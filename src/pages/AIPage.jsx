import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Brain, RefreshCw, Sparkles, TrendingUp, MessageSquare, Zap } from 'lucide-react';
import { fetchDevicePredictions, triggerCloudAnalysis, setAIMode } from '../api';
import Breadcrumbs from '../components/Breadcrumbs';
import LiveIndicator from '../components/LiveIndicator';
import PredictionsBadge from '../components/PredictionsBadge';
import SkeletonCard from '../components/SkeletonCard';
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

function AIPage() {
  const { deviceId } = useParams();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [error, setError] = useState('');
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [analysisSuccess, setAnalysisSuccess] = useState(null); // true | false | null
  const [analysisResult, setAnalysisResult] = useState(null); // Store AI response
  const [lastUpdated, setLastUpdated] = useState(null);

  // Cooldown state
  const [cooldown, setCooldown] = useState(0); // seconds remaining
  const cooldownRef = useRef(null);

  // Mode toggle state — default to commentary
  const [aiMode, setAiModeState] = useState('commentary');
  const [modeChanging, setModeChanging] = useState(false);

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  const loadPredictions = async () => {
    try {
      setError('');
      const response = await fetchDevicePredictions(deviceId, 50);
      const normalized = Array.isArray(response?.data)
        ? response.data.map(normalizePrediction)
        : [];
      setPredictions(normalized);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load AI predictions', err);
      setPredictions([]);
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

  const handleRunAnalysis = async () => {
    if (cooldown > 0 || runningAnalysis) return;
    try {
      setRunningAnalysis(true);
      setAnalysisMessage('');
      setAnalysisSuccess(null);
      setAnalysisResult(null); // Clear previous result
      const result = await triggerCloudAnalysis(deviceId);
      setAnalysisSuccess(result?.success !== false);
      setAnalysisMessage(result?.message || 'Cloud AI analysis completed.');
      setAnalysisResult(result?.analysis || null); // Store AI analysis
      if (result?.success !== false) await loadPredictions();
    } catch (err) {
      console.error('Failed to run Cloud AI analysis', err);
      setAnalysisSuccess(false);
      setAnalysisMessage('Cloud AI analysis could not be completed. Check backend configuration for API keys.');
      setAnalysisResult(null);
    } finally {
      setRunningAnalysis(false);
      startCooldown();
    }
  };

  const handleModeChange = async (newMode) => {
    if (newMode === aiMode || modeChanging) return;
    setModeChanging(true);
    try {
      await setAIMode(newMode);
      setAiModeState(newMode);
      setAnalysisMessage(`AI mode switched to "${newMode}".`);
      setAnalysisSuccess(true);
    } catch {
      setAnalysisMessage('Failed to switch AI mode. Check backend connection.');
      setAnalysisSuccess(false);
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
          <LiveIndicator isLive={!loading && !error} />
          <span className="last-updated">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for data...'}
          </span>
          <button className="refresh-btn" onClick={loadPredictions} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {analysisMessage && <div className={analysisBannerClass}>{analysisMessage}</div>}

      {/* AI Analysis Result Display */}
      {analysisResult && (
        <section className="ai-result-section">
          <div className="panel ai-result-panel">
            <div className="ai-result-header">
              <Sparkles size={18} />
              <h3>AI Analysis Result</h3>
              <span className={`severity-badge ${analysisResult.severity}`}>
                {analysisResult.severity?.toUpperCase()}
              </span>
              <span className="confidence-badge">
                {Math.round(analysisResult.confidence * 100)}% confidence
              </span>
            </div>
            <div className="ai-result-content">
              <p className="prediction-type">{formatPredictionType(analysisResult.type)}</p>
              {analysisResult.details?.comment && (
                <p className="ai-comment">{analysisResult.details.comment}</p>
              )}
              {analysisResult.details?.failure_probability_24h !== undefined && (
                <div className="ai-metrics">
                  <div className="metric">
                    <span className="metric-label">Failure Probability (24h)</span>
                    <span className="metric-value">{analysisResult.details.failure_probability_24h}%</span>
                  </div>
                  {analysisResult.details.likely_failure_mode && (
                    <div className="metric">
                      <span className="metric-label">Likely Failure Mode</span>
                      <span className="metric-value">{analysisResult.details.likely_failure_mode}</span>
                    </div>
                  )}
                  {analysisResult.details.estimated_rul_days !== undefined && (
                    <div className="metric">
                      <span className="metric-label">Estimated RUL</span>
                      <span className="metric-value">{analysisResult.details.estimated_rul_days} days</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
