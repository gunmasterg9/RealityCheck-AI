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
import BenchmarkModal from './components/BenchmarkModal';
import VerificationStagesStepper from './components/VerificationStagesStepper';
import FactCheckMatchesBanner from './components/FactCheckMatchesBanner';
import EvidenceGrid from './components/EvidenceGrid';
import ErrorBoundary from './components/ErrorBoundary';
import {
  fetchProviders,
  fetchSampleClaims,
  fetchBenchmarkReport,
  analyzeClaim,
  verifyClaim,
  abortActiveVerification,
  fetchHistory,
  fetchAnalysisDetail,
  deleteAnalysis
} from './api';
import { ShieldAlert, AlertTriangle, Scale, Award, Eye, Sparkles } from 'lucide-react';

export default function App() {
  const [claim, setClaim] = useState('');
  const [context, setContext] = useState('');
  const [imageData, setImageData] = useState(null);
  const [providerPreference, setProviderPreference] = useState('auto');
  
  const [providers, setProviders] = useState(null);
  const [activeLocalModel, setActiveLocalModel] = useState('qwen3:1.7b');
  const [isLocalMultimodal, setIsLocalMultimodal] = useState(false);
  const [sampleClaims, setSampleClaims] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [benchmarkData, setBenchmarkData] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Load initial environment metadata and restore active session if present
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [provData, samplesData, histData, benchData] = await Promise.allSettled([
          fetchProviders(),
          fetchSampleClaims(),
          fetchHistory(),
          fetchBenchmarkReport()
        ]);

        if (provData.status === 'fulfilled') setProviders(provData.value);
        if (samplesData.status === 'fulfilled') setSampleClaims(samplesData.value);
        if (histData.status === 'fulfilled') setHistory(histData.value);
        if (benchData.status === 'fulfilled') setBenchmarkData(benchData.value);

        // Session survival: restore latest verification across browser refresh
        const activeId = sessionStorage.getItem('realitycheck_active_id');
        if (activeId) {
          try {
            const savedDetail = await fetchAnalysisDetail(activeId);
            if (savedDetail && (savedDetail.id || savedDetail.final_verdict)) {
              console.log('[RealityCheck] Restored completed verification from session across refresh:', activeId);
              setCurrentAnalysis(savedDetail);
              setClaim(savedDetail.primary_claim || savedDetail.claim || '');
            }
          } catch (e) {
            console.warn('[RealityCheck] Stale session ID removed:', activeId);
            sessionStorage.removeItem('realitycheck_active_id');
          }
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }
    loadInitialData();
  }, []);

  const handleAnalyze = async (inputType = 'auto') => {
    if (!claim.trim() && !imageData) return;

    setIsLoading(true);
    setErrorMessage(null);
    setCurrentAnalysis(null);

    console.log('[RealityCheck] Verification request started:', {
      timestamp: new Date().toISOString(),
      inputType,
      providerPreference,
      hasImage: Boolean(imageData),
      claimSnippet: claim.trim().slice(0, 80)
    });

    try {
      // Use 2.0 real-time 6-stage verification pipeline
      const result = await verifyClaim(claim, inputType, providerPreference, imageData);

      // Validate response structure to prevent blank-screen rendering
      if (!result || typeof result !== 'object') {
        throw new Error('Server returned an empty or malformed verification response.');
      }

      console.log('[RealityCheck] API response received successfully:', {
        id: result.id,
        verdict: result.final_verdict || result.verdict,
        confidence: result.assessment_confidence ?? result.confidence,
        stagesCount: result.stages?.length || 0,
        sourcesCount: result.sources?.length || 0
      });

      console.log('[RealityCheck] Response validation completed.');
      setCurrentAnalysis(result);
      console.log('[RealityCheck] Result state updated and components mounted.');

      if (result.id) {
        sessionStorage.setItem('realitycheck_active_id', result.id);
      }

      fetchHistory().then(setHistory).catch(console.error);
    } catch (err) {
      console.error('[RealityCheck] Verification pipeline error:', err);
      setErrorMessage(err.message || 'Verification pipeline execution failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelVerification = () => {
    abortActiveVerification();
    setIsLoading(false);
    setErrorMessage('Verification request was cancelled.');
    console.log('[RealityCheck] Verification cancelled by user.');
  };

  const handleSelectHistoryItem = async (id) => {
    try {
      console.log('[RealityCheck] Loading historical analysis:', id);
      const detail = await fetchAnalysisDetail(id);
      setCurrentAnalysis(detail);
      if (detail?.id) {
        sessionStorage.setItem('realitycheck_active_id', detail.id);
      }
      setClaim(detail.primary_claim || detail.claim || '');
      setContext(detail.context || '');
      setImageData(null);
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
        sessionStorage.removeItem('realitycheck_active_id');
      }
    } catch (err) {
      setErrorMessage(`Failed to delete record: ${err.message}`);
    }
  };

  const handleProvidersRefresh = async () => {
    try {
      const p = await fetchProviders();
      setProviders(p);
    } catch (err) {
      console.warn('Failed to refresh providers:', err);
    }
  };

  const handleModelChanged = (modelName, modelInfo) => {
    setActiveLocalModel(modelName);
    setIsLocalMultimodal(modelInfo?.is_multimodal ?? false);
  };

  return (
    <div className="app-root">
      <Header
        providers={providers}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onModelChanged={handleModelChanged}
        onProvidersRefresh={handleProvidersRefresh}
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

        {/* Claim Input Component with Multimodal File Upload & Model Selector awareness */}
        <ClaimInput
          claim={claim}
          setClaim={setClaim}
          context={context}
          setContext={setContext}
          imageData={imageData}
          setImageData={setImageData}
          providerPreference={providerPreference}
          setProviderPreference={setProviderPreference}
          sampleClaims={sampleClaims}
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          activeLocalModel={activeLocalModel}
          isLocalMultimodal={isLocalMultimodal}
        />

        {/* Pipeline Progress Indicator */}
        {isLoading && <AnalysisProgress onCancel={handleCancelVerification} />}

        {/* Results Panels with Error Boundary */}
        {currentAnalysis && !isLoading && (
          <ErrorBoundary
            title="Verification Result View Guard"
            onReset={() => {
              setCurrentAnalysis(null);
              sessionStorage.removeItem('realitycheck_active_id');
            }}
          >
            <div className="analysis-results-container">
              <VerdictPanel analysis={currentAnalysis} />

              {/* Official Fact Check Tools Matches Banner */}
              {currentAnalysis.fact_check_matches && currentAnalysis.fact_check_matches.length > 0 && (
                <FactCheckMatchesBanner factChecks={currentAnalysis.fact_check_matches} />
              )}

              {/* 6-Stage Real-Time Pipeline Audit Stepper */}
              {currentAnalysis.stages && currentAnalysis.stages.length > 0 && (
                <VerificationStagesStepper stages={currentAnalysis.stages} />
              )}

              {/* Evidence Corpus Grid with Citations */}
              {((currentAnalysis.sources && currentAnalysis.sources.length > 0) || (currentAnalysis.evidence && currentAnalysis.evidence.length > 0)) && (
                <EvidenceGrid sources={currentAnalysis.sources} evidence={currentAnalysis.evidence} />
              )}

              {/* Verdict Diff / What Changed */}
              <VerdictDiffView analysis={currentAnalysis} />

              {/* Supplementary Sections */}
              {currentAnalysis.initial_assessment && (
                <EvidenceSection analysis={currentAnalysis} />
              )}
              {currentAnalysis.adversarial_critique && (
                <AdversarialSection analysis={currentAnalysis} />
              )}
              <LimitationsSection analysis={currentAnalysis} />
            </div>
          </ErrorBoundary>
        )}

        {/* Welcome & Philosophy Explainer (when no active analysis) */}
        {!currentAnalysis && !isLoading && (
          <div className="panel welcome-panel">
            <div className="welcome-header">
              <Scale size={24} className="welcome-scale-icon" />
              <h3>RealityCheck AI 2.0: Real-Time Fact Verification Platform</h3>
            </div>
            <p className="welcome-intro">
              Engineered for the <strong>DigitalOcean Best Open-Source AI Project</strong> and <strong>Google Best Use of Gemma 4</strong> prize categories. RealityCheck AI stops sycophancy by deploying Gemma 4 across an automated 6-stage evidence retrieval and adversarial verification loop.
            </p>

            <div className="methodology-grid">
              <div className="method-card">
                <div className="method-step-num">Stage 1 & 2 • Retrieval</div>
                <h4>Safe Search & Extraction</h4>
                <p>SSRF-safe crawling of web articles, social media links, regional Indian WhatsApp forwards (Hindi/Gujarati), and Google Fact Check Tools ClaimReview queries.</p>
              </div>

              <div className="method-card active-method">
                <div className="method-step-num">Stage 3 & 4 • Reasoning</div>
                <h4>Gemma 4 Evidence Reasoner</h4>
                <p>Synthesizes real-time web citations without hallucinating facts. Evaluates chart footnotes, dates, and empirical evidence.</p>
              </div>

              <div className="method-card">
                <div className="method-step-num">Stage 5 & 6 • Reconcile</div>
                <h4>Chief Judge & Adjudication</h4>
                <p>Challenges initial assessments with adversarial self-critique, explains what changed, and provides traceable, clickable source citations.</p>
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

      {/* Gemma 4 Benchmark Evaluation Modal */}
      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        benchmarkData={benchmarkData}
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
