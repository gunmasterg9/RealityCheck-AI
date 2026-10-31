import React, { useState, useRef } from 'react';
import { Send, FileText, Sparkles, Trash2, Image as ImageIcon, X, Upload } from 'lucide-react';

export default function ClaimInput({
  claim,
  setClaim,
  context,
  setContext,
  imageData,
  setImageData,
  providerPreference,
  setProviderPreference,
  sampleClaims,
  onAnalyze,
  isLoading
}) {
  const [showContext, setShowContext] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPEG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target.result;
      setImageData(b64);
      setImagePreview({
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        url: b64
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageData(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectSample = async (sample) => {
    setClaim(sample.claim);
    setContext(sample.context || '');
    if (sample.context) setShowContext(true);

    if (sample.image_url) {
      try {
        const res = await fetch(sample.image_url);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = (event) => {
          const b64 = event.target.result;
          setImageData(b64);
          setImagePreview({
            name: sample.image_url.split('/').pop(),
            size: `${Math.round(blob.size / 1024)} KB`,
            url: b64
          });
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('Failed to preload sample image:', err);
      }
    } else {
      handleRemoveImage();
    }
  };

  const handleClear = () => {
    setClaim('');
    setContext('');
    handleRemoveImage();
  };

  const isClaimValid = claim.trim().length >= 3;

  return (
    <div className="panel claim-panel">
      {/* Sample claims quick loader */}
      {sampleClaims && sampleClaims.length > 0 && (
        <div className="sample-claims-bar">
          <div className="sample-label">
            <Sparkles size={14} className="sparkle-icon" />
            <span>Curated Gemma 4 Multimodal Demos:</span>
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
                {sample.has_image && <ImageIcon size={12} className="inline-icon" />}
                <span>{sample.title}</span>
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
            placeholder="e.g. The company announced a 100,000x quantum supremacy speedup over supercomputers on general optimization workloads..."
            value={claim}
            onChange={(e) => setClaim(e.target.value.slice(0, 2000))}
            rows={3}
            disabled={isLoading}
          />
        </div>

        {/* Multimodal Image Evidence Upload Area */}
        <div className="image-evidence-container">
          <div className="image-header-row">
            <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ImageIcon size={15} style={{ color: '#A78BFA' }} />
              <span>Visual Evidence / Chart Screenshot (Gemma 4 Multimodal)</span>
            </label>
            <span className="optional-tag">Optional</span>
          </div>

          {!imagePreview ? (
            <div 
              className="dropzone-box" 
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={20} className="upload-icon" />
              <div className="dropzone-text">
                <strong>Click to upload chart, screenshot, or product label</strong> (PNG, JPG, WebP)
              </div>
              <div className="dropzone-sub">
                Gemma 4 will inspect footnotes, chart axes, fine-print asterisks, and nutritional tables.
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
                disabled={isLoading}
              />
            </div>
          ) : (
            <div className="image-preview-card">
              <img src={imagePreview.url} alt="Attached Evidence" className="preview-thumb" />
              <div className="preview-details">
                <div className="preview-name">{imagePreview.name}</div>
                <div className="preview-meta">{imagePreview.size} • Attached to Gemma 4 prompt</div>
              </div>
              <button
                type="button"
                className="btn-ghost remove-img-btn"
                onClick={handleRemoveImage}
                disabled={isLoading}
                title="Remove attached image"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Collapsible Context / Text Evidence */}
        <div className="context-accordion">
          <div className="context-toggle-row">
            <button
              type="button"
              className="btn-ghost context-toggle-btn"
              onClick={() => setShowContext(!showContext)}
            >
              <FileText size={15} />
              <span>{showContext ? 'Hide' : 'Add'} Supplementary Text Excerpts</span>
              {context && !showContext && (
                <span className="context-attached-indicator">Text Attached</span>
              )}
            </button>
            {context && (
              <span className="char-count">{context.length} / 12000</span>
            )}
          </div>

          {showContext && (
            <div className="context-body">
              <textarea
                className="styled-textarea context-textarea"
                placeholder="Paste press release text, official transcripts, or background documentation..."
                value={context}
                onChange={(e) => setContext(e.target.value.slice(0, 12000))}
                rows={3}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        {/* Action and Provider Selection Bar */}
        <div className="form-bottom-bar">
          <div className="provider-selector-group">
            <label className="selector-label">Inference Target:</label>
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
                Auto (Local Gemma 4 1st)
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
                Local Gemma 4 (Ollama)
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
                Hosted Gemma 4 (Gemini API)
              </label>
            </div>
          </div>

          <div className="action-buttons">
            {(claim || context || imageData) && (
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
                  <span>Auditing with Gemma 4...</span>
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
          padding: 22px 24px;
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
          display: inline-flex;
          align-items: center;
          gap: 5px;
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
        .inline-icon {
          color: #A78BFA;
        }
        .input-field-group {
          margin-bottom: 16px;
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
        .optional-tag {
          font-size: 0.72rem;
          color: var(--text-muted);
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
        .image-evidence-container {
          margin-bottom: 16px;
        }
        .image-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .dropzone-box {
          border: 1px dashed rgba(139, 92, 246, 0.35);
          background: rgba(139, 92, 246, 0.03);
          border-radius: 10px;
          padding: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dropzone-box:hover {
          border-color: var(--primary-500);
          background: rgba(139, 92, 246, 0.08);
        }
        .upload-icon {
          color: #A78BFA;
          margin-bottom: 4px;
        }
        .dropzone-text {
          font-size: 0.85rem;
          color: var(--text-main);
          margin-bottom: 2px;
        }
        .dropzone-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .image-preview-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-card);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 10px;
          padding: 8px 12px;
        }
        .preview-thumb {
          width: 60px;
          height: 60px;
          border-radius: 6px;
          object-fit: cover;
          border: 1px solid var(--border-subtle);
        }
        .preview-details {
          flex: 1;
        }
        .preview-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-main);
        }
        .preview-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .remove-img-btn {
          color: var(--text-muted);
          padding: 6px;
        }
        .remove-img-btn:hover {
          color: #EF4444;
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
        .context-attached-indicator {
          background: rgba(16, 185, 129, 0.2);
          color: #34D399;
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          margin-left: 8px;
        }
        .context-body {
          margin-top: 8px;
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
          flex-wrap: wrap;
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
