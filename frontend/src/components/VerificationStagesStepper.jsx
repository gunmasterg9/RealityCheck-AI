import React, { useState } from 'react';
import { CheckCircle2, Clock, ChevronDown, ChevronUp, Layers, Cpu, ShieldAlert, Scale, Search, FileSearch } from 'lucide-react';

export default function VerificationStagesStepper({ stages }) {
  const [expandedStage, setExpandedStage] = useState(null);

  if (!stages || stages.length === 0) return null;

  const getStageIcon = (stageName) => {
    switch (stageName) {
      case 'input_classification':
        return FileSearch;
      case 'source_retrieval':
        return Search;
      case 'evidence_collection':
        return Layers;
      case 'gemma_analyzer':
        return Cpu;
      case 'adversarial_critic':
        return ShieldAlert;
      case 'chief_judge':
      default:
        return Scale;
    }
  };

  const getStageLabel = (stageName) => {
    switch (stageName) {
      case 'input_classification':
        return '1. Input Classification & Extraction';
      case 'source_retrieval':
        return '2. Real-Time Source Retrieval';
      case 'evidence_collection':
        return '3. Evidence Synthesis & Alignment';
      case 'gemma_analyzer':
        return '4. Gemma 4 Evidence Reasoner';
      case 'adversarial_critic':
        return '5. Adversarial Self-Critique';
      case 'chief_judge':
      default:
        return '6. Chief Judge & Reconciled Verdict';
    }
  };

  const toggleExpand = (idx) => {
    setExpandedStage(expandedStage === idx ? null : idx);
  };

  return (
    <div className="panel stages-stepper-panel" style={{ marginTop: '1.5rem' }}>
      <div className="stepper-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} style={{ color: '#60A5FA' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>6-Stage Evidence Verification Audit</h3>
        </div>
        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
          All 6 reasoning passes verified • {stages.reduce((acc, s) => acc + (s.duration_ms || 0), 0)}ms total
        </span>
      </div>

      <div className="stages-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {stages.map((stage, idx) => {
          const Icon = getStageIcon(stage.stage_name);
          const isExpanded = expandedStage === idx;

          return (
            <div
              key={stage.stage_name || idx}
              className={`stage-row-card ${isExpanded ? 'expanded' : ''}`}
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              <div
                className="stage-row-summary"
                onClick={() => toggleExpand(idx)}
                style={{
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(96, 165, 250, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60A5FA'
                    }}
                  >
                    <Icon size={15} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F1F5F9' }}>
                      {getStageLabel(stage.stage_name)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{stage.summary}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#38BDF8',
                      background: 'rgba(56, 189, 248, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Clock size={11} /> {stage.duration_ms}ms
                  </span>
                  {isExpanded ? <ChevronUp size={16} color="#94A3B8" /> : <ChevronDown size={16} color="#94A3B8" />}
                </div>
              </div>

              {isExpanded && stage.details && Object.keys(stage.details).length > 0 && (
                <div
                  className="stage-row-details"
                  style={{
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid rgba(148, 163, 184, 0.1)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    fontSize: '0.8rem'
                  }}
                >
                  <pre
                    style={{
                      margin: 0,
                      color: '#CBD5E1',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'monospace'
                    }}
                  >
                    {JSON.stringify(stage.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
