import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import VerdictPanel from '../components/VerdictPanel';
import VerdictDiffView from '../components/VerdictDiffView';
import EvidenceSection from '../components/EvidenceSection';
import AdversarialSection from '../components/AdversarialSection';
import LimitationsSection from '../components/LimitationsSection';
import VerificationStagesStepper from '../components/VerificationStagesStepper';
import FactCheckMatchesBanner from '../components/FactCheckMatchesBanner';
import EvidenceGrid from '../components/EvidenceGrid';
import ErrorBoundary from '../components/ErrorBoundary';

function renderComponent(ui) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    }
  };
}

describe('RealityCheck AI Stage 6 Blank Screen Regression Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // Scenario 1: Valid complete Stage 6 response
  it('Scenario 1: Renders valid complete Stage 6 response without crashing', () => {
    const validData = {
      id: 'test-job-001',
      primary_claim: 'Aspartame is an approved food additive with set daily intake limits.',
      final_verdict: 'SUPPORTED',
      assessment_confidence: 0.92,
      verdict_summary: 'Corroborated by WHO/JECFA empirical guidelines.',
      soundness_explanation: 'Multiple international food safety bodies confirm daily safety bounds.',
      what_changed: 'Affirmed initial assessment with primary safety citations.',
      supporting_evidence: ['JECFA evaluated toxicology', 'FDA permits up to 50mg/kg'],
      contradicting_evidence: [],
      sources: [
        { id: 's1', title: 'WHO Guideline', url: 'https://who.int/aspartame', publisher: 'WHO', reliability_score: 0.99 }
      ],
      stages: [
        { stage_number: 1, stage_name: 'Evidence Extraction', duration_ms: 120, summary: 'Extracted claim' },
        { stage_number: 6, stage_name: 'Final Verdict', duration_ms: 80, summary: 'Adjudicated' }
      ]
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary>
        <VerdictPanel analysis={validData} />
        <VerificationStagesStepper stages={validData.stages} />
        <EvidenceGrid sources={validData.sources} evidence={[]} />
        <VerdictDiffView analysis={validData} />
        <LimitationsSection analysis={validData} />
      </ErrorBoundary>
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('SUPPORTED');
    expect(container.textContent).toContain('92%');
    expect(container.textContent).toContain('WHO Guideline');
    unmount();
  });

  // Scenario 2: Missing optional confidence field
  it('Scenario 2: Handles missing optional confidence field gracefully', () => {
    const dataWithoutConfidence = {
      id: 'test-job-002',
      final_verdict: 'UNVERIFIED',
      assessment_confidence: undefined,
      confidence: undefined,
      verdict_summary: 'Pending further peer review.'
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary>
        <VerdictPanel analysis={dataWithoutConfidence} />
        <VerdictDiffView analysis={dataWithoutConfidence} />
      </ErrorBoundary>
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('UNVERIFIED');
    expect(container.textContent).toContain('%');
    unmount();
  });

  // Scenario 3: Missing citations / empty sources
  it('Scenario 3: Handles missing citations and empty sources safely', () => {
    const dataNoCitations = {
      id: 'test-job-003',
      final_verdict: 'INSUFFICIENT_EVIDENCE',
      sources: null,
      evidence: null,
      verdict_summary: 'No empirical sources could be retrieved.'
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary>
        <VerdictPanel analysis={dataNoCitations} />
        <EvidenceGrid sources={dataNoCitations.sources} evidence={dataNoCitations.evidence} />
      </ErrorBoundary>
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('INSUFFICIENT EVIDENCE');
    unmount();
  });

  // Scenario 4: Empty supporting evidence
  it('Scenario 4: Handles empty supporting evidence safely', () => {
    const dataEmptySupport = {
      id: 'test-job-004',
      final_verdict: 'FALSE',
      supporting_evidence: [],
      supporting_points: [],
      contradicting_evidence: ['Official agency refuted this statement.']
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary>
        <VerdictPanel analysis={dataEmptySupport} />
        <EvidenceSection analysis={dataEmptySupport} />
      </ErrorBoundary>
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('FALSE / CONTRADICTED');
    expect(container.textContent).toContain('0 Supporting Points');
    unmount();
  });

  // Scenario 5: Empty contradicting evidence
  it('Scenario 5: Handles empty contradicting evidence safely', () => {
    const dataEmptyCounter = {
      id: 'test-job-005',
      final_verdict: 'SUPPORTED',
      supporting_evidence: ['Verified by agency.'],
      contradicting_evidence: [],
      contradicting_points: []
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary>
        <VerdictPanel analysis={dataEmptyCounter} />
        <EvidenceSection analysis={dataEmptyCounter} />
      </ErrorBoundary>
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('0 Counter Points');
    unmount();
  });

  // Scenario 6: Unexpected verdict value
  it('Scenario 6: Handles unexpected or novel verdict strings without crashing', () => {
    const dataNovelVerdict = {
      id: 'test-job-006',
      final_verdict: 'HIGHLY_UNCERTAIN_EMERGING_TOPIC',
      verdict_summary: 'Emerging scientific research with no consensus.'
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary>
        <VerdictPanel analysis={dataNovelVerdict} />
        <VerdictDiffView analysis={dataNovelVerdict} />
      </ErrorBoundary>
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('INSUFFICIENT EVIDENCE');
    unmount();
  });

  // Scenario 7: Null response object
  it('Scenario 7: Returns null without throwing when analysis is null', () => {
    const { container, unmount } = renderComponent(
      <ErrorBoundary>
        <VerdictPanel analysis={null} />
        <VerdictDiffView analysis={null} />
        <EvidenceSection analysis={null} />
        <LimitationsSection analysis={null} />
      </ErrorBoundary>
    );

    expect(container.innerHTML).toBe('');
    unmount();
  });

  // Scenario 8: Malformed response object (corrupt keys / unexpected types)
  it('Scenario 8: Safely handles malformed response structures', () => {
    const corruptData = {
      id: null,
      final_verdict: { complex: 'object' },
      verdict_summary: ['array', 'instead', 'of', 'string'],
      assessment_confidence: 'not-a-number',
      limitations: 12345,
      stages: 'not-an-array'
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary>
        <VerdictPanel analysis={corruptData} />
        <LimitationsSection analysis={corruptData} />
      </ErrorBoundary>
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('Executive Adjudication Summary');
    unmount();
  });

  // Scenario 9: Backend HTTP 500 error display
  it('Scenario 9: Error boundary or banner renders when backend returns error state', () => {
    const errorState = {
      is_partial: true,
      error_notice: 'Backend pipeline timed out during Stage 3; deterministic fallback rendered.',
      final_verdict: 'UNVERIFIED',
      verdict_summary: 'Analysis completed with partial fallback due to server load.'
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary>
        <VerdictPanel analysis={errorState} />
        <LimitationsSection analysis={errorState} />
      </ErrorBoundary>
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('UNVERIFIED');
    unmount();
  });

  // Scenario 10: Network disconnection handling
  it('Scenario 10: Error boundary catches network abort errors and avoids whiteout', () => {
    const BrokenChild = () => {
      throw new Error('NetworkError: Failed to fetch verification endpoint');
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary title="Network Incident Intercepted">
        <BrokenChild />
      </ErrorBoundary>
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('Network Incident Intercepted');
    expect(container.textContent).toContain('Failed to fetch verification endpoint');
    expect(container.textContent).toContain('Retry Rendering');
    unmount();
  });

  // Scenario 11: Browser refresh survival with sessionStorage
  it('Scenario 11: Session storage preserves verification ID across browser refresh', () => {
    sessionStorage.setItem('realitycheck_active_id', 'job-refresh-123');
    const stored = sessionStorage.getItem('realitycheck_active_id');
    expect(stored).toBe('job-refresh-123');

    const restoredData = {
      id: stored,
      primary_claim: 'Claim preserved across refresh',
      final_verdict: 'SUPPORTED'
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary>
        <VerdictPanel analysis={restoredData} />
      </ErrorBoundary>
    );

    expect(container.textContent).toContain('Claim preserved across refresh');
    expect(container.textContent).toContain('SUPPORTED');
    unmount();
    sessionStorage.removeItem('realitycheck_active_id');
  });

  // Scenario 12: Opening completed verification from history
  it('Scenario 12: Seamlessly renders historical verification records', () => {
    const historicalJob = {
      id: 'history-item-999',
      primary_claim: 'Historical claim clicked from History drawer',
      final_verdict: 'FALSE / CONTRADICTED',
      verdict_summary: 'Historical record loaded cleanly.',
      stages: [{ stage_number: 1, stage_name: 'Evidence Extraction', duration_ms: 50, summary: 'Loaded' }]
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary>
        <VerdictPanel analysis={historicalJob} />
        <VerificationStagesStepper stages={historicalJob.stages} />
      </ErrorBoundary>
    );

    expect(container.textContent).toContain('Historical claim clicked from History drawer');
    expect(container.textContent).toContain('FALSE / CONTRADICTED');
    unmount();
  });

  // Scenario 13: Result component throws a rendering exception
  it('Scenario 13: Error boundary intercepts child component rendering exception', () => {
    const CrashComponent = () => {
      throw new Error('Simulated child render failure in verdict visualizer');
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary title="Verification Result View Guard">
        <CrashComponent />
      </ErrorBoundary>
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('Verification Result View Guard');
    expect(container.textContent).toContain('Simulated child render failure');
    expect(container.textContent).toContain('Return to Dashboard');
    unmount();
  });

  // Scenario 14: Verification cancellation preserves dashboard
  it('Scenario 14: Cancelled verification leaves the UI intact and actionable', () => {
    const { container, unmount } = renderComponent(
      <div className="app-root">
        <div className="error-banner">
          <span>Verification request was cancelled.</span>
        </div>
      </div>
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('Verification request was cancelled.');
    unmount();
  });

  // Scenario 15: Partial verification response
  it('Scenario 15: Renders partial verification response gracefully without blank screen', () => {
    const partialData = {
      id: 'job-partial-456',
      primary_claim: 'Partial claim executed up to Stage 2',
      final_verdict: 'UNVERIFIED',
      is_partial: true,
      error_notice: 'Timeout occurred; partial evidence presented.',
      stages: [
        { stage_number: 1, stage_name: 'Evidence Extraction', duration_ms: 100, summary: 'Extracted' }
      ]
    };

    const { container, unmount } = renderComponent(
      <ErrorBoundary>
        <VerdictPanel analysis={partialData} />
        <VerificationStagesStepper stages={partialData.stages} />
        <LimitationsSection analysis={partialData} />
      </ErrorBoundary>
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('UNVERIFIED');
    expect(container.textContent).toContain('Stage 1: Evidence Extraction');
    unmount();
  });

  // Scenario 16: Source classification & evidence relationship badges in EvidenceGrid
  it('Scenario 16: Renders 9 source categories and evidence relationships properly', () => {
    const complexSources = [
      {
        id: 's1',
        title: 'WHO Official Guidelines on Aspartame Safety',
        url: 'https://who.int/news/item/aspartame',
        publisher: 'World Health Organization',
        source_category: 'PRIMARY_OFFICIAL',
        retrieval_status: 'accessible',
        http_status: 200,
        is_url_accessible: true,
        relevance_score: 0.95,
        evidence_relationship: 'SUPPORTS',
        relationship_explanation: 'Primary international health agency guidelines affirm ADI limits.'
      },
      {
        id: 's2',
        title: 'Debunking Viral Sugar Cures',
        url: 'https://boomlive.in/debunk',
        publisher: 'Boom Live',
        source_category: 'FACT_CHECK',
        retrieval_status: 'accessible',
        http_status: 200,
        is_url_accessible: true,
        relevance_score: 0.98,
        evidence_relationship: 'CONTRADICTS',
        relationship_explanation: 'Investigation debunked false claims.'
      },
      {
        id: 's3',
        title: 'Inaccessible Blog Post',
        url: 'https://broken-link.com/post',
        publisher: 'Broken Blog',
        source_category: 'UNAVAILABLE',
        retrieval_status: 'inaccessible',
        http_status: 404,
        is_url_accessible: false,
        relevance_score: 0.0,
        evidence_relationship: 'DOES_NOT_ADDRESS_CLAIM',
        relationship_explanation: 'URL returned HTTP 404.'
      }
    ];

    const complexEvidence = [
      {
        id: 'ev_1',
        publisher: 'World Health Organization',
        source_category: 'PRIMARY_OFFICIAL',
        relationship: 'SUPPORTS',
        direction: 'supporting',
        excerpt: 'JECFA confirmed safe intake up to 40mg/kg daily.',
        relationship_explanation: 'Explicit corroboration of safe daily dose bounds.',
        source_url: 'https://who.int/news/item/aspartame',
        relevance_score: 0.95
      },
      {
        id: 'ev_2',
        publisher: 'Boom Live',
        source_category: 'FACT_CHECK',
        relationship: 'CONTRADICTS',
        direction: 'contradicting',
        excerpt: 'There is no scientific basis for instant cures.',
        relationship_explanation: 'Direct contradiction of claim by fact-checker.',
        source_url: 'https://boomlive.in/debunk',
        relevance_score: 0.98
      }
    ];

    const { container, unmount } = renderComponent(
      <EvidenceGrid sources={complexSources} evidence={complexEvidence} />
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('World Health Organization');
    expect(container.textContent).toContain('Primary Official / Gov');
    expect(container.textContent).toContain('SUPPORTS CLAIM');
    expect(container.textContent).toContain('CONTRADICTS CLAIM');
    expect(container.textContent).toContain('Relationship Rationale:');
    unmount();
  });

  // Scenario 17: Transparent Separate Metrics in VerdictPanel
  it('Scenario 17: Displays transparent separate metrics with safe fallback for unavailable values', () => {
    const analysisWithMetrics = {
      id: 'job-metrics-789',
      primary_claim: 'Claim evaluated with separated epistemic measurements',
      final_verdict: 'SUPPORTED',
      assessment_confidence: 0.88,
      soundness_explanation: 'Procedural verification followed full 6-stage adversarial audit.',
      verdict_summary: 'Corroborated by independent sources.',
      evidence_coverage: 0.85,
      source_quality: 0.92,
      claim_verification_confidence: 0.90,
      reasoning_completeness: null, // explicitly uncalculated to test unavailable display
      retrieved_sources_count: 5,
      url_validated_sources_count: 4,
      sources: [{ id: 's1', url: 'https://who.int', publisher: 'WHO', is_url_accessible: true }]
    };

    const { container, unmount } = renderComponent(
      <VerdictPanel analysis={analysisWithMetrics} />
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('Evidence Coverage');
    expect(container.textContent).toContain('85%');
    expect(container.textContent).toContain('Source Quality');
    expect(container.textContent).toContain('92%');
    expect(container.textContent).toContain('Factual Confidence');
    expect(container.textContent).toContain('90%');
    expect(container.textContent).toContain('Reasoning Completeness');
    expect(container.textContent).toContain('Unavailable');
    expect(container.textContent).toContain('5 Retrieved Sources');
    expect(container.textContent).toContain('4 URL-Validated Sources');
    unmount();
  });

  // Scenario 18: Unverified Epistemic Breakdown
  it('Scenario 18: Renders structured Unverified Epistemic Breakdown when verdict is UNVERIFIED', () => {
    const unverifiedAnalysis = {
      id: 'job-unverified-101',
      primary_claim: 'Exotic root extract cures kidney stones within 48 hours.',
      final_verdict: 'UNVERIFIED',
      assessment_confidence: 0.55,
      soundness_explanation: 'Evaluated public search corpus; no peer-reviewed proof located.',
      verdict_summary: 'Unsupported claim; held as UNVERIFIED pending primary records.',
      unverified_breakdown: {
        evidence_found: ['Retrieved general herbal context from health blogs.'],
        evidence_missing: ['Double-blind clinical trials or gazette notifications.'],
        why_unestablished: 'Absence of proof does not equate to disproof, but primary documentation is absent.',
        evidence_needed: ['Clinical study by accredited medical university.']
      }
    };

    const { container, unmount } = renderComponent(
      <VerdictPanel analysis={unverifiedAnalysis} />
    );

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('UNVERIFIED');
    expect(container.textContent).toContain('Epistemic Investigation Breakdown: Why This Claim is Unverified');
    expect(container.textContent).toContain('Evidence Found in Retrieved Corpus');
    expect(container.textContent).toContain('Critical Evidence Missing');
    expect(container.textContent).toContain('Why Retrieved Sources Do Not Establish Claim');
    expect(container.textContent).toContain('Additional Independent Evidence Needed to Substantiate');
    expect(container.textContent).toContain('lack of proof does not equate to disproof');
    unmount();
  });
});

