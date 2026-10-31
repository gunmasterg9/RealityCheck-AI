import React from 'react';
import { ShieldCheck, ExternalLink, AlertOctagon, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export default function FactCheckMatchesBanner({ factChecks }) {
  if (!factChecks || factChecks.length === 0) return null;

  const getRatingBadgeStyle = (rating) => {
    const r = (rating || '').toLowerCase();
    if (r.includes('false') || r.includes('pants on fire') || r.includes('fake') || r.includes('hoax') || r.includes('incorrect')) {
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        color: '#EF4444',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        icon: AlertOctagon
      };
    }
    if (r.includes('true') || r.includes('verified') || r.includes('correct')) {
      return {
        bg: 'rgba(16, 185, 129, 0.15)',
        color: '#10B981',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        icon: CheckCircle2
      };
    }
    return {
      bg: 'rgba(245, 158, 11, 0.15)',
      color: '#F59E0B',
      border: '1px solid rgba(245, 158, 11, 0.4)',
      icon: AlertTriangle
    };
  };

  return (
    <div
      className="panel fact-check-banner"
      style={{
        marginTop: '1.5rem',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(96, 165, 250, 0.3)',
        borderRadius: '12px',
        padding: '1.25rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={20} style={{ color: '#38BDF8' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#F8FAFC' }}>
            Official ClaimReview Database Matches ({factChecks.length})
          </h3>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '3px 10px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38BDF8',
            fontWeight: 500
          }}
        >
          Google Fact Check Tools API
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {factChecks.map((item, idx) => {
          const badge = getRatingBadgeStyle(item.rating);
          const BadgeIcon = badge.icon;

          return (
            <div
              key={idx}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
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
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#93C5FD' }}>
                    {item.publisher}
                  </span>
                  <span
                    style={{
                      background: badge.bg,
                      color: badge.color,
                      border: badge.border,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <BadgeIcon size={12} /> {item.rating}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#E2E8F0', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                  "{item.claim_text}"
                </div>

                {item.review_title && (
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    {item.review_title}
                  </div>
                )}
              </div>

              {item.review_url && (
                <a
                  href={item.review_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.75rem',
                    color: '#38BDF8',
                    textDecoration: 'none',
                    fontWeight: 500,
                    alignSelf: 'flex-start',
                    marginTop: '0.25rem'
                  }}
                >
                  <span>Read Official Fact-Check</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
