import React from 'react';
import { AlertCircle, Clock, ShieldCheck } from 'lucide-react';

export default function LimitationsSection({ analysis }) {
  if (!analysis) return null;

  const rawLimitations =
    analysis.limitations ||
    analysis.limitations_disclaimer ||
    analysis.final_judgment?.limitations ||
    [];
  const limitations = Array.isArray(rawLimitations)
    ? rawLimitations
    : typeof rawLimitations === 'string'
    ? [rawLimitations]
    : [];

  const rawSteps = analysis.stages || analysis.audit_steps || [];
  const steps = Array.isArray(rawSteps) ? rawSteps : [];
  const totalDuration = steps.reduce(
    (acc, step) => acc + (Number(step?.duration_ms) || 0),
    0
  );

  const providerUsed = analysis.provider_used || 'AI Provider';
  const modelUsed = analysis.model_used || 'Evidence Reasoner';

  return (
    <div className="panel limitations-panel">
      <div className="limitations-grid">
        {/* Explicit System Limitations */}
        <div className="limitation-block">
          <div className="block-header">
            <AlertCircle size={16} className="limit-icon" />
            <h4 className="block-title">Explicit Epistemic Limitations & Disclosures</h4>
          </div>
          <p className="limit-intro">
            RealityCheck AI maintains strict scientific boundaries. It challenges its own conclusions and does not invent external factual verification.
          </p>
          <ul className="limitations-list">
            {limitations.length === 0 ? (
              <li className="limitation-item">
                <span className="dot" />
                <span>Inference is strictly bounded by retrieved real-time web documents and Google Fact Check records.</span>
              </li>
            ) : (
              limitations.map((lim, idx) => (
                <li key={idx} className="limitation-item">
                  <span className="dot" />
                  <span>{typeof lim === 'object' ? JSON.stringify(lim) : String(lim)}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Audit Pipeline Latency */}
        <div className="audit-latency-block">
          <div className="block-header">
            <Clock size={16} className="clock-icon" />
            <h4 className="block-title">
              Pipeline Audit Latency ({totalDuration > 0 ? `${totalDuration}ms total` : 'Complete'})
            </h4>
          </div>
          <div className="audit-steps-list">
            {steps.map((step, idx) => {
              const rawName = step?.stage_name || step?.step_name || `Stage ${idx + 1}`;
              const stepName = String(rawName).replace(/_/g, ' ');
              const duration = Number(step?.duration_ms) || 0;
              return (
                <div key={idx} className="audit-step-row">
                  <div className="step-label">
                    <span className="step-idx">{idx + 1}</span>
                    <span className="step-name">{stepName}</span>
                  </div>
                  <span className="step-duration mono">{duration} ms</span>
                </div>
              );
            })}
          </div>
          <div className="audit-footer-note">
            Inference executed via <strong>{providerUsed}</strong> utilizing <strong>{modelUsed}</strong>.
          </div>
        </div>
      </div>

      <style>{`
        .limitations-panel {
          padding: 22px 24px;
          margin-bottom: 28px;
          background: rgba(14, 20, 36, 0.6);
        }
        .limitations-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 24px;
        }
        @media (max-width: 820px) {
          .limitations-grid {
            grid-template-columns: 1fr;
          }
        }
        .block-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .block-title {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }
        .limit-icon {
          color: #A78BFA;
        }
        .clock-icon {
          color: #60A5FA;
        }
        .limit-intro {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .limitations-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 0;
          margin: 0;
        }
        .limitation-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #A78BFA;
          margin-top: 6px;
          flex-shrink: 0;
        }
        .audit-steps-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }
        .audit-step-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.82rem;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .step-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .step-idx {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          font-size: 0.68rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        .step-name {
          color: var(--text-main);
          text-transform: capitalize;
        }
        .step-duration {
          color: #60A5FA;
          font-size: 0.78rem;
        }
        .audit-footer-note {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 10px;
        }
        .audit-footer-note strong {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
