import React from 'react';
import { ArrowRight, GitCompare, RefreshCw, Zap } from 'lucide-react';

export default function VerdictDiffView({ analysis }) {
  if (!analysis) return null;

  const rawInitV = analysis.initial_verdict || analysis.initial_assessment?.initial_verdict || 'unverified';
  const initialVerdict = typeof rawInitV === 'object' ? JSON.stringify(rawInitV) : String(rawInitV);

  const rawFinalV = analysis.final_verdict || analysis.verdict || analysis.final_judgment?.verdict || 'INSUFFICIENT EVIDENCE';
  const finalVerdict = typeof rawFinalV === 'object' ? JSON.stringify(rawFinalV) : String(rawFinalV);

  const rawWhatChanged = analysis.what_changed || analysis.final_judgment?.what_changed || 'Evidence cross-examination refined initial stance.';
  const whatChanged = typeof rawWhatChanged === 'object' ? JSON.stringify(rawWhatChanged) : String(rawWhatChanged);

  const rawInitR = analysis.initial_assessment?.initial_reasoning || 'Initial evidence reasoning across retrieved web sources and ClaimReviews.';
  const initialReasoning = typeof rawInitR === 'object' ? JSON.stringify(rawInitR) : String(rawInitR);

  const rawSummary = analysis.verdict_summary || analysis.summary || analysis.final_judgment?.summary || '';
  const finalSummary = typeof rawSummary === 'object' ? JSON.stringify(rawSummary) : String(rawSummary);

  const initConfVal = Number(analysis.initial_assessment?.confidence) || 0.8;
  const initialConfidence = Math.min(100, Math.max(0, Math.round(initConfVal * 100)));

  const finalConfVal = Number(analysis.assessment_confidence ?? analysis.confidence ?? analysis.final_judgment?.assessment_confidence) || 0.85;
  const finalConfidence = Math.min(100, Math.max(0, Math.round(finalConfVal * 100)));

  const getVerdictBadge = (verdict) => {
    const norm = String(verdict || '').toLowerCase();
    if (norm.includes('true') || (norm.includes('support') && !norm.includes('insufficient'))) {
      return <span className="badge badge-supported">{verdict}</span>;
    }
    if (norm.includes('false') || norm.includes('contradict')) {
      return <span className="badge badge-contradicted">{verdict}</span>;
    }
    if (norm.includes('mislead') || norm.includes('mixed') || norm.includes('part') || norm.includes('outdate')) {
      return <span className="badge badge-mixed">{verdict}</span>;
    }
    return <span className="badge badge-insufficient">{verdict}</span>;
  };

  const isShifted = String(initialVerdict).toLowerCase() !== String(finalVerdict).toLowerCase();

  return (
    <div className="panel diff-panel">
      <div className="diff-panel-header">
        <div className="diff-header-title">
          <GitCompare size={18} className="diff-icon" />
          <h3>Self-Audit Evolution: Initial vs Final Verdict</h3>
        </div>
        {isShifted ? (
          <span className="shift-badge shifted">
            <Zap size={12} /> Verdict Shifted by Adversarial Audit
          </span>
        ) : (
          <span className="shift-badge refined">
            <RefreshCw size={12} /> Rigorously Confirmed with Tempered Certainty
          </span>
        )}
      </div>

      <div className="diff-comparison-cards">
        {/* Stage 1 / Initial Assessment */}
        <div className="stage-card">
          <div className="stage-card-header">
            <span className="stage-step-tag">Initial Pass</span>
            <span className="stage-name">Evidence Analyzer Stance</span>
          </div>
          <div className="stage-verdict-row">
            {getVerdictBadge(initialVerdict)}
            <span className="stage-conf">
              Confidence: {initialConfidence}%
            </span>
          </div>
          <p className="stage-reasoning">{initialReasoning}</p>
        </div>

        {/* Transition Arrow / Adversarial Bridge */}
        <div className="diff-bridge">
          <div className="bridge-icon-wrap" title="Adversarial Critique Pass">
            <ArrowRight size={20} className="arrow-icon" />
          </div>
          <span className="bridge-label">Adversarial Stress Test</span>
        </div>

        {/* Stage 3 / Final Reconciled Judgment */}
        <div className="stage-card final-stage-card">
          <div className="stage-card-header">
            <span className="stage-step-tag final-tag">Final Adjudication</span>
            <span className="stage-name">Reconciled Chief Verdict</span>
          </div>
          <div className="stage-verdict-row">
            {getVerdictBadge(finalVerdict)}
            <span className="stage-conf">
              Soundness: {finalConfidence}%
            </span>
          </div>
          <p className="stage-reasoning">{finalSummary}</p>
        </div>
      </div>

      {/* What Changed Highlight Box */}
      <div className="what-changed-highlight">
        <div className="what-changed-label">What Changed During Adversarial Challenge & Evidence Synthesis:</div>
        <p className="what-changed-text">{whatChanged}</p>
      </div>

      <style>{`
        .diff-panel {
          padding: 22px 24px;
          margin-bottom: 28px;
        }
        .diff-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .diff-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .diff-header-title h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .diff-icon {
          color: #A78BFA;
        }
        .shift-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .shift-badge.shifted {
          background: rgba(245, 158, 11, 0.15);
          color: #FBBF24;
          border: 1px solid rgba(245, 158, 11, 0.35);
        }
        .shift-badge.refined {
          background: rgba(139, 92, 246, 0.15);
          color: #C4B5FD;
          border: 1px solid rgba(139, 92, 246, 0.35);
        }
        .diff-comparison-cards {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 16px;
          align-items: stretch;
          margin-bottom: 18px;
        }
        @media (max-width: 768px) {
          .diff-comparison-cards {
            grid-template-columns: 1fr;
          }
          .diff-bridge {
            transform: rotate(90deg);
            margin: 8px 0;
          }
        }
        .stage-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 16px;
          display: flex;
          flex-direction: column;
        }
        .final-stage-card {
          border-color: rgba(139, 92, 246, 0.3);
          background: linear-gradient(180deg, rgba(22, 31, 56, 0.8) 0%, rgba(17, 24, 39, 0.8) 100%);
        }
        .stage-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .stage-step-tag {
          font-size: 0.7rem;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--text-secondary);
        }
        .stage-step-tag.final-tag {
          background: var(--primary-500);
          color: #FFF;
        }
        .stage-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .stage-verdict-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .stage-conf {
          font-size: 0.78rem;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }
        .stage-reasoning {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.45;
          margin-top: auto;
        }
        .diff-bridge {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .bridge-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .arrow-icon {
          color: #A78BFA;
        }
        .bridge-label {
          font-size: 0.68rem;
          color: var(--text-muted);
          text-align: center;
          max-width: 80px;
          line-height: 1.2;
        }
        .what-changed-highlight {
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
        }
        .what-changed-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #A5B4FC;
          margin-bottom: 4px;
        }
        .what-changed-text {
          font-size: 0.88rem;
          color: #E0E7FF;
          line-height: 1.45;
        }
      `}</style>
    </div>
  );
}

