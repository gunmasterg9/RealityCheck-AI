import React from 'react';
import { ArrowRight, GitCompare, RefreshCw, Zap } from 'lucide-react';

export default function VerdictDiffView({ analysis }) {
  if (!analysis) return null;

  const { initial_assessment, adversarial_critique, final_judgment } = analysis;

  const getVerdictBadge = (verdict) => {
    switch (verdict) {
      case 'supported':
        return <span className="badge badge-supported">Supported</span>;
      case 'contradicted':
        return <span className="badge badge-contradicted">Contradicted</span>;
      case 'mixed':
        return <span className="badge badge-mixed">Mixed Evidence</span>;
      case 'insufficient_evidence':
      default:
        return <span className="badge badge-insufficient">Insufficient Evidence</span>;
    }
  };

  const isShifted = initial_assessment.initial_verdict !== final_judgment.verdict;

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
        {/* Stage 1: Initial Assessment */}
        <div className="stage-card">
          <div className="stage-card-header">
            <span className="stage-step-tag">Stage 1</span>
            <span className="stage-name">Initial Evidence Assessor</span>
          </div>
          <div className="stage-verdict-row">
            {getVerdictBadge(initial_assessment.initial_verdict)}
            <span className="stage-conf">
              Confidence: {Math.round((initial_assessment.confidence || 0) * 100)}%
            </span>
          </div>
          <p className="stage-reasoning">{initial_assessment.initial_reasoning}</p>
        </div>

        {/* Transition Arrow / Adversarial Bridge */}
        <div className="diff-bridge">
          <div className="bridge-icon-wrap" title="Adversarial Critique Pass">
            <ArrowRight size={20} className="arrow-icon" />
          </div>
          <span className="bridge-label">Adversarial Stress Test</span>
        </div>

        {/* Stage 3: Final Reconciled Judgment */}
        <div className="stage-card final-stage-card">
          <div className="stage-card-header">
            <span className="stage-step-tag final-tag">Stage 3</span>
            <span className="stage-name">Reconciled Final Adjudication</span>
          </div>
          <div className="stage-verdict-row">
            {getVerdictBadge(final_judgment.verdict)}
            <span className="stage-conf">
              Soundness: {Math.round((final_judgment.assessment_confidence || 0) * 100)}%
            </span>
          </div>
          <p className="stage-reasoning">{final_judgment.summary}</p>
        </div>
      </div>

      {/* What Changed Highlight Box */}
      <div className="what-changed-highlight">
        <div className="what-changed-label">What Changed:</div>
        <p className="what-changed-text">{final_judgment.what_changed}</p>
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

