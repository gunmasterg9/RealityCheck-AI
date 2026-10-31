"""Tests for the multi-stage analysis pipeline and provider selection."""
import pytest
from app.schemas import AnalysisRequest
from app.services.analysis_pipeline import AnalysisPipelineService
from tests.conftest import MockProvider

@pytest.mark.asyncio
async def test_full_pipeline_success(temp_db):
    """Verify that all 3 stages run, capture audit steps, and calculate what changed."""
    local_mock = MockProvider(name="local", model_id="gemma4:e4b", is_healthy=True)
    cloud_mock = MockProvider(name="cloud", model_id="gemini-2.5-flash", is_healthy=True)
    service = AnalysisPipelineService(local_provider=local_mock, cloud_provider=cloud_mock)

    req = AnalysisRequest(
        claim="Quantum system solved optimization 100,000x faster than supercomputers.",
        context="Synthetic benchmark test on 128-qubit system; real-world replication pending.",
        provider_preference="auto"
    )

    result = await service.execute_analysis(req)

    assert result.id is not None
    assert result.claim == req.claim
    assert result.context == req.context
    assert result.initial_assessment.initial_verdict == "supported"
    assert result.adversarial_critique.suggested_revision == "mixed"
    assert result.final_judgment.verdict == "mixed"
    assert "what_changed" in result.final_judgment.model_dump()
    assert len(result.final_judgment.what_changed) > 10
    assert "confidence_explanation" in result.final_judgment.model_dump()
    assert len(result.audit_steps) == 3
    assert result.audit_steps[0].step_name == "initial_assessment"
    assert result.audit_steps[1].step_name == "adversarial_critique"
    assert result.audit_steps[2].step_name == "final_judgment"
    assert result.provider_used == "local (auto-selected)"

@pytest.mark.asyncio
async def test_pipeline_fallback_on_corrupt_json(temp_db):
    """Verify that corrupt or invalid model JSON does not crash the pipeline, invoking safe fallbacks."""
    failing_provider = MockProvider(name="local", model_id="gemma4:e4b", is_healthy=True, should_fail_json=True)
    service = AnalysisPipelineService(local_provider=failing_provider)

    req = AnalysisRequest(
        claim="Regular green tea consumption prevents all cardiovascular ailments.",
        context=None,
        provider_preference="local"
    )

    result = await service.execute_analysis(req)

    assert result.id is not None
    # Context was None, so fallback initial verdict should default to insufficient_evidence
    assert result.initial_assessment.initial_verdict == "insufficient_evidence"
    assert result.final_judgment.verdict == "insufficient_evidence"
    assert len(result.final_judgment.limitations) > 0

@pytest.mark.asyncio
async def test_provider_selection_auto_fallback(temp_db):
    """Verify auto mode falls back to cloud when local is down and cloud is ready."""
    local_down = MockProvider(name="local", model_id="gemma4:e4b", is_healthy=False)
    cloud_ready = MockProvider(name="cloud", model_id="gemini-2.5-flash", is_healthy=True)
    service = AnalysisPipelineService(local_provider=local_down, cloud_provider=cloud_ready)

    provider, label = await service.select_provider("auto")
    assert provider.name == "cloud"
    assert label == "cloud (auto-fallback)"

@pytest.mark.asyncio
async def test_explicit_local_never_falls_back_to_cloud(temp_db):
    """Verify explicit 'local' mode raises error when local is down, rather than silently routing to cloud."""
    local_down = MockProvider(name="local", model_id="gemma4:e4b", is_healthy=False)
    cloud_ready = MockProvider(name="cloud", model_id="gemini-2.5-flash", is_healthy=True)
    service = AnalysisPipelineService(local_provider=local_down, cloud_provider=cloud_ready)

    with pytest.raises(RuntimeError) as exc_info:
        await service.select_provider("local")
    
    assert "Local provider" in str(exc_info.value)
    assert "is not available" in str(exc_info.value)

@pytest.mark.asyncio
async def test_explicit_cloud_fails_when_unavailable(temp_db):
    """Verify explicit 'cloud' mode raises clear error when cloud is down."""
    local_ready = MockProvider(name="local", model_id="gemma4:e4b", is_healthy=True)
    cloud_down = MockProvider(name="cloud", model_id="gemini-2.5-flash", is_healthy=False)
    service = AnalysisPipelineService(local_provider=local_ready, cloud_provider=cloud_down)

    with pytest.raises(RuntimeError) as exc_info:
        await service.select_provider("cloud")

    assert "Cloud provider" in str(exc_info.value)
    assert "is not available" in str(exc_info.value)

@pytest.mark.asyncio
async def test_auto_fails_when_both_unavailable(temp_db):
    """Verify informative error when both local and cloud providers are down."""
    local_down = MockProvider(name="local", model_id="gemma4:e4b", is_healthy=False)
    cloud_down = MockProvider(name="cloud", model_id="gemini-2.5-flash", is_healthy=False)
    service = AnalysisPipelineService(local_provider=local_down, cloud_provider=cloud_down)

    with pytest.raises(RuntimeError) as exc_info:
        await service.select_provider("auto")

    assert "No inference providers are currently available" in str(exc_info.value)

