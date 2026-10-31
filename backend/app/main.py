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
    delete_analysis_by_id
)
from app.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisSummaryItem,
    ProviderStatusResponse,
    SampleClaim
)
from app.analyzer import get_pipeline_service, generate_printable_html_report
from app.services.analysis_pipeline import SAMPLE_CLAIMS

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
    service = get_pipeline_service()
    return await service.get_providers_status()

@app.get("/api/sample-claims", response_model=List[SampleClaim], summary="List sample claims for demonstration")
async def get_sample_claims():
    """Retrieve pre-configured sample claims highlighting varying evidentiary conditions."""
    return SAMPLE_CLAIMS

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

@app.get("/api/history", response_model=List[AnalysisSummaryItem], summary="List recent analyses")
async def get_history(
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """Retrieve historical claim analyses ordered by timestamp descending."""
    return list_analyses(limit=limit, offset=offset)

@app.get("/api/history/{analysis_id}", summary="Get full analysis record")
async def get_analysis_detail(analysis_id: str):
    """Retrieve the full analysis details and audit steps for a given ID."""
    data = get_analysis_by_id(analysis_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Analysis '{analysis_id}' not found.")
    return data

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
