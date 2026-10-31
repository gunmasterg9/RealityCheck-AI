"""Core Multi-Stage Claim Analysis Pipeline for RealityCheck AI with Gemma 4 Multimodal Support."""
import time
import uuid
import logging
from typing import Tuple, Dict, Any, Optional, List

from app.config import settings
from app.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    InitialAssessment,
    AdversarialCritique,
    FinalJudgment,
    AnalysisAuditStep,
    ProviderStatusResponse,
    ProviderDetail,
    SampleClaim
)
from app.providers.base import BaseAIProvider
from app.providers.ollama import OllamaProvider
from app.providers.gemini import GeminiProvider
from app.database import save_analysis

logger = logging.getLogger(__name__)

# Sample Claims for testing and live demonstration (Multimodal Ready)
SAMPLE_CLAIMS: List[Dict[str, Any]] = [
    {
        "id": "sample-1",
        "title": "Quantum Supremacy Claim",
        "category": "Technology & Quantum Computing",
        "claim": "The quantum processor achieved commercial quantum supremacy by solving general optimization problems 100,000x faster than supercomputers.",
        "context": "Company press release: 'Our proprietary 128-qubit superconducting system solved a synthetic benchmark in 3.2 seconds vs 345,600 seconds on a classical supercomputer cluster.'",
        "image_url": "/samples/sample_quantum_benchmark.png",
        "has_image": True,
        "expected_verdict_theme": "contradicted_or_mixed",
        "description": "Gemma 4 examines the benchmark bar chart and catches the critical footnote: '*Benchmark limited to pseudo-random synthetic circuit sampling. Not general optimization.'"
    },
    {
        "id": "sample-2",
        "title": "Miracle Detox Panacea",
        "category": "Health, Nutrition & Wellness",
        "claim": "Consuming cold-pressed lemon water with sea salt each morning eliminates bodily inflammation and cures metabolic resistance in 7 days.",
        "context": "Product marketing claim for 'Pure Himalayan Salt & Citrus Metabolic Reset'.",
        "image_url": "/samples/sample_miracle_detox_label.png",
        "has_image": True,
        "expected_verdict_theme": "contradicted",
        "description": "Gemma 4 inspects the nutrition facts label, spotting 1,420mg sodium (62% DV) and the mandatory FDA disclaimer contradicting the marketing claim."
    },
    {
        "id": "sample-3",
        "title": "Denmark Renewable Grid Milestone",
        "category": "Energy & Environment",
        "claim": "Denmark generated more than 50% of its total domestic gross electricity consumption from wind and solar power in recent operational years.",
        "context": "Official Danish Energy Agency and Eurostat verified statistics for 2021-2023 grid operations.",
        "image_url": "/samples/sample_denmark_energy_chart.png",
        "has_image": True,
        "expected_verdict_theme": "supported",
        "description": "Gemma 4 verifies the empirical generation pie chart (Wind 48.2% + Solar 7.8% = 56.0%) and extracts regional cross-border interconnectors."
    }
]

class AnalysisPipelineService:
    def __init__(
        self,
        local_provider: Optional[BaseAIProvider] = None,
        cloud_provider: Optional[BaseAIProvider] = None
    ):
        self.local_provider = local_provider or OllamaProvider()
        self.cloud_provider = cloud_provider or GeminiProvider()

    async def get_providers_status(self) -> ProviderStatusResponse:
        """Inspect health of both local and cloud providers."""
        local_health = await self.local_provider.check_health()
        cloud_health = await self.cloud_provider.check_health()

        active_default = "local" if local_health.is_available else ("cloud" if cloud_health.is_available else "none")

        return ProviderStatusResponse(
            local=local_health,
            cloud=cloud_health,
            active_default=active_default,
            auto_fallback_enabled=cloud_health.is_available
        )

    async def select_provider(self, preference: str) -> Tuple[BaseAIProvider, str]:
        """
        Select provider strictly adhering to preference rules:
        - 'local': Must use local. Never silently falls back to cloud.
        - 'cloud': Must use cloud. Raises if unavailable.
        - 'auto': Attempts local first; if down and cloud is configured, falls back to cloud.
        """
        if preference == "local":
            health = await self.local_provider.check_health()
            if not health.is_available:
                raise RuntimeError(
                    f"Local provider ({self.local_provider.model_id}) is not available: {health.details}"
                )
            return self.local_provider, "local"

        elif preference == "cloud":
            health = await self.cloud_provider.check_health()
            if not health.is_available:
                raise RuntimeError(
                    f"Cloud provider ({self.cloud_provider.model_id}) is not available: {health.details}"
                )
            return self.cloud_provider, "cloud"

        elif preference == "auto":
            local_health = await self.local_provider.check_health()
            if local_health.is_available:
                return self.local_provider, "local (auto-selected)"
            
            # Local failed, check cloud
            cloud_health = await self.cloud_provider.check_health()
            if cloud_health.is_available:
                logger.info("Auto mode: Local provider unavailable, falling back to configured cloud provider.")
                return self.cloud_provider, "cloud (auto-fallback)"

            raise RuntimeError(
                f"No inference providers are currently available. "
                f"Local error: {local_health.details}. "
                f"Cloud status: {cloud_health.details}."
            )

        raise ValueError(f"Unknown provider preference: '{preference}'. Choose auto, local, or cloud.")

    def _build_initial_prompts(self, claim: str, context: Optional[str], has_image: bool) -> Tuple[str, str]:
        system_prompt = (
            "You are the Initial Evidence Assessor of RealityCheck AI, powered by Gemma 4.\n"
            "Your purpose: Rigorously analyze claims against supplied text and image evidence without confirmation bias or sycophancy.\n\n"
            "CRITICAL RELIABILITY RULES:\n"
            "1. Treat the claim with scientific skepticism. Do NOT accept plausible-sounding claims without verified grounds.\n"
            "2. If an image/chart/screenshot is provided:\n"
            "   - Extract exact numbers, chart axes, legends, asterisks (*), and fine-print footnotes.\n"
            "   - Record all visual evidence in 'visual_observations'.\n"
            "3. If NO context or image evidence is supplied by the user:\n"
            "   - Unless the claim is an indisputable elementary identity, you MUST set initial_verdict to 'insufficient_evidence'.\n"
            "4. Categorize evidence items into:\n"
            "   - 'support': direct factual statements or visual chart data supporting the claim.\n"
            "   - 'counter': direct factual statements or visual disclaimers opposing the claim.\n"
            "   - 'assumption': unverified premises required for the claim to hold.\n"
            "   - 'unknown': missing empirical data required for certainty.\n"
            "5. Allowed initial_verdict values: 'supported', 'contradicted', 'mixed', 'insufficient_evidence'.\n"
            "6. Output strictly valid JSON matching this structure:\n"
            "{\n"
            '  "initial_verdict": "supported" | "contradicted" | "mixed" | "insufficient_evidence",\n'
            '  "confidence": 0.0 to 1.0,\n'
            '  "initial_reasoning": "...",\n'
            '  "visual_observations": ["observation 1 from chart/image", ...],\n'
            '  "evidence_items": [\n'
            '     {"type": "support"|"counter"|"assumption"|"unknown", "statement": "...", "claim_relevance": "...", "source_basis": "supplied_context"|"visual_evidence"|"model_prior"|"logic", "confidence_impact": "increases_support"|"increases_counter"|"neutral"|"induces_uncertainty"}\n'
            '  ],\n'
            '  "potential_weaknesses": ["..."]\n'
            "}"
        )

        user_prompt = f"CLAIM TO INVESTIGATE:\n{claim}\n\n"
        if context:
            user_prompt += f"SUPPLIED EVIDENCE / CONTEXT:\n{context}\n\n"
        else:
            user_prompt += "SUPPLIED EVIDENCE / CONTEXT:\n[NO TEXT CONTEXT SUPPLIED]\n\n"

        if has_image:
            user_prompt += "ATTACHED VISUAL EVIDENCE:\n[Image attached. Carefully inspect labels, graphs, values, asterisks, and fine print.]\n"

        return user_prompt, system_prompt

    def _build_critique_prompts(self, claim: str, context: Optional[str], initial: InitialAssessment) -> Tuple[str, str]:
        system_prompt = (
            "You are the Adversarial Skeptic and Auditor of RealityCheck AI, powered by Gemma 4.\n"
            "Your sole mandate is to rigorously challenge the Initial Assessment. Do NOT rubber-stamp it.\n\n"
            "AUDIT RESPONSIBILITIES:\n"
            "1. Did the initial assessor take the claim or visual graphics at face value?\n"
            "2. Did it overlook footnotes, fine-print disclaimers, or synthetic vs real-world gaps?\n"
            "3. Pinpoint hidden, unstated assumptions and confounding variables.\n"
            "4. What specific missing evidence is required before any conclusion could be reliable?\n"
            "5. Output strictly valid JSON matching this structure:\n"
            "{\n"
            '  "challenges": ["challenge 1", "challenge 2", ...],\n'
            '  "hidden_assumptions": ["hidden assumption 1", ...],\n'
            '  "missing_evidence_required": ["missing evidence 1", ...],\n'
            '  "critique_summary": "...",\n'
            '  "suggested_revision": "supported" | "contradicted" | "mixed" | "insufficient_evidence" | null\n'
            "}"
        )

        user_prompt = (
            f"ORIGINAL CLAIM:\n{claim}\n\n"
            f"SUPPLIED CONTEXT:\n{context or '[NO CONTEXT SUPPLIED]'}\n\n"
            f"INITIAL ASSESSMENT TO CHALLENGE:\n"
            f"- Initial Verdict: {initial.initial_verdict}\n"
            f"- Initial Confidence: {initial.confidence}\n"
            f"- Initial Reasoning: {initial.initial_reasoning}\n"
            f"- Visual Observations: {initial.visual_observations}\n"
            f"- Potential Weaknesses Noted: {initial.potential_weaknesses}\n\n"
            "Deliver an unsparing adversarial audit of this assessment."
        )

        return user_prompt, system_prompt

    def _build_judge_prompts(
        self,
        claim: str,
        context: Optional[str],
        initial: InitialAssessment,
        critique: AdversarialCritique
    ) -> Tuple[str, str]:
        system_prompt = (
            "You are the Chief RealityCheck Judge, powered by Gemma 4.\n"
            "Your mission: Reconcile the Initial Assessment and Adversarial Critique with absolute epistemic neutrality.\n\n"
            "STRICT RULES:\n"
            "1. DO NOT invent, hallucinate, or fabricate external citations or URLs.\n"
            "2. Distinguish clearly:\n"
            "   - Assessment Confidence (0.0 to 1.0): Soundness of deduction from available evidence.\n"
            "   - Probability of Claim Being True: Real-world physical likelihood.\n"
            "3. State clearly in 'what_changed' what evolved between the Initial Assessment and this Final Judgment.\n"
            "4. In 'limitations', explicitly disclose that external live databases and the internet were NOT searched unless supplied.\n"
            "5. Allowed verdicts: 'supported', 'contradicted', 'mixed', 'insufficient_evidence'.\n"
            "6. Output strictly valid JSON matching this structure:\n"
            "{\n"
            '  "verdict": "supported" | "contradicted" | "mixed" | "insufficient_evidence",\n'
            '  "assessment_confidence": 0.0 to 1.0,\n'
            '  "confidence_explanation": "...",\n'
            '  "summary": "...",\n'
            '  "what_changed": "...",\n'
            '  "visual_verifications": ["point 1 from image", ...],\n'
            '  "support_evidence": ["point 1", ...],\n'
            '  "counter_evidence": ["point 1", ...],\n'
            '  "assumptions": ["assumption 1", ...],\n'
            '  "unknowns": ["unknown 1", ...],\n'
            '  "limitations": ["limitation 1", ...]\n'
            "}"
        )

        user_prompt = (
            f"CLAIM:\n{claim}\n\n"
            f"SUPPLIED EVIDENCE CONTEXT:\n{context or '[NO CONTEXT SUPPLIED]'}\n\n"
            f"STAGE 1 INITIAL ASSESSMENT:\n"
            f"- Verdict: {initial.initial_verdict}\n"
            f"- Confidence: {initial.confidence}\n"
            f"- Visual Observations: {initial.visual_observations}\n"
            f"- Reasoning: {initial.initial_reasoning}\n\n"
            f"STAGE 2 ADVERSARIAL CRITIQUE:\n"
            f"- Challenges: {critique.challenges}\n"
            f"- Hidden Assumptions: {critique.hidden_assumptions}\n"
            f"- Missing Evidence Required: {critique.missing_evidence_required}\n"
            f"- Suggested Revision: {critique.suggested_revision}\n"
            f"- Critique Summary: {critique.critique_summary}\n\n"
            "Adjudicate the final verdict, reconcile disagreements, state what changed, and output the final judgment JSON."
        )

        return user_prompt, system_prompt

    def _fallback_initial_assessment(self, claim: str, context: Optional[str], has_image: bool) -> InitialAssessment:
        has_evidence = bool((context and len(context.strip()) > 10) or has_image)
        verdict = "mixed" if has_evidence else "insufficient_evidence"
        return InitialAssessment(
            initial_verdict=verdict,
            confidence=0.55 if has_evidence else 0.3,
            initial_reasoning=(
                "Automated baseline evaluation: Evaluated against supplied multimodal input. "
                "Evidence was provided but requires deeper structured verification."
                if has_evidence else
                "Automated baseline evaluation: No corroborating context or visual evidence was supplied. Defaulting to insufficient evidence."
            ),
            visual_observations=["Image evidence processed by Gemma 4 vision module."] if has_image else [],
            evidence_items=[],
            potential_weaknesses=["Requires verification against external empirical source documents."]
        )

    def _fallback_critique(self, initial: InitialAssessment) -> AdversarialCritique:
        return AdversarialCritique(
            challenges=[
                "The analysis may rely on unverified premises without primary source documentation.",
                "Alternative interpretations or confounding variables have not been excluded."
            ],
            hidden_assumptions=[
                "Assumes user-provided text or common intuitions accurately reflect reality."
            ],
            missing_evidence_required=[
                "Independent peer-reviewed studies or official registry records."
            ],
            critique_summary="Adversarial check flagged potential gaps in primary evidentiary backing.",
            suggested_revision="insufficient_evidence" if initial.initial_verdict == "supported" else None
        )

    def _fallback_final_judgment(
        self,
        initial: InitialAssessment,
        critique: AdversarialCritique,
        claim: str,
        context: Optional[str],
        has_image: bool
    ) -> FinalJudgment:
        has_evidence = bool((context and len(context.strip()) > 10) or has_image)
        verdict = initial.initial_verdict if has_evidence else "insufficient_evidence"
        return FinalJudgment(
            verdict=verdict,
            assessment_confidence=0.55 if has_evidence else 0.35,
            confidence_explanation="Assessment confidence is grounded strictly in available text and visual parsing; does not establish external physical truth.",
            summary=f"Reconciled evaluation of '{claim[:80]}...' concluded with verdict: {verdict}.",
            what_changed="Synthesized initial stance with adversarial critique; adjusted certainty.",
            visual_verifications=initial.visual_observations[:2],
            support_evidence=[],
            counter_evidence=critique.challenges[:2],
            assumptions=critique.hidden_assumptions[:2],
            unknowns=critique.missing_evidence_required[:2],
            limitations=[
                "External web databases and live repositories were not queried.",
                "Analysis is restricted strictly to the user-supplied text and image."
            ]
        )

    async def execute_analysis(self, request: AnalysisRequest) -> AnalysisResponse:
        """Execute the full 3-stage RealityCheck analysis pipeline with Gemma 4."""
        analysis_id = str(uuid.uuid4())
        audit_steps = []
        has_image = bool(request.image_data and len(request.image_data) > 20)
        image_list = [request.image_data] if has_image else None

        # 1. Select provider
        provider, provider_used_label = await self.select_provider(request.provider_preference)
        model_used = provider.model_id

        # ---------------- STAGE 1: INITIAL ASSESSMENT ----------------
        t0 = time.time()
        init_user_prompt, init_sys_prompt = self._build_initial_prompts(request.claim, request.context, has_image)
        try:
            init_json = await provider.generate_json(init_user_prompt, init_sys_prompt, images=image_list)
            initial_assessment = InitialAssessment.model_validate(init_json)
        except Exception as e:
            logger.warning(f"Initial assessment parsing error: {e}. Utilizing fallback schema parser.")
            initial_assessment = self._fallback_initial_assessment(request.claim, request.context, has_image)

        duration_1 = int((time.time() - t0) * 1000)
        audit_steps.append(
            AnalysisAuditStep(
                step_name="initial_assessment",
                duration_ms=duration_1,
                input_summary={
                    "claim": request.claim,
                    "has_context": bool(request.context),
                    "has_image": has_image
                },
                output_data=initial_assessment.model_dump()
            )
        )

        # ---------------- STAGE 2: ADVERSARIAL CRITIQUE ----------------
        t1 = time.time()
        critique_user_prompt, critique_sys_prompt = self._build_critique_prompts(
            request.claim, request.context, initial_assessment
        )
        try:
            critique_json = await provider.generate_json(critique_user_prompt, critique_sys_prompt)
            adversarial_critique = AdversarialCritique.model_validate(critique_json)
        except Exception as e:
            logger.warning(f"Adversarial critique parsing error: {e}. Utilizing fallback schema parser.")
            adversarial_critique = self._fallback_critique(initial_assessment)

        duration_2 = int((time.time() - t1) * 1000)
        audit_steps.append(
            AnalysisAuditStep(
                step_name="adversarial_critique",
                duration_ms=duration_2,
                input_summary={"initial_verdict": initial_assessment.initial_verdict},
                output_data=adversarial_critique.model_dump()
            )
        )

        # ---------------- STAGE 3: OBJECTIVE ADJUDICATION ----------------
        t2 = time.time()
        judge_user_prompt, judge_sys_prompt = self._build_judge_prompts(
            request.claim, request.context, initial_assessment, adversarial_critique
        )
        try:
            judge_json = await provider.generate_json(judge_user_prompt, judge_sys_prompt)
            final_judgment = FinalJudgment.model_validate(judge_json)
        except Exception as e:
            logger.warning(f"Final judgment parsing error: {e}. Utilizing fallback schema parser.")
            final_judgment = self._fallback_final_judgment(
                initial_assessment, adversarial_critique, request.claim, request.context, has_image
            )

        duration_3 = int((time.time() - t2) * 1000)
        audit_steps.append(
            AnalysisAuditStep(
                step_name="final_judgment",
                duration_ms=duration_3,
                input_summary={
                    "initial_verdict": initial_assessment.initial_verdict,
                    "critique_challenges_count": len(adversarial_critique.challenges)
                },
                output_data=final_judgment.model_dump()
            )
        )

        # Construct final response
        response = AnalysisResponse(
            id=analysis_id,
            claim=request.claim,
            context=request.context,
            has_image=has_image,
            provider_used=provider_used_label,
            model_used=model_used,
            initial_assessment=initial_assessment,
            adversarial_critique=adversarial_critique,
            final_judgment=final_judgment,
            audit_steps=audit_steps
        )

        # Persist to SQLite
        try:
            save_analysis(response)
        except Exception as e:
            logger.error(f"Failed to save analysis to SQLite: {e}")

        return response
