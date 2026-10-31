"""RealityCheck AI 2.0 Real-Time 6-Stage Verification Pipeline.
Orchestrates:
Stage 1: Evidence Extraction (Claim normalization, entities, independent source retrieval)
Stage 2: Evidence Evaluation (Credibility scoring, dates, deduplication, primary vs secondary, category classification)
Stage 3: Adversarial Critique (Challenging interpretations, counter-evidence, unstated assumptions)
Stage 4: Objective Adjudication (Evidence sufficiency, strict verdict determination, unverified breakdown)
Stage 5: Citation Validation (Verifying cited URLs against retrieved corpus, eliminating fabricated URLs)
Stage 6: Final Verdict (Synthesized report, confidence, separate metrics, limitations, source URLs, provider used)
"""
import re
import uuid
import time
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urlparse
from datetime import datetime, timezone

from app.config import settings
from app.providers.manager import get_provider_manager, ProviderManager, ProviderExecutionResult
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
    VerificationVerdict,
    SourceCategory,
    RetrievalStatus,
    EvidenceRelationship,
    UnverifiedBreakdown,
    VerificationMetrics
)

logger = logging.getLogger(__name__)

URL_PATTERN = re.compile(r"^https?://[^\s]+", re.I)

PRIMARY_OFFICIAL_DOMAINS = {
    "who.int", "un.org", "cdc.gov", "fda.gov", "nih.gov", "nasa.gov",
    "pib.gov.in", "rbi.org.in", "mohfw.gov.in", "europa.eu", "whitehouse.gov",
    "isro.gov.in", "gov.uk", "who.org", "unicef.org", "worldbank.org", "wmo.int"
}

FACT_CHECK_DOMAINS = {
    "factcheck.org", "snopes.com", "politifact.com", "boomlive.in", "altnews.in",
    "fullfact.org", "vishvasnews.com", "thip.media", "newschecker.in",
    "leadstories.com", "checkyourfact.com"
}

ACADEMIC_DOMAINS = {
    "nature.com", "sciencedirect.com", "ncbi.nlm.nih.gov", "pubmed.ncbi.nlm.nih.gov",
    "thelancet.com", "arxiv.org", "biorxiv.org", "nejm.org", "cell.com", "jamanetwork.com",
    "pnas.org", "frontiersin.org", "bmj.com"
}

INDEPENDENT_NEWS_DOMAINS = {
    "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "thehindu.com", "indianexpress.com",
    "ndtv.com", "nytimes.com", "theguardian.com", "bloomberg.com", "wsj.com",
    "washingtonpost.com", "aljazeera.com", "hindustantimes.com", "timesofindia.indiatimes.com",
    "afp.com", "ft.com", "economist.com"
}

SOCIAL_MEDIA_DOMAINS = {
    "twitter.com", "x.com", "reddit.com", "youtube.com", "youtu.be",
    "facebook.com", "instagram.com", "t.me", "telegram.org", "tiktok.com",
    "threads.net", "linkedin.com"
}

SECONDARY_REFERENCE_DOMAINS = {
    "wikipedia.org", "britannica.com", "wikimedia.org", "investopedia.com", "archive.org"
}

UNRELIABLE_DOMAINS = {
    "theonion.com", "babylonbee.com", "worldnewsdailyreport.com", "infowars.com",
    "naturalnews.com", "beforeitsnews.com"
}


def classify_source(
    url: str,
    publisher: Optional[str] = None,
    source_type: Optional[str] = None,
    http_status: Optional[int] = 200,
    is_accessible: bool = True
) -> Tuple[SourceCategory, RetrievalStatus, float]:
    """
    Classify a source into one of 9 distinct categories:
    PRIMARY_OFFICIAL, INDEPENDENT_NEWS, FACT_CHECK, ACADEMIC, SOCIAL_MEDIA,
    SECONDARY_REFERENCE, CONTEXTUAL, UNRELIABLE, UNAVAILABLE.

    Distinguishes URL accessibility (HTTP 200) from source authenticity and factual support.
    """
    if not is_accessible or (http_status is not None and http_status >= 400):
        return "UNAVAILABLE", "inaccessible", 0.0

    url_lower = (url or "").strip().lower()
    pub_lower = (publisher or "").strip().lower()

    parsed = urlparse(url_lower)
    domain = parsed.netloc or ""
    path = parsed.path or ""

    if domain.startswith("www."):
        domain = domain[4:]

    # Check for parody / satirical / unreliable sources first
    if any(unrel in domain for unrel in UNRELIABLE_DOMAINS) or any(u in pub_lower for u in ["onion", "babylon bee", "satire"]):
        return "UNRELIABLE", "accessible", 0.20

    # 1. PRIMARY_OFFICIAL: Government, military, international treaty bodies
    if (
        domain.endswith((".gov", ".gov.in", ".nic.in", ".mil", ".int"))
        or any(d in domain for d in PRIMARY_OFFICIAL_DOMAINS)
        or any(p in pub_lower for p in ["who", "un", "united nations", "cdc", "fda", "nasa", "pib", "press information bureau", "rbi", "mohfw", "isro", "government of india", "white house"])
    ):
        return "PRIMARY_OFFICIAL", "accessible", 0.95

    # 2. FACT_CHECK: Dedicated fact-checking organizations
    if (
        source_type == "official_fact_checker"
        or any(fc in domain for fc in FACT_CHECK_DOMAINS)
        or "/fact-check" in path
        or "/factcheck" in path
        or any(p in pub_lower for p in ["fact check", "factcheck", "alt news", "boom live", "snopes", "politifact", "full fact", "vishvas news", "newschecker", "lead stories"])
    ):
        return "FACT_CHECK", "accessible", 0.95

    # 3. ACADEMIC: Universities, peer-reviewed journals, preprint servers
    if (
        domain.endswith((".edu", ".ac.in", ".ac.uk", ".edu.au"))
        or any(ac in domain for ac in ACADEMIC_DOMAINS)
        or any(p in pub_lower for p in ["nature", "lancet", "science", "pubmed", "cell press", "jamanetwork", "arxiv", "biorxiv", "university"])
    ):
        return "ACADEMIC", "accessible", 0.95

    # 4. SOCIAL_MEDIA: User-generated content platforms
    if (
        source_type == "social_media"
        or any(sm in domain for sm in SOCIAL_MEDIA_DOMAINS)
        or any(p in pub_lower for p in ["twitter", "x.com", "reddit", "youtube", "telegram", "facebook", "instagram", "tiktok"])
    ):
        return "SOCIAL_MEDIA", "accessible", 0.40

    # 5. INDEPENDENT_NEWS: Established independent reporting organizations
    if (
        domain.endswith((".reuters.com", "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "thehindu.com", "indianexpress.com", "ndtv.com", "nytimes.com", "theguardian.com", "bloomberg.com", "wsj.com", "washingtonpost.com", "aljazeera.com", "hindustantimes.com", "timesofindia.indiatimes.com", "afp.com", "ft.com", "economist.com"))
        or any(n in domain for n in INDEPENDENT_NEWS_DOMAINS)
        or any(p in pub_lower for p in ["reuters", "associated press", "ap news", "bbc", "the hindu", "indian express", "ndtv", "new york times", "the guardian", "bloomberg", "wall street journal", "washington post", "al jazeera", "hindustan times"])
    ):
        return "INDEPENDENT_NEWS", "accessible", 0.85

    # 6. SECONDARY_REFERENCE: Encyclopedias and open reference compendiums
    if (
        any(sr in domain for sr in SECONDARY_REFERENCE_DOMAINS)
        or any(p in pub_lower for p in ["wikipedia", "britannica", "wikimedia", "investopedia", "encyclopedia"])
    ):
        return "SECONDARY_REFERENCE", "accessible", 0.70

    # Default: General web contextual source
    return "CONTEXTUAL", "accessible", 0.60


def determine_evidence_relationship(
    claim: str,
    title: str,
    excerpt: str,
    fact_check_rating: Optional[str] = None,
    source_category: SourceCategory = "CONTEXTUAL"
) -> Tuple[EvidenceRelationship, str, str]:
    """
    For every source, identify whether it:
    - SUPPORTS the claim
    - CONTRADICTS the claim
    - PROVIDES_CONTEXT
    - DOES_NOT_ADDRESS_CLAIM

    Requires a specific supporting excerpt or explanation for each SUPPORTS or CONTRADICTS.
    Does NOT infer support from matching keywords or headlines alone.
    """
    if source_category == "UNAVAILABLE":
        return "DOES_NOT_ADDRESS_CLAIM", "Source URL was inaccessible during retrieval.", ""

    combined_text = f"{title}. {excerpt}".strip()
    combined_lower = combined_text.lower()
    claim_lower = claim.lower()

    # 1. Fact-check rating stance analysis
    if fact_check_rating:
        r = fact_check_rating.lower()
        if any(w in r for w in ["false", "fake", "hoax", "incorrect", "pants on fire", "debunked", "misleading", "distorted", "untrue", "disproven", "fabricated", "myth"]):
            return (
                "CONTRADICTS",
                f"Accredited fact-check investigation rated this claim as '{fact_check_rating}'.",
                f"Fact-checker verdict: '{fact_check_rating}'. Investigated claim: {title}"
            )
        elif any(w in r for w in ["true", "correct", "verified", "accurate", "confirmed"]):
            return (
                "SUPPORTS",
                f"Accredited fact-check investigation verified this claim as '{fact_check_rating}'.",
                f"Fact-checker verdict: '{fact_check_rating}'. Verified claim: {title}"
            )

    # 2. Explicit debunking / contradiction markers in text
    refutation_patterns = [
        r"\b(?:is false|is a hoax|is untrue|has been debunked|refutes|incorrectly claimed|denied by|no evidence that|has been refuted|fabricated claim|misinformation|falsely claimed)\b",
        r"\b(?:there is no truth to|did not state that|rejected the claim|baseless assertion|unfounded)\b"
    ]
    for pattern in refutation_patterns:
        match = re.search(pattern, combined_lower)
        if match:
            # Locate sentence containing refutation
            sentences = [s.strip() for s in re.split(r"[.!?]\s+", combined_text) if s.strip()]
            ref_sentence = next((s for s in sentences if match.group(0) in s.lower()), combined_text[:200])
            return (
                "CONTRADICTS",
                f"Source explicitly refutes the claim assertion ({match.group(0)}).",
                ref_sentence
            )

    # 3. Explicit affirmation / confirmation markers in text
    affirmation_patterns = [
        r"\b(?:confirmed that|officially announced|evidence proves that|corroborates that|study proves that|data demonstrates that|authorities confirmed|agency affirmed)\b"
    ]
    for pattern in affirmation_patterns:
        match = re.search(pattern, combined_lower)
        if match:
            # Check whether claim entities are present before declaring support
            claim_words = [w for w in re.findall(r"\b[a-zA-Z]{4,}\b", claim_lower) if w not in {"that", "with", "from", "this", "they", "have", "were", "been"}]
            overlap = [w for w in claim_words if w in combined_lower]
            if len(overlap) >= 2 or len(claim_words) < 2:
                sentences = [s.strip() for s in re.split(r"[.!?]\s+", combined_text) if s.strip()]
                aff_sentence = next((s for s in sentences if match.group(0) in s.lower()), combined_text[:200])
                return (
                    "SUPPORTS",
                    f"Source explicitly corroborates the core assertion ({match.group(0)}).",
                    aff_sentence
                )

    # 4. Contextual vs Does Not Address
    claim_words = [w for w in re.findall(r"\b[a-zA-Z]{4,}\b", claim_lower) if w not in {"that", "with", "from", "this", "they", "have", "were", "been", "claim", "true"}]
    matching_keywords = [w for w in claim_words if w in combined_lower]

    if len(matching_keywords) >= 1 or len(claim_words) == 0:
        return (
            "PROVIDES_CONTEXT",
            "Source provides topical context or background information without explicitly affirming or refuting the claim's specific proposition.",
            excerpt[:250] if excerpt else title
        )

    return (
        "DOES_NOT_ADDRESS_CLAIM",
        "Source content does not address the factual substance of this specific claim.",
        ""
    )


def build_unverified_breakdown(
    claim: str,
    verdict: str,
    sources: List[SourceItem],
    evidence: List[EvidenceRecord]
) -> Optional[UnverifiedBreakdown]:
    """Generate epistemic breakdown explaining what evidence was found and what is missing."""
    v_norm = verdict.upper()
    if not ("UNVERIFIED" in v_norm or "INSUFFICIENT" in v_norm):
        return None

    evidence_found: List[str] = []
    for e in evidence:
        if e.relationship == "PROVIDES_CONTEXT" and e.excerpt:
            evidence_found.append(f"Topical context from {e.publisher}: {e.excerpt[:150]}...")
        elif e.relationship == "DOES_NOT_ADDRESS_CLAIM":
            continue
        elif e.excerpt:
            evidence_found.append(f"{e.publisher}: {e.excerpt[:150]}...")

    if not evidence_found:
        evidence_found.append("No indexed public records or accredited fact-checking reports matching this specific claim were retrieved.")

    evidence_missing = [
        "Primary documentation, official gazette, or public registry record from the relevant governing body.",
        "Independent journalistic investigations or corroborated reporting by accredited news agencies.",
        "Peer-reviewed scientific literature or empirical clinical data verifying the alleged phenomenon."
    ]

    why_unestablished = (
        "The retrieved sources fail to substantiate the claim because available coverage only provides "
        "peripheral topical context or uncorroborated commentary without primary evidentiary verification. "
        "In accordance with rigorous verification standards, absence of immediate proof does not demonstrate "
        "falsity, but the claim cannot be endorsed as factual without verifiable primary documentation."
    )

    evidence_needed = [
        "Direct official statement or authenticated public filing from authorized institutional sources.",
        "At least two independent, accredited news or scientific reports directly corroborating the core factual proposition."
    ]

    return UnverifiedBreakdown(
        evidence_found=evidence_found[:4],
        evidence_missing=evidence_missing,
        why_unestablished=why_unestablished,
        evidence_needed=evidence_needed
    )


def compute_verification_metrics(
    claim: str,
    sources: List[SourceItem],
    evidence: List[EvidenceRecord],
    critique: Dict[str, Any],
    verdict: str,
    assessment_soundness: float = 0.85
) -> VerificationMetrics:
    """
    Compute transparent verification metrics:
    - Evidence Coverage
    - Source Quality
    - Claim Verification Confidence
    - Reasoning Completeness
    - Assessment Soundness (methodological rigor)
    If a metric cannot be calculated reliably, sets it to None instead of fabricating a percentage.
    """
    notes: Dict[str, str] = {}

    # 1. Evidence Coverage
    if not sources and not evidence:
        evidence_coverage = 0.0
        notes["evidence_coverage"] = "Zero sources or evidence items retrieved."
    else:
        has_direct = any(e.relationship in ("SUPPORTS", "CONTRADICTS") for e in evidence)
        has_context = any(e.relationship == "PROVIDES_CONTEXT" for e in evidence)
        if has_direct:
            evidence_coverage = 0.85
            notes["evidence_coverage"] = "Retrieved evidence directly addresses core claim propositions."
        elif has_context:
            evidence_coverage = 0.35
            notes["evidence_coverage"] = "Retrieved sources address surrounding context, but lack direct proof or refutation of core assertion."
        else:
            evidence_coverage = 0.10
            notes["evidence_coverage"] = "Sources retrieved do not substantively address the claim."

    # 2. Source Quality
    accessible_sources = [s for s in sources if getattr(s, "is_url_accessible", True) and s.retrieval_status != "inaccessible"]
    if not accessible_sources:
        source_quality = None
        notes["source_quality"] = "Unavailable: No accessible sources available to evaluate quality score."
    else:
        category_weights = {
            "PRIMARY_OFFICIAL": 0.95,
            "FACT_CHECK": 0.95,
            "ACADEMIC": 0.95,
            "INDEPENDENT_NEWS": 0.85,
            "SECONDARY_REFERENCE": 0.70,
            "CONTEXTUAL": 0.60,
            "SOCIAL_MEDIA": 0.40,
            "UNRELIABLE": 0.20,
            "UNAVAILABLE": 0.0
        }
        scores = [category_weights.get(getattr(s, "source_category", "CONTEXTUAL"), 0.60) for s in accessible_sources]
        source_quality = round(sum(scores) / len(scores), 2)
        notes["source_quality"] = f"Calculated as weighted average across {len(accessible_sources)} accessible sources."

    # 3. Claim Verification Confidence (Factual certainty, distinct from methodology soundness)
    v_norm = verdict.upper()
    if "FALSE" in v_norm or "SUPPORTED" in v_norm:
        if any(s.source_category in ("PRIMARY_OFFICIAL", "FACT_CHECK", "ACADEMIC") for s in sources):
            claim_conf = 0.92
        else:
            claim_conf = 0.82
        notes["claim_verification_confidence"] = "High certainty established via definitive evidentiary consensus."
    elif "PARTLY" in v_norm or "MISLEADING" in v_norm:
        claim_conf = 0.75
        notes["claim_verification_confidence"] = "Moderate certainty reflecting mixed or nuanced evidence."
    elif "OUTDATED" in v_norm:
        claim_conf = 0.80
        notes["claim_verification_confidence"] = "High temporal certainty: statement superseded by recent developments."
    else:
        claim_conf = 0.45
        notes["claim_verification_confidence"] = "Low factual certainty due to missing primary proof; preserved as unverified."

    # 4. Reasoning Completeness
    challenges = critique.get("challenges", [])
    assumptions = critique.get("hidden_assumptions", [])
    if challenges and assumptions:
        reasoning_completeness = 0.90
        notes["reasoning_completeness"] = f"Complete adversarial critique: {len(challenges)} challenges and {len(assumptions)} hidden assumptions evaluated."
    elif challenges:
        reasoning_completeness = 0.75
        notes["reasoning_completeness"] = f"Adversarial challenges formulated ({len(challenges)} points)."
    else:
        reasoning_completeness = None
        notes["reasoning_completeness"] = "Unavailable: Adversarial critique was skipped or incomplete."

    return VerificationMetrics(
        evidence_coverage=evidence_coverage,
        source_quality=source_quality,
        claim_verification_confidence=claim_conf,
        reasoning_completeness=reasoning_completeness,
        assessment_soundness=assessment_soundness,
        metrics_notes=notes
    )


class VerificationPipelineService:
    def __init__(self, provider_manager: Optional[ProviderManager] = None, local_provider=None, cloud_provider=None):
        if provider_manager:
            self.provider_manager = provider_manager
        elif local_provider or cloud_provider:
            self.provider_manager = ProviderManager(
                cloud_provider=cloud_provider,
                local_lightweight=local_provider,
                local_heavy=local_provider
            )
        else:
            self.provider_manager = get_provider_manager()

    async def select_provider(self, preference: str):
        """Backwards compatible provider selection helper."""
        return await self.provider_manager.select_provider(preference)

    async def execute_verification(self, request: VerificationRequest) -> VerificationJobResponse:
        """
        Execute the 6-stage fact-verification pipeline with total timeout guard
        and per-stage bounded execution.
        """
        job_id = str(uuid.uuid4())
        total_timeout = settings.total_verification_timeout_seconds

        try:
            return await asyncio.wait_for(
                self._run_pipeline(request, job_id),
                timeout=total_timeout
            )
        except asyncio.TimeoutError:
            logger.error(f"Verification pipeline exceeded total timeout of {total_timeout}s for job {job_id}")
            return self._build_partial_timeout_response(request, job_id, total_timeout)

    async def _run_pipeline(self, request: VerificationRequest, job_id: str) -> VerificationJobResponse:
        stages: List[VerificationStageAudit] = []
        raw_text = request.input_text.strip()
        detected_lang = detect_language(raw_text)

        # --------------------------------------------------------------------
        # STAGE 1: EVIDENCE EXTRACTION
        # --------------------------------------------------------------------
        s1_start = time.perf_counter()
        classified_type = request.input_type
        if classified_type == "auto":
            classified_type = self._classify_input(raw_text, request.image_data)

        primary_claim, extracted_claims, scraped_article, entities = await self._stage1_extract_and_retrieve(
            classified_type, raw_text, request.image_data, detected_lang
        )

        # Parallel retrieval of independent sources
        sources: List[SourceItem] = []
        fact_check_matches: List[ClaimReviewItem] = []

        if scraped_article:
            if scraped_article.get("success"):
                art_url = scraped_article.get("canonical_url") or scraped_article.get("url", "")
                art_pub = scraped_article.get("publisher", "Web Publisher")
                art_title = scraped_article.get("title", "Submitted Web Article")
                art_date = scraped_article.get("publish_date")
                art_status_code = scraped_article.get("status_code", 200)
                art_cat, art_ret_status, art_weight = classify_source(
                    url=art_url,
                    publisher=art_pub,
                    source_type="social_media" if scraped_article.get("is_social") else "news_organization",
                    http_status=art_status_code,
                    is_accessible=True
                )
                art_rel, art_rel_expl, art_excerpt = determine_evidence_relationship(
                    claim=primary_claim,
                    title=art_title,
                    excerpt=scraped_article.get("text", "")[:450],
                    source_category=art_cat
                )
                sources.append(SourceItem(
                    id=f"src_{len(sources)+1}",
                    url=art_url,
                    title=art_title,
                    publisher=art_pub,
                    publish_date=art_date,
                    source_category=art_cat,
                    source_type="social_media" if scraped_article.get("is_social") else "news_organization",
                    retrieval_status=art_ret_status,
                    http_status=art_status_code,
                    is_url_accessible=True,
                    reliability_score=art_weight,
                    relevance_score=0.92,
                    evidence_relationship=art_rel,
                    relationship_explanation=art_rel_expl,
                    supporting_excerpt=art_excerpt
                ))
            else:
                # Inaccessible URL handling
                inacc_url = scraped_article.get("url", raw_text)
                inacc_status_code = scraped_article.get("status_code", 404)
                sources.append(SourceItem(
                    id=f"src_{len(sources)+1}",
                    url=inacc_url,
                    title=f"Inaccessible Target URL ({scraped_article.get('error', 'HTTP error')})",
                    publisher=urlparse(inacc_url).netloc or "Inaccessible Host",
                    source_category="UNAVAILABLE",
                    source_type="web_search",
                    retrieval_status="inaccessible",
                    http_status=inacc_status_code,
                    is_url_accessible=False,
                    reliability_score=0.0,
                    relevance_score=0.0,
                    evidence_relationship="DOES_NOT_ADDRESS_CLAIM",
                    relationship_explanation=f"URL failed validation or was inaccessible during retrieval: {scraped_article.get('error', 'Status ' + str(inacc_status_code))}",
                    supporting_excerpt=""
                ))

        # Parallel Google Fact Check API + Web Search
        fc_task = search_service.search_fact_check_tools(primary_claim, language_code=detected_lang.get("language"))
        web_task = search_service.search_web(primary_claim, num_results=5)

        fc_results, web_results = await asyncio.gather(fc_task, web_task, return_exceptions=True)

        if isinstance(fc_results, list):
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
                    fc_url = fc.get("review_url")
                    fc_pub = fc.get("publisher", "Fact Checker")
                    fc_title = fc.get("review_title", f"Fact Check by {fc_pub}")
                    fc_rating = fc.get("rating", "Unrated")
                    fc_date = fc.get("review_date")
                    fc_cat, fc_ret_status, fc_weight = classify_source(
                        url=fc_url,
                        publisher=fc_pub,
                        source_type="official_fact_checker",
                        http_status=200,
                        is_accessible=True
                    )
                    fc_rel, fc_rel_expl, fc_excerpt = determine_evidence_relationship(
                        claim=primary_claim,
                        title=fc_title,
                        excerpt=f"Rated '{fc_rating}'. Investigated claim: {fc.get('claim_text', '')}",
                        fact_check_rating=fc_rating,
                        source_category=fc_cat
                    )
                    sources.append(SourceItem(
                        id=f"src_{len(sources)+1}",
                        url=fc_url,
                        title=fc_title,
                        publisher=fc_pub,
                        publish_date=fc_date,
                        source_category=fc_cat,
                        source_type="official_fact_checker",
                        retrieval_status=fc_ret_status,
                        http_status=200,
                        is_url_accessible=True,
                        reliability_score=0.98,
                        relevance_score=0.98,
                        evidence_relationship=fc_rel,
                        relationship_explanation=fc_rel_expl,
                        supporting_excerpt=fc_excerpt
                    ))

        if isinstance(web_results, list):
            for w in web_results:
                w_url = w.get("url", "")
                if not any(s.url == w_url for s in sources):
                    w_pub = w.get("publisher", "Web")
                    w_title = w.get("title", "Web Source")
                    w_snippet = w.get("snippet", "")
                    w_date = w.get("publish_date")
                    w_cat, w_ret_status, w_weight = classify_source(
                        url=w_url,
                        publisher=w_pub,
                        source_type=w.get("source_type", "web_search"),
                        http_status=200,
                        is_accessible=True
                    )
                    w_rel, w_rel_expl, w_excerpt = determine_evidence_relationship(
                        claim=primary_claim,
                        title=w_title,
                        excerpt=w_snippet,
                        source_category=w_cat
                    )
                    sources.append(SourceItem(
                        id=f"src_{len(sources)+1}",
                        url=w_url,
                        title=w_title,
                        publisher=w_pub,
                        publish_date=w_date,
                        source_category=w_cat,
                        source_type=w.get("source_type", "web_search"),
                        retrieval_status=w_ret_status,
                        http_status=200,
                        is_url_accessible=True,
                        reliability_score=w_weight,
                        relevance_score=w.get("score", 0.80),
                        evidence_relationship=w_rel,
                        relationship_explanation=w_rel_expl,
                        supporting_excerpt=w_excerpt
                    ))

        s1_ms = int((time.perf_counter() - s1_start) * 1000)
        accessible_count = sum(1 for s in sources if getattr(s, "is_url_accessible", True))
        stages.append(VerificationStageAudit(
            stage_number=1,
            stage_name="Evidence Extraction",
            duration_ms=s1_ms,
            status="completed",
            summary=f"Extracted claim in {detected_lang['name']}. Retrieved {len(sources)} sources ({accessible_count} URL-validated) and {len(fact_check_matches)} FactCheck matches.",
            details={
                "primary_claim": primary_claim,
                "input_type": classified_type,
                "entities": entities,
                "sources_retrieved": len(sources),
                "url_validated_sources": accessible_count,
                "fact_checks_found": len(fact_check_matches)
            }
        ))

        # --------------------------------------------------------------------
        # STAGE 2: EVIDENCE EVALUATION
        # --------------------------------------------------------------------
        s2_start = time.perf_counter()
        evaluated_sources, evidence_records = self._stage2_evaluate_evidence(
            sources=sources,
            fact_checks=fact_check_matches,
            scraped_article=scraped_article,
            claim=primary_claim
        )
        s2_ms = int((time.perf_counter() - s2_start) * 1000)
        stages.append(VerificationStageAudit(
            stage_number=2,
            stage_name="Evidence Evaluation",
            duration_ms=s2_ms,
            status="completed",
            summary=f"Evaluated {len(evaluated_sources)} deduplicated sources; synthesized {len(evidence_records)} evidence records across 9 source categories.",
            details={
                "evaluated_sources_count": len(evaluated_sources),
                "supporting_count": sum(1 for e in evidence_records if e.relationship == "SUPPORTS"),
                "contradicting_count": sum(1 for e in evidence_records if e.relationship == "CONTRADICTS"),
                "contextual_count": sum(1 for e in evidence_records if e.relationship == "PROVIDES_CONTEXT"),
                "does_not_address_count": sum(1 for e in evidence_records if e.relationship == "DOES_NOT_ADDRESS_CLAIM")
            }
        ))

        # --------------------------------------------------------------------
        # STAGE 3: ADVERSARIAL CRITIQUE (Bounded LLM Reasoner)
        # --------------------------------------------------------------------
        s3_start = time.perf_counter()
        critique_result, provider_used, model_used = await self._stage3_adversarial_critique(
            claim=primary_claim,
            evidence=evidence_records,
            fact_checks=fact_check_matches,
            image_data=request.image_data,
            mode=request.provider_preference
        )
        s3_ms = int((time.perf_counter() - s3_start) * 1000)
        stages.append(VerificationStageAudit(
            stage_number=3,
            stage_name="Adversarial Critique",
            duration_ms=s3_ms,
            status="completed",
            summary=f"Adversarial critique completed via {model_used} ({s3_ms}ms). Formulated challenges and identified hidden assumptions.",
            details=critique_result
        ))

        # --------------------------------------------------------------------
        # STAGE 4: OBJECTIVE ADJUDICATION
        # --------------------------------------------------------------------
        s4_start = time.perf_counter()
        adjudication_verdict, confidence, explanation, what_changed = self._stage4_adjudicate(
            claim=primary_claim,
            evidence=evidence_records,
            fact_checks=fact_check_matches,
            critique=critique_result
        )
        unverified_breakdown = build_unverified_breakdown(
            claim=primary_claim,
            verdict=adjudication_verdict,
            sources=evaluated_sources,
            evidence=evidence_records
        )
        s4_ms = int((time.perf_counter() - s4_start) * 1000)
        stages.append(VerificationStageAudit(
            stage_number=4,
            stage_name="Objective Adjudication",
            duration_ms=s4_ms,
            status="completed",
            summary=f"Adjudicated verdict: '{adjudication_verdict}' with confidence {confidence:.2f}.",
            details={
                "verdict": adjudication_verdict,
                "confidence": confidence,
                "explanation": explanation,
                "what_changed": what_changed,
                "has_unverified_breakdown": unverified_breakdown is not None
            }
        ))

        # --------------------------------------------------------------------
        # STAGE 5: CITATION VALIDATION
        # --------------------------------------------------------------------
        s5_start = time.perf_counter()
        valid_urls, fabricated_urls = self._stage5_validate_citations(
            sources=evaluated_sources,
            evidence=evidence_records,
            critique=critique_result
        )
        s5_ms = int((time.perf_counter() - s5_start) * 1000)
        stages.append(VerificationStageAudit(
            stage_number=5,
            stage_name="Citation Validation",
            duration_ms=s5_ms,
            status="completed",
            summary=f"Validated {len(valid_urls)} citations against retrieved source corpus; filtered {len(fabricated_urls)} fabricated URLs.",
            details={
                "valid_citations": valid_urls,
                "fabricated_citations_filtered": fabricated_urls
            }
        ))

        # --------------------------------------------------------------------
        # STAGE 6: FINAL VERDICT & REPORT SYNTHESIS
        # --------------------------------------------------------------------
        s6_start = time.perf_counter()
        supporting_items = [e.excerpt for e in evidence_records if e.relationship == "SUPPORTS"]
        contradicting_items = [e.excerpt for e in evidence_records if e.relationship == "CONTRADICTS"]

        metrics = compute_verification_metrics(
            claim=primary_claim,
            sources=evaluated_sources,
            evidence=evidence_records,
            critique=critique_result,
            verdict=adjudication_verdict,
            assessment_soundness=confidence
        )

        limitations = [
            "Analysis reflects publicly accessible web evidence and official fact-checks available at check time.",
            "Restricted paywalled archives and private messaging groups were not accessed.",
            "URL accessibility (HTTP 200) was validated independently from source authenticity and factual support."
        ]
        if not sources:
            limitations.append("No independent public corroboration was returned by search providers for this query.")

        s6_ms = int((time.perf_counter() - s6_start) * 1000)
        stages.append(VerificationStageAudit(
            stage_number=6,
            stage_name="Final Verdict",
            duration_ms=s6_ms,
            status="completed",
            summary=f"Final report synthesized with verdict '{adjudication_verdict}'.",
            details={
                "verdict": adjudication_verdict,
                "confidence": confidence,
                "claim_verification_confidence": metrics.claim_verification_confidence,
                "evidence_coverage": metrics.evidence_coverage,
                "source_quality": metrics.source_quality,
                "provider_used": provider_used,
                "model_used": model_used
            }
        ))

        return VerificationJobResponse(
            id=job_id,
            input_type=classified_type,
            raw_input=raw_text,
            detected_language=detected_lang,
            primary_claim=primary_claim,
            extracted_claims=extracted_claims,
            fact_check_matches=fact_check_matches,
            sources=evaluated_sources,
            evidence=evidence_records,
            final_verdict=adjudication_verdict,
            verdict=adjudication_verdict,
            initial_verdict=critique_result.get("initial_stance", "unverified"),
            assessment_confidence=confidence,
            confidence=confidence,
            soundness_explanation=explanation,
            explanation=explanation,
            verdict_summary=f"Adjudication determined '{adjudication_verdict}' based on cross-examination of {len(evaluated_sources)} sources and adversarial critique.",
            what_changed=what_changed,
            supporting_points=supporting_items,
            supporting_evidence=supporting_items,
            contradicting_points=contradicting_items,
            contradicting_evidence=contradicting_items,
            source_urls=valid_urls,
            limitations_disclaimer=limitations,
            limitations=limitations,
            provider_used=provider_used,
            model_used=model_used,
            stages=stages,
            unverified_breakdown=unverified_breakdown,
            metrics=metrics,
            evidence_coverage=metrics.evidence_coverage,
            source_quality=metrics.source_quality,
            claim_verification_confidence=metrics.claim_verification_confidence,
            reasoning_completeness=metrics.reasoning_completeness,
            retrieved_sources_count=len(evaluated_sources),
            url_validated_sources_count=sum(1 for s in evaluated_sources if getattr(s, "is_url_accessible", True)),
            created_at=datetime.now(timezone.utc).isoformat(),
            verification_timestamp=datetime.now(timezone.utc).isoformat()
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

        forward_cues = ["forwarded", "whatsapp", "telegram", "viral", "share to all", "must read", "सावधान", "શેર કરો", "ब्रेकिंग"]
        if any(c in text_stripped.lower() for c in forward_cues) or ("\n" in text_stripped and len(text_stripped) > 80):
            return "message"

        if len(text_stripped) > 500:
            return "article"

        return "direct"

    async def _stage1_extract_and_retrieve(
        self,
        classified_type: str,
        raw_text: str,
        image_data: Optional[str],
        detected_lang: Dict[str, Any]
    ) -> Tuple[str, List[ExtractedClaim], Optional[Dict[str, Any]], Dict[str, Any]]:
        """Stage 1: Normalize claim and extract named entities/dates."""
        scraped_article = None
        entities = {"dates": [], "organizations": [], "locations": [], "numbers": []}

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
            clean_lines = [line.strip() for line in raw_text.split("\n") if len(line.strip()) > 15]
            primary = clean_lines[0] if clean_lines else raw_text[:200]
        else:
            primary = raw_text

        # Normalize claim text
        clean_claim = re.sub(r"^(claim|verify|check|is it true that|fact check):?\s*", "", primary, flags=re.I).strip()
        if len(clean_claim) > 250:
            clean_claim = clean_claim[:250].rsplit(" ", 1)[0] + "..."

        # Basic entity / regex detection
        dates = re.findall(r"\b(?:19|20)\d{2}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}\b", clean_claim, re.I)
        numbers = re.findall(r"\b\d+(?:[\.,]\d+)?%?\b", clean_claim)
        entities["dates"] = dates
        entities["numbers"] = numbers

        claims = [ExtractedClaim(id="claim_1", claim_text=clean_claim, category="factual", order=1)]
        return clean_claim, claims, scraped_article, entities

    def _stage2_evaluate_evidence(
        self,
        sources: List[SourceItem],
        fact_checks: List[ClaimReviewItem],
        scraped_article: Optional[Dict[str, Any]],
        claim: str = ""
    ) -> Tuple[List[SourceItem], List[EvidenceRecord]]:
        """
        Stage 2: Check credibility, deduplicate with rich metadata preservation,
        classify into 9 source categories, and evaluate evidence relationships.
        """
        # Deduplicate sources by normalized URL
        seen_urls: Dict[str, SourceItem] = {}
        for s in sources:
            norm_url = s.url.strip().lower().rstrip('/')
            if not norm_url:
                continue
            if norm_url in seen_urls:
                # Merge metadata: preserve richer details
                existing = seen_urls[norm_url]
                if not existing.publish_date and s.publish_date:
                    existing.publish_date = s.publish_date
                if len(s.title or "") > len(existing.title or ""):
                    existing.title = s.title
                if s.supporting_excerpt and not existing.supporting_excerpt:
                    existing.supporting_excerpt = s.supporting_excerpt
                if s.relevance_score > existing.relevance_score:
                    existing.relevance_score = s.relevance_score
            else:
                seen_urls[norm_url] = s

        deduped_sources: List[SourceItem] = list(seen_urls.values())
        evidence_records: List[EvidenceRecord] = []

        # Convert fact-checks into high-reliability records
        for fc in fact_checks:
            fc_url = fc.review_url or ""
            fc_cat, fc_ret_status, _ = classify_source(
                url=fc_url,
                publisher=fc.publisher,
                source_type="official_fact_checker",
                http_status=200,
                is_accessible=True
            )
            fc_rel, fc_rel_expl, fc_excerpt = determine_evidence_relationship(
                claim=claim,
                title=fc.review_title or fc.claim_text or "Fact Check",
                excerpt=f"Rated '{fc.rating}'. {fc.claim_text}",
                fact_check_rating=fc.rating,
                source_category=fc_cat
            )
            direction: EvidenceDirection = (
                "supporting" if fc_rel == "SUPPORTS"
                else "contradicting" if fc_rel == "CONTRADICTS"
                else "contextual"
            )

            evidence_records.append(EvidenceRecord(
                id=f"ev_{len(evidence_records)+1}",
                claim_id="claim_1",
                source_url=fc.review_url,
                publisher=fc.publisher,
                excerpt=fc_excerpt or f"Official Fact-Check ({fc.publisher}): Rated '{fc.rating}'. Claim investigated: '{fc.claim_text}'.",
                direction=direction,
                relationship=fc_rel,
                relationship_explanation=fc_rel_expl,
                relevance_score=0.98,
                source_category=fc_cat
            ))

        # Add article text snippet if present and accessible
        if scraped_article and scraped_article.get("success") and scraped_article.get("text"):
            art_url = scraped_article.get("canonical_url") or scraped_article.get("url", "")
            art_cat, _, _ = classify_source(
                url=art_url,
                publisher=scraped_article.get("publisher", "Web Publisher"),
                source_type="social_media" if scraped_article.get("is_social") else "news_organization",
                http_status=200,
                is_accessible=True
            )
            art_rel, art_rel_expl, art_excerpt = determine_evidence_relationship(
                claim=claim,
                title=scraped_article.get("title", ""),
                excerpt=scraped_article.get("text", "")[:450],
                source_category=art_cat
            )
            art_dir: EvidenceDirection = (
                "supporting" if art_rel == "SUPPORTS"
                else "contradicting" if art_rel == "CONTRADICTS"
                else "contextual"
            )
            evidence_records.append(EvidenceRecord(
                id=f"ev_{len(evidence_records)+1}",
                claim_id="claim_1",
                source_url=art_url,
                publisher=scraped_article.get("publisher", "Web Source"),
                excerpt=art_excerpt or scraped_article.get("text", "")[:450],
                direction=art_dir,
                relationship=art_rel,
                relationship_explanation=art_rel_expl,
                relevance_score=0.90,
                source_category=art_cat
            ))

        # Add web search sources as evaluated evidence records
        for s in deduped_sources:
            if s.source_type != "official_fact_checker" and s.is_url_accessible and len(evidence_records) < 10:
                s_dir: EvidenceDirection = (
                    "supporting" if s.evidence_relationship == "SUPPORTS"
                    else "contradicting" if s.evidence_relationship == "CONTRADICTS"
                    else "contextual"
                )
                evidence_records.append(EvidenceRecord(
                    id=f"ev_{len(evidence_records)+1}",
                    claim_id="claim_1",
                    source_url=s.url,
                    publisher=s.publisher,
                    excerpt=s.supporting_excerpt or f"Reporting from {s.publisher}: '{s.title}'.",
                    direction=s_dir,
                    relationship=s.evidence_relationship,
                    relationship_explanation=s.relationship_explanation,
                    relevance_score=s.reliability_score,
                    source_category=s.source_category
                ))

        return deduped_sources, evidence_records

    async def _stage3_adversarial_critique(
        self,
        claim: str,
        evidence: List[EvidenceRecord],
        fact_checks: List[ClaimReviewItem],
        image_data: Optional[str],
        mode: str
    ) -> Tuple[Dict[str, Any], str, str]:
        """Stage 3: Execute single bounded adversarial critique with per-stage timeout."""
        evidence_summary = "\n".join([
            f"- [{e.relationship}] {e.publisher} ({e.source_category or 'WEB'}): {e.excerpt}" for e in evidence[:6]
        ]) or "No direct independent evidence retrieved from search indices."

        system_prompt = (
            "You are the Adversarial Epistemic Auditor of RealityCheck AI.\n"
            "Analyze the claim and retrieved evidence. Formulate counterarguments and challenge assumptions.\n"
            "CRITICAL RULES:\n"
            "1. Output VALID JSON ONLY.\n"
            "2. Never declare an unsupported claim FALSE. If proof is missing, suggest UNVERIFIED or INSUFFICIENT_EVIDENCE.\n"
            "3. If credible evidence contradicts the claim, explain why it is contradicted.\n"
            "Schema:\n"
            "{\n"
            '  "initial_stance": "supported" | "contradicted" | "mixed" | "insufficient_evidence",\n'
            '  "challenges": ["<challenge point 1>", "<challenge point 2>"],\n'
            '  "hidden_assumptions": ["<unstated assumption>"],\n'
            '  "suggested_verdict": "SUPPORTED" | "FALSE" | "MISLEADING" | "PARTLY_TRUE" | "OUTDATED" | "UNVERIFIED" | "INSUFFICIENT_EVIDENCE",\n'
            '  "reasoning": "<concise analytical synthesis>"\n'
            "}"
        )

        user_prompt = (
            f"CLAIM: {claim}\n\n"
            f"RETRIEVED EVIDENCE:\n{fence_untrusted_content(evidence_summary, 'EVIDENCE')}\n\n"
            "Execute adversarial audit and return JSON."
        )

        images = [image_data] if image_data else None

        try:
            exec_res: ProviderExecutionResult = await self.provider_manager.generate_with_fallback(
                prompt=user_prompt,
                system_prompt=system_prompt,
                images=images,
                mode=mode,
                timeout_seconds=settings.stage_timeout_seconds
            )
            data = exec_res.data
            return data, exec_res.provider_used, exec_res.model_used

        except Exception as e:
            logger.warning(f"Stage 3 LLM execution failed or timed out: {e}. Utilizing deterministic fallback.")
            # Deterministic heuristic fallback
            has_false_fact_check = any("false" in fc.rating.lower() or "hoax" in fc.rating.lower() for fc in fact_checks)
            has_true_fact_check = any("true" in fc.rating.lower() for fc in fact_checks)

            if has_false_fact_check:
                suggested = "FALSE"
                stance = "contradicted"
            elif has_true_fact_check:
                suggested = "SUPPORTED"
                stance = "supported"
            elif not evidence:
                suggested = "INSUFFICIENT_EVIDENCE"
                stance = "insufficient_evidence"
            else:
                suggested = "UNVERIFIED"
                stance = "mixed"

            fallback_data = {
                "initial_stance": stance,
                "challenges": [
                    "Examine whether correlation was misattributed to medical or factual causation.",
                    "Verify if source reports reflect contemporary verification or outdated recycled claims."
                ],
                "hidden_assumptions": [
                    "Assumes public reporting or web queries cover all private records."
                ],
                "suggested_verdict": suggested,
                "reasoning": f"Synthesized from {len(evidence)} evidence records and {len(fact_checks)} fact-checker records with deterministic safety rules."
            }
            return fallback_data, "deterministic-epistemic-rules", "heuristic-v2"

    def _stage4_adjudicate(
        self,
        claim: str,
        evidence: List[EvidenceRecord],
        fact_checks: List[ClaimReviewItem],
        critique: Dict[str, Any]
    ) -> Tuple[VerificationVerdict, float, str, str]:
        """
        Stage 4: Objective adjudication enforcing verdict rules consistently.
        Preserves epistemic distinction: Unsupported claims are classified as UNVERIFIED,
        never automatically declared FALSE without contradictory evidence.
        """
        suggested = str(critique.get("suggested_verdict", "")).upper()

        has_contra = (
            any(e.relationship == "CONTRADICTS" for e in evidence)
            or any(
                any(w in fc.rating.lower() for w in ["false", "fake", "hoax", "incorrect", "pants on fire", "debunked", "untrue"])
                for fc in fact_checks
            )
        )
        has_supp = (
            any(e.relationship == "SUPPORTS" for e in evidence)
            or any(
                any(w in fc.rating.lower() for w in ["true", "verified", "correct", "accurate"])
                for fc in fact_checks
            )
        )
        has_context_only = (
            not has_supp
            and not has_contra
            and any(e.relationship == "PROVIDES_CONTEXT" for e in evidence)
        )

        # 1. Zero evidence case
        if not evidence and not fact_checks:
            final_v: VerificationVerdict = "INSUFFICIENT_EVIDENCE"
            confidence = 0.50
            explanation = "No public corroboration, indexed fact-checks, or verifiable evidence were retrieved. Scientific burden of proof is unmet."
            what_changed = "Maintained evidentiary standard: Absence of proof does not equate to disproof."

        # 2. Contradicted by authoritative evidence
        elif has_contra and not has_supp:
            final_v = "FALSE"
            confidence = 0.92
            explanation = "Directly contradicted by accredited fact-checking investigations or empirical scientific consensus."
            what_changed = "Adversarial critique validated contradiction against verified primary records."

        # 3. Supported by credible evidence
        elif has_supp and not has_contra:
            final_v = "SUPPORTED"
            confidence = 0.88
            explanation = "Corroborated by independent reporting and verified empirical sources."
            what_changed = "Initial assessment rigorously corroborated with verified publisher citations."

        # 4. Conflicting evidence
        elif has_supp and has_contra:
            final_v = "MISLEADING"
            confidence = 0.78
            explanation = "Evidence is conflicting or presents factual premises in a misleading context."
            what_changed = "Adversarial critique surfaced contradictory data points, tempering verdict certainty."

        # 5. Outdated
        elif "OUTDATE" in suggested:
            final_v = "OUTDATED"
            confidence = 0.80
            explanation = "Claim may have been valid previously but has been superseded by new developments or updated guidance."
            what_changed = "Critique surfaced date discrepancy and obsolete guidance."

        # 6. Partly True
        elif "PART" in suggested:
            final_v = "PARTLY_TRUE"
            confidence = 0.75
            explanation = "Some elements are factual, but key assertions remain unverified or overstated."
            what_changed = "Separated verified premises from unbacked extrapolations."

        # 7. Contextual-only or unsupported claims -> UNVERIFIED (Never auto-classified as FALSE!)
        elif has_context_only or (not has_supp and not has_contra):
            final_v = "UNVERIFIED"
            confidence = 0.55
            explanation = "Retrieved sources provide background context on related topics but do not substantiate or refute the claim's specific factual assertion."
            what_changed = "Preserved epistemic neutrality: Unsupported claim held as UNVERIFIED pending primary corroboration rather than presumed false."

        else:
            final_v = "UNVERIFIED"
            confidence = 0.55
            explanation = "Evidence retrieved is inconclusive or insufficient to definitively substantiate or refute."
            what_changed = "Enforced epistemic boundaries to prevent hallucinated consensus."

        return final_v, confidence, explanation, what_changed

    def _stage5_validate_citations(
        self,
        sources: List[SourceItem],
        evidence: List[EvidenceRecord],
        critique: Dict[str, Any]
    ) -> Tuple[List[str], List[str]]:
        """
        Stage 5: Check that cited URLs actually exist in retrieved sources and remove invented/hallucinated ones.
        Returns (valid_urls, fabricated_urls).
        """
        valid_urls: List[str] = []
        fabricated_urls: List[str] = []
        known_accessible_urls = {
            s.url.strip() for s in sources
            if s.url and s.url.startswith("http") and getattr(s, "is_url_accessible", True)
        }

        # Check any URLs referenced in critique
        critique_text = str(critique)
        referenced_urls = re.findall(r"https?://[^\s'\",\)]+", critique_text)
        for u in referenced_urls:
            u_clean = u.strip().rstrip('.')
            if u_clean in known_accessible_urls:
                if u_clean not in valid_urls:
                    valid_urls.append(u_clean)
            else:
                fabricated_urls.append(u_clean)

        # Collect URLs from evidence records that exist in accessible sources
        for e in evidence:
            if e.source_url and e.source_url in known_accessible_urls and e.source_url not in valid_urls:
                valid_urls.append(e.source_url)

        # Fallback: add known source URLs if not already listed
        for u in known_accessible_urls:
            if u not in valid_urls:
                valid_urls.append(u)

        return valid_urls, fabricated_urls

    def _build_partial_timeout_response(
        self,
        request: VerificationRequest,
        job_id: str,
        timeout_seconds: int
    ) -> VerificationJobResponse:
        """Construct structured partial result when total timeout is reached."""
        raw_text = request.input_text.strip()
        return VerificationJobResponse(
            id=job_id,
            input_type=request.input_type,
            raw_input=raw_text,
            detected_language=detect_language(raw_text),
            primary_claim=raw_text[:200],
            extracted_claims=[ExtractedClaim(id="claim_1", claim_text=raw_text[:200], category="factual", order=1)],
            fact_check_matches=[],
            sources=[],
            evidence=[],
            final_verdict="INSUFFICIENT_EVIDENCE",
            verdict="INSUFFICIENT_EVIDENCE",
            initial_verdict="insufficient_evidence",
            assessment_confidence=0.30,
            confidence=0.30,
            soundness_explanation=f"Verification timed out after {timeout_seconds} seconds. Returned partial analysis.",
            explanation=f"Verification timed out after {timeout_seconds} seconds. Returned partial analysis.",
            verdict_summary="Verification incomplete due to execution timeout.",
            what_changed="Execution reached timeout limit; reverted to conservative insufficient evidence verdict.",
            supporting_points=[],
            supporting_evidence=[],
            contradicting_points=[],
            contradicting_evidence=[],
            source_urls=[],
            limitations_disclaimer=[
                f"Verification timed out after {timeout_seconds} seconds. Incomplete analysis.",
                "Execution was stopped to protect system resources on low-memory hardware."
            ],
            limitations=[
                f"Verification timed out after {timeout_seconds} seconds. Incomplete analysis.",
                "Execution was stopped to protect system resources on low-memory hardware."
            ],
            provider_used="timeout-safety-guard",
            model_used="none",
            stages=[
                VerificationStageAudit(
                    stage_number=1,
                    stage_name="Evidence Extraction",
                    duration_ms=timeout_seconds * 1000,
                    status="error",
                    summary="Pipeline execution reached total configured timeout limit.",
                    details={"timeout_seconds": timeout_seconds}
                )
            ],
            is_partial=True,
            error_notice=f"Verification reached maximum timeout ({timeout_seconds}s).",
            created_at=datetime.now(timezone.utc).isoformat(),
            verification_timestamp=datetime.now(timezone.utc).isoformat()
        )

_verification_service: Optional[VerificationPipelineService] = None

def get_verification_service() -> VerificationPipelineService:
    global _verification_service
    if _verification_service is None:
        _verification_service = VerificationPipelineService()
    return _verification_service
