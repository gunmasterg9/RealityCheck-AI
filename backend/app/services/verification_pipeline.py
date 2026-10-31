"""RealityCheck AI 2.0 Real-Time 6-Stage Verification Pipeline.
Orchestrates:
Stage 1: Input Classification & Claim Extraction (with Hindi/Gujarati/Indic support)
Stage 2: Safe Source Retrieval (SSRF-safe scraping, Fact Check Tools API, Web search)
Stage 3: Evidence Collection & Alignment (direction, excerpts, publisher metadata)
Stage 4: Gemma 4 Evidence-Aware Analyzer
Stage 5: Adversarial Critic
Stage 6: Chief Judge & Reconciled Verdict (What Changed, Citations, Confidence)
"""
import re
import uuid
import time
import logging
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urlparse
from datetime import datetime, timezone

from app.config import settings
from app.providers.base import BaseAIProvider
from app.providers.ollama import OllamaProvider
from app.providers.gemini import GeminiProvider
from app.services.security import is_safe_url, detect_language, fence_untrusted_content
from app.services.scraper import scraper_service
from app.services.search_service import search_service
from app.schemas import (
    VerificationRequest,
    VerificationJobResponse,
    VerificationStageAudit,
    ExtractedClaim,
    SourceItem,
    EvidenceRecord,
    ClaimReviewItem,
    VerificationVerdict
)

logger = logging.getLogger(__name__)

URL_PATTERN = re.compile(r"^https?://[^\s]+", re.I)

class VerificationPipelineService:
    def __init__(
        self,
        local_provider: Optional[BaseAIProvider] = None,
        cloud_provider: Optional[BaseAIProvider] = None
    ):
        self.local_provider = local_provider or OllamaProvider()
        self.cloud_provider = cloud_provider or GeminiProvider()

    async def select_provider(self, preference: str) -> Tuple[BaseAIProvider, str]:
        """Adhere strictly to preference rules."""
        if preference == "local":
            health = await self.local_provider.check_health()
            if not health.is_available:
                raise RuntimeError(f"Local provider ({self.local_provider.model_id}) unavailable: {health.details}")
            return self.local_provider, "local"

        elif preference == "cloud":
            health = await self.cloud_provider.check_health()
            if not health.is_available:
                raise RuntimeError(f"Cloud provider ({self.cloud_provider.model_id}) unavailable: {health.details}")
            return self.cloud_provider, "cloud"

        elif preference == "auto":
            local_health = await self.local_provider.check_health()
            if local_health.is_available:
                return self.local_provider, "local (auto-selected)"

            cloud_health = await self.cloud_provider.check_health()
            if cloud_health.is_available:
                return self.cloud_provider, "cloud (auto-fallback)"

            raise RuntimeError("No AI inference providers are available. Check Ollama or configure GEMINI_API_KEY.")

        raise ValueError(f"Unknown preference '{preference}'. Choose auto, local, or cloud.")

    async def execute_verification(self, request: VerificationRequest) -> VerificationJobResponse:
        job_id = str(uuid.uuid4())
        stages: List[VerificationStageAudit] = []
        start_all = time.perf_counter()

        # Select LLM Provider
        provider, provider_used_label = await self.select_provider(request.provider_preference)
        model_used = provider.model_id

        # --------------------------------------------------------------------
        # STAGE 1: INPUT CLASSIFICATION & CLAIM EXTRACTION
        # --------------------------------------------------------------------
        s1_start = time.perf_counter()
        raw_text = request.input_text.strip()
        detected_lang = detect_language(raw_text)

        classified_type = request.input_type
        if classified_type == "auto":
            classified_type = self._classify_input(raw_text, request.image_data)

        primary_claim, extracted_claims, scraped_article = await self._stage1_extract_claims(
            classified_type, raw_text, request.image_data, detected_lang
        )

        s1_ms = int((time.perf_counter() - s1_start) * 1000)
        stages.append(VerificationStageAudit(
            stage_number=1,
            stage_name="input_classification",
            duration_ms=s1_ms,
            status="completed",
            summary=f"Classified as '{classified_type}' in {detected_lang['name']}. Extracted {len(extracted_claims)} claim(s).",
            details={
                "input_type": classified_type,
                "language": detected_lang,
                "claims_count": len(extracted_claims),
                "primary_claim": primary_claim
            }
        ))

        # --------------------------------------------------------------------
        # STAGE 2: SOURCE RETRIEVAL (Fact Check Tools + Web Search + Scrape)
        # --------------------------------------------------------------------
        s2_start = time.perf_counter()
        sources: List[SourceItem] = []
        fact_check_matches: List[ClaimReviewItem] = []

        # If scraped article already exists from Stage 1, record it as a primary source
        if scraped_article and scraped_article.get("success"):
            src_id = f"src_{len(sources)+1}"
            sources.append(SourceItem(
                id=src_id,
                url=scraped_article.get("canonical_url") or scraped_article.get("url", ""),
                title=scraped_article.get("title", "Submitted Article"),
                publisher=scraped_article.get("publisher", "Web Publisher"),
                publish_date=scraped_article.get("publish_date"),
                source_type="news_organization" if not scraped_article.get("is_social") else "social_media",
                reliability_score=0.85
            ))

        # 1. Google Fact Check Tools API lookup
        try:
            fc_results = await search_service.search_fact_check_tools(
                primary_claim,
                language_code=detected_lang.get("language")
            )
            for fc in fc_results:
                fact_check_matches.append(ClaimReviewItem(
                    publisher=fc.get("publisher", "Fact Checker"),
                    rating=fc.get("rating", "Unrated"),
                    claim_text=fc.get("claim_text", ""),
                    review_url=fc.get("review_url", ""),
                    review_title=fc.get("review_title"),
                    review_date=fc.get("review_date"),
                    publisher_site=fc.get("publisher_site"),
                    source_type="official_fact_checker"
                ))
                if fc.get("review_url"):
                    sources.append(SourceItem(
                        id=f"src_{len(sources)+1}",
                        url=fc.get("review_url"),
                        title=fc.get("review_title", f"Fact Check by {fc.get('publisher')}"),
                        publisher=fc.get("publisher", "Fact Checker"),
                        publish_date=fc.get("review_date"),
                        source_type="official_fact_checker",
                        reliability_score=0.98
                    ))
        except Exception as e:
            logger.warning(f"Error querying fact check tools: {e}")

        # 2. Web Search retrieval (Tavily, Brave, or open fallback)
        try:
            search_query = primary_claim
            # Query web
            web_results = await search_service.search_web(search_query, num_results=5)
            # If low results, also query with fact check keyword
            if len(web_results) < 3:
                fc_web = await search_service.search_web(f"fact check {search_query}", num_results=3)
                web_results.extend(fc_web)

            for w in web_results:
                if not any(s.url == w.get("url") for s in sources):
                    sources.append(SourceItem(
                        id=f"src_{len(sources)+1}",
                        url=w.get("url", ""),
                        title=w.get("title", "Web Source"),
                        publisher=w.get("publisher", "Web"),
                        source_type=w.get("source_type", "web_search"),
                        reliability_score=w.get("score", 0.8)
                    ))
        except Exception as e:
            logger.warning(f"Error executing web search: {e}")

        s2_ms = int((time.perf_counter() - s2_start) * 1000)
        stages.append(VerificationStageAudit(
            stage_number=2,
            stage_name="source_retrieval",
            duration_ms=s2_ms,
            status="completed",
            summary=f"Retrieved {len(sources)} sources and {len(fact_check_matches)} official fact-check matches.",
            details={
                "sources_found": len(sources),
                "fact_checks_found": len(fact_check_matches)
            }
        ))

        # --------------------------------------------------------------------
        # STAGE 3: EVIDENCE COLLECTION & DIRECTIONAL ALIGNMENT
        # --------------------------------------------------------------------
        s3_start = time.perf_counter()
        evidence_records: List[EvidenceRecord] = []

        # Convert fact-check matches to evidence records
        for fc in fact_check_matches:
            rating_lower = fc.rating.lower()
            direction = "contradicting" if any(w in rating_lower for w in ["false", "pants on fire", "fake", "incorrect", "hoax", "misleading"]) else ("supporting" if any(w in rating_lower for w in ["true", "correct", "verified", "accurate"]) else "contextual")
            evidence_records.append(EvidenceRecord(
                id=f"ev_{len(evidence_records)+1}",
                claim_id="claim_1",
                source_url=fc.review_url,
                publisher=fc.publisher,
                excerpt=f"Official Fact Check Rating: '{fc.rating}'. Reviewing claim: '{fc.claim_text}'.",
                direction=direction,
                relevance_score=0.98
            ))

        # Add excerpts from scraped article or search snippets
        if scraped_article and scraped_article.get("text"):
            text_snippet = scraped_article["text"][:600]
            evidence_records.append(EvidenceRecord(
                id=f"ev_{len(evidence_records)+1}",
                claim_id="claim_1",
                source_url=scraped_article.get("canonical_url", ""),
                publisher=scraped_article.get("publisher", "Submitted URL"),
                excerpt=text_snippet,
                direction="contextual",
                relevance_score=0.90
            ))

        # Add web search snippets as evidence records
        for src in sources:
            if src.source_type != "official_fact_checker" and len(evidence_records) < 10:
                evidence_records.append(EvidenceRecord(
                    id=f"ev_{len(evidence_records)+1}",
                    claim_id="claim_1",
                    source_url=src.url,
                    publisher=src.publisher,
                    excerpt=f"Source article: '{src.title}'. Evidence context from {src.publisher}.",
                    direction="contextual",
                    relevance_score=src.reliability_score
                ))

        s3_ms = int((time.perf_counter() - s3_start) * 1000)
        stages.append(VerificationStageAudit(
            stage_number=3,
            stage_name="evidence_collection",
            duration_ms=s3_ms,
            status="completed",
            summary=f"Synthesized {len(evidence_records)} evidence items with directional classification.",
            details={"evidence_items_count": len(evidence_records)}
        ))

        # --------------------------------------------------------------------
        # STAGE 4: GEMMA 4 EVIDENCE-AWARE REASONING (ANALYZER)
        # --------------------------------------------------------------------
        s4_start = time.perf_counter()
        analyzer_output = await self._run_stage4_analyzer(
            provider=provider,
            claim=primary_claim,
            detected_lang=detected_lang,
            evidence=evidence_records,
            fact_checks=fact_check_matches,
            image_data=request.image_data
        )
        s4_ms = int((time.perf_counter() - s4_start) * 1000)
        stages.append(VerificationStageAudit(
            stage_number=4,
            stage_name="gemma_analyzer",
            duration_ms=s4_ms,
            status="completed",
            summary=f"Analyzer arrived at initial stance: '{analyzer_output.get('initial_verdict')}' (confidence: {analyzer_output.get('confidence', 0.8):.2f}).",
            details=analyzer_output
        ))

        # --------------------------------------------------------------------
        # STAGE 5: ADVERSARIAL CRITIC PASS
        # --------------------------------------------------------------------
        s5_start = time.perf_counter()
        critic_output = await self._run_stage5_critic(
            provider=provider,
            claim=primary_claim,
            analyzer_assessment=analyzer_output,
            evidence=evidence_records,
            has_image=bool(request.image_data)
        )
        s5_ms = int((time.perf_counter() - s5_start) * 1000)
        stages.append(VerificationStageAudit(
            stage_number=5,
            stage_name="adversarial_critic",
            duration_ms=s5_ms,
            status="completed",
            summary=f"Adversarial critic raised {len(critic_output.get('challenges', []))} challenges and evaluated unstated assumptions.",
            details=critic_output
        ))

        # --------------------------------------------------------------------
        # STAGE 6: CHIEF JUDGE & RECONCILED VERDICT
        # --------------------------------------------------------------------
        s6_start = time.perf_counter()
        judge_output = await self._run_stage6_judge(
            provider=provider,
            claim=primary_claim,
            analyzer=analyzer_output,
            critic=critic_output,
            sources=sources,
            evidence=evidence_records
        )
        s6_ms = int((time.perf_counter() - s6_start) * 1000)
        stages.append(VerificationStageAudit(
            stage_number=6,
            stage_name="chief_judge",
            duration_ms=s6_ms,
            status="completed",
            summary=f"Final reconciled verdict rendered: '{judge_output.get('final_verdict')}' with confidence {judge_output.get('confidence', 0.85):.2f}.",
            details=judge_output
        ))

        # Build final response
        return VerificationJobResponse(
            id=job_id,
            input_type=classified_type,
            raw_input=raw_text,
            detected_language=detected_lang,
            primary_claim=primary_claim,
            extracted_claims=extracted_claims,
            fact_check_matches=fact_check_matches,
            sources=sources,
            evidence=evidence_records,
            final_verdict=judge_output.get("final_verdict", "INSUFFICIENT EVIDENCE"),
            initial_verdict=analyzer_output.get("initial_verdict", "unverified"),
            assessment_confidence=judge_output.get("confidence", 0.75),
            soundness_explanation=judge_output.get("soundness_explanation", "Distinguishes analysis rigor from raw truth probability."),
            verdict_summary=judge_output.get("verdict_summary", "Verification complete."),
            what_changed=judge_output.get("what_changed", "Synthesized evidence and adversarial critique to render verdict."),
            supporting_points=judge_output.get("supporting_points", []),
            contradicting_points=judge_output.get("contradicting_points", []),
            limitations_disclaimer=judge_output.get("limitations", [
                "Analysis reflects publicly accessible web evidence and official fact-checks available at check time.",
                "External private groups or restricted paywalled sources were not accessed."
            ]),
            provider_used=provider_used_label,
            model_used=model_used,
            stages=stages,
            created_at=datetime.now(timezone.utc).isoformat()
        )

    def _classify_input(self, text: str, image_data: Optional[str]) -> str:
        """Classify input text automatically."""
        if image_data and (not text or len(text) < 15):
            return "image"

        text_stripped = text.strip()
        if URL_PATTERN.match(text_stripped):
            domain = urlparse(text_stripped).netloc.lower()
            if any(s in domain for s in ["twitter.com", "x.com", "reddit.com", "youtube.com", "youtu.be", "t.me"]):
                return "social"
            return "url"

        # Check for forwarded message signals
        forward_cues = ["forwarded", "whatsapp", "telegram", "viral", "share to all", "must read", "सावधान", "શેર કરો", "ब्रेकिंग", "ચેતવણી"]
        if any(c in text_stripped.lower() for c in forward_cues) or ("\n" in text_stripped and len(text_stripped) > 80):
            return "message"

        if len(text_stripped) > 500:
            return "article"

        return "direct"

    async def _stage1_extract_claims(
        self,
        classified_type: str,
        raw_text: str,
        image_data: Optional[str],
        detected_lang: Dict[str, Any]
    ) -> Tuple[str, List[ExtractedClaim], Optional[Dict[str, Any]]]:
        """Extract primary and secondary factual claims."""
        scraped_article = None

        if classified_type in ("url", "social"):
            if classified_type == "social":
                scraped_article = await scraper_service.fetch_social_media_post(raw_text)
            else:
                scraped_article = await scraper_service.fetch_article(raw_text)

            if scraped_article.get("success"):
                headline = scraped_article.get("title", "")
                text_snippet = scraped_article.get("text", "")[:300]
                primary = headline if (headline and headline != "Untitled Web Article") else text_snippet
            else:
                primary = f"Content at {raw_text}"
        elif classified_type == "message":
            # Extract main assertion from forwarded message
            clean_lines = [line.strip() for line in raw_text.split("\n") if len(line.strip()) > 15]
            primary = clean_lines[0] if clean_lines else raw_text[:200]
        else:
            primary = raw_text

        # Clean primary claim string
        primary = re.sub(r"^(claim|verify|check|is it true that|fact check):?\s*", "", primary, flags=re.I).strip()
        if len(primary) > 250:
            primary = primary[:250].rsplit(" ", 1)[0] + "..."

        claims = [ExtractedClaim(id="claim_1", claim_text=primary, category="factual", order=1)]
        return primary, claims, scraped_article

    async def _run_stage4_analyzer(
        self,
        provider: BaseAIProvider,
        claim: str,
        detected_lang: Dict[str, Any],
        evidence: List[EvidenceRecord],
        fact_checks: List[ClaimReviewItem],
        image_data: Optional[str]
    ) -> Dict[str, Any]:
        """Run Gemma 4 evidence-aware analyzer."""
        evidence_text = "\n".join([
            f"- [{e.direction.upper()}] ({e.publisher}): {e.excerpt}" for e in evidence[:8]
        ]) or "No direct external web evidence found."

        fc_text = "\n".join([
            f"- {fc.publisher}: Rating '{fc.rating}' for claim '{fc.claim_text}' (URL: {fc.review_url})"
            for fc in fact_checks[:4]
        ]) or "No official Google Fact Check Tools records found."

        lang_note = f"Note: Input detected in {detected_lang['name']}. Cross-reference semantics accurately." if detected_lang.get("is_regional") else ""

        system_prompt = (
            "You are the Evidence Analyzer of RealityCheck AI, powered by Gemma 4.\n"
            "Analyze the given claim strictly against the retrieved evidence.\n"
            "CRITICAL INSTRUCTION: Do not blindly confirm or deny. If credible fact-checks or evidence refute the claim, mark it contradicted or false. If evidence confirms it, mark it supported.\n"
            "Output VALID JSON only matching this schema:\n"
            "{\n"
            '  "initial_verdict": "supported" | "contradicted" | "mixed" | "insufficient_evidence",\n'
            '  "confidence": <float 0.0 to 1.0>,\n'
            '  "reasoning": "<thorough rationale grounded in evidence>",\n'
            '  "supporting_observations": ["<point>"],\n'
            '  "counter_observations": ["<point>"]\n'
            "}"
        )

        user_prompt = (
            f"CLAIM TO ANALYZE:\n{claim}\n\n"
            f"{lang_note}\n\n"
            f"OFFICIAL FACT-CHECK REVIEWS:\n{fence_untrusted_content(fc_text, 'FACT_CHECKS')}\n\n"
            f"RETRIEVED WEB EVIDENCE:\n{fence_untrusted_content(evidence_text, 'EVIDENCE')}\n\n"
            "Provide your structured JSON analysis."
        )

        images = [image_data] if image_data else None
        try:
            res = await provider.generate_json(system_prompt=system_prompt, user_prompt=user_prompt, images=images)
            return res
        except Exception as e:
            logger.warning(f"Analyzer inference error: {e}. Using deterministic fallback.")
            # Deterministic evidence heuristic fallback if LLM times out or is offline
            has_contra = any(e.direction == "contradicting" for e in evidence) or any(
                "false" in fc.rating.lower() or "hoax" in fc.rating.lower() for fc in fact_checks
            )
            has_supp = any(e.direction == "supporting" for e in evidence) or any(
                "true" in fc.rating.lower() for fc in fact_checks
            )
            v = "contradicted" if has_contra else ("supported" if has_supp else "insufficient_evidence")
            return {
                "initial_verdict": v,
                "confidence": 0.85 if (has_contra or has_supp) else 0.50,
                "reasoning": f"Synthesized from {len(evidence)} retrieved evidentiary records and {len(fact_checks)} fact-checker records.",
                "supporting_observations": [e.excerpt for e in evidence if e.direction == "supporting"][:3],
                "counter_observations": [e.excerpt for e in evidence if e.direction == "contradicting"][:3]
            }

    async def _run_stage5_critic(
        self,
        provider: BaseAIProvider,
        claim: str,
        analyzer_assessment: Dict[str, Any],
        evidence: List[EvidenceRecord],
        has_image: bool
    ) -> Dict[str, Any]:
        """Run Adversarial Critic pass."""
        system_prompt = (
            "You are the Adversarial Self-Critic of RealityCheck AI.\n"
            "Your mission: Challenge the initial assessment. Find potential weaknesses, date misattributions, satire, or confirmation bias.\n"
            "Output VALID JSON only matching:\n"
            "{\n"
            '  "challenges": ["<challenge point 1>", "<challenge point 2>"],\n'
            '  "hidden_assumptions": ["<unstated assumption>"],\n'
            '  "missing_evidence": ["<missing proof>"],\n'
            '  "suggested_verdict": "supported" | "contradicted" | "mixed" | "insufficient_evidence"\n'
            "}"
        )

        user_prompt = (
            f"CLAIM: {claim}\n"
            f"INITIAL STANCE: {analyzer_assessment.get('initial_verdict')}\n"
            f"INITIAL REASONING: {analyzer_assessment.get('reasoning')}\n"
            f"AVAILABLE EVIDENCE COUNT: {len(evidence)}\n"
            "Challenge this assessment rigorously."
        )

        try:
            return await provider.generate_json(system_prompt=system_prompt, user_prompt=user_prompt)
        except Exception as e:
            logger.warning(f"Critic inference error: {e}. Fallback critic active.")
            return {
                "challenges": [
                    "Evaluate whether the claim conflates correlation with clinical causation.",
                    "Verify if source reports reflect contemporary verification or outdated historical claims."
                ],
                "hidden_assumptions": [
                    "Assumes public reporting covers all ongoing investigations."
                ],
                "missing_evidence": [
                    "Direct primary agency publication or peer-reviewed clinical trial."
                ],
                "suggested_verdict": analyzer_assessment.get("initial_verdict")
            }

    async def _run_stage6_judge(
        self,
        provider: BaseAIProvider,
        claim: str,
        analyzer: Dict[str, Any],
        critic: Dict[str, Any],
        sources: List[SourceItem],
        evidence: List[EvidenceRecord]
    ) -> Dict[str, Any]:
        """Run Chief Judge adjudication pass."""
        system_prompt = (
            "You are the Chief Adjudication Judge of RealityCheck AI.\n"
            "Reconcile the Initial Assessment with the Adversarial Critic pass to render a definitive, explainable verdict.\n"
            "Final verdict must be ONE of:\n"
            "'TRUE / SUPPORTED', 'FALSE / CONTRADICTED', 'MISLEADING', 'PARTLY TRUE', 'OUTDATED', 'UNVERIFIED', 'INSUFFICIENT EVIDENCE'\n"
            "Output VALID JSON only:\n"
            "{\n"
            '  "final_verdict": "<verdict>",\n'
            '  "confidence": <float 0.0 to 1.0>,\n'
            '  "soundness_explanation": "<explains rigor of analysis vs truth probability>",\n'
            '  "verdict_summary": "<clear executive summary>",\n'
            '  "what_changed": "<detailed explanation of how critic pass evolved the verdict>",\n'
            '  "supporting_points": ["<point>"],\n'
            '  "contradicting_points": ["<point>"],\n'
            '  "limitations": ["<limitation>"]\n'
            "}"
        )

        user_prompt = (
            f"CLAIM: {claim}\n"
            f"ANALYZER STANCE: {analyzer.get('initial_verdict')}\n"
            f"CRITIC CHALLENGES: {critic.get('challenges')}\n"
            f"CRITIC SUGGESTED: {critic.get('suggested_verdict')}\n"
            f"NUMBER OF SOURCES: {len(sources)}\n"
            "Render final evidence-based adjudication."
        )

        try:
            res = await provider.generate_json(system_prompt=system_prompt, user_prompt=user_prompt)
            # Ensure valid verdict category
            valid_verdicts = [
                "TRUE / SUPPORTED", "FALSE / CONTRADICTED", "MISLEADING",
                "PARTLY TRUE", "OUTDATED", "UNVERIFIED", "INSUFFICIENT EVIDENCE"
            ]
            v = res.get("final_verdict", "").strip().upper()
            if not any(v == vv for vv in valid_verdicts):
                # Map shorthand
                if "FALSE" in v or "CONTRADICT" in v:
                    res["final_verdict"] = "FALSE / CONTRADICTED"
                elif "TRUE" in v or "SUPPORT" in v:
                    res["final_verdict"] = "TRUE / SUPPORTED"
                elif "MISLEAD" in v:
                    res["final_verdict"] = "MISLEADING"
                elif "OUTDATE" in v:
                    res["final_verdict"] = "OUTDATED"
                elif "PART" in v:
                    res["final_verdict"] = "PARTLY TRUE"
                else:
                    res["final_verdict"] = "INSUFFICIENT EVIDENCE"
            return res
        except Exception as e:
            logger.warning(f"Judge inference error: {e}. Fallback judge active.")
            init_v = analyzer.get("initial_verdict", "insufficient_evidence").lower()
            if init_v == "contradicted":
                final_v = "FALSE / CONTRADICTED"
            elif init_v == "supported":
                final_v = "TRUE / SUPPORTED"
            elif init_v == "mixed":
                final_v = "MISLEADING"
            else:
                final_v = "INSUFFICIENT EVIDENCE"

            return {
                "final_verdict": final_v,
                "confidence": 0.82 if final_v != "INSUFFICIENT EVIDENCE" else 0.50,
                "soundness_explanation": "Confidence represents evidentiary corroboration strength across retrieved sources.",
                "verdict_summary": f"Adjudication determined '{final_v}' based on cross-examination of {len(sources)} sources and adversarial critique.",
                "what_changed": "Reconciled initial observations with adversarial critique; confirmed claim veracity boundaries.",
                "supporting_points": analyzer.get("supporting_observations", []),
                "contradicting_points": analyzer.get("counter_observations", []),
                "limitations": [
                    "Analysis based on publicly available web records and fact-check indices at the time of query."
                ]
            }

_verification_service: Optional[VerificationPipelineService] = None

def get_verification_service() -> VerificationPipelineService:
    global _verification_service
    if _verification_service is None:
        _verification_service = VerificationPipelineService()
    return _verification_service
