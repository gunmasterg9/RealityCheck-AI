"""Pytest fixtures for RealityCheck AI."""
import pytest
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional

from app.config import settings
from app.database import init_db
from app.providers.base import BaseAIProvider
from app.schemas import ProviderDetail
from app.services.analysis_pipeline import AnalysisPipelineService
from app.analyzer import get_pipeline_service
import app.analyzer as analyzer_mod

class MockProvider(BaseAIProvider):
    def __init__(
        self,
        name: str = "local",
        model_id: str = "mock-model",
        is_healthy: bool = True,
        canned_responses: Optional[Dict[str, Any]] = None,
        should_fail_json: bool = False,
        error_to_raise: Optional[Exception] = None
    ):
        self._name = name
        self._model_id = model_id
        self._is_healthy = is_healthy
        self.canned_responses = canned_responses or {}
        self.should_fail_json = should_fail_json
        self.error_to_raise = error_to_raise
        self.call_history = []

    @property
    def name(self) -> str:
        return self._name

    @property
    def model_id(self) -> str:
        return self._model_id

    async def check_health(self) -> ProviderDetail:
        return ProviderDetail(
            name=self._name,
            model_id=self._model_id,
            status="ready" if self._is_healthy else "unavailable",
            is_available=self._is_healthy,
            details="Mock provider operational" if self._is_healthy else "Mock provider offline"
        )

    async def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        self.call_history.append({"prompt": prompt, "system_prompt": system_prompt})
        if self.error_to_raise:
            raise self.error_to_raise

        if self.should_fail_json:
            raise ValueError("Invalid JSON from model")

        # Return canned response based on system prompt or stage
        if system_prompt and "Initial Evidence Assessor" in system_prompt:
            return self.canned_responses.get("initial", {
                "initial_verdict": "supported",
                "confidence": 0.85,
                "initial_reasoning": "Mock initial reasoning indicates strong alignment with text.",
                "evidence_items": [
                    {
                        "type": "support",
                        "statement": "Supplied context directly confirms the test metric.",
                        "claim_relevance": "Direct confirmation",
                        "source_basis": "supplied_context",
                        "confidence_impact": "increases_support"
                    }
                ],
                "potential_weaknesses": ["Relies on single source text."]
            })
        elif system_prompt and "Adversarial Skeptic" in system_prompt:
            return self.canned_responses.get("critique", {
                "challenges": [
                    "Context sample size is insufficient to generalize.",
                    "Potential conflict of interest in self-reported press release."
                ],
                "hidden_assumptions": [
                    "Assumes synthetic benchmark transfers to production workloads."
                ],
                "missing_evidence_required": [
                    "Independent audit report by external third party."
                ],
                "critique_summary": "Initial assessment overlooked synthetic benchmark limitation.",
                "suggested_revision": "mixed"
            })
        elif system_prompt and "Chief RealityCheck Judge" in system_prompt:
            return self.canned_responses.get("judge", {
                "verdict": "mixed",
                "assessment_confidence": 0.80,
                "confidence_explanation": "Confidence in analysis is high given provided text; does not equate to verified ground truth.",
                "summary": "Reconciled evaluation: While the metric was reported, it only applies to synthetic benchmarks.",
                "what_changed": "Adversarial critique highlighted benchmark limitation, shifting initial supported verdict to mixed.",
                "support_evidence": ["Reported speedup on synthetic test"],
                "counter_evidence": ["Lack of real-world generalization"],
                "assumptions": ["Synthetic parity with real workflows"],
                "unknowns": ["Replication by independent parties"],
                "limitations": ["External live internet search was not performed."]
            })

        return {"status": "default_mock"}

@pytest.fixture
def temp_db(tmp_path: Path):
    """Fixture to provide a clean SQLite DB for each test."""
    db_file = tmp_path / "test_realitycheck.db"
    old_db_path = settings.sqlite_db_path
    settings.sqlite_db_path = str(db_file)
    init_db(db_file)
    yield db_file
    settings.sqlite_db_path = old_db_path

@pytest.fixture
def mock_pipeline(temp_db):
    """Fixture providing a pipeline service wired with MockProviders."""
    local_mock = MockProvider(name="local", model_id="mock-gemma4", is_healthy=True)
    cloud_mock = MockProvider(name="cloud", model_id="mock-gemini", is_healthy=True)
    service = AnalysisPipelineService(local_provider=local_mock, cloud_provider=cloud_mock)
    
    # Patch singleton
    analyzer_mod._pipeline_service = service
    yield service, local_mock, cloud_mock
    analyzer_mod._pipeline_service = None
