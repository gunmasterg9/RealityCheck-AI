import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Download,
  Printer,
  ShieldCheck,
  Info
} from 'lucide-react';
import { getExportUrl } from '../api';

export default function VerdictPanel({ analysis }) {
  if (!analysis) return null;

  const { final_judgment, id, provider_used, model_used, created_at } = analysis;
  const verdict = final_judgment.verdict;
  const confidenceScore = Math.round((final_judgment.assessment_confidence || 0) * 100);

  const getVerdictConfig = (v) => {
    switch (v) {
      case 'supported':
        return {
          label: 'Supported',
          badgeClass: 'badge-supported',
          icon: CheckCircle2,
          color: '#10B981',
          bgGlow: 'rgba(16, 185, 129, 0.15)',
          description: 'The supplied evidence and premises adequately substantiate this claim.'
        };
      case 'contradicted':
        return {
          label: 'Contradicted',
          badgeClass: 'badge-contradicted',
          icon: XCircle,
          color: '#EF4444',
          bgGlow: 'rgba(239, 68, 68, 0.15)',
          description: 'The claim is directly contradicted by facts, evidence, or logical necessity.'
        };
      case 'mixed':
        return {
          label: 'Mixed Evidence',
          badgeClass: 'badge-mixed',
          icon: AlertCircle,
          color: '#F59E0B',
          bgGlow: 'rgba(245, 158, 11, 0.15)',
          description: 'Evidence is conflicting, partial, or applies only under narrow conditions.'
        };
      case 'insufficient_evidence':
      default:
        return {
          label: 'Insufficient Evidence',
          badgeClass: 'badge-insufficient',
          icon: HelpCircle,
          color: '#A78BFA',
          bgGlow: 'rgba(167, 139, 250, 0.15)',
          description: 'No verified basis or context supplied. Scientific burden of proof is unmet.'
        };
    }
  };

  const config = getVerdictConfig(verdict);
  const VerdictIcon = config.icon;

  const handlePrint = () => {
    const url = getExportUrl(id, 'html');
    window.open(url, '_blank');
  };

  const handleDownloadJson = () => {
    const url = getExportUrl(id, 'json');
    window.location.href = url;
  };

  return (
    <div className="panel verdict-hero-panel">
      {/* Top Meta Bar */}
      <div className="verdict-meta-bar">
        <div className="meta-left">
          <span className="audit-id-badge">ID: {id.slice(0, 8)}</span>
          <span className="provider-tag">Evaluated with {provider_used} ({model_used})</span>
        </div>
        <div className="meta-actions">
          <button className="btn-secondary export-btn" onClick={handleDownloadJson} title="Download structured JSON">
            <Download size={14} />
            <span>JSON</span>
          </button>
          <button className="btn-secondary export-btn" onClick={handlePrint} title="Open printable report or PDF">
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Verdict Display */}
      <div className="verdict-main-row">
        <div className="verdict-badge-block">
          <div className="verdict-icon-container" style={{ borderColor: config.color, background: config.bgGlow }}>
            <VerdictIcon size={36} style={{ color: config.color }} />
          </div>
          <div>
            <span className="verdict-status-caption">Adjudicated Verdict</span>
            <div className={`badge ${config.badgeClass} large-verdict-badge`}>
              {config.label}
            </div>
            <p className="verdict-subtext">{config.description}</p>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div className="confidence-block">
          <div className="confidence-header">
            <span className="conf-label">Assessment Soundness</span>
            <span className="conf-value" style={{ color: config.color }}>{confidenceScore}%</span>
          </div>
          <div className="confidence-track">
            <div 
              className="confidence-fill" 
              style={{ width: `${confidenceScore}%`, backgroundColor: config.color }}
            />
          </div>
          <div className="conf-expl-box">
            <Info size={13} className="info-icon" />
            <p className="conf-expl-text">
              <strong>Epistemic Distinction:</strong> {final_judgment.confidence_explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="verdict-summary-box">
        <h4 className="summary-title">Executive Adjudication Summary</h4>
        <p className="summary-text">{final_judgment.summary}</p>
      </div>

      <style>{`
        .verdict-hero-panel {
          padding: 24px;
          margin-bottom: 28px;
          border-color: rgba(255, 255, 255, 0.12);
          background: linear-gradient(180deg, #10172B 0%, #0E1424 100%);
        }
        .verdict-meta-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-subtle);
          flex-wrap: wrap;
          gap: 12px;
        }
        .meta-left {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .audit-id-badge {
          font-family: 'JetBrains Mono', monospace;
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: 4px;
          color: var(--text-secondary);
        }
        .provider-tag {
          font-size: 0.78rem;
        }
        .meta-actions {
          display: flex;
          gap: 8px;
        }
        .export-btn {
          font-size: 0.78rem;
          padding: 5px 12px;
        }
        .verdict-main-row {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 28px;
          align-items: center;
          margin-bottom: 22px;
        }
        @media (max-width: 860px) {
          .verdict-main-row {
            grid-template-columns: 1fr;
          }
        }
        .verdict-badge-block {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .verdict-icon-container {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .verdict-status-caption {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          font-weight: 600;
          display: block;
          margin-bottom: 4px;
        }
        .large-verdict-badge {
          font-size: 1.15rem;
          padding: 6px 18px;
          margin-bottom: 6px;
        }
        .verdict-subtext {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .confidence-block {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 16px;
        }
        .confidence-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .conf-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .conf-value {
          font-size: 1.15rem;
          font-weight: 800;
          font-family: 'JetBrains Mono', monospace;
        }
        .confidence-track {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .confidence-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .conf-expl-box {
          display: flex;
          gap: 8px;
          background: rgba(0, 0, 0, 0.2);
          padding: 8px 10px;
          border-radius: 6px;
          align-items: flex-start;
        }
        .info-icon {
          color: #A78BFA;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .conf-expl-text {
          font-size: 0.74rem;
          color: var(--text-muted);
          line-height: 1.35;
        }
        .verdict-summary-box {
          background: rgba(255, 255, 255, 0.03);
          border-left: 3px solid var(--primary-500);
          padding: 14px 18px;
          border-radius: 0 8px 8px 0;
        }
        .summary-title {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #C4B5FD;
          margin-bottom: 4px;
        }
        .summary-text {
          font-size: 0.95rem;
          color: var(--text-main);
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
