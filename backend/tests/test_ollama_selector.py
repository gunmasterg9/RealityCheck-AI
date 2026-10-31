"""Comprehensive test suite for Dynamic Local Ollama Model Selector.
Verifies model discovery, persistence, validation, switching reliability,
multimodal capability detection, pull progress, and local/cloud independence.
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
import httpx

from app.main import app
from app.config import settings
from app.services.model_config import ModelConfigService, get_model_config_service
from app.database import get_system_setting, set_system_setting, init_db
from app.providers.manager import ProviderManager, get_provider_manager
from app.providers.ollama import OllamaProvider

client = TestClient(app)

MOCK_TAGS_RESPONSE = {
    "models": [
        {
            "name": "qwen3:1.7b",
            "model": "qwen3:1.7b",
            "size": 1359293444,
            "details": {
                "family": "qwen3",
                "families": ["qwen3"],
                "parameter_size": "2.0B",
                "quantization_level": "Q4_K_M"
            },
            "capabilities": ["completion", "tools"]
        },
        {
            "name": "gemma4:e4b",
            "model": "gemma4:e4b",
            "size": 6583656505,
            "details": {
                "family": "gemma4",
                "families": ["gemma4"],
                "parameter_size": "7.5B",
                "quantization_level": "Q4_K_M"
            },
            "capabilities": ["completion", "vision", "tools"]
        },
        {
            "name": "qwen3:8b",
            "model": "qwen3:8b",
            "size": 5225388164,
            "details": {
                "family": "qwen3",
                "families": ["qwen3"],
                "parameter_size": "8.2B",
                "quantization_level": "Q4_K_M"
            },
            "capabilities": ["completion", "tools"]
        }
    ]
}

@pytest.fixture(autouse=True)
def setup_test_db(tmp_path):
    """Set up temporary database for testing settings persistence."""
    test_db = tmp_path / "test_selector.db"
    init_db(test_db)
    with patch("app.database.get_db_path", return_value=test_db), \
         patch("app.services.model_config.get_system_setting", side_effect=lambda k, d=None: get_system_setting(k, d, test_db)), \
         patch("app.services.model_config.set_system_setting", side_effect=lambda k, v: set_system_setting(k, v, test_db)):
        yield test_db

@pytest.mark.asyncio
async def test_ollama_model_discovery():
    """Verify dynamic discovery returns structured model metadata with resource tiers."""
    service = ModelConfigService()
    with patch.object(service, "get_installed_models_raw", new_callable=AsyncMock) as mock_raw:
        mock_raw.return_value = MOCK_TAGS_RESPONSE["models"]
        resp = await service.discover_models()

        assert resp.total_count == 3
        model_names = [m.name for m in resp.models]
        assert "qwen3:1.7b" in model_names
        assert "gemma4:e4b" in model_names

        # Verify Qwen 3 1.7B is classified as lightweight
        qwen_info = next(m for m in resp.models if m.name == "qwen3:1.7b")
        assert qwen_info.resource_tier == "lightweight"
        assert "Recommended for 8GB RAM" in qwen_info.resource_warning
        assert qwen_info.is_multimodal is False

        # Verify Gemma 4 E4B is classified as heavy and multimodal
        gemma_info = next(m for m in resp.models if m.name == "gemma4:e4b")
        assert gemma_info.resource_tier == "heavy"
        assert gemma_info.is_multimodal is True

@pytest.mark.asyncio
async def test_empty_model_list():
    """Verify empty tags list is handled gracefully without crashing."""
    service = ModelConfigService()
    with patch.object(service, "get_installed_models_raw", new_callable=AsyncMock) as mock_raw:
        mock_raw.return_value = []
        resp = await service.discover_models()
        assert resp.total_count == 0
        assert resp.models == []

@pytest.mark.asyncio
async def test_ollama_unavailable():
    """Verify connection failure returns informative status instead of throwing uncaught exceptions."""
    service = ModelConfigService()
    with patch.object(service, "get_ollama_version", new_callable=AsyncMock, return_value=None), \
         patch.object(service, "get_installed_models_raw", new_callable=AsyncMock, return_value=[]):
        status_resp = await service.get_status()
        assert status_resp.is_connected is False
        assert status_resp.version is None
        assert "Cannot connect to Ollama" in status_resp.details

@pytest.mark.asyncio
async def test_model_selection_and_persistence(tmp_path):
    """Verify selecting a valid model updates runtime and persists in SQLite across service recreation."""
    service = ModelConfigService()
    with patch.object(service, "get_installed_models_raw", new_callable=AsyncMock) as mock_raw:
        mock_raw.return_value = MOCK_TAGS_RESPONSE["models"]
        
        # Select gemma4:e4b
        sel_resp = await service.select_model("gemma4:e4b")
        assert sel_resp.status == "success"
        assert sel_resp.selected_model == "gemma4:e4b"
        assert sel_resp.is_multimodal is True

        # Simulate backend restart with a fresh service instance
        service_after_restart = ModelConfigService()
        active = await service_after_restart.get_active_model()
        assert active == "gemma4:e4b"

@pytest.mark.asyncio
async def test_unknown_model_rejection():
    """Verify requesting an unknown or non-installed model is rejected."""
    service = ModelConfigService()
    with patch.object(service, "get_installed_models_raw", new_callable=AsyncMock) as mock_raw:
        mock_raw.return_value = MOCK_TAGS_RESPONSE["models"]
        with pytest.raises(ValueError) as excinfo:
            await service.select_model("nonexistent_llama:99b")
        assert "is not installed" in str(excinfo.value)

@pytest.mark.asyncio
async def test_invalid_model_name_regex_rejection():
    """Verify malicious or invalid shell characters in model name are rejected."""
    service = ModelConfigService()
    with pytest.raises(ValueError):
        await service.select_model("model; rm -rf /")

@pytest.mark.asyncio
async def test_deleted_model_after_selection_safe_fallback():
    """Verify that if a selected model is removed from Ollama, discover_models safely falls back."""
    service = ModelConfigService()
    # Explicitly set stored selection to a removed model
    service._selected_model = "deleted-model:latest"
    
    with patch.object(service, "get_installed_models_raw", new_callable=AsyncMock) as mock_raw:
        mock_raw.return_value = MOCK_TAGS_RESPONSE["models"]
        resp = await service.discover_models()
        # Should safely select an available model (qwen3:1.7b)
        assert resp.selected_model == "qwen3:1.7b"
        assert any(m.is_selected for m in resp.models)

@pytest.mark.asyncio
async def test_multimodal_compatibility_detection():
    """Verify vision detection for various families and capabilities."""
    service = ModelConfigService()
    assert service._is_multimodal_model("gemma4:e4b", family="gemma4") is True
    assert service._is_multimodal_model("llava:7b", family="llama", families=["clip"]) is True
    assert service._is_multimodal_model("custom_vision", capabilities=["vision"]) is True
    assert service._is_multimodal_model("qwen3:1.7b", family="qwen3") is False
    assert service._is_multimodal_model("llama3:8b", family="llama") is False

@pytest.mark.asyncio
async def test_local_cloud_independence():
    """Verify switching local model does not mutate or affect cloud Gemini configuration."""
    pm = ProviderManager()
    initial_cloud_model = pm.cloud_provider.model_id
    
    # Switch local model
    pm.set_active_local_model("gemma4:e4b")
    assert pm.get_active_local_provider().model_id == "gemma4:e4b"
    # Cloud model remains unaffected
    assert pm.cloud_provider.model_id == initial_cloud_model

@pytest.mark.asyncio
async def test_pull_cancellation():
    """Verify pull cancellation terminates in-progress task."""
    service = ModelConfigService()
    await service.start_pull("tiny-model:latest")
    assert service.get_pull_status().status in ("pulling", "downloading")
    
    cancelled = await service.cancel_pull()
    assert cancelled is True
    assert service.get_pull_status().status == "cancelled"

def test_fastapi_ollama_endpoints():
    """Verify FastAPI routes for Ollama model management."""
    service = get_model_config_service()
    with patch.object(service, "get_installed_models_raw", new_callable=AsyncMock, return_value=MOCK_TAGS_RESPONSE["models"]), \
         patch.object(service, "get_ollama_version", new_callable=AsyncMock, return_value="0.40.13"):

        # 1. GET /api/ollama/models
        res = client.get("/api/ollama/models")
        assert res.status_code == 200
        data = res.json()
        assert data["total_count"] == 3

        # 2. GET /api/ollama/status
        res_status = client.get("/api/ollama/status")
        assert res_status.status_code == 200
        assert res_status.json()["is_connected"] is True
        assert res_status.json()["version"] == "0.40.13"

        # 3. POST /api/ollama/models/select (valid)
        res_sel = client.post("/api/ollama/models/select", json={"model": "qwen3:1.7b"})
        assert res_sel.status_code == 200
        assert res_sel.json()["selected_model"] == "qwen3:1.7b"

        # 4. POST /api/ollama/models/select (invalid)
        res_bad = client.post("/api/ollama/models/select", json={"model": "ghost_model:404"})
        assert res_bad.status_code == 400
        assert "is not installed" in res_bad.json()["detail"]
