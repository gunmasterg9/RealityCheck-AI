import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ClaimInput from './components/ClaimInput';
import AnalysisProgress from './components/AnalysisProgress';
import VerdictPanel from './components/VerdictPanel';
import VerdictDiffView from './components/VerdictDiffView';
import EvidenceSection from './components/EvidenceSection';
import AdversarialSection from './components/AdversarialSection';
import LimitationsSection from './components/LimitationsSection';
import HistoryDrawer from './components/HistoryDrawer';
import {
  fetchProviders,
  fetchSampleClaims,
  analyzeClaim,
  fetchHistory,
  fetchAnalysisDetail,
  deleteAnalysis
} from './api';
import { ShieldAlert, AlertTriangle, Scale, CheckCircle2, HelpCircle } from 'lucide-react';

export default function App() {
  const [claim, setClaim] = useState('');
  const [context, setContext] = useState('');
  const [providerPreference, setProviderPreference] = useState('auto');
  
  const [providers, setProviders] = useState(null);
  const [sampleClaims, setSampleClaims] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Load initial environment metadata
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [provData, samplesData, histData] = await Promise.allSettled([
          fetchProviders(),
          fetchSampleClaims(),
          fetchHistory()
        ]);

        if (provData.status === 'fulfilled') setProviders(provData.value);
        if (samplesData.status === 'fulfilled') setSampleClaims(samplesData.value);
        if (histData.status === 'fulfilled') setHistory(histData.value);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }
    loadInitialData();
  }, []);

  const handleAnalyze = async () => {
    if (!claim.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setCurrentAnalysis(null);

    try {
      const result = await analyzeClaim(claim, context, providerPreference);
      setCurrentAnalysis(result);
      // Refresh history in background
      fetchHistory().then(setHistory).catch(console.error);
    } catch (err) {
      setErrorMessage(err.message || 'Analysis pipeline execution failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryItem = async (id) => {
    try {
      const detail = await fetchAnalysisDetail(id);
      setCurrentAnalysis(detail);
      setClaim(detail.claim);
      setContext(detail.context || '');
      setIsHistoryOpen(false);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    } catch (err) {
      setErrorMessage(`Failed to load historical record: ${err.message}`);
    }
  };

  const handleDeleteHistoryItem = async (id) => {
    try {
      await deleteAnalysis(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (currentAnalysis?.id === id) {
        setCurrentAnalysis(null);
      }
    } catch (err) {
      setErrorMessage(`Failed to delete record: ${err.message}`);
    }
  };

  return (
    <div className="app-root">
      <Header
        providers={providers}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
      />

      <main className="container main-content">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="error-banner">
            <AlertTriangle size={18} className="err-icon" />
            <div className="err-body">
              <strong>Investigation Error:</strong> {errorMessage}
            </div>
            <button className="btn-ghost err-close-btn" onClick={() => setErrorMessage(null)}>
              Dismiss
            </button>
          </div>
        )}

        {/* Claim Input Component */}
        <ClaimInput
          claim={claim}
          setClaim={setClaim}
          context={context}
          setContext={setContext}
          providerPreference={providerPreference}
          setProviderPreference={setProviderPreference}
          sampleClaims={sampleClaims}
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
        />

        {/* Pipeline Progress Indicator */}
        {isLoading && <AnalysisProgress />}

        {/* Results Panels */}
        {currentAnalysis && !isLoading && (
          <div className="analysis-results-container">
            <VerdictPanel analysis={currentAnalysis} />
            <VerdictDiffView analysis={currentAnalysis} />
            <EvidenceSection analysis={currentAnalysis} />
            <AdversarialSection analysis={currentAnalysis} />
            <LimitationsSection analysis={currentAnalysis} />
          </div>
        )}

        {/* Welcome & Philosophy Explainer (when no active analysis) */}
        {!currentAnalysis && !isLoading && (
          <div className="panel welcome-panel">
            <div className="welcome-header">
              <Scale size={24} className="welcome-scale-icon" />
              <h3>The RealityCheck AI Epistemic Architecture</h3>
            </div>
            <p className="welcome-intro">
              Standard LLMs suffer from sycophancy and plausible hallucination—they often validate whatever premises a user feeds them. RealityCheck AI is engineered specifically to challenge assumptions through a rigorous three-pass adversarial pipeline.
            </p>

            <div className="methodology-grid">
              <div className="method-card">
                <div className="method-step-num">Pass 1</div>
                <h4>Evidence Assessor</h4>
                <p>Scrutinizes the claim exclusively against supplied facts. Claims lacking empirical backing are strictly assigned <em>insufficient_evidence</em>.</p>
              </div>

              <div className="method-card active-method">
                <div className="method-step-num">Pass 2</div>
                <h4>Adversarial Skeptic</h4>
                <p>Actively challenges the initial pass. Hunts for selection bias, unverified assumptions, and alternative causal explanations.</p>
              </div>

              <div className="method-card">
                <div className="method-step-num">Pass 3</div>
                <h4>Chief RealityCheck Judge</h4>
                <p>Adjudicates disagreements without inventing evidence. Outputs what changed, distinguishes confidence from truth probability, and discloses limitations.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectAnalysis={handleSelectHistoryItem}
        onDeleteAnalysis={handleDeleteHistoryItem}
      />

      <style>{`
        .app-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .main-content {
          padding-top: 32px;
          padding-bottom: 64px;
          flex: 1;
        }
        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #FCA5A5;
          padding: 12px 18px;
          border-radius: 10px;
          margin-bottom: 24px;
        }
        .err-icon {
          flex-shrink: 0;
          color: #EF4444;
        }
        .err-body {
          flex: 1;
          font-size: 0.88rem;
          line-height: 1.4;
        }
        .err-close-btn {
          font-size: 0.75rem;
          padding: 4px 8px;
          color: #FCA5A5;
        }
        .welcome-panel {
          padding: 28px;
          margin-top: 10px;
          background: linear-gradient(180deg, rgba(17, 24, 39, 0.6) 0%, rgba(14, 20, 36, 0.6) 100%);
        }
        .welcome-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .welcome-header h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #FFF;
        }
        .welcome-scale-icon {
          color: #A78BFA;
        }
        .welcome-intro {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.55;
          max-width: 900px;
          margin-bottom: 24px;
        }
        .methodology-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .method-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 18px;
          display: flex;
          flex-direction: column;
        }
        .method-card.active-method {
          border-color: rgba(139, 92, 246, 0.3);
          background: rgba(139, 92, 246, 0.04);
        }
        .method-step-num {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #A78BFA;
          margin-bottom: 6px;
          font-family: 'JetBrains Mono', monospace;
        }
        .method-card h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 8px;
        }
        .method-card p {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
