import React from 'react';
import { AlertCircle, Clock, ShieldCheck } from 'lucide-react';

export default function LimitationsSection({ analysis }) {
  if (!analysis) return null;

  const { final_judgment, audit_steps, provider_used, model_used } = analysis;
  const limitations = final_judgment.limitations || [];

  const totalDuration = audit_steps.reduce((acc, step) => acc + (step.duration_ms || 0), 0);

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
            RealityCheck AI maintains strict scientific boundaries. It does not hallucinate external factual verification.
          </p>
          <ul className="limitations-list">
            {limitations.map((lim, idx) => (
              <li key={idx} className="limitation-item">
                <span className="dot" />
                <span>{lim}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Audit Pipeline Latency */}
        <div className="audit-latency-block">
          <div className="block-header">
            <Clock size={16} className="clock-icon" />
            <h4 className="block-title">Pipeline Step Audit Latency ({totalDuration}ms total)</h4>
          </div>
          <div className="audit-steps-list">
            {audit_steps.map((step, idx) => (
              <div key={idx} className="audit-step-row">
                <div className="step-label">
                  <span className="step-idx">{idx + 1}</span>
                  <span className="step-name">{step.step_name.replace('_', ' ')}</span>
                </div>
                <span className="step-duration mono">{step.duration_ms} ms</span>
              </div>
            ))}
          </div>
          <div className="audit-footer-note">
            Inference executed via <strong>{provider_used}</strong> utilizing <strong>{model_used}</strong>.
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
          gap: 6px;
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
          margin-top: 7px;
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
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          padding: 6px 12px;
          border-radius: 6px;
        }
        .step-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .step-idx {
          font-size: 0.7rem;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          width: 18px;
          height: 18px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .step-name {
          font-size: 0.8rem;
          text-transform: capitalize;
          color: var(--text-main);
        }
        .step-duration {
          font-size: 0.75rem;
          color: #60A5FA;
        }
        .audit-footer-note {
          font-size: 0.74rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

