"""Tests for RealityCheck AI FastAPI endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings

@pytest.mark.asyncio
async def test_health_endpoint():
    """Verify health endpoint response."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["app"] == "RealityCheck AI"
        assert "version" in data

@pytest.mark.asyncio
async def test_providers_endpoint(mock_pipeline):
    """Verify provider status endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/providers")
        assert res.status_code == 200
        data = res.json()
        assert "local" in data
        assert "cloud" in data
        assert data["active_default"] in ["local", "cloud", "none"]

@pytest.mark.asyncio
async def test_sample_claims_endpoint():
    """Verify sample claims endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/sample-claims")
        assert res.status_code == 200
        claims = res.json()
        assert len(claims) >= 3
        for item in claims:
            assert "id" in item
            assert "claim" in item
            assert "category" in item

@pytest.mark.asyncio
async def test_claim_validation_empty_or_short():
    """Verify that claims with length < 3 or whitespace are rejected with 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Too short
        res = await client.post("/api/analyze", json={"claim": "ab"})
        assert res.status_code == 422

        # Whitespace
        res2 = await client.post("/api/analyze", json={"claim": "   "})
        assert res2.status_code == 422

@pytest.mark.asyncio
async def test_full_analysis_and_export_lifecycle(mock_pipeline):
    """Verify end-to-end analyze, history retrieve, export JSON, export HTML, and delete."""
    service, _, _ = mock_pipeline
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Analyze
        payload = {
            "claim": "Autonomous electric aircraft will achieve zero FAA safety incidents in 2026.",
            "context": "Preliminary flight testing in desert airspace completed with no major incidents.",
            "provider_preference": "auto"
        }
        res = await client.post("/api/analyze", json=payload)
        assert res.status_code == 200
        data = res.json()
        analysis_id = data["id"]
        assert analysis_id is not None
        assert data["initial_assessment"]["initial_verdict"] == "supported"
        assert data["final_judgment"]["verdict"] == "mixed"
        assert len(data["final_judgment"]["what_changed"]) > 0

        # 2. Check history
        hist_res = await client.get("/api/history")
        assert hist_res.status_code == 200
        hist_data = hist_res.json()
        assert len(hist_data) >= 1
        assert any(item["id"] == analysis_id for item in hist_data)

        # 3. Retrieve detail
        detail_res = await client.get(f"/api/history/{analysis_id}")
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["id"] == analysis_id
        assert len(detail_data["audit_steps"]) == 3

        # 4. Export JSON
        export_json = await client.get(f"/api/export/{analysis_id}?format=json")
        assert export_json.status_code == 200
        assert export_json.headers["content-type"].startswith("application/json")
        assert "realitycheck-audit-" in export_json.headers.get("content-disposition", "")

        # 5. Export HTML
        export_html = await client.get(f"/api/export/{analysis_id}?format=html")
        assert export_html.status_code == 200
        assert "text/html" in export_html.headers["content-type"]
        assert "RealityCheck AI Audit Report" in export_html.text
        assert "What Changed Through Adversarial Audit" in export_html.text

        # 6. Delete
        del_res = await client.delete(f"/api/history/{analysis_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"

        # 7. Verify 404 after deletion
        not_found_res = await client.get(f"/api/history/{analysis_id}")
        assert not_found_res.status_code == 404
