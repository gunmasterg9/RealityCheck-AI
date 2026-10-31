import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lightbulb,
  FileCheck,
  ChevronRight,
  Eye,
  ScanLine
} from 'lucide-react';

export default function EvidenceSection({ analysis }) {
  if (!analysis) return null;

  const fj = analysis.final_judgment || {};
  const ia = analysis.initial_assessment || {};
  const has_image = Boolean(analysis.has_image || analysis.input_type === 'image');
  const [activeTab, setActiveTab] = useState('all');

  const supportItems = Array.isArray(analysis.supporting_evidence)
    ? analysis.supporting_evidence
    : Array.isArray(analysis.supporting_points)
    ? analysis.supporting_points
    : Array.isArray(fj.support_evidence)
    ? fj.support_evidence
    : [];

  const counterItems = Array.isArray(analysis.contradicting_evidence)
    ? analysis.contradicting_evidence
    : Array.isArray(analysis.contradicting_points)
    ? analysis.contradicting_points
    : Array.isArray(fj.counter_evidence)
    ? fj.counter_evidence
    : [];

  const assumptionItems = Array.isArray(analysis.assumptions)
    ? analysis.assumptions
    : Array.isArray(fj.assumptions)
    ? fj.assumptions
    : [];

  const unknownItems = Array.isArray(analysis.unknowns)
    ? analysis.unknowns
    : Array.isArray(fj.unknowns)
    ? fj.unknowns
    : [];

  const visualObservations = Array.isArray(ia.visual_observations) ? ia.visual_observations : [];
  const visualVerifications = Array.isArray(fj.visual_verifications) ? fj.visual_verifications : [];

  const tabs = [
    { id: 'all', label: 'All Items', count: supportItems.length + counterItems.length + assumptionItems.length + unknownItems.length },
    { id: 'support', label: 'Support Evidence', count: supportItems.length, color: '#10B981' },
    { id: 'counter', label: 'Counter Arguments', count: counterItems.length, color: '#EF4444' },
    { id: 'assumption', label: 'Assumptions', count: assumptionItems.length, color: '#F59E0B' },
    { id: 'unknown', label: 'Unknowns', count: unknownItems.length, color: '#A78BFA' }
  ];

  return (
    <div className="panel evidence-panel">
      <div className="evidence-header">
        <div className="title-group">
          <FileCheck size={20} className="header-icon" />
          <h3 className="section-title">Four-Way Epistemic Evidence Breakdown</h3>
        </div>
        <p className="section-desc">
          Strictly categorizing verified support, counter-points, unstated assumptions, and missing variables.
        </p>
      </div>

      {/* Multimodal Extraction Card (if image observations exist) */}
      {(has_image || visualObservations.length > 0 || visualVerifications.length > 0) && (
        <div className="visual-evidence-banner">
          <div className="banner-title-row">
            <ScanLine size={16} className="scan-icon" />
            <h4>Gemma 4 Multimodal Visual Evidence Observations</h4>
          </div>
          <p className="banner-sub">
            Gemma 4 extracted these critical chart data points, footnote disclosures, and fine-print text directly from the attached image:
          </p>
          <ul className="visual-obs-list">
            {(visualObservations.length > 0 ? visualObservations : visualVerifications).map((obs, idx) => (
              <li key={idx} className="visual-obs-item">
                <Eye size={13} className="eye-icon" />
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
            <span className="tab-count" style={tab.color ? { background: `${tab.color}20`, color: tab.color } : {}}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4 Quadrants Grid */}
      <div className="quadrant-grid">
        {/* Support items */}
        {(activeTab === 'all' || activeTab === 'support') && (
          <div className="quadrant-card support-quadrant">
            <div className="quadrant-header">
              <div className="quadrant-title-row">
                <CheckCircle2 size={16} className="q-icon" style={{ color: '#10B981' }} />
                <h4 style={{ color: '#10B981' }}>Verified Support Items</h4>
              </div>
              <span className="quadrant-badge">{supportItems.length}</span>
            </div>
            {supportItems.length === 0 ? (
              <p className="empty-notice">No verified empirical support identified in supplied input.</p>
            ) : (
              <ul className="evidence-list">
                {supportItems.map((item, idx) => (
                  <li key={idx} className="evidence-list-item support-item">
                    <ChevronRight size={14} className="bullet-icon" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Counter items */}
        {(activeTab === 'all' || activeTab === 'counter') && (
          <div className="quadrant-card counter-quadrant">
            <div className="quadrant-header">
              <div className="quadrant-title-row">
                <XCircle size={16} className="q-icon" style={{ color: '#EF4444' }} />
                <h4 style={{ color: '#EF4444' }}>Counter Arguments & Evidence</h4>
              </div>
              <span className="quadrant-badge">{counterItems.length}</span>
            </div>
            {counterItems.length === 0 ? (
              <p className="empty-notice">No direct contradiction surfaced.</p>
            ) : (
              <ul className="evidence-list">
                {counterItems.map((item, idx) => (
                  <li key={idx} className="evidence-list-item counter-item">
                    <ChevronRight size={14} className="bullet-icon" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Assumptions */}
        {(activeTab === 'all' || activeTab === 'assumption') && (
          <div className="quadrant-card assumption-quadrant">
            <div className="quadrant-header">
              <div className="quadrant-title-row">
                <Lightbulb size={16} className="q-icon" style={{ color: '#F59E0B' }} />
                <h4 style={{ color: '#F59E0B' }}>Unstated Assumptions</h4>
              </div>
              <span className="quadrant-badge">{assumptionItems.length}</span>
            </div>
            {assumptionItems.length === 0 ? (
              <p className="empty-notice">No unverified assumptions identified.</p>
            ) : (
              <ul className="evidence-list">
                {assumptionItems.map((item, idx) => (
                  <li key={idx} className="evidence-list-item assumption-item">
                    <ChevronRight size={14} className="bullet-icon" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Unknowns */}
        {(activeTab === 'all' || activeTab === 'unknown') && (
          <div className="quadrant-card unknown-quadrant">
            <div className="quadrant-header">
              <div className="quadrant-title-row">
                <HelpCircle size={16} className="q-icon" style={{ color: '#A78BFA' }} />
                <h4 style={{ color: '#A78BFA' }}>Critical Unknowns</h4>
              </div>
              <span className="quadrant-badge">{unknownItems.length}</span>
            </div>
            {unknownItems.length === 0 ? (
              <p className="empty-notice">No critical unknowns identified.</p>
            ) : (
              <ul className="evidence-list">
                {unknownItems.map((item, idx) => (
                  <li key={idx} className="evidence-list-item unknown-item">
                    <ChevronRight size={14} className="bullet-icon" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <style>{`
        .evidence-panel {
          padding: 24px;
          margin-bottom: 28px;
        }
        .evidence-header {
          margin-bottom: 18px;
        }
        .title-group {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }
        .header-icon {
          color: #A78BFA;
        }
        .section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .section-desc {
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .visual-evidence-banner {
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .banner-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .banner-title-row h4 {
          font-size: 0.88rem;
          font-weight: 700;
          color: #DDD6FE;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .scan-icon {
          color: #A78BFA;
        }
        .banner-sub {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 10px;
        }
        .visual-obs-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .visual-obs-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.82rem;
          color: #F8FAFC;
          background: rgba(0, 0, 0, 0.2);
          padding: 6px 10px;
          border-radius: 6px;
        }
        .eye-icon {
          color: #38BDF8;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .tabs-bar {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tab-btn:hover {
          color: var(--text-main);
          border-color: var(--border-strong);
        }
        .tab-btn.active {
          background: rgba(139, 92, 246, 0.15);
          border-color: var(--primary-500);
          color: #FFF;
        }
        .tab-count {
          font-size: 0.7rem;
          padding: 1px 6px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.08);
          font-family: 'JetBrains Mono', monospace;
        }
        .quadrant-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 16px;
        }
        .quadrant-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 18px;
          display: flex;
          flex-direction: column;
        }
        .support-quadrant {
          border-top: 3px solid #10B981;
        }
        .counter-quadrant {
          border-top: 3px solid #EF4444;
        }
        .assumption-quadrant {
          border-top: 3px solid #F59E0B;
        }
        .unknown-quadrant {
          border-top: 3px solid #A78BFA;
        }
        .quadrant-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .quadrant-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .quadrant-title-row h4 {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .quadrant-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 9999px;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }
        .evidence-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .evidence-list-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.83rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }
        .bullet-icon {
          flex-shrink: 0;
          margin-top: 3px;
        }
        .support-item .bullet-icon { color: #10B981; }
        .counter-item .bullet-icon { color: #EF4444; }
        .assumption-item .bullet-icon { color: #F59E0B; }
        .unknown-item .bullet-icon { color: #A78BFA; }
        .empty-notice {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-style: italic;
          padding: 10px 0;
        }
      `}</style>
    </div>
  );
}
