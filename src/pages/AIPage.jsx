import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Brain, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { fetchDevicePredictions, triggerGeminiAnalysis } from '../api';
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

function AIPage() {
  const { deviceId } = useParams();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [error, setError] = useState('');
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

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
    try {
      setRunningAnalysis(true);
      setAnalysisMessage('');
      const result = await triggerGeminiAnalysis(deviceId);
      setAnalysisMessage(result?.message || 'Gemini analysis completed.');
      await loadPredictions();
    } catch (err) {
      console.error('Failed to run Gemini analysis', err);
      setAnalysisMessage('Gemini analysis could not be completed. Check backend configuration for the Gemini API key.');
    } finally {
      setRunningAnalysis(false);
    }
  };

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
      {analysisMessage && <div className="loading-banner">{analysisMessage}</div>}

      {loading ? (
        <div className="skeleton-grid">
          {[...Array(4)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : (
        <>
          <section className="ai-hero-section">
            <div className="ai-hero-card">
              <div className="ai-hero-icon">
                <Sparkles size={28} />
              </div>
              <div className="ai-hero-content">
                <h2>Run Gemini analysis on demand</h2>
                <p>
                  This view now stays stable even when the predictions payload is partial or the backend
                  is temporarily unavailable.
                </p>
              </div>
              <button className="ai-primary-action" onClick={handleRunAnalysis} disabled={runningAnalysis}>
                {runningAnalysis ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    Analyzing
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
                  The AI page is rendering correctly now. It will populate once the backend returns
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
