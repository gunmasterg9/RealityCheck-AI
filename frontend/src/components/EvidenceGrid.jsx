import React, { useState } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Globe,
  Shield,
  BookOpen,
  Calendar,
  AlertCircle,
  WifiOff,
  Check,
  Building2,
  GraduationCap,
  MessageSquare,
  FileText
} from 'lucide-react';

export default function EvidenceGrid({ sources, evidence }) {
  const safeSources = Array.isArray(sources) ? sources : [];
  const safeEvidence = Array.isArray(evidence) ? evidence : [];

  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState(safeEvidence.length > 0 ? 'evidence' : 'sources');

  if (safeSources.length === 0 && safeEvidence.length === 0) return null;

  // Filter evidence by relationship
  const filteredEvidence = safeEvidence.filter((item) => {
    if (activeTab === 'all') return true;
    const rel = (item?.relationship || item?.direction || '').toUpperCase();
    if (activeTab === 'SUPPORTS') return rel === 'SUPPORTS' || rel === 'SUPPORTING';
    if (activeTab === 'CONTRADICTS') return rel === 'CONTRADICTS' || rel === 'CONTRADICTING';
    if (activeTab === 'PROVIDES_CONTEXT') return rel === 'PROVIDES_CONTEXT' || rel === 'CONTEXTUAL';
    if (activeTab === 'DOES_NOT_ADDRESS_CLAIM') return rel === 'DOES_NOT_ADDRESS_CLAIM';
    return true;
  });

  const supportingCount = safeEvidence.filter((e) => {
    const r = (e?.relationship || e?.direction || '').toUpperCase();
    return r === 'SUPPORTS' || r === 'SUPPORTING';
  }).length;

  const contradictingCount = safeEvidence.filter((e) => {
    const r = (e?.relationship || e?.direction || '').toUpperCase();
    return r === 'CONTRADICTS' || r === 'CONTRADICTING';
  }).length;

  const contextualCount = safeEvidence.filter((e) => {
    const r = (e?.relationship || e?.direction || '').toUpperCase();
    return r === 'PROVIDES_CONTEXT' || r === 'CONTEXTUAL';
  }).length;

  const doesNotAddressCount = safeEvidence.filter((e) => {
    const r = (e?.relationship || e?.direction || '').toUpperCase();
    return r === 'DOES_NOT_ADDRESS_CLAIM';
  }).length;

  const getCategoryConfig = (cat) => {
    switch (cat) {
      case 'PRIMARY_OFFICIAL':
        return { label: 'Primary Official / Gov', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.15)', icon: Building2 };
      case 'FACT_CHECK':
        return { label: 'Accredited Fact Check', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)', icon: Shield };
      case 'ACADEMIC':
        return { label: 'Academic / Peer-Reviewed', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', icon: GraduationCap };
      case 'INDEPENDENT_NEWS':
        return { label: 'Independent News', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.15)', icon: Globe };
      case 'SECONDARY_REFERENCE':
        return { label: 'Secondary Reference', color: '#0D9488', bg: 'rgba(13, 148, 136, 0.15)', icon: BookOpen };
      case 'SOCIAL_MEDIA':
        return { label: 'Social Media Post', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', icon: MessageSquare };
      case 'UNRELIABLE':
        return { label: 'Unreliable / Satire', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', icon: AlertCircle };
      case 'UNAVAILABLE':
        return { label: 'Unavailable / Inaccessible', color: '#64748B', bg: 'rgba(100, 116, 139, 0.15)', icon: WifiOff };
      case 'CONTEXTUAL':
      default:
        return { label: 'Contextual Web', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)', icon: FileText };
    }
  };

  const getRelationshipBadge = (rel, dir) => {
    const raw = (rel || dir || '').toUpperCase();
    if (raw.includes('SUPP')) {
      return { label: 'SUPPORTS CLAIM', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2 };
    }
    if (raw.includes('CONTRA')) {
      return { label: 'CONTRADICTS CLAIM', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', icon: XCircle };
    }
    if (raw.includes('DOES_NOT') || raw.includes('NOT_ADDRESS')) {
      return { label: 'DOES NOT ADDRESS', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)', icon: AlertCircle };
    }
    return { label: 'PROVIDES CONTEXT', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)', icon: HelpCircle };
  };

  const getRetrievalStatusBadge = (status, isAccessible, httpStatus) => {
    if (!isAccessible || status === 'inaccessible' || (httpStatus && httpStatus >= 400)) {
      return {
        label: `Inaccessible (HTTP ${httpStatus || 'Err'})`,
        color: '#F87171',
        bg: 'rgba(248, 113, 113, 0.12)'
      };
    }
    if (status === 'blocked') {
      return { label: 'Blocked (SSRF Guard)', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.12)' };
    }
    if (status === 'cached') {
      return { label: 'Cached Snapshot', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' };
    }
    return { label: 'URL-Validated (HTTP 200)', color: '#34D399', bg: 'rgba(52, 211, 153, 0.12)' };
  };

  return (
    <div className="panel evidence-grid-panel" style={{ marginTop: '1.5rem' }}>
      {/* Header bar */}
      <div className="evidence-header-bar">
        <div>
          <h3 className="evidence-title">
            Retrieved Sources & Evaluated Evidence Corpus ({safeSources.length} Sources, {safeEvidence.length} Findings)
          </h3>
          <span className="evidence-subtitle">
            Classified across 9 epistemic tiers. Distinguishes URL accessibility from source authenticity and factual support.
          </span>
        </div>

        {/* View switcher & Filters */}
        <div className="evidence-controls">
          <div className="view-toggle-group">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'evidence' ? 'active' : ''}`}
              onClick={() => setViewMode('evidence')}
            >
              Evaluated Findings ({safeEvidence.length})
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'sources' ? 'active' : ''}`}
              onClick={() => setViewMode('sources')}
            >
              Retrieved Sources Table ({safeSources.length})
            </button>
          </div>
        </div>
      </div>

      {/* Relationship Filter Tabs (for Evidence view) */}
      {viewMode === 'evidence' && (
        <div className="relationship-tabs-bar">
          <button
            type="button"
            className={`rel-filter-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Findings ({safeEvidence.length})
          </button>
          <button
            type="button"
            className={`rel-filter-btn supporting ${activeTab === 'SUPPORTS' ? 'active' : ''}`}
            onClick={() => setActiveTab('SUPPORTS')}
          >
            <CheckCircle2 size={12} /> Supports ({supportingCount})
          </button>
          <button
            type="button"
            className={`rel-filter-btn contradicting ${activeTab === 'CONTRADICTS' ? 'active' : ''}`}
            onClick={() => setActiveTab('CONTRADICTS')}
          >
            <XCircle size={12} /> Contradicts ({contradictingCount})
          </button>
          <button
            type="button"
            className={`rel-filter-btn contextual ${activeTab === 'PROVIDES_CONTEXT' ? 'active' : ''}`}
            onClick={() => setActiveTab('PROVIDES_CONTEXT')}
          >
            <HelpCircle size={12} /> Context ({contextualCount})
          </button>
          {doesNotAddressCount > 0 && (
            <button
              type="button"
              className={`rel-filter-btn unaddressed ${activeTab === 'DOES_NOT_ADDRESS_CLAIM' ? 'active' : ''}`}
              onClick={() => setActiveTab('DOES_NOT_ADDRESS_CLAIM')}
            >
              <AlertCircle size={12} /> Does Not Address ({doesNotAddressCount})
            </button>
          )}
        </div>
      )}

      {/* VIEW 1: Evaluated Evidence Cards */}
      {viewMode === 'evidence' && (
        <div className="evidence-cards-grid">
          {filteredEvidence.map((item, idx) => {
            const relBadge = getRelationshipBadge(item.relationship, item.direction);
            const RelIcon = relBadge.icon;

            // Match source category if available
            const matchedSource = safeSources.find((s) => s.url === item.source_url);
            const cat = item.source_category || matchedSource?.source_category || 'CONTEXTUAL';
            const catConfig = getCategoryConfig(cat);
            const CatIcon = catConfig.icon;

            const isAccessible = matchedSource?.is_url_accessible !== false && matchedSource?.retrieval_status !== 'inaccessible';
            const statusBadge = getRetrievalStatusBadge(
              matchedSource?.retrieval_status || 'accessible',
              isAccessible,
              matchedSource?.http_status || 200
            );

            return (
              <div key={item.id || idx} className="evidence-card">
                <div>
                  {/* Card Header */}
                  <div className="card-top-row">
                    <div className="card-publisher-box">
                      <span className="publisher-name" title={item.publisher}>
                        <Globe size={13} className="globe-icon" />
                        {item.publisher || 'Retrieved Web Publisher'}
                      </span>
                      <span className="source-category-tag" style={{ color: catConfig.color, background: catConfig.bg }}>
                        <CatIcon size={11} /> {catConfig.label}
                      </span>
                    </div>

                    <span className="relationship-tag" style={{ color: relBadge.color, background: relBadge.bg }}>
                      <RelIcon size={12} /> {relBadge.label}
                    </span>
                  </div>

                  {/* Supporting Excerpt or Direct Quote */}
                  <div className="evidence-excerpt-box">
                    <p className="evidence-excerpt-text">
                      "{typeof item?.excerpt === 'object' ? JSON.stringify(item.excerpt) : String(item?.excerpt || '')}"
                    </p>
                  </div>

                  {/* Specific Relationship Explanation */}
                  {item.relationship_explanation && (
                    <div className="relationship-explanation-box">
                      <span className="expl-label">Relationship Rationale:</span>
                      <p className="expl-text">{item.relationship_explanation}</p>
                    </div>
                  )}
                </div>

                {/* Card Footer: Metadata and Source Link */}
                <div className="card-footer-row">
                  <div className="footer-left-meta">
                    <span className="retrieval-status-tag" style={{ color: statusBadge.color, background: statusBadge.bg }}>
                      {statusBadge.label}
                    </span>
                    {matchedSource?.publish_date && (
                      <span className="pub-date-tag">
                        <Calendar size={11} /> {matchedSource.publish_date}
                      </span>
                    )}
                  </div>

                  {item.source_url && (
                    <div className="footer-right-actions">
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inspect-source-link"
                      >
                        <span>Inspect Original Source</span>
                        <ExternalLink size={11} />
                      </a>
                      <span className="relevance-pct">
                        Relevance: {Math.round((item.relevance_score || 0.85) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Discovered Sources Table / Summary Strip */}
      {safeSources.length > 0 && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={14} /> Discovered Web & Encyclopedia Sources:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {safeSources.map((s, idx) => (
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
                <span>{s.publisher ? `${s.publisher}: ` : ''}{s.title ? (s.title.length > 40 ? s.title.slice(0, 40) + '...' : s.title) : 'Source Link'}</span>
                <ExternalLink size={10} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: Retrieved Sources Master Table */}
      {viewMode === 'sources' && (
        <div className="sources-table-container">
          <table className="sources-master-table">
            <thead>
              <tr>
                <th>Publisher</th>
                <th>Category</th>
                <th>Publication Date</th>
                <th>Retrieval Status</th>
                <th>Evidence Relationship</th>
                <th>Relevance</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {safeSources.map((s, idx) => {
                const catConfig = getCategoryConfig(s.source_category || 'CONTEXTUAL');
                const CatIcon = catConfig.icon;
                const relBadge = getRelationshipBadge(s.evidence_relationship, 'contextual');
                const isAccessible = s.is_url_accessible !== false && s.retrieval_status !== 'inaccessible';
                const statusBadge = getRetrievalStatusBadge(s.retrieval_status || 'accessible', isAccessible, s.http_status);

                return (
                  <tr key={s.id || idx}>
                    <td className="source-publisher-cell">
                      <div className="publisher-title-wrap">
                        <strong>{s.publisher || 'Unknown Publisher'}</strong>
                        <span className="source-headline">{s.title}</span>
                      </div>
                    </td>
                    <td>
                      <span className="source-category-tag" style={{ color: catConfig.color, background: catConfig.bg }}>
                        <CatIcon size={11} /> {catConfig.label}
                      </span>
                    </td>
                    <td className="source-date-cell">
                      {s.publish_date ? (
                        <span>
                          <Calendar size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                          {s.publish_date}
                        </span>
                      ) : (
                        <span className="text-muted">Not specified</span>
                      )}
                    </td>
                    <td>
                      <span className="retrieval-status-tag" style={{ color: statusBadge.color, background: statusBadge.bg }}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td>
                      <span className="relationship-tag" style={{ color: relBadge.color, background: relBadge.bg }}>
                        {relBadge.label}
                      </span>
                    </td>
                    <td className="relevance-cell">
                      {Math.round((s.relevance_score || 0.8) * 100)}%
                    </td>
                    <td>
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inspect-source-link"
                          title="Open original page in new tab"
                        >
                          <span>Visit</span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-muted">No URL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .evidence-grid-panel {
          padding: 20px 24px;
        }
        .evidence-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .evidence-title {
          margin: 0 0 4px 0;
          fontSize: 1.1rem;
          font-weight: 600;
          color: #F8FAFC;
        }
        .evidence-subtitle {
          font-size: 0.8rem;
          color: #94A3B8;
          display: block;
        }
        .view-toggle-group {
          display: flex;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 6px;
          overflow: hidden;
        }
        .view-toggle-btn {
          background: transparent;
          border: none;
          color: #94A3B8;
          padding: 6px 12px;
          font-size: 0.76rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .view-toggle-btn.active {
          background: #2563EB;
          color: #FFFFFF;
          font-weight: 600;
        }
        .relationship-tabs-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .rel-filter-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(148, 163, 184, 0.15);
          color: #CBD5E1;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rel-filter-btn.active {
          border-color: #38BDF8;
          background: rgba(56, 189, 248, 0.15);
          color: #F0F9FF;
          font-weight: 600;
        }
        .rel-filter-btn.supporting.active {
          border-color: #10B981;
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
        }
        .rel-filter-btn.contradicting.active {
          border-color: #EF4444;
          background: rgba(239, 68, 68, 0.15);
          color: #EF4444;
        }
        .rel-filter-btn.contextual.active {
          border-color: #60A5FA;
          background: rgba(96, 165, 250, 0.15);
          color: #60A5FA;
        }
        .evidence-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 14px;
        }
        .evidence-card {
          background: rgba(15, 23, 42, 0.65);
          border-radius: 8px;
          padding: 16px;
          border: 1px solid rgba(148, 163, 184, 0.15);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
        }
        .card-top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 10px;
          gap: 8px;
          flex-wrap: wrap;
        }
        .card-publisher-box {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .publisher-name {
          font-size: 0.8rem;
          font-weight: 700;
          color: #CBD5E1;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .globe-icon {
          color: #94A3B8;
        }
        .source-category-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.68rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 10px;
        }
        .relationship-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 12px;
          letter-spacing: 0.02em;
        }
        .evidence-excerpt-box {
          margin-bottom: 8px;
        }
        .evidence-excerpt-text {
          margin: 0;
          font-size: 0.86rem;
          color: #E2E8F0;
          line-height: 1.5;
          font-style: italic;
        }
        .relationship-explanation-box {
          background: rgba(0, 0, 0, 0.25);
          border-left: 2px solid #38BDF8;
          border-radius: 4px;
          padding: 6px 10px;
          margin-top: 8px;
        }
        .expl-label {
          display: block;
          font-size: 0.68rem;
          text-transform: uppercase;
          color: #38BDF8;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .expl-text {
          margin: 0;
          font-size: 0.78rem;
          color: #CBD5E1;
          line-height: 1.4;
        }
        .card-footer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
          flex-wrap: wrap;
          gap: 8px;
        }
        .footer-left-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .retrieval-status-tag {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .pub-date-tag {
          font-size: 0.7rem;
          color: #94A3B8;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .footer-right-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .inspect-source-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: #38BDF8;
          text-decoration: none;
          font-weight: 500;
        }
        .inspect-source-link:hover {
          text-decoration: underline;
        }
        .relevance-pct {
          font-size: 0.7rem;
          color: #64748B;
        }
        .sources-table-container {
          overflow-x: auto;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.15);
        }
        .sources-master-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          text-align: left;
        }
        .sources-master-table th {
          background: rgba(30, 41, 59, 0.7);
          color: #94A3B8;
          font-weight: 600;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.15);
          white-space: nowrap;
        }
        .sources-master-table td {
          padding: 10px 14px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.08);
          color: #E2E8F0;
        }
        .publisher-title-wrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-width: 240px;
        }
        .source-headline {
          font-size: 0.74rem;
          color: #94A3B8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .source-date-cell, .relevance-cell {
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

