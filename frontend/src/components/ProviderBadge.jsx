import React from 'react';
import { Cpu, Cloud, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function ProviderBadge({ providers }) {
  if (!providers) return null;

  const { local, cloud, active_default } = providers;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready':
        return <span className="status-dot online" />;
      case 'unconfigured':
        return <span className="status-dot unconfigured" />;
      default:
        return <span className="status-dot offline" />;
    }
  };

  return (
    <div className="provider-badges-container">
      {/* Local Provider */}
      <div className={`provider-pill ${local?.is_available ? 'active' : 'inactive'}`} title={local?.details}>
        <Cpu size={14} className="icon" />
        <span className="name">Local: {local?.model_id || 'gemma4:e4b'}</span>
        {getStatusIcon(local?.status)}
      </div>

      {/* Cloud Provider */}
      <div className={`provider-pill ${cloud?.is_available ? 'active' : 'inactive'}`} title={cloud?.details}>
        <Cloud size={14} className="icon" />
        <span className="name">Cloud: {cloud?.model_id || 'Gemini'}</span>
        {getStatusIcon(cloud?.status)}
      </div>

      <style>{`
        .provider-badges-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .provider-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          padding: 5px 10px;
          border-radius: 9999px;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .provider-pill.active {
          border-color: rgba(139, 92, 246, 0.3);
          color: var(--text-main);
        }
        .provider-pill .icon {
          color: var(--primary-500);
        }
        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          display: inline-block;
        }
        .status-dot.online {
          background-color: #10B981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
        }
        .status-dot.unconfigured {
          background-color: #64748B;
        }
        .status-dot.offline {
          background-color: #EF4444;
        }
      `}</style>
    </div>
  );
}
