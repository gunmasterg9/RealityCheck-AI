import React, { useState } from 'react';
import {
  X,
  History,
  Trash2,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { getExportUrl } from '../api';

export default function HistoryDrawer({
  isOpen,
  onClose,
  history,
  onSelectAnalysis,
  onDeleteAnalysis
}) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) =>
    item.claim.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.final_verdict.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVerdictBadge = (verdict) => {
    switch (verdict) {
      case 'supported':
        return <span className="badge badge-supported">Supported</span>;
      case 'contradicted':
        return <span className="badge badge-contradicted">Contradicted</span>;
      case 'mixed':
        return <span className="badge badge-mixed">Mixed</span>;
      case 'insufficient_evidence':
      default:
        return <span className="badge badge-insufficient">Insufficient</span>;
    }
  };

  const formatDate = (isoStr) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <History size={18} className="drawer-icon" />
            <h3>Analysis Audit History</h3>
            <span className="history-pill">{history.length} Saved</span>
          </div>
          <button className="btn-ghost close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search Input */}
        <div className="search-bar">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search claims, verdicts, summaries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* List of past analyses */}
        <div className="history-list">
          {filteredHistory.length === 0 ? (
            <div className="empty-history">
              <History size={36} className="empty-icon" />
              <p>No historical analyses match your criteria.</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div key={item.id} className="history-card" onClick={() => onSelectAnalysis(item.id)}>
                <div className="card-top-row">
                  <div className="verdict-shift-pills">
                    {getVerdictBadge(item.final_verdict)}
                    {item.initial_verdict !== item.final_verdict && (
                      <span className="shift-note">Shifted from {item.initial_verdict}</span>
                    )}
                  </div>
                  <span className="card-date">{formatDate(item.created_at)}</span>
                </div>

                <h4 className="card-claim">{item.claim}</h4>
                <p className="card-summary">{item.summary}</p>

                <div className="card-bottom-row">
                  <div className="card-meta">
                    <span className="mono sound-score">
                      Soundness: {Math.round(item.assessment_confidence * 100)}%
                    </span>
                    <span className="dot">•</span>
                    <span>{item.provider_used}</span>
                  </div>

                  <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={getExportUrl(item.id, 'html')}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost icon-link"
                      title="Open printable report"
                    >
                      <ExternalLink size={13} />
                    </a>
                    <button
                      className="btn-ghost icon-link del-link"
                      onClick={() => onDeleteAnalysis(item.id)}
                      title="Delete record"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      className="btn-primary load-btn"
                      onClick={() => onSelectAnalysis(item.id)}
                      title="Load this analysis"
                    >
                      <span>Load</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .drawer-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          z-index: 50;
          display: flex;
          justify-content: flex-end;
        }
        .drawer-panel {
          width: 100%;
          max-width: 540px;
          height: 100%;
          background: var(--bg-surface);
          border-left: 1px solid var(--border-subtle);
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          animation: slideIn 0.25s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .drawer-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .drawer-title-group h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .drawer-icon {
          color: #A78BFA;
        }
        .history-pill {
          font-size: 0.72rem;
          font-weight: 700;
          background: rgba(139, 92, 246, 0.15);
          color: #C4B5FD;
          padding: 2px 8px;
          border-radius: 9999px;
        }
        .close-btn {
          color: var(--text-muted);
        }
        .close-btn:hover {
          color: #FFF;
        }
        .search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(0, 0, 0, 0.15);
        }
        .search-icon {
          color: var(--text-muted);
        }
        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-main);
          font-size: 0.85rem;
          outline: none;
        }
        .history-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .empty-history {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--text-muted);
          gap: 12px;
        }
        .empty-icon {
          opacity: 0.4;
        }
        .history-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 14px 16px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .history-card:hover {
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateY(-1px);
          background: var(--bg-card-hover);
        }
        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .verdict-shift-pills {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .shift-note {
          font-size: 0.7rem;
          color: #FBBF24;
        }
        .card-date {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .card-claim {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 6px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-summary {
          font-size: 0.78rem;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: 10px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 8px;
        }
        .card-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .sound-score {
          color: #C4B5FD;
        }
        .card-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .icon-link {
          padding: 4px 6px;
        }
        .del-link:hover {
          color: #EF4444;
        }
        .load-btn {
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
