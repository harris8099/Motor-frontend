import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Brain, RefreshCw, Sparkles, TrendingUp, MessageSquare, Zap } from 'lucide-react';
import { fetchDevicePredictions, triggerCloudAnalysis, setAIMode, fetchLatestAIResult, fetchDeviceData } from '../api';
import Breadcrumbs from '../components/Breadcrumbs';
import LiveIndicator from '../components/LiveIndicator';
import PredictionsBadge from '../components/PredictionsBadge';
import SkeletonCard from '../components/SkeletonCard';
import { isReadingLive } from '../utils/deviceStatus';
import { formatISTTime } from '../utils/formatters';
import './PageStyles.css';

function normalizePrediction(prediction, index) {
  return {
    id: prediction?.id ?? `${prediction?.prediction_type ?? 'prediction'}-${index}`,
    prediction_type: prediction?.prediction_type ?? 'unknown_prediction',
    severity: prediction?.severity ?? 'low',
    confidence: Number(prediction?.confidence ?? 0),
    predicted_at: prediction?.predicted_at ?? null,
    details: prediction?.details ?? null,
  };
}

function formatPredictionType(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPredictionTime(value) {
  if (!value) {
    return 'Timestamp unavailable';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Timestamp unavailable' : parsed.toLocaleString();
}

function getSummary(predictions) {
  return {
    total: predictions.length,
    high: predictions.filter((item) => item.severity === 'high').length,
    medium: predictions.filter((item) => item.severity === 'medium').length,
    avgConfidence: predictions.length
      ? Math.round(
          (predictions.reduce((sum, item) => sum + item.confidence, 0) / predictions.length) * 100
        )
      : 0,
  };
}

const COOLDOWN_SECONDS = 30;

// Renders inline markdown: **bold**, *italic*, `code`
function RenderMarkdown({ text }) {
  if (!text) return null;
  // Split into paragraphs first
  const paragraphs = text.split(/\n+/).filter(Boolean);
  return (
    <>
      {paragraphs.map((para, pi) => {
        // Split on **bold**, *italic*, `code`
        const parts = para.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
        return (
          <p key={pi} style={{ margin: pi === 0 ? 0 : '0.5rem 0 0 0' }}>
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**'))
                return <strong key={i}>{part.slice(2, -2)}</strong>;
              if (part.startsWith('*') && part.endsWith('*'))
                return <em key={i}>{part.slice(1, -1)}</em>;
              if (part.startsWith('`') && part.endsWith('`'))
                return <code key={i} style={{ background: 'rgba(255,255,255,0.08)', padding: '0 4px', borderRadius: '3px', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
              return part;
            })}
          </p>
        );
      })}
    </>
  );
}

function AIPage() {
  const { deviceId } = useParams();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [error, setError] = useState('');
  // Separate state for each AI result type — both show simultaneously
  const [commentaryResult, setCommentaryResult] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(false);

  // Cooldown state
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  // Mode toggle
  const [aiMode, setAiModeState] = useState('commentary');
  const [modeChanging, setModeChanging] = useState(false);

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  // Load both latest results from DB on mount / device change
  useEffect(() => {
    setCommentaryResult(null);
    setPredictionResult(null);
    fetchLatestAIResult(deviceId)
      .then(res => {
        const norm = (row) => row ? {
          type: row.prediction_type, confidence: row.confidence,
          severity: row.severity, details: row.details, timestamp: row.predicted_at,
        } : null;
        setCommentaryResult(norm(res?.commentary));
        setPredictionResult(norm(res?.prediction));
      })
      .catch(() => {});
  }, [deviceId]);

  const loadPredictions = async () => {
    try {
      setError('');
      const [response, telemetryResponse] = await Promise.all([
        fetchDevicePredictions(deviceId, 50),
        fetchDeviceData(deviceId, 1),
      ]);
      const normalized = Array.isArray(response?.data)
        ? response.data.map(normalizePrediction)
        : [];
      setPredictions(normalized);
      const latestReading = telemetryResponse?.data?.[0] ?? null;
      setIsLive(isReadingLive(latestReading));
      setLastUpdated(latestReading?.ts ? new Date(latestReading.ts) : null);
    } catch (err) {
      console.error('Failed to load AI predictions', err);
      setPredictions([]);
      setIsLive(false);
      setError('Could not load AI predictions. The page stays available, but the backend response failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
    const interval = setInterval(loadPredictions, 10000);
    return () => clearInterval(interval);
  }, [deviceId]);

  const stats = useMemo(() => getSummary(predictions), [predictions]);
  const recentPredictions = useMemo(() => predictions.slice(0, 6), [predictions]);

  const [analysisMessage, setAnalysisMessage] = useState('');
  const [analysisSuccess, setAnalysisSuccess] = useState(null);
  const [modeMessage, setModeMessage] = useState('');

  const handleRunAnalysis = async () => {
    if (cooldown > 0 || runningAnalysis) return;
    try {
      setRunningAnalysis(true);
      setAnalysisMessage('');
      setAnalysisSuccess(null);
      const result = await triggerCloudAnalysis(deviceId);
      setAnalysisSuccess(result?.success !== false);
      setAnalysisMessage(result?.message || 'Cloud AI analysis completed.');
      if (result?.analysis) {
        const norm = {
          type: result.analysis.type,
          confidence: result.analysis.confidence,
          severity: result.analysis.severity,
          details: result.analysis.details,
          timestamp: new Date().toISOString(),
        };
        if (result.analysis.type === 'ai_comment') setCommentaryResult(norm);
        else if (result.analysis.type === 'ai_analysis') setPredictionResult(norm);
      }
      if (result?.success !== false) await loadPredictions();
    } catch (err) {
      console.error('Failed to run Cloud AI analysis', err);
      setAnalysisSuccess(false);
      setAnalysisMessage('Cloud AI analysis could not be completed. Check backend configuration for API keys.');
    } finally {
      setRunningAnalysis(false);
      startCooldown();
    }
  };

  const handleModeChange = async (newMode) => {
    if (newMode === aiMode || modeChanging) return;
    setModeChanging(true);
    setModeMessage('');
    try {
      await setAIMode(newMode);
      setAiModeState(newMode);
      setModeMessage(`Mode switched to "${newMode}" — run analysis to see new results.`);
    } catch {
      setModeMessage('Failed to switch AI mode. Check backend connection.');
    } finally {
      setModeChanging(false);
    }
  };

  const analysisBannerClass = analysisSuccess === false
    ? 'error-banner'
    : 'loading-banner';

  return (
    <div className="page-container">
      <Breadcrumbs />

      <header className="page-header">
        <div className="header-with-icon">
          <div className="header-icon-wrapper ai">
            <Brain size={28} />
          </div>
          <div>
            <h1>AI Insights</h1>
            <p className="page-subtitle">Prediction history, AI commentary, and model output health.</p>
          </div>
        </div>
        <div className="header-meta">
          <LiveIndicator isLive={!loading && !error && isLive} />
          <span className="last-updated">
            {lastUpdated ? `Updated ${formatISTTime(lastUpdated)} IST` : 'Waiting for data...'}
          </span>
          <button className="refresh-btn" onClick={loadPredictions} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {analysisMessage && <div className={analysisSuccess === false ? 'error-banner' : 'loading-banner'}>{analysisMessage}</div>}
      {modeMessage && <div style={{ padding: '0.6rem 1rem', marginBottom: '0.5rem', borderRadius: '8px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }}>{modeMessage}</div>}

      {/* ── AI Results — both panels show independently ──────────────────── */}
      {(commentaryResult || predictionResult) && (
        <section className="ai-result-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Commentary panel */}
          {commentaryResult && (
            <div className="panel ai-result-panel">
              <div className="ai-result-header">
                <MessageSquare size={18} />
                <h3>AI Expert Commentary</h3>
                <span className={`severity-badge ${commentaryResult.severity}`}>
                  {commentaryResult.severity?.toUpperCase()}
                </span>
                <span className="confidence-badge">
                  {Math.round(commentaryResult.confidence * 100)}% confidence
                </span>
              </div>
              <div className="ai-result-content">
                <div className="ai-comment">
                  <RenderMarkdown text={commentaryResult.details?.comment} />
                </div>
              </div>
              {commentaryResult.timestamp && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)', marginTop: '0.5rem', textAlign: 'right' }}>
                  Last analyzed: {new Date(commentaryResult.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Prediction panel */}
          {predictionResult && (
            <div className="panel ai-result-panel">
              <div className="ai-result-header">
                <Sparkles size={18} />
                <h3>AI Failure Prediction</h3>
                <span className={`severity-badge ${predictionResult.severity}`}>
                  {predictionResult.severity?.toUpperCase()}
                </span>
                <span className="confidence-badge">
                  {Math.round(predictionResult.confidence * 100)}% confidence
                </span>
              </div>
              <div className="ai-result-content">
                {predictionResult.details?.failure_probability_24h !== undefined && (
                  <div className="ai-metrics">
                    <div className="metric">
                      <span className="metric-label">Failure Probability (24h)</span>
                      <span className="metric-value">{predictionResult.details.failure_probability_24h}%</span>
                    </div>
                    {predictionResult.details.likely_failure_mode && (
                      <div className="metric">
                        <span className="metric-label">Likely Failure Mode</span>
                        <span className="metric-value">{predictionResult.details.likely_failure_mode}</span>
                      </div>
                    )}
                    {predictionResult.details.estimated_rul_days !== undefined && (
                      <div className="metric">
                        <span className="metric-label">Estimated RUL</span>
                        <span className="metric-value">{predictionResult.details.estimated_rul_days} days</span>
                      </div>
                    )}
                    {predictionResult.details.maintenance_actions?.length > 0 && (
                      <div className="metric" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                        <span className="metric-label">Maintenance Actions</span>
                        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                          {predictionResult.details.maintenance_actions.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {predictionResult.timestamp && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)', marginTop: '0.5rem', textAlign: 'right' }}>
                  Last analyzed: {new Date(predictionResult.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {loading ? (
        <div className="skeleton-grid">
          {[...Array(4)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : (
        <>
          {/* Cloud AI Analysis Hero Card */}
          <section className="ai-hero-section">
            <div className="ai-hero-card">
              <div className="ai-hero-icon">
                <Sparkles size={28} />
              </div>
              <div className="ai-hero-content">
                <h2>Run Cloud AI Analysis</h2>
                <p>
                  Trigger on-demand AI analysis for this device.
                  Results are stored and shown in the predictions below.
                </p>

                {/* Mode Toggle */}
                <div className="gemini-mode-toggle" aria-label="AI analysis mode">
                  <button
                    id="mode-commentary"
                    className={`mode-btn ${aiMode === 'commentary' ? 'active' : ''}`}
                    onClick={() => handleModeChange('commentary')}
                    disabled={modeChanging}
                  >
                    <MessageSquare size={13} />
                    Commentary
                  </button>
                  <button
                    id="mode-prediction"
                    className={`mode-btn ${aiMode === 'prediction' ? 'active' : ''}`}
                    onClick={() => handleModeChange('prediction')}
                    disabled={modeChanging}
                  >
                    <Zap size={13} />
                    Prediction
                  </button>
                </div>
                <p className="mode-description">
                  {aiMode === 'commentary'
                    ? 'Commentary: AI explains the ML model results in plain language.'
                    : 'Prediction: AI directly predicts failures and maintenance needs.'}
                </p>
              </div>

              {/* Analyze Button with Cooldown */}
              <button
                id="btn-run-ai-analysis"
                className="ai-primary-action"
                onClick={handleRunAnalysis}
                disabled={runningAnalysis || cooldown > 0}
              >
                {runningAnalysis ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    Analyzing…
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <RefreshCw size={16} />
                    Wait {cooldown}s
                  </>
                ) : (
                  <>
                    <Brain size={16} />
                    Run Analysis
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="metrics-section">
            <h2>Summary</h2>
            <div className="metrics-grid">
              <div className="panel ai-summary-card">
                <span className="ai-summary-label">Total Predictions</span>
                <strong className="ai-summary-value">{stats.total}</strong>
              </div>
              <div className="panel ai-summary-card">
                <span className="ai-summary-label">High Severity</span>
                <strong className="ai-summary-value">{stats.high}</strong>
              </div>
              <div className="panel ai-summary-card">
                <span className="ai-summary-label">Medium Severity</span>
                <strong className="ai-summary-value">{stats.medium}</strong>
              </div>
              <div className="panel ai-summary-card">
                <span className="ai-summary-label">Avg Confidence</span>
                <strong className="ai-summary-value">{stats.avgConfidence}%</strong>
              </div>
            </div>
          </section>

          <section className="predictions-section">
            <h2>Recent Predictions</h2>
            {recentPredictions.length ? (
              <div className="predictions-preview">
                {recentPredictions.map((prediction) => (
                  <div key={prediction.id} className={`prediction-pill severity-${prediction.severity}`}>
                    <span className="pred-type">{formatPredictionType(prediction.prediction_type)}</span>
                    <span className="pred-confidence">
                      {Math.round(prediction.confidence * 100)}% confidence
                    </span>
                    <span className="pred-confidence">{formatPredictionTime(prediction.predicted_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel status-ok-message">
                <TrendingUp size={18} />
                No active prediction records yet.
              </div>
            )}
          </section>

          <section className="predictions-section">
            <h2>Current Alerts</h2>
            <div className="panel">
              <PredictionsBadge predictions={predictions} />
            </div>
          </section>

          {!predictions.length && !error && (
            <section className="note-section">
              <div className="panel note-panel">
                <AlertTriangle size={18} />
                <p>
                  The AI page is rendering correctly. It will populate once the backend returns
                  prediction records for this device.
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default AIPage;
