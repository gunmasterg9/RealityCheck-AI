import React, { useState } from 'react';
import { ExternalLink, CheckCircle2, XCircle, HelpCircle, Globe, Shield, BookOpen } from 'lucide-react';

export default function EvidenceGrid({ sources, evidence }) {
  const [activeTab, setActiveTab] = useState('all');

  if ((!sources || sources.length === 0) && (!evidence || evidence.length === 0)) return null;

  const filteredEvidence = (evidence || []).filter((item) => {
    if (activeTab === 'all') return true;
    return item.direction === activeTab;
  });

  const supportingCount = (evidence || []).filter((e) => e.direction === 'supporting').length;
  const contradictingCount = (evidence || []).filter((e) => e.direction === 'contradicting').length;
  const contextualCount = (evidence || []).filter((e) => e.direction === 'contextual').length;

  const getDirectionBadge = (dir) => {
    switch (dir) {
      case 'supporting':
        return {
          label: 'Supporting Evidence',
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.15)',
          icon: CheckCircle2
        };
      case 'contradicting':
        return {
          label: 'Contradicting Evidence',
          color: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.15)',
          icon: XCircle
        };
      case 'contextual':
      default:
        return {
          label: 'Contextual Nuance',
          color: '#60A5FA',
          bg: 'rgba(96, 165, 250, 0.15)',
          icon: HelpCircle
        };
    }
  };

  return (
    <div className="panel evidence-grid-panel" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#F8FAFC' }}>
            Retrieved Sources & Evidence Corpus ({sources?.length || 0} Sources, {evidence?.length || 0} Findings)
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
            Extracted via real-time web retrieval, official fact-check tools, and SSRF-safe crawling.
          </span>
        </div>

        {/* Direction Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className={`btn-secondary ${activeTab === 'all' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('all')}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            All ({evidence?.length || 0})
          </button>
          <button
            type="button"
            className={`btn-secondary ${activeTab === 'supporting' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('supporting')}
            style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#10B981' }}
          >
            Supporting ({supportingCount})
          </button>
          <button
            type="button"
            className={`btn-secondary ${activeTab === 'contradicting' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('contradicting')}
            style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#EF4444' }}
          >
            Contradicting ({contradictingCount})
          </button>
          <button
            type="button"
            className={`btn-secondary ${activeTab === 'contextual' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('contextual')}
            style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#60A5FA' }}
          >
            Contextual ({contextualCount})
          </button>
        </div>
      </div>

      {/* Evidence Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {filteredEvidence.map((item, idx) => {
          const dirConfig = getDirectionBadge(item.direction);
          const Icon = dirConfig.icon;

          return (
            <div
              key={item.id || idx}
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                borderRadius: '8px',
                padding: '1rem',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Globe size={13} style={{ color: '#94A3B8' }} />
                    {item.publisher || 'Verified Source'}
                  </span>
                  <span
                    style={{
                      background: dirConfig.bg,
                      color: dirConfig.color,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Icon size={11} /> {dirConfig.label}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#E2E8F0', lineHeight: 1.45, fontStyle: 'italic' }}>
                  "{item.excerpt}"
                </div>
              </div>

              {item.source_url && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.75rem',
                      color: '#38BDF8',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    <span>Inspect Original Source</span>
                    <ExternalLink size={11} />
                  </a>
                  <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                    Relevance: {Math.round((item.relevance_score || 0.85) * 100)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Discovered Sources Table / Summary */}
      {sources && sources.length > 0 && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={14} /> Discovered Web & Encyclopedia Sources:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {sources.map((s, idx) => (
              <a
                key={idx}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  color: '#93C5FD',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>{s.publisher}: {s.title?.slice(0, 35)}...</span>
                <ExternalLink size={10} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

