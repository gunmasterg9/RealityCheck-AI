import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Download,
  Printer,
  ShieldCheck,
  Info,
  Clock,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { getExportUrl } from '../api';

export default function VerdictPanel({ analysis }) {
  if (!analysis) return null;

  const id = String(analysis.id || 'job-audit');
  const provider_used = analysis.provider_used || 'Evidence-Aware Engine';
  const model_used = analysis.model_used || 'Standard Reasoner';

  const rawVerdict =
    analysis.final_verdict ||
    analysis.verdict ||
    analysis.final_judgment?.verdict ||
    'INSUFFICIENT EVIDENCE';
  const verdict = typeof rawVerdict === 'object' ? JSON.stringify(rawVerdict) : String(rawVerdict);

  const rawConfidence =
    analysis.assessment_confidence ??
    analysis.confidence ??
    analysis.final_judgment?.assessment_confidence ??
    0.75;
  const numConfidence = typeof rawConfidence === 'number' && !isNaN(rawConfidence) ? rawConfidence : 0.75;
  const confidenceScore = Math.min(100, Math.max(0, Math.round(numConfidence * 100)));

  const rawSummary =
    analysis.verdict_summary ||
    analysis.summary ||
    analysis.final_judgment?.summary ||
    'Evidence-based adjudication completed.';
  const summary = typeof rawSummary === 'object' ? JSON.stringify(rawSummary) : String(rawSummary);

  const rawExplanation =
    analysis.soundness_explanation ||
    analysis.explanation ||
    analysis.final_judgment?.confidence_explanation ||
    'Confidence represents evidentiary corroboration strength across retrieved sources.';
  const explanation = typeof rawExplanation === 'object' ? JSON.stringify(rawExplanation) : String(rawExplanation);

  const originalClaim =
    analysis.primary_claim ||
    analysis.claim ||
    analysis.raw_input ||
    'Direct Factual Claim';

  const stages = Array.isArray(analysis.stages)
    ? analysis.stages
    : Array.isArray(analysis.audit_steps)
    ? analysis.audit_steps
    : [];
  const totalDuration = stages.reduce((acc, s) => acc + (Number(s?.duration_ms) || 0), 0);

  const rawTimestamp = analysis.verification_timestamp || analysis.created_at || new Date().toISOString();
  let formattedTime = 'Recent';
  try {
    formattedTime = new Date(rawTimestamp).toLocaleString();
  } catch {
    formattedTime = String(rawTimestamp);
  }

  const supportList = Array.isArray(analysis.supporting_evidence)
    ? analysis.supporting_evidence
    : Array.isArray(analysis.supporting_points)
    ? analysis.supporting_points
    : Array.isArray(analysis.final_judgment?.support_evidence)
    ? analysis.final_judgment.support_evidence
    : [];

  const counterList = Array.isArray(analysis.contradicting_evidence)
    ? analysis.contradicting_evidence
    : Array.isArray(analysis.contradicting_points)
    ? analysis.contradicting_points
    : Array.isArray(analysis.final_judgment?.counter_evidence)
    ? analysis.final_judgment.counter_evidence
    : [];

  const getVerdictConfig = (v) => {
    const norm = String(v || '').toLowerCase();
    if (norm.includes('true') || (norm.includes('support') && !norm.includes('insufficient'))) {
      return {
        label: 'SUPPORTED',
        badgeClass: 'badge-supported',
        icon: CheckCircle2,
        color: '#10B981',
        bgGlow: 'rgba(16, 185, 129, 0.15)',
        description: 'The claim is corroborated by verified primary records, reputable reporting, or scientific evidence.'
      };
    }
    if (norm.includes('false') || norm.includes('contradict')) {
      return {
        label: 'FALSE / CONTRADICTED',
        badgeClass: 'badge-contradicted',
        icon: XCircle,
        color: '#EF4444',
        bgGlow: 'rgba(239, 68, 68, 0.15)',
        description: 'The claim is directly contradicted or debunked by verified facts, scientific research, or official agency records.'
      };
    }
    if (norm.includes('mislead')) {
      return {
        label: 'MISLEADING',
        badgeClass: 'badge-mixed',
        icon: AlertCircle,
        color: '#F59E0B',
        bgGlow: 'rgba(245, 158, 11, 0.15)',
        description: 'The claim uses true facts out of context, omits crucial caveats, or draws unsubstantiated conclusions.'
      };
    }
    if (norm.includes('outdate')) {
      return {
        label: 'OUTDATED',
        badgeClass: 'badge-mixed',
        icon: AlertCircle,
        color: '#FBBF24',
        bgGlow: 'rgba(251, 191, 36, 0.15)',
        description: 'The statement may have been accurate in the past but has been superseded by new events, data, or scientific guidance.'
      };
    }
    if (norm.includes('part') || norm.includes('mix')) {
      return {
        label: 'PARTLY TRUE',
        badgeClass: 'badge-mixed',
        icon: AlertCircle,
        color: '#F59E0B',
        bgGlow: 'rgba(245, 158, 11, 0.15)',
        description: 'Some elements of the claim are accurate, but key assertions remain unverified or overstated.'
      };
    }
    if (norm.includes('unverif')) {
      return {
        label: 'UNVERIFIED',
        badgeClass: 'badge-insufficient',
        icon: HelpCircle,
        color: '#818CF8',
        bgGlow: 'rgba(129, 140, 248, 0.15)',
        description: 'Circulating without sufficient independent verification or public record corroboration.'
      };
    }
    return {
      label: 'INSUFFICIENT EVIDENCE',
      badgeClass: 'badge-insufficient',
      icon: HelpCircle,
      color: '#A78BFA',
      bgGlow: 'rgba(167, 139, 250, 0.15)',
      description: 'Public records, web searches, and fact-checking indices provide insufficient basis to confirm or refute.'
    };
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
          <span className="provider-tag">Adjudicated with {provider_used} ({model_used})</span>
          {totalDuration > 0 && (
            <span className="duration-tag">
              <Clock size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} />
              {totalDuration}ms
            </span>
          )}
          <span className="timestamp-tag">
            <Calendar size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} />
            {formattedTime}
          </span>
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

      {/* Claim Prompt Banner */}
      <div className="original-claim-banner">
        <span className="claim-banner-label">Original Investigated Claim:</span>
        <blockquote className="claim-banner-quote">"{originalClaim}"</blockquote>
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
              <strong>Epistemic Soundness:</strong> {explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Evidence Metrics Bar */}
      <div className="evidence-metrics-bar">
        <span className="metric-pill supporting">
          <CheckCircle2 size={13} />
          <strong>{supportList.length}</strong> Supporting Points
        </span>
        <span className="metric-pill contradicting">
          <XCircle size={13} />
          <strong>{counterList.length}</strong> Counter Points
        </span>
        <span className="metric-pill sources">
          <Layers size={13} />
          <strong>{analysis.sources?.length || 0}</strong> Verified Sources
        </span>
      </div>

      {/* Executive Summary */}
      <div className="verdict-summary-box">
        <h4 className="summary-title">Executive Adjudication Summary</h4>
        <p className="summary-text">{summary}</p>
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
          margin-bottom: 16px;
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
          flex-wrap: wrap;
        }
        .audit-id-badge {
          font-family: 'JetBrains Mono', monospace;
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: 4px;
          color: var(--text-secondary);
        }
        .duration-tag, .timestamp-tag {
          font-size: 0.75rem;
          color: #94A3B8;
        }
        .original-claim-banner {
          background: rgba(15, 23, 42, 0.6);
          border-left: 3px solid #38BDF8;
          border-radius: 4px;
          padding: 10px 14px;
          margin-bottom: 20px;
        }
        .claim-banner-label {
          display: block;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #38BDF8;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .claim-banner-quote {
          margin: 0;
          font-size: 0.95rem;
          color: #F8FAFC;
          font-style: italic;
          line-height: 1.45;
        }
        .verdict-main-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 32px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .verdict-badge-block {
          display: flex;
          align-items: center;
          gap: 18px;
          flex: 1;
          min-width: 280px;
        }
        .verdict-icon-container {
          width: 64px;
          height: 64px;
          border-radius: 14px;
          border: 2px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .verdict-status-caption {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 4px;
          display: block;
        }
        .large-verdict-badge {
          font-size: 1.25rem;
          padding: 6px 16px;
          letter-spacing: 0.03em;
          display: inline-block;
          margin-bottom: 6px;
        }
        .verdict-subtext {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.4;
          max-width: 440px;
          margin: 0;
        }
        .confidence-block {
          flex: 0 0 320px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 16px;
        }
        .confidence-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .conf-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .conf-value {
          font-size: 1.25rem;
          font-weight: 800;
          font-family: 'JetBrains Mono', monospace;
        }
        .confidence-track {
          height: 8px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .confidence-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .conf-expl-box {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          background: rgba(0, 0, 0, 0.2);
          padding: 8px 10px;
          border-radius: 6px;
        }
        .info-icon {
          color: var(--text-muted);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .conf-expl-text {
          font-size: 0.74rem;
          color: var(--text-muted);
          line-height: 1.35;
          margin: 0;
        }
        .evidence-metrics-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .metric-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          padding: 4px 12px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.04);
          color: #94A3B8;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .metric-pill.supporting {
          color: #10B981;
          border-color: rgba(16, 185, 129, 0.25);
          background: rgba(16, 185, 129, 0.08);
        }
        .metric-pill.contradicting {
          color: #EF4444;
          border-color: rgba(239, 68, 68, 0.25);
          background: rgba(239, 68, 68, 0.08);
        }
        .metric-pill.sources {
          color: #38BDF8;
          border-color: rgba(56, 189, 248, 0.25);
          background: rgba(56, 189, 248, 0.08);
        }
        .verdict-summary-box {
          background: rgba(0, 0, 0, 0.25);
          border-left: 3px solid var(--primary-500);
          border-radius: 6px;
          padding: 16px;
        }
        .summary-title {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--primary-400);
          margin-bottom: 6px;
        }
        .summary-text {
          font-size: 0.92rem;
          line-height: 1.6;
          color: var(--text-main);
          margin: 0;
        }
      `}</style>
    </div>
  );
}
