"""FastAPI Application entry point for RealityCheck AI."""
import logging
from contextlib import asynccontextmanager
from typing import List, Optional, Literal

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

from app.config import settings
from app.database import (
    init_db,
    list_analyses,
    get_analysis_by_id,
    delete_analysis_by_id,
    save_verification_job,
    get_verification_job_by_id,
    list_verification_jobs
)
from app.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisSummaryItem,
    ProviderStatusResponse,
    SampleClaim,
    BenchmarkReport,
    VerificationRequest,
    VerifyUrlRequest,
    VerifyMessageRequest,
    VerifyImageRequest,
    VerificationJobResponse,
    ClaimReviewItem
)
from app.analyzer import get_pipeline_service, generate_printable_html_report
from app.providers.manager import get_provider_manager
from app.services.analysis_pipeline import SAMPLE_CLAIMS
from app.services.verification_pipeline import get_verification_service
from app.services.search_service import search_service
from app.benchmark import get_benchmark_report

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("realitycheck")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    logger.info("Initializing RealityCheck AI database schema...")
    init_db()
    logger.info("Database initialized successfully.")
    yield
    # Shutdown logic if needed
    logger.info("RealityCheck AI shutting down.")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Evidence-aware AI claim analysis platform that separates supplied evidence, assumptions, counterarguments, unknowns, and model limitations.",
    lifespan=lifespan
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", summary="Health check endpoint")
async def health_check():
    """Returns basic service health status."""
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment
    }

@app.get("/api/providers", response_model=ProviderStatusResponse, summary="Inspect AI provider statuses")
async def get_providers():
    """Inspect local and cloud AI provider availability and active configuration."""
    manager = get_provider_manager()
    return await manager.get_providers_status()

@app.get("/api/sample-claims", response_model=List[SampleClaim], summary="List sample claims for demonstration")
async def get_sample_claims():
    """Retrieve pre-configured sample claims highlighting varying evidentiary conditions."""
    return SAMPLE_CLAIMS

@app.get("/api/benchmark", response_model=BenchmarkReport, summary="Gemma 4 Evaluation Benchmark Report")
async def get_benchmark():
    """Retrieve Gemma 4 empirical benchmark metrics across multimodal sample claims."""
    return get_benchmark_report()

@app.post("/api/analyze", response_model=AnalysisResponse, summary="Analyze a claim through the multi-stage pipeline")
async def analyze_claim(request: AnalysisRequest):
    """
    Submits a claim for rigorous evidence-aware investigation.
    Executes:
    1. Initial Assessment against supplied context.
    2. Adversarial Self-Critique challenging the initial stance.
    3. Objective Reconciled Adjudication with what-changed diff.
    """
    service = get_pipeline_service()
    try:
        response = await service.execute_analysis(request)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except (TimeoutError, ConnectionError) as ce:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(ce))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(re))
    except Exception as e:
        logger.exception("Unexpected error during claim analysis")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Analysis pipeline error: {str(e)}")

@app.post("/api/verify", response_model=VerificationJobResponse, summary="RealityCheck AI 2.0 Universal Fact Verification")
async def verify_claim(request: VerificationRequest):
    """
    Universal Fact-Checking endpoint.
    Processes URLs, public social media, forwarded messages (Hindi/Gujarati/English),
    news articles, screenshots, and direct claims through the 6-stage evidence pipeline.
    """
    service = get_verification_service()
    try:
        response = await service.execute_verification(request)
        save_verification_job(response)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except (TimeoutError, ConnectionError) as ce:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(ce))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(re))
    except Exception as e:
        logger.exception("Unexpected error during verification")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Verification pipeline error: {str(e)}")

@app.post("/api/verify/url", response_model=VerificationJobResponse, summary="Verify content at website or article URL")
async def verify_url(request: VerifyUrlRequest):
    """Safely extracts web content with SSRF protection and verifies factual claims."""
    req = VerificationRequest(
        input_text=request.url,
        input_type="url",
        provider_preference=request.provider_preference
    )
    return await verify_claim(req)

@app.post("/api/verify/message", response_model=VerificationJobResponse, summary="Verify WhatsApp/Telegram forwarded message")
async def verify_message(request: VerifyMessageRequest):
    """Analyzes viral forwarded text messages with Hindi/Gujarati/English script detection."""
    full_text = request.message
    if request.sender_context:
        full_text = f"Context: {request.sender_context}\n\n{request.message}"
    req = VerificationRequest(
        input_text=full_text,
        input_type="message",
        provider_preference=request.provider_preference
    )
    return await verify_claim(req)

@app.post("/api/verify/image", response_model=VerificationJobResponse, summary="Verify claim from screenshot or image")
async def verify_image(request: VerifyImageRequest):
    """Multimodal claim extraction and evidence-backed verification from screenshot."""
    req = VerificationRequest(
        input_text=request.claim_hint or "Screenshot Claim Verification",
        input_type="image",
        image_data=request.image_data,
        provider_preference=request.provider_preference
    )
    return await verify_claim(req)

@app.get("/api/verify/{job_id}", summary="Get verification job by ID")
async def get_verification_job(job_id: str):
    """Retrieve full verification job details, including all 6 stages and evidence citations."""
    data = get_verification_job_by_id(job_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Verification job '{job_id}' not found.")
    return data

@app.get("/api/fact-check/search", response_model=List[ClaimReviewItem], summary="Query Google Fact Check Tools API")
async def search_fact_checks(
    query: str = Query(..., min_length=2, description="Claim or keywords to search in ClaimReview database"),
    hl: Optional[str] = Query(default=None, description="Optional language code (e.g. 'en', 'hi', 'gu')")
):
    """Direct search of Google Fact Check Tools ClaimReview database."""
    results = await search_service.search_fact_check_tools(query, language_code=hl)
    return [
        ClaimReviewItem(
            publisher=r.get("publisher", "Fact Checker"),
            rating=r.get("rating", "Unrated"),
            claim_text=r.get("claim_text", ""),
            review_url=r.get("review_url", ""),
            review_title=r.get("review_title"),
            review_date=r.get("review_date"),
            publisher_site=r.get("publisher_site"),
            source_type="official_fact_checker"
        )
        for r in results
    ]

@app.get("/api/history", summary="List recent analyses and verification jobs")
async def get_history(
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """Retrieve historical verification jobs and claim analyses sorted by timestamp descending."""
    v_jobs = list_verification_jobs(limit=limit, offset=offset)
    legacy = list_analyses(limit=limit, offset=offset)
    
    combined = []
    for v in v_jobs:
        combined.append({
            "id": v["id"],
            "claim": v["primary_claim"],
            "has_image": v.get("input_type") == "image",
            "initial_verdict": v.get("initial_verdict", "unverified"),
            "final_verdict": v.get("final_verdict", "UNVERIFIED"),
            "assessment_confidence": v.get("confidence", 0.8),
            "provider_used": v.get("provider_used", "local"),
            "model_used": v.get("model_used", "gemma4:e4b"),
            "summary": v.get("summary", ""),
            "what_changed": v.get("what_changed", ""),
            "created_at": v.get("created_at", "")
        })
    for leg in legacy:
        combined.append(leg.model_dump())
        
    combined.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return combined[:limit]

@app.get("/api/history/{analysis_id}", summary="Get full analysis or verification record")
async def get_analysis_detail(analysis_id: str):
    """Retrieve the full record for either a verification job or legacy analysis."""
    # Check verification jobs first
    v_data = get_verification_job_by_id(analysis_id)
    if v_data:
        return v_data

    # Check legacy analyses
    data = get_analysis_by_id(analysis_id)
    if data:
        return data

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Record '{analysis_id}' not found.")


@app.delete("/api/history/{analysis_id}", summary="Delete an analysis record")
async def delete_analysis(analysis_id: str):
    """Delete an analysis record and associated audit records."""
    deleted = delete_analysis_by_id(analysis_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Analysis '{analysis_id}' not found.")
    return {"status": "deleted", "id": analysis_id}

@app.get("/api/export/{analysis_id}", summary="Export analysis as JSON or printable HTML")
async def export_analysis(
    analysis_id: str,
    format: Literal["json", "html"] = Query(default="json")
):
    """Export an analysis as downloadable JSON or a clean printable HTML report."""
    data = get_analysis_by_id(analysis_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Analysis '{analysis_id}' not found.")
    
    if format == "html":
        html_content = generate_printable_html_report(data)
        return HTMLResponse(content=html_content, media_type="text/html")
    else:
        return JSONResponse(
            content=data,
            headers={
                "Content-Disposition": f'attachment; filename="realitycheck-audit-{analysis_id}.json"'
            }
        )

# Serve frontend build in production / standalone container if present
import os
from fastapi.staticfiles import StaticFiles
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

