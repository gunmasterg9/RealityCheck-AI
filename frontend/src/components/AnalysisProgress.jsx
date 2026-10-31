import React, { useEffect, useState } from 'react';
import { Search, ShieldAlert, Scale, Sparkles, CheckCircle2, Clock, XCircle, FileCheck, Layers } from 'lucide-react';

export default function AnalysisProgress({ onCancel }) {
  const [stage, setStage] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    // Live elapsed timer
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    // Smooth stage transitions matching the real 6-stage pipeline
    const t1 = setTimeout(() => setStage(2), 2500);  // Evidence Extraction -> Evaluation
    const t2 = setTimeout(() => setStage(3), 5500);  // Evaluation -> Adversarial Critique
    const t3 = setTimeout(() => setStage(4), 9000);  // Critique -> Adjudication
    const t4 = setTimeout(() => setStage(5), 13000); // Adjudication -> Citation Validation
    const t5 = setTimeout(() => setStage(6), 17000); // Citation Validation -> Final Verdict

    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  const steps = [
    {
      step: 1,
      title: 'Stage 1: Evidence Extraction',
      desc: 'Normalizing claim, entity recognition, web search & Google Fact Check retrieval',
      icon: Search,
      isActive: stage >= 1
    },
    {
      step: 2,
      title: 'Stage 2: Evidence Evaluation',
      desc: 'Source credibility scoring, primary vs secondary weighting, date validation & deduplication',
      icon: Layers,
      isActive: stage >= 2
    },
    {
      step: 3,
      title: 'Stage 3: Adversarial Critique',
      desc: 'Stress-testing initial stance: hunting unstated assumptions, selection bias & counter-evidence',
      icon: ShieldAlert,
      isActive: stage >= 3
    },
    {
      step: 4,
      title: 'Stage 4: Objective Adjudication',
      desc: 'Weighing corroborated proof against counter-arguments; evaluating evidentiary sufficiency',
      icon: Scale,
      isActive: stage >= 4
    },
    {
      step: 5,
      title: 'Stage 5: Citation Validation',
      desc: 'Eliminating fabricated references; strictly anchoring claims to verified URLs',
      icon: FileCheck,
      isActive: stage >= 5
    },
    {
      step: 6,
      title: 'Stage 6: Final Verdict',
      desc: 'Synthesizing final classification (SUPPORTED, FALSE, MISLEADING, etc.) and audit diff',
      icon: CheckCircle2,
      isActive: stage >= 6
    }
  ];

  return (
    <div className="panel progress-panel">
      <div className="progress-top-bar">
        <div className="progress-header">
          <Sparkles size={20} className="spinner" style={{ color: '#38BDF8' }} />
          <div>
            <h3 className="progress-title">Executing 6-Stage Epistemic Audit</h3>
            <span className="progress-elapsed">
              <Clock size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
              Elapsed: <strong>{formatTime(elapsedSeconds)}</strong>
              {elapsedSeconds > 25 && (
                <span className="deep-audit-tag"> • Deep CPU / Web Search Pass</span>
              )}
            </span>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            className="btn-cancel-verification"
            onClick={onCancel}
            title="Abort this verification request immediately"
          >
            <XCircle size={15} />
            <span>Cancel</span>
          </button>
        )}
      </div>

      <p className="progress-subtitle">
        RealityCheck AI avoids sycophancy: it retrieves real evidence, challenges its own assumptions through adversarial critique, and verifies all citations.
      </p>

      <div className="progress-steps-grid">
        {steps.map((s) => {
          const Icon = s.icon;
          const isCurrent = stage === s.step;
          return (
            <div
              key={s.step}
              className={`progress-step-card ${s.isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="step-badge-row">
                <div className="step-icon-wrap">
                  <Icon size={16} />
                </div>
                {isCurrent && (
                  <span className="live-indicator">
                    <span className="pulse-dot" /> Running
                  </span>
                )}
                {stage > s.step && (
                  <span className="complete-indicator">Done</span>
                )}
              </div>
              <h4 className="step-card-title">{s.title}</h4>
              <p className="step-card-desc">{s.desc}</p>
            </div>
          );
        })}
      </div>

      <style>{`
        .progress-panel {
          padding: 24px;
          margin-bottom: 28px;
          border-color: rgba(56, 189, 248, 0.3);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(11, 15, 25, 0.98));
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
        }
        .progress-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .progress-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .progress-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #FFF;
          margin: 0;
        }
        .progress-elapsed {
          font-size: 0.8rem;
          color: #94A3B8;
        }
        .progress-elapsed strong {
          color: #38BDF8;
          font-family: monospace;
          font-size: 0.88rem;
        }
        .deep-audit-tag {
          color: #F59E0B;
          font-style: italic;
        }
        .btn-cancel-verification {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #F87171;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-cancel-verification:hover {
          background: rgba(239, 68, 68, 0.25);
          border-color: #EF4444;
          color: #FFF;
        }
        .progress-subtitle {
          font-size: 0.85rem;
          color: #94A3B8;
          margin-bottom: 20px;
          line-height: 1.45;
        }
        .progress-steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
        }
        .progress-step-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 10px;
          padding: 14px;
          opacity: 0.45;
          transition: all 0.3s ease;
        }
        .progress-step-card.active {
          opacity: 0.85;
          border-color: rgba(56, 189, 248, 0.25);
        }
        .progress-step-card.current {
          opacity: 1;
          border-color: #38BDF8;
          background: rgba(56, 189, 248, 0.06);
          box-shadow: 0 0 16px rgba(56, 189, 248, 0.15);
        }
        .step-badge-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .step-icon-wrap {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #38BDF8;
        }
        .progress-step-card.current .step-icon-wrap {
          background: #38BDF8;
          color: #0F172A;
        }
        .live-indicator {
          font-size: 0.72rem;
          font-weight: 700;
          color: #38BDF8;
          display: flex;
          align-items: center;
          gap: 5px;
          text-transform: uppercase;
        }
        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #38BDF8;
          animation: pulseGlow 1s infinite;
        }
        .complete-indicator {
          font-size: 0.72rem;
          font-weight: 600;
          color: #10B981;
        }
        .step-card-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #F8FAFC;
          margin-bottom: 4px;
        }
        .step-card-desc {
          font-size: 0.76rem;
          color: #94A3B8;
          line-height: 1.4;
        }
        @keyframes pulseGlow {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
