import React, { useEffect, useState } from 'react';
import { Search, ShieldAlert, Scale, Sparkles } from 'lucide-react';

export default function AnalysisProgress() {
  const [stage, setStage] = useState(1);

  useEffect(() => {
    // Simulated smooth progress indication through the 3 pipeline passes
    const timer1 = setTimeout(() => setStage(2), 2200);
    const timer2 = setTimeout(() => setStage(3), 5500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const steps = [
    {
      step: 1,
      title: 'Stage 1: Evidence Extraction',
      desc: 'Isolating claim assertions against supplied context and premises',
      icon: Search,
      isActive: stage >= 1
    },
    {
      step: 2,
      title: 'Stage 2: Adversarial Critique',
      desc: 'Active self-challenge: hunting confirmation bias, hidden leaps, and missing variables',
      icon: ShieldAlert,
      isActive: stage >= 2
    },
    {
      step: 3,
      title: 'Stage 3: Objective Adjudication',
      desc: 'Synthesizing evidence, calculating confidence, and detailing verdict shifts',
      icon: Scale,
      isActive: stage >= 3
    }
  ];

  return (
    <div className="panel progress-panel">
      <div className="progress-header">
        <Sparkles size={18} className="spinner" style={{ color: '#A78BFA' }} />
        <h3 className="progress-title">Executing Multi-Stage Epistemic Audit</h3>
      </div>
      <p className="progress-subtitle">
        RealityCheck AI does not rubber-stamp answers. It runs an adversarial challenge pass to stress-test its own reasoning.
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
          border-color: rgba(139, 92, 246, 0.3);
          background: linear-gradient(180deg, rgba(17, 24, 39, 0.95), rgba(15, 23, 42, 0.95));
        }
        .progress-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .progress-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #FFF;
        }
        .progress-subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 20px;
        }
        .progress-steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .progress-step-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 16px;
          opacity: 0.4;
          transition: all 0.3s ease;
        }
        .progress-step-card.active {
          opacity: 0.85;
          border-color: rgba(139, 92, 246, 0.25);
        }
        .progress-step-card.current {
          opacity: 1;
          border-color: var(--primary-500);
          background: rgba(139, 92, 246, 0.08);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.15);
        }
        .step-badge-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .step-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #A78BFA;
        }
        .progress-step-card.current .step-icon-wrap {
          background: var(--primary-500);
          color: #FFF;
        }
        .live-indicator {
          font-size: 0.72rem;
          font-weight: 700;
          color: #A78BFA;
          display: flex;
          align-items: center;
          gap: 5px;
          text-transform: uppercase;
        }
        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #A78BFA;
          animation: pulseGlow 1s infinite;
        }
        .complete-indicator {
          font-size: 0.72rem;
          font-weight: 600;
          color: #10B981;
        }
        .step-card-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 4px;
        }
        .step-card-desc {
          font-size: 0.78rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}

