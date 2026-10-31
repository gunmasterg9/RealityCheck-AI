import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
  Eye,
  Info,
  Sparkles,
  Layers,
  HardDrive,
  Activity,
  Check
} from 'lucide-react';
import {
  fetchOllamaModels,
  fetchOllamaStatus,
  selectOllamaModel,
  pullOllamaModel,
  fetchPullStatus,
  cancelPull
} from '../api';

export default function ModelSelector({
  onModelChanged,
  onProvidersRefresh
}) {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Pull model modal state
  const [isPullOpen, setIsPullOpen] = useState(false);
  const [pullModelName, setPullModelName] = useState('');
  const [pullProgress, setPullProgress] = useState(null);
  const [isPulling, setIsPulling] = useState(false);

  const dropdownRef = useRef(null);

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll pull status if in progress
  useEffect(() => {
    let interval = null;
    if (isPulling) {
      interval = setInterval(async () => {
        try {
          const status = await fetchPullStatus();
          setPullProgress(status);
          if (status.status === 'completed') {
            setIsPulling(false);
            setFeedbackMsg(`Successfully downloaded ${status.model || pullModelName}`);
            await loadModels();
          } else if (status.status === 'error' || status.status === 'cancelled') {
            setIsPulling(false);
            if (status.error) setErrorMessage(status.error);
          }
        } catch (err) {
          console.error('Failed to poll pull status:', err);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPulling, pullModelName]);

  const loadModels = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const [modelsData, statusData] = await Promise.all([
        fetchOllamaModels().catch(err => {
          console.warn('Ollama models discovery warning:', err);
          return { models: [], selected_model: '', total_count: 0 };
        }),
        fetchOllamaStatus().catch(err => {
          console.warn('Ollama status warning:', err);
          return { is_connected: false, selected_model: '', installed_count: 0, details: err.message };
        })
      ]);

      setModels(modelsData.models || []);
      const activeName = modelsData.selected_model || statusData.selected_model || 'qwen3:1.7b';
      setSelectedModel(activeName);

      const activeInfo = (modelsData.models || []).find(m => m.name === activeName) || null;
      setSelectedInfo(activeInfo);
      setOllamaStatus(statusData);

      if (onModelChanged) {
        onModelChanged(activeName, activeInfo);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load Ollama models');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectModel = async (modelName) => {
    if (modelName === selectedModel) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setErrorMessage(null);
    setFeedbackMsg(null);

    try {
      const resp = await selectOllamaModel(modelName);
      setSelectedModel(resp.selected_model);
      const newInfo = models.find(m => m.name === resp.selected_model) || null;
      setSelectedInfo(newInfo);
      setFeedbackMsg(`Switched active local model to ${resp.selected_model}`);
      setIsOpen(false);

      if (onModelChanged) {
        onModelChanged(resp.selected_model, newInfo);
      }
      if (onProvidersRefresh) {
        onProvidersRefresh();
      }
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to switch model');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleStartPull = async (e) => {
    e.preventDefault();
    if (!pullModelName.trim()) return;

    setErrorMessage(null);
    setIsPulling(true);
    try {
      await pullOllamaModel(pullModelName.trim());
      setPullProgress({
        status: 'pulling',
        model: pullModelName.trim(),
        percentage: 0.0,
        message: `Contacting Ollama registry for ${pullModelName.trim()}...`
      });
    } catch (err) {
      setIsPulling(false);
      setErrorMessage(err.message || 'Failed to start download');
    }
  };

  const handleCancelPull = async () => {
    try {
      await cancelPull();
      setIsPulling(false);
      setPullProgress(null);
      setFeedbackMsg('Model download cancelled');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error('Failed to cancel pull:', err);
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'lightweight':
        return '#10B981'; // Emerald
      case 'moderate':
        return '#38BDF8'; // Sky
      case 'heavy':
        return '#F59E0B'; // Amber
      case 'extreme':
        return '#EF4444'; // Rose
      default:
        return '#94A3B8';
    }
  };

  const isConnected = ollamaStatus?.is_connected ?? false;

  return (
    <div className="model-selector-wrapper" ref={dropdownRef}>
      {/* Active Model Bar & Trigger */}
      <div className="selector-control-bar">
        <button
          type="button"
          className={`model-selector-btn ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          title="Select active local AI model for CPU inference"
        >
          <div className="btn-left">
            <Cpu size={15} className="cpu-icon" style={{ color: getTierColor(selectedInfo?.resource_tier) }} />
            <div className="model-label-col">
              <span className="selector-sublabel">Local Ollama Model</span>
              <div className="model-name-row">
                <span className="model-active-name">{selectedModel || 'Select Model'}</span>
                {selectedInfo?.is_multimodal && (
                  <span className="multimodal-pill" title="Multimodal vision enabled">
                    <Eye size={11} /> Vision
                  </span>
                )}
                {selectedInfo && (
                  <span
                    className="tier-pill"
                    style={{
                      borderColor: getTierColor(selectedInfo.resource_tier),
                      color: getTierColor(selectedInfo.resource_tier)
                    }}
                  >
                    {selectedInfo.parameter_size || selectedInfo.size_formatted}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="btn-right">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} title={isConnected ? 'Ollama Online' : 'Ollama Offline'} />
            <ChevronDown size={14} className={`chevron-icon ${isOpen ? 'rotate' : ''}`} />
          </div>
        </button>

        <button
          type="button"
          className={`btn-icon-refresh ${isRefreshing ? 'spinning' : ''}`}
          onClick={loadModels}
          title="Refresh installed Ollama models"
          disabled={isRefreshing}
        >
          <RefreshCw size={14} />
        </button>

        <button
          type="button"
          className="btn-icon-pull"
          onClick={() => setIsPullOpen(true)}
          title="Download a new model from Ollama library"
        >
          <Download size={14} />
        </button>
      </div>

      {/* Notifications / Feedback */}
      {feedbackMsg && (
        <div className="feedback-banner success">
          <CheckCircle2 size={13} />
          <span>{feedbackMsg}</span>
        </div>
      )}
      {errorMessage && (
        <div className="feedback-banner error">
          <AlertTriangle size={13} />
          <span>{errorMessage}</span>
          <button className="banner-dismiss" onClick={() => setErrorMessage(null)}>×</button>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="model-dropdown-menu">
          <div className="dropdown-header">
            <div className="dropdown-title-row">
              <span className="dropdown-title">Installed Ollama Models</span>
              <span className="model-count-tag">{models.length} installed</span>
            </div>
            <p className="hardware-advisory">
              <Info size={12} style={{ display: 'inline', marginRight: 4 }} />
              <strong>Development Hardware:</strong> Intel Core i3, 8 GB RAM.
              1B–2B models (e.g. Qwen 3 1.7B) run fastest on CPU. 7B–8B models provide deeper reasoning & vision but require higher memory.
            </p>
          </div>

          <div className="models-list">
            {models.length === 0 ? (
              <div className="empty-models-state">
                <AlertTriangle size={18} style={{ color: '#F59E0B' }} />
                <p>No models found on Ollama at <code>{ollamaStatus?.base_url || 'http://127.0.0.1:11434'}</code>.</p>
                <button className="btn-pull-shortcut" onClick={() => { setIsOpen(false); setIsPullOpen(true); }}>
                  <Download size={13} /> Pull a Model
                </button>
              </div>
            ) : (
              models.map((m) => {
                const isCurrent = m.name === selectedModel;
                const isHeavy = m.resource_tier === 'heavy' || m.resource_tier === 'extreme';
                return (
                  <div
                    key={m.name}
                    className={`model-option-card ${isCurrent ? 'selected' : ''}`}
                    onClick={() => handleSelectModel(m.name)}
                  >
                    <div className="option-top-row">
                      <div className="option-name-group">
                        <span className="option-name">{m.name}</span>
                        {m.is_multimodal && (
                          <span className="vision-tag" title="Supports visual screenshots and charts">
                            <Eye size={10} /> Vision
                          </span>
                        )}
                        {isCurrent && (
                          <span className="active-check-tag">
                            <Check size={11} /> Active
                          </span>
                        )}
                      </div>
                      <span className="option-size-tag">{m.size_formatted}</span>
                    </div>

                    <div className="option-metadata-row">
                      <span className="meta-badge">Family: {m.family || 'gguf'}</span>
                      {m.parameter_size && <span className="meta-badge">Params: {m.parameter_size}</span>}
                      {m.quantization_level && <span className="meta-badge">{m.quantization_level}</span>}
                      <span
                        className="tier-badge"
                        style={{
                          background: `${getTierColor(m.resource_tier)}20`,
                          color: getTierColor(m.resource_tier),
                          borderColor: `${getTierColor(m.resource_tier)}40`
                        }}
                      >
                        {m.resource_tier.toUpperCase()}
                      </span>
                    </div>

                    {/* Hardware Advisory Warning for 8GB RAM Laptop */}
                    {m.resource_warning && (
                      <div className={`resource-warning-box ${isHeavy ? 'warning-heavy' : 'warning-light'}`}>
                        {isHeavy ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                        <span>{m.resource_warning}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="dropdown-footer">
            <button
              type="button"
              className="btn-download-new"
              onClick={() => { setIsOpen(false); setIsPullOpen(true); }}
            >
              <Download size={13} />
              <span>Pull / Download New Model from Ollama</span>
            </button>
          </div>
        </div>
      )}

      {/* Pull / Download Modal */}
      {isPullOpen && (
        <div className="pull-modal-overlay">
          <div className="pull-modal-card">
            <div className="pull-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={18} style={{ color: '#38BDF8' }} />
                <h3 className="pull-title">Pull Ollama Model</h3>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => { if (!isPulling) setIsPullOpen(false); }}
                disabled={isPulling}
              >
                <X size={16} />
              </button>
            </div>

            <div className="pull-modal-body">
              <p className="pull-description">
                Download models directly from the Ollama library without leaving RealityCheck AI.
              </p>

              <div className="pull-hardware-notice">
                <AlertTriangle size={14} style={{ color: '#F59E0B', flexShrink: 0 }} />
                <div>
                  <strong>Resource Warning (8 GB RAM Laptop):</strong>
                  <br />
                  Recommended: <code>qwen3:1.7b</code>, <code>smollm2:1.7b</code>, or <code>llama3.2:1b</code>.
                  Avoid downloading models larger than 8B on this machine to prevent memory exhaustion.
                </div>
              </div>

              {!isPulling ? (
                <form onSubmit={handleStartPull}>
                  <label className="pull-field-label">Model Identifier (e.g. <code>qwen2.5:0.5b</code>, <code>smollm2:latest</code>)</label>
                  <input
                    type="text"
                    className="pull-text-input"
                    placeholder="e.g. smollm2:1.7b or qwen2.5:0.5b"
                    value={pullModelName}
                    onChange={(e) => setPullModelName(e.target.value)}
                    required
                  />

                  <div className="popular-suggestions">
                    <span className="suggestions-label">Lightweight suggestions:</span>
                    {['qwen3:1.7b', 'smollm2:latest', 'llama3.2:1b', 'gemma4:e4b'].map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="suggestion-pill"
                        onClick={() => setPullModelName(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>

                  <div className="pull-actions">
                    <button
                      type="button"
                      className="btn-cancel-modal"
                      onClick={() => setIsPullOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-submit-pull"
                      disabled={!pullModelName.trim()}
                    >
                      <Download size={14} /> Start Download
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pull-progress-container">
                  <div className="progress-info-row">
                    <span className="pulling-model-name">Pulling: <strong>{pullModelName}</strong></span>
                    <span className="pull-pct">{pullProgress?.percentage || 0}%</span>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${pullProgress?.percentage || 0}%` }}
                    />
                  </div>

                  <p className="pull-status-msg">
                    {pullProgress?.message || 'Contacting Ollama daemon...'}
                  </p>

                  <div className="pull-cancel-row">
                    <button
                      type="button"
                      className="btn-abort-pull"
                      onClick={handleCancelPull}
                    >
                      <X size={13} /> Cancel Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .model-selector-wrapper {
          position: relative;
          display: inline-block;
          font-family: inherit;
        }
        .selector-control-bar {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .model-selector-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          padding: 6px 12px;
          cursor: pointer;
          color: var(--text-main, #F1F5F9);
          transition: all 0.2s ease;
          min-width: 220px;
          text-align: left;
        }
        .model-selector-btn:hover, .model-selector-btn.active {
          border-color: rgba(56, 189, 248, 0.5);
          background: rgba(30, 41, 59, 0.9);
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.15);
        }
        .btn-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .model-label-col {
          display: flex;
          flex-direction: column;
        }
        .selector-sublabel {
          font-size: 0.65rem;
          color: var(--text-secondary, #94A3B8);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .model-name-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .model-active-name {
          font-size: 0.82rem;
          font-weight: 700;
          color: #F8FAFC;
        }
        .multimodal-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.65rem;
          padding: 1px 5px;
          border-radius: 6px;
          background: rgba(167, 139, 250, 0.2);
          color: #C4B5FD;
          font-weight: 600;
        }
        .tier-pill {
          font-size: 0.65rem;
          padding: 1px 5px;
          border-radius: 6px;
          border: 1px solid;
          font-weight: 600;
        }
        .btn-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }
        .status-dot.online {
          background-color: #10B981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
        }
        .status-dot.offline {
          background-color: #EF4444;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
        }
        .chevron-icon {
          color: #94A3B8;
          transition: transform 0.2s ease;
        }
        .chevron-icon.rotate {
          transform: rotate(180deg);
        }
        .btn-icon-refresh, .btn-icon-pull {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          color: #94A3B8;
          padding: 7px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .btn-icon-refresh:hover, .btn-icon-pull:hover {
          color: #38BDF8;
          border-color: rgba(56, 189, 248, 0.4);
        }
        .btn-icon-refresh.spinning svg {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .feedback-banner {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 50;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .feedback-banner.success {
          background: #064E3B;
          color: #6EE7B7;
          border: 1px solid #059669;
        }
        .feedback-banner.error {
          background: #7F1D1D;
          color: #FCA5A5;
          border: 1px solid #DC2626;
        }
        .banner-dismiss {
          background: transparent;
          border: none;
          color: inherit;
          cursor: pointer;
          font-size: 1rem;
          margin-left: 6px;
        }
        .model-dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 8px;
          width: 380px;
          max-height: 480px;
          background: #0F172A;
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 12px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
          z-index: 55;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .dropdown-header {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.15);
          background: rgba(30, 41, 59, 0.4);
        }
        .dropdown-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .dropdown-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #F1F5F9;
        }
        .model-count-tag {
          font-size: 0.7rem;
          background: rgba(56, 189, 248, 0.15);
          color: #38BDF8;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
        }
        .hardware-advisory {
          font-size: 0.72rem;
          color: #94A3B8;
          line-height: 1.35;
          margin: 0;
        }
        .models-list {
          padding: 8px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 320px;
        }
        .model-option-card {
          padding: 9px 12px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .model-option-card:hover {
          background: rgba(51, 65, 85, 0.6);
          border-color: rgba(56, 189, 248, 0.4);
        }
        .model-option-card.selected {
          border-color: #38BDF8;
          background: rgba(56, 189, 248, 0.12);
        }
        .option-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .option-name-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .option-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: #F8FAFC;
        }
        .vision-tag {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 0.62rem;
          padding: 1px 4px;
          border-radius: 4px;
          background: rgba(167, 139, 250, 0.25);
          color: #DDD6FE;
          font-weight: 600;
        }
        .active-check-tag {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 0.65rem;
          color: #38BDF8;
          font-weight: 600;
        }
        .option-size-tag {
          font-size: 0.72rem;
          color: #94A3B8;
          font-weight: 600;
        }
        .option-metadata-row {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
        .meta-badge {
          font-size: 0.65rem;
          background: rgba(15, 23, 42, 0.6);
          padding: 1px 5px;
          border-radius: 4px;
          color: #94A3B8;
        }
        .tier-badge {
          font-size: 0.62rem;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid;
          font-weight: 700;
        }
        .resource-warning-box {
          font-size: 0.68rem;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 6px;
          border-radius: 4px;
          margin-top: 4px;
        }
        .resource-warning-box.warning-heavy {
          background: rgba(245, 158, 11, 0.15);
          color: #FCD34D;
        }
        .resource-warning-box.warning-light {
          background: rgba(16, 185, 129, 0.12);
          color: #6EE7B7;
        }
        .dropdown-footer {
          padding: 10px 12px;
          border-top: 1px solid rgba(148, 163, 184, 0.15);
          background: rgba(15, 23, 42, 0.8);
        }
        .btn-download-new {
          width: 100%;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #38BDF8;
          border-radius: 8px;
          padding: 7px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
        }
        .btn-download-new:hover {
          background: rgba(56, 189, 248, 0.22);
          border-color: #38BDF8;
        }
        .pull-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .pull-modal-card {
          width: 100%;
          max-width: 480px;
          background: #0F172A;
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 14px;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.7);
          overflow: hidden;
        }
        .pull-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.15);
        }
        .pull-title {
          font-size: 1rem;
          margin: 0;
          color: #F8FAFC;
        }
        .btn-close-modal {
          background: transparent;
          border: none;
          color: #94A3B8;
          cursor: pointer;
        }
        .pull-modal-body {
          padding: 18px;
        }
        .pull-description {
          font-size: 0.82rem;
          color: #94A3B8;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .pull-hardware-notice {
          display: flex;
          gap: 10px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          padding: 10px;
          font-size: 0.75rem;
          color: #FCD34D;
          margin-bottom: 16px;
          line-height: 1.4;
        }
        .pull-field-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          color: #E2E8F0;
          margin-bottom: 6px;
        }
        .pull-text-input {
          width: 100%;
          box-sizing: border-box;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          padding: 9px 12px;
          color: #F8FAFC;
          font-size: 0.85rem;
          margin-bottom: 12px;
        }
        .pull-text-input:focus {
          outline: none;
          border-color: #38BDF8;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
        }
        .popular-suggestions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .suggestions-label {
          font-size: 0.7rem;
          color: #64748B;
        }
        .suggestion-pill {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #94A3B8;
          border-radius: 6px;
          padding: 2px 7px;
          font-size: 0.7rem;
          cursor: pointer;
        }
        .suggestion-pill:hover {
          color: #38BDF8;
          border-color: #38BDF8;
        }
        .pull-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .btn-cancel-modal {
          background: transparent;
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #94A3B8;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .btn-submit-pull {
          background: #0284C7;
          border: none;
          color: #FFFFFF;
          padding: 7px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-submit-pull:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pull-progress-container {
          padding: 10px 0;
        }
        .progress-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 0.82rem;
          color: #F8FAFC;
        }
        .pull-pct {
          font-weight: 700;
          color: #38BDF8;
        }
        .progress-track {
          width: 100%;
          height: 8px;
          background: rgba(30, 41, 59, 0.8);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #38BDF8, #818CF8);
          transition: width 0.3s ease;
        }
        .pull-status-msg {
          font-size: 0.75rem;
          color: #94A3B8;
          margin: 0 0 14px 0;
        }
        .pull-cancel-row {
          display: flex;
          justify-content: flex-end;
        }
        .btn-abort-pull {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #FCA5A5;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>
    </div>
  );
}
