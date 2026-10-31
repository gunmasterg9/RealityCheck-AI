import React, { useState } from 'react';
import { Send, FileText, Sparkles, Trash2, HelpCircle } from 'lucide-react';

export default function ClaimInput({
  claim,
  setClaim,
  context,
  setContext,
  providerPreference,
  setProviderPreference,
  sampleClaims,
  onAnalyze,
  isLoading
}) {
  const [showContext, setShowContext] = useState(false);

  const handleSelectSample = (sample) => {
    setClaim(sample.claim);
    setContext(sample.context || '');
    if (sample.context) {
      setShowContext(true);
    }
  };

  const handleClear = () => {
    setClaim('');
    setContext('');
  };

  const isClaimValid = claim.trim().length >= 3;

  return (
    <div className="panel claim-panel">
      {/* Sample claims loader */}
      {sampleClaims && sampleClaims.length > 0 && (
        <div className="sample-claims-bar">
          <div className="sample-label">
            <Sparkles size={14} className="sparkle-icon" />
            <span>Test with Curated Claim:</span>
          </div>
          <div className="sample-pills">
            {sampleClaims.map((sample) => (
              <button
                key={sample.id}
                type="button"
                className="sample-pill-btn"
                onClick={() => handleSelectSample(sample)}
                disabled={isLoading}
                title={`${sample.category}: ${sample.description}`}
              >
                {sample.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (isClaimValid && !isLoading) onAnalyze(); }}>
        {/* Main Claim Textarea */}
        <div className="input-field-group">
          <div className="field-header">
            <label className="field-label">
              Claim to Challenge & Investigate <span className="req">*</span>
            </label>
            <span className="char-count">{claim.length} / 2000</span>
          </div>
          <textarea
            className="styled-textarea claim-textarea"
            placeholder="e.g. The company announced a 100x efficiency breakthrough in quantum simulation, eliminating all thermal noise limitations..."
            value={claim}
            onChange={(e) => setClaim(e.target.value.slice(0, 2000))}
            rows={3}
            disabled={isLoading}
          />
        </div>

        {/* Collapsible Context / Evidence Section */}
        <div className="context-accordion">
          <div className="context-toggle-row">
            <button
              type="button"
              className="btn-ghost context-toggle-btn"
              onClick={() => setShowContext(!showContext)}
            >
              <FileText size={15} />
              <span>{showContext ? 'Hide' : 'Add'} Supplied Evidence / Context (Optional)</span>
              {context && !showContext && (
                <span className="context-attached-indicator">Attached</span>
              )}
            </button>
            {context && (
              <span className="char-count">{context.length} / 12000</span>
            )}
          </div>

          {showContext && (
            <div className="context-body">
              <p className="context-hint">
                Paste background excerpts, press releases, or source text. If no evidence is provided, RealityCheck AI enforces strict evidentiary burden of proof rather than assuming truth.
              </p>
              <textarea
                className="styled-textarea context-textarea"
                placeholder="Paste background context, quotes, or documentation to test whether the claim is actually backed by facts..."
                value={context}
                onChange={(e) => setContext(e.target.value.slice(0, 12000))}
                rows={4}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        {/* Action and Provider Selection Bar */}
        <div className="form-bottom-bar">
          <div className="provider-selector-group">
            <label className="selector-label">Inference Mode:</label>
            <div className="radio-options">
              <label className={`radio-pill ${providerPreference === 'auto' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value="auto"
                  checked={providerPreference === 'auto'}
                  onChange={() => setProviderPreference('auto')}
                  disabled={isLoading}
                />
                Auto (Local 1st)
              </label>
              <label className={`radio-pill ${providerPreference === 'local' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value="local"
                  checked={providerPreference === 'local'}
                  onChange={() => setProviderPreference('local')}
                  disabled={isLoading}
                />
                Local Gemma 4
              </label>
              <label className={`radio-pill ${providerPreference === 'cloud' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value="cloud"
                  checked={providerPreference === 'cloud'}
                  onChange={() => setProviderPreference('cloud')}
                  disabled={isLoading}
                />
                Cloud Gemini
              </label>
            </div>
          </div>

          <div className="action-buttons">
            {(claim || context) && (
              <button
                type="button"
                className="btn-ghost"
                onClick={handleClear}
                disabled={isLoading}
              >
                <Trash2 size={15} />
                <span>Clear</span>
              </button>
            )}

            <button
              type="submit"
              className="btn-primary analyze-submit-btn"
              disabled={!isClaimValid || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, border: '2px solid #FFF', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  <span>Challenging Claim...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Challenge Claim</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <style>{`
        .claim-panel {
          padding: 20px 24px;
          margin-bottom: 28px;
        }
        .sample-claims-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 16px;
          margin-bottom: 18px;
          border-bottom: 1px solid var(--border-subtle);
          flex-wrap: wrap;
        }
        .sample-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #C4B5FD;
        }
        .sparkle-icon {
          color: #A78BFA;
        }
        .sample-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .sample-pill-btn {
          background: rgba(139, 92, 246, 0.1);
          color: #DDD6FE;
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 9999px;
          padding: 4px 12px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .sample-pill-btn:hover:not(:disabled) {
          background: rgba(139, 92, 246, 0.25);
          border-color: rgba(139, 92, 246, 0.5);
          color: #FFF;
        }
        .input-field-group {
          margin-bottom: 14px;
        }
        .field-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .field-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-main);
        }
        .field-label .req {
          color: #F87171;
        }
        .char-count {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }
        .styled-textarea {
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 12px 14px;
          color: var(--text-main);
          font-family: inherit;
          font-size: 0.95rem;
          line-height: 1.5;
          resize: vertical;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .styled-textarea:focus {
          outline: none;
          border-color: var(--primary-500);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }
        .context-accordion {
          margin-bottom: 20px;
        }
        .context-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .context-toggle-btn {
          color: #A78BFA;
          font-weight: 500;
        }
        .context-toggle-btn:hover {
          color: #C4B5FD;
        }
        .context-attached-indicator {
          background: rgba(16, 185, 129, 0.2);
          color: #34D399;
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }
        .context-body {
          margin-top: 8px;
        }
        .context-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .form-bottom-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--border-subtle);
        }
        .provider-selector-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .selector-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .radio-options {
          display: flex;
          gap: 6px;
        }
        .radio-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.78rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .radio-pill.selected {
          border-color: var(--primary-500);
          color: #FFF;
          background: rgba(139, 92, 246, 0.15);
        }
        .radio-pill input {
          display: none;
        }
        .action-buttons {
          display: flex;
          align-items: center;
          gap: 10px;
        }
      `}</style>
    </div>
  );
}
