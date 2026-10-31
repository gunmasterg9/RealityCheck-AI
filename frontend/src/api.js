/**
 * RealityCheck AI API Client with Multimodal, Bounded Timeouts, and Request Cancellation
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

let activeAbortController = null;

export function abortActiveVerification() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
    return true;
  }
  return false;
}

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

export async function fetchBenchmarkReport() {
  const res = await fetch(`${API_BASE}/api/benchmark`);
  if (!res.ok) throw new Error(`Failed to fetch benchmark: HTTP ${res.status}`);
  return res.json();
}

export async function analyzeClaim(claim, context = null, providerPreference = 'auto', imageData = null, timeoutMs = 120000) {
  if (activeAbortController) activeAbortController.abort();
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  const timer = setTimeout(() => {
    if (activeAbortController) activeAbortController.abort();
  }, timeoutMs);

  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim,
        context: context && context.trim() ? context.trim() : null,
        image_data: imageData || null,
        provider_preference: providerPreference
      }),
      signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      throw new Error(errorData.detail || `Analysis request failed: HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error("Analysis was cancelled or timed out after 120 seconds.");
    }
    throw err;
  } finally {
    activeAbortController = null;
  }
}

/**
 * RealityCheck AI 2.0 Universal Fact Verification API call
 * Features client-side timeout and interactive cancellation.
 */
export async function verifyClaim(
  inputText,
  inputType = 'auto',
  providerPreference = 'auto',
  imageData = null,
  languageHint = null,
  timeoutMs = 180000
) {
  if (activeAbortController) activeAbortController.abort();
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  const timer = setTimeout(() => {
    if (activeAbortController) activeAbortController.abort();
  }, timeoutMs);

  try {
    const res = await fetch(`${API_BASE}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_text: inputText.trim(),
        input_type: inputType,
        image_data: imageData || null,
        provider_preference: providerPreference,
        language_hint: languageHint || null
      }),
      signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      throw new Error(errorData.detail || `Verification request failed: HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error("Verification was cancelled or timed out. Please try again or switch to a faster provider mode.");
    }
    throw err;
  } finally {
    activeAbortController = null;
  }
}

export async function fetchFactCheckSearch(query, hl = null) {
  const params = new URLSearchParams({ query });
  if (hl) params.append('hl', hl);
  const res = await fetch(`${API_BASE}/api/fact-check/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Fact check query failed: HTTP ${res.status}`);
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
