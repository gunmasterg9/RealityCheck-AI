"""Tests for SQLite database persistence and repository functions."""
import pytest
from app.database import (
    init_db,
    save_analysis,
    get_analysis_by_id,
    list_analyses,
    delete_analysis_by_id
)
from app.schemas import (
    AnalysisResponse,
    InitialAssessment,
    AdversarialCritique,
    FinalJudgment,
    AnalysisAuditStep
)

def test_init_db_and_save_analysis(temp_db):
    """Verify that tables are created, data persists, and can be retrieved."""
    response = AnalysisResponse(
        id="test-analysis-123",
        claim="Cold lemon water cures metabolic syndrome.",
        context="A wellness blog claims lemon water resets the liver.",
        provider_used="local",
        model_used="gemma4:e4b",
        initial_assessment=InitialAssessment(
            initial_verdict="insufficient_evidence",
            confidence=0.4,
            initial_reasoning="No biological mechanism or peer-reviewed citation provided.",
            evidence_items=[],
            potential_weaknesses=["Anecdotal claim"]
        ),
        adversarial_critique=AdversarialCritique(
            challenges=["Liver function does not require citrus reset."],
            hidden_assumptions=["Assumes natural equates to therapeutic."],
            missing_evidence_required=["Double-blind RCT"],
            critique_summary="Critique firmly challenges metabolic cure claim.",
            suggested_revision="contradicted"
        ),
        final_judgment=FinalJudgment(
            verdict="contradicted",
            assessment_confidence=0.88,
            confidence_explanation="High confidence in evidentiary deficit analysis; not a guarantee of every physiological interaction.",
            summary="Claim of curing metabolic resistance is contradicted by medical consensus.",
            what_changed="Shifted from insufficient evidence to contradicted following adversarial audit of physiological claims.",
            support_evidence=[],
            counter_evidence=["No clinical basis for citrus organ reset"],
            assumptions=["Wellness blog credibility"],
            unknowns=["Individual dietary tolerance"],
            limitations=["External clinical trials were not queried via live internet."]
        ),
        audit_steps=[
            AnalysisAuditStep(step_name="initial_assessment", duration_ms=120, input_summary={"has_context": True}, output_data={"verdict": "insufficient_evidence"}),
            AnalysisAuditStep(step_name="adversarial_critique", duration_ms=110, input_summary={}, output_data={}),
            AnalysisAuditStep(step_name="final_judgment", duration_ms=140, input_summary={}, output_data={})
        ]
    )

    save_analysis(response, db_path=temp_db)

    # Fetch back
    loaded = get_analysis_by_id("test-analysis-123", db_path=temp_db)
    assert loaded is not None
    assert loaded["id"] == "test-analysis-123"
    assert loaded["claim"] == response.claim
    assert loaded["final_judgment"]["verdict"] == "contradicted"
    assert loaded["final_judgment"]["assessment_confidence"] == 0.88
    assert len(loaded["audit_steps"]) == 3

    # Test list_analyses
    history = list_analyses(limit=10, offset=0, db_path=temp_db)
    assert len(history) == 1
    assert history[0].id == "test-analysis-123"
    assert history[0].initial_verdict == "insufficient_evidence"
    assert history[0].final_verdict == "contradicted"

    # Test deletion
    deleted = delete_analysis_by_id("test-analysis-123", db_path=temp_db)
    assert deleted is True
    assert get_analysis_by_id("test-analysis-123", db_path=temp_db) is None
    assert len(list_analyses(limit=10, db_path=temp_db)) == 0

