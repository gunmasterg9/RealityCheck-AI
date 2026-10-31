/**
 * RealityCheck AI API Client
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchProviders() {
  const res = await fetch(`${API_BASE}/api/providers`);
  if (!res.ok) throw new Error(`Failed to fetch providers: HTTP ${res.status}`);
  return res.json();
}

export async function fetchSampleClaims() {
  const res = await fetch(`${API_BASE}/api/sample-claims`);
  if (!res.ok) throw new Error(`Failed to fetch sample claims: HTTP ${res.status}`);
  return res.json();
}

export async function analyzeClaim(claim, context = null, providerPreference = 'auto') {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      claim,
      context: context && context.trim() ? context.trim() : null,
      provider_preference: providerPreference
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(errorData.detail || `Analysis request failed: HTTP ${res.status}`);
  }

  return res.json();
}

export async function fetchHistory(limit = 30, offset = 0) {
  const res = await fetch(`${API_BASE}/api/history?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`Failed to fetch history: HTTP ${res.status}`);
  return res.json();
}

export async function fetchAnalysisDetail(id) {
  const res = await fetch(`${API_BASE}/api/history/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch analysis: HTTP ${res.status}`);
  return res.json();
}

export async function deleteAnalysis(id) {
  const res = await fetch(`${API_BASE}/api/history/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete analysis: HTTP ${res.status}`);
  return res.json();
}

export function getExportUrl(id, format = 'json') {
  return `${API_BASE}/api/export/${id}?format=${format}`;
}
