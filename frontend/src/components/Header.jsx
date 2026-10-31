import React from 'react';
import { ShieldAlert, History, Award, BarChart2 } from 'lucide-react';
import ProviderBadge from './ProviderBadge';

export default function Header({
  providers,
  onOpenHistory,
  historyCount,
  onOpenBenchmark
}) {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <div className="brand-group">
          <div className="brand-icon-wrapper">
            <ShieldAlert size={26} className="brand-shield" />
          </div>
          <div>
            <div className="brand-title-row">
              <span className="brand-title">RealityCheck</span>
              <span className="brand-badge">AI</span>
              <div className="hackathon-prize-pill" onClick={onOpenBenchmark} title="Click to view Gemma 4 Benchmark">
                <Award size={12} className="award-icon" />
                <span>DigitalOcean Open-Source & Google Gemma 4</span>
              </div>
            </div>
            <p className="brand-tagline">Don't just trust an answer. Challenge it.</p>
          </div>
        </div>

        <div className="header-actions">
          <ProviderBadge providers={providers} />

          <button
            className="btn-secondary benchmark-btn"
            onClick={onOpenBenchmark}
            title="View Gemma 4 Empirical Benchmark"
          >
            <BarChart2 size={15} />
            <span>Benchmark</span>
          </button>
          
          <button 
            className="btn-secondary history-btn" 
            onClick={onOpenHistory}
            title="Browse past analyses"
          >
            <History size={16} />
            <span>Audit Log</span>
            {historyCount > 0 && (
              <span className="history-count-badge">{historyCount}</span>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .app-header {
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(14, 20, 36, 0.7);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 40;
          padding: 14px 0;
        }
        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .brand-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .brand-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.1));
          border: 1px solid rgba(139, 92, 246, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);
        }
        .brand-shield {
          color: #A78BFA;
        }
        .brand-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .brand-title {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(to right, #FFFFFF, #E2E8F0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .brand-badge {
          background: rgba(139, 92, 246, 0.2);
          color: #C4B5FD;
          border: 1px solid rgba(139, 92, 246, 0.4);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }
        .hackathon-prize-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #FDE68A;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .hackathon-prize-pill:hover {
          background: rgba(245, 158, 11, 0.25);
          border-color: rgba(245, 158, 11, 0.6);
        }
        .award-icon {
          color: #F59E0B;
        }
        .brand-tagline {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .benchmark-btn {
          font-size: 0.82rem;
          padding: 6px 12px;
        }
        .history-btn {
          position: relative;
        }
        .history-count-badge {
          background: var(--primary-600);
          color: #FFF;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 9999px;
          margin-left: 2px;
        }
      `}</style>
    </header>
  );
}
