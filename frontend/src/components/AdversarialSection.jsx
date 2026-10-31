import React from 'react';
import { ShieldAlert, AlertTriangle, HelpCircle, Flame } from 'lucide-react';

export default function AdversarialSection({ analysis }) {
  if (!analysis) return null;

  const critique = analysis.adversarial_critique || {};
  const challenges = Array.isArray(critique.challenges) ? critique.challenges : [];
  const hidden_assumptions = Array.isArray(critique.hidden_assumptions) ? critique.hidden_assumptions : [];
  const missing_evidence_required = Array.isArray(critique.missing_evidence_required) ? critique.missing_evidence_required : [];
  const critique_summary = critique.critique_summary || 'Adversarial self-critique investigated alternative explanations and potential biases.';
  const suggested_revision = critique.suggested_revision || '';

  return (
    <div className="panel adversarial-panel">
      <div className="adversarial-header">
        <div className="adversarial-title-group">
          <div className="adversarial-icon-wrap">
            <Flame size={18} className="flame-icon" />
          </div>
          <div>
            <h3 className="section-title">Adversarial Self-Critique & Stress Test</h3>
            <p className="section-desc">
              Mandatory internal skeptical pass designed to break confirmation bias and expose blind spots.
            </p>
          </div>
        </div>

        {suggested_revision && (
          <div className="suggested-revision-pill">
            <span className="rev-label">Critic's Suggested Revision:</span>
            <span className="badge badge-insufficient">{suggested_revision.replace('_', ' ')}</span>
          </div>
        )}
      </div>

      {/* Critique summary */}
      <div className="critique-summary-card">
        <div className="summary-label">Adversarial Audit Finding:</div>
        <p className="summary-text">{critique_summary}</p>
      </div>

      <div className="critique-details-grid">
        {/* Adversarial Challenges */}
        <div className="critique-card">
          <div className="card-header-row">
            <ShieldAlert size={16} className="card-icon" style={{ color: '#EF4444' }} />
            <h4>Adversarial Counter-Arguments</h4>
          </div>
          <ul className="critique-list">
            {challenges.map((c, i) => (
              <li key={i} className="critique-item">
                <span className="item-num">{i + 1}.</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Hidden Assumptions */}
        <div className="critique-card">
          <div className="card-header-row">
            <AlertTriangle size={16} className="card-icon" style={{ color: '#F59E0B' }} />
            <h4>Surfaced Hidden Assumptions</h4>
          </div>
          <ul className="critique-list">
            {hidden_assumptions.length === 0 ? (
              <li className="critique-item empty">None detected</li>
            ) : (
              hidden_assumptions.map((a, i) => (
                <li key={i} className="critique-item">
                  <span className="item-num">{i + 1}.</span>
                  <span>{a}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Missing Evidence Required */}
        <div className="critique-card">
          <div className="card-header-row">
            <HelpCircle size={16} className="card-icon" style={{ color: '#A78BFA' }} />
            <h4>Missing Verifications Needed</h4>
          </div>
          <ul className="critique-list">
            {missing_evidence_required.length === 0 ? (
              <li className="critique-item empty">None required</li>
            ) : (
              missing_evidence_required.map((m, i) => (
                <li key={i} className="critique-item">
                  <span className="item-num">{i + 1}.</span>
                  <span>{m}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <style>{`
        .adversarial-panel {
          padding: 24px;
          margin-bottom: 28px;
          border-color: rgba(239, 68, 68, 0.2);
          background: linear-gradient(180deg, rgba(23, 17, 30, 0.8) 0%, rgba(17, 24, 39, 0.8) 100%);
        }
        .adversarial-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .adversarial-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .adversarial-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .flame-icon {
          color: #EF4444;
        }
        .section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .section-desc {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .suggested-revision-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.04);
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--border-subtle);
        }
        .rev-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .critique-summary-card {
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.18);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
        }
        .summary-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #F87171;
          margin-bottom: 4px;
        }
        .summary-text {
          font-size: 0.88rem;
          color: #FCA5A5;
          line-height: 1.45;
        }
        .critique-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .critique-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 16px;
        }
        .card-header-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 8px;
        }
        .card-header-row h4 {
          font-size: 0.82rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-secondary);
        }
        .critique-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .critique-item {
          display: flex;
          gap: 8px;
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .critique-item.empty {
          color: var(--text-muted);
          font-style: italic;
        }
        .item-num {
          font-weight: 700;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

