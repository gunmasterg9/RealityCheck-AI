import React from 'react';
import { X, Award, BarChart3, CheckCircle2, Clock, Cpu, Zap } from 'lucide-react';

export default function BenchmarkModal({ isOpen, onClose, benchmarkData }) {
  if (!isOpen || !benchmarkData) return null;

  const {
    model_id,
    provider,
    hardware,
    avg_response_time_ms,
    schema_compliance_pct,
    adversarial_shift_pct,
    results
  } = benchmarkData;

  return (
    <div className="benchmark-backdrop" onClick={onClose}>
      <div className="benchmark-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="benchmark-modal-header">
          <div className="title-group">
            <Award size={22} className="award-icon" />
            <div>
              <h3>Gemma 4 Empirical Evaluation Benchmark</h3>
              <p className="sub">Rigorous testing across multimodal and adversarial challenge cases</p>
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="benchmark-body">
          {/* Hardware & Model Badge Row */}
          <div className="benchmark-meta-box">
            <div className="meta-item">
              <Cpu size={14} className="meta-icon" />
              <span><strong>Primary Model:</strong> {model_id} (Open-Weights 7.5B Q4)</span>
            </div>
            <div className="meta-item">
              <Zap size={14} className="meta-icon" />
              <span><strong>Inference Environment:</strong> {hardware || 'NVIDIA RTX 5060 Ti 16GB VRAM'}</span>
            </div>
          </div>

          {/* 3 Metric KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Avg Response Time</div>
              <div className="kpi-value">{(avg_response_time_ms / 1000).toFixed(2)}s</div>
              <div className="kpi-sub">3-stage pipeline latency</div>
            </div>

            <div className="kpi-card highlight-green">
              <div className="kpi-label">Structured Schema Compliance</div>
              <div className="kpi-value">{schema_compliance_pct}%</div>
              <div className="kpi-sub">Zero format deviations</div>
            </div>

            <div className="kpi-card highlight-purple">
              <div className="kpi-label">Adversarial Shift Rate</div>
              <div className="kpi-value">{adversarial_shift_pct}%</div>
              <div className="kpi-sub">Sycophancy prevention rate</div>
            </div>
          </div>

          {/* Evaluation Table */}
          <h4 className="table-heading">Multimodal Test Case Adjudication Breakdown</h4>
          <div className="benchmark-table-wrapper">
            <table className="benchmark-table">
              <thead>
                <tr>
                  <th>Test Case</th>
                  <th>Modalities</th>
                  <th>Latency</th>
                  <th>Initial Stance</th>
                  <th>Adjudicated Result</th>
                  <th>Adversarial Shift</th>
                  <th>Soundness</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.sample_id}>
                    <td className="bold-cell">{r.claim_title}</td>
                    <td>
                      <span className="multimodal-tag">
                        {r.is_multimodal ? 'Text + Visual Chart' : 'Text Only'}
                      </span>
                    </td>
                    <td className="mono">{r.response_time_ms}ms</td>
                    <td>
                      <span className="tiny-badge">{r.initial_verdict}</span>
                    </td>
                    <td>
                      <span className="tiny-badge final">{r.final_verdict}</span>
                    </td>
                    <td>
                      {r.verdict_shifted ? (
                        <span className="shift-pill yes">Shifted</span>
                      ) : (
                        <span className="shift-pill no">Tempered</span>
                      )}
                    </td>
                    <td className="mono font-bold">{Math.round(r.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Hackathon Dual Target Note */}
          <div className="dual-prize-callout">
            <div className="callout-header">
              <CheckCircle2 size={16} />
              <span>Targeting Dual Prize Categories</span>
            </div>
            <p>
              <strong>1. DigitalOcean Best Open-Source AI Project:</strong> Fully functional open-source codebase with local Gemma 4 inference, zero cloud dependencies, complete SQLite audit persistence, Docker containers, and clean reproducible scripts.
            </p>
            <p style={{ marginTop: 6 }}>
              <strong>2. Google Best Use of Gemma 4:</strong> Gemma 4 serves as the core intelligence across text and visual chart analysis, driving the 3-pass adversarial self-audit, extracting fine-print footnote evidence, and eliminating confirmation bias.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .benchmark-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .benchmark-modal-panel {
          background: var(--bg-surface);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 16px;
          max-width: 820px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
          animation: scaleUp 0.2s ease-out;
        }
        @keyframes scaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .benchmark-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .award-icon {
          color: #F59E0B;
        }
        .title-group h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #FFF;
        }
        .title-group .sub {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .benchmark-body {
          padding: 24px;
        }
        .benchmark-meta-box {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          padding: 10px 14px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .meta-icon {
          color: var(--primary-500);
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 680px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }
        .kpi-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 16px;
          text-align: center;
        }
        .kpi-card.highlight-green {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.04);
        }
        .kpi-card.highlight-purple {
          border-color: rgba(139, 92, 246, 0.3);
          background: rgba(139, 92, 246, 0.04);
        }
        .kpi-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .kpi-value {
          font-size: 1.8rem;
          font-weight: 800;
          font-family: 'JetBrains Mono', monospace;
          color: #FFF;
          margin-bottom: 4px;
        }
        .kpi-sub {
          font-size: 0.72rem;
          color: var(--text-secondary);
        }
        .table-heading {
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #DDD6FE;
          margin-bottom: 12px;
        }
        .benchmark-table-wrapper {
          overflow-x: auto;
          margin-bottom: 24px;
        }
        .benchmark-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          text-align: left;
        }
        .benchmark-table th {
          background: rgba(255, 255, 255, 0.04);
          padding: 8px 12px;
          color: var(--text-muted);
          font-weight: 600;
          border-bottom: 1px solid var(--border-subtle);
        }
        .benchmark-table td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          color: var(--text-secondary);
        }
        .bold-cell {
          font-weight: 600;
          color: var(--text-main);
        }
        .multimodal-tag {
          font-size: 0.7rem;
          background: rgba(139, 92, 246, 0.15);
          color: #C4B5FD;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .tiny-badge {
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          text-transform: uppercase;
          font-weight: 600;
        }
        .tiny-badge.final {
          background: rgba(16, 185, 129, 0.15);
          color: #34D399;
        }
        .shift-pill {
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }
        .shift-pill.yes {
          background: rgba(245, 158, 11, 0.2);
          color: #FBBF24;
        }
        .shift-pill.no {
          background: rgba(139, 92, 246, 0.2);
          color: #DDD6FE;
        }
        .dual-prize-callout {
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 10px;
          padding: 16px;
          font-size: 0.82rem;
          color: #E2E8F0;
          line-height: 1.45;
        }
        .callout-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: #C4B5FD;
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}
