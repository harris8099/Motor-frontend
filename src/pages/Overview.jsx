import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Zap, Clock, Activity, Brain, AlertTriangle, RefreshCw,
  TrendingUp, Heart, Shield, Wrench, BarChart2, Sparkles, Cpu,
} from 'lucide-react';
import { fetchDeviceData, fetchDevicePredictions, triggerGeminiAnalysis, triggerLocalAnalysis } from '../api';
import MetricCard from '../components/MetricCard';
import LiveChart from '../components/LiveChart';
import Breadcrumbs from '../components/Breadcrumbs';
import LiveIndicator from '../components/LiveIndicator';
import GaugeMeter from '../components/GaugeMeter';
import SkeletonCard from '../components/SkeletonCard';
import './PageStyles.css';

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseDetails(details) {
  if (!details) return {};
  if (typeof details === 'string') {
    try { return JSON.parse(details); } catch { return {}; }
  }
  return details;
}

function getHealthSummary(predictions) {
  const rulPred  = predictions.find(p => p.prediction_type === 'remaining_useful_life');
  const brgPred  = predictions.find(p => p.prediction_type === 'nasa_bearing_analysis');
  const effPred  = predictions.find(p => p.prediction_type === 'advanced_efficiency_degradation');

  const rul = parseDetails(rulPred?.details);
  const brg = parseDetails(brgPred?.details);
  const eff = parseDetails(effPred?.details);

  return {
    hasData: !!(rulPred || brgPred),
    healthIndex:           rul.health_index          ?? null,   // 0-1, 1 = perfect
    healthStatus:          rul.health_status          ?? null,
    rulDays:               rul.rul_days               ?? null,
    maintenancePriority:   rul.maintenance_priority   ?? null,
    bearingHealthIndex:    brg.bearing_health_index   ?? null,  // 0-1, 1 = worst
    bearingStatus:         brg.health_status          ?? null,
    bearingRecommendation: brg.recommendation         ?? null,
    effDegradation:        eff.degradation_rate       ?? null,
  };
}

const PRIORITY_COLOR = {
  immediate: 'var(--accent-danger)',
  schedule:  'var(--accent-warm)',
  monitor:   'var(--accent-success)',
};

const STATUS_COLOR = {
  critical: 'var(--accent-danger)',
  poor:     'var(--accent-danger)',
  warning:  'var(--accent-warm)',
  monitor:  'var(--accent-warm)',
  fair:     'var(--accent-warm)',
  good:     'var(--accent-success)',
};

function formatPredType(type) {
  const labels = {
    // advanced_ml_prediction.py
    advanced_anomaly_detection:      'Anomaly Detected',
    nasa_bearing_analysis:           'Bearing Wear Risk',
    advanced_overheating_prediction: 'Overheating Risk',
    stall_risk_random_forest:        'Stall Risk',
    advanced_efficiency_degradation: 'Efficiency Degradation',
    remaining_useful_life:           'Remaining Useful Life',
    ai_comment:                      'AI Expert Commentary',
    ai_analysis:                     'AI Failure Prediction',
    // ml_prediction.py
    anomaly_detection:               'Anomaly Detected',
    overheating_prediction:          'Overheating Risk',
    bearing_failure_prediction:      'Bearing Failure Risk',
    stall_risk_prediction:           'Stall Risk',
    efficiency_degradation_prediction: 'Efficiency Degradation',
    maintenance_prediction_ml:       'Maintenance Required',
    // enhanced_prediction.py
    overheating:                     'Overheating Alert',
    stall_risk:                      'Stall Risk',
    bearing_fault:                   'Bearing Fault',
    efficiency_drop:                 'Efficiency Drop',
    maintenance_due:                 'Maintenance Due',
    // prebuilt_models.py
    lof_anomaly_detection:           'Anomaly Detected',
    elliptic_anomaly_detection:      'Statistical Anomaly',
    ridge_temperature_prediction:    'Temperature Warning',
    lasso_power_prediction:          'Power Anomaly',
    gbr_vibration_prediction:        'Vibration Increase Warning',
    svr_efficiency_prediction:       'Efficiency Drop Warning',
    // basic fallbacks
    overheating_basic:               'Overheating Alert',
    stall_risk_basic:                'Stall Alert',
  };
  return labels[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ── Component ─────────────────────────────────────────────────────────────────
function Overview() {
  const { deviceId } = useParams();
  const [data, setData]             = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // AI Button State
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [runningLocal, setRunningLocal] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [localCooldown, setLocalCooldown] = useState(0);
  const cooldownRef = useRef(null);
  const localCooldownRef = useRef(null);

  const startCooldown = () => {
    setCooldown(30);
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

  const startLocalCooldown = () => {
    setLocalCooldown(10); // Shorter cooldown for local models
    if (localCooldownRef.current) clearInterval(localCooldownRef.current);
    localCooldownRef.current = setInterval(() => {
      setLocalCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(localCooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      clearInterval(cooldownRef.current);
      clearInterval(localCooldownRef.current);
    };
  }, []);

  const handleRunAnalysis = async () => {
    if (cooldown > 0 || runningAnalysis) return;
    try {
      setRunningAnalysis(true);
      await triggerGeminiAnalysis(deviceId);
      const predsRes = await fetchDevicePredictions(deviceId);
      setPredictions(predsRes.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to run Gemini analysis', err);
    } finally {
      setRunningAnalysis(false);
      startCooldown();
    }
  };

  const handleRunLocalAnalysis = async () => {
    if (localCooldown > 0 || runningLocal) return;
    try {
      setRunningLocal(true);
      await triggerLocalAnalysis(deviceId);
      const predsRes = await fetchDevicePredictions(deviceId);
      setPredictions(predsRes.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to run local ML analysis', err);
    } finally {
      setRunningLocal(false);
      startLocalCooldown();
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const [dataRes, predsRes] = await Promise.all([
          fetchDeviceData(deviceId),
          fetchDevicePredictions(deviceId),
        ]);
        setData(dataRes.data || []);
        setPredictions(predsRes.data || []);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Failed to load data', err);
        setError('Could not load telemetry. Please check API connection.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [deviceId]);

  const latest      = data.length > 0 ? data[0] : null;
  const uptimeHours = latest ? Math.floor(latest.uptime_seconds / 3600) : 0;
  const averageTemp = latest ? ((latest.temp1 + latest.temp2) / 2).toFixed(1) : '0.0';
  const health      = getHealthSummary(predictions);

  const maxRPM   = 3000;
  const maxPower = 2000;
  const maxTemp  = 100;

  return (
    <div className="page-container">
      <Breadcrumbs />

      <header className="page-header">
        <div className="header-with-icon">
          <div className="header-icon-wrapper overview">
            <Activity size={28} />
          </div>
          <div>
            <h1>Overview</h1>
            <p className="page-subtitle">Real-time device status and key metrics</p>
          </div>
        </div>
        <div className="header-meta">
          <LiveIndicator isLive={!!latest} />
          <span className="last-updated">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting...'}
          </span>
          <button className="refresh-btn" onClick={() => window.location.reload()} title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {!latest && loading && (
        <div className="skeleton-grid">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {latest && (
        <>
          {/* ── Gauges ────────────────────────────────────────────────── */}
          <section className="gauges-section">
            <div className="gauges-grid">
              <div className="gauge-card">
                <GaugeMeter value={latest.rpm || 0} max={maxRPM} unit="RPM" label="Motor Speed" color="var(--accent-1)" size={140} />
                <div className="gauge-details">
                  <span className={`status-pill ${latest.motor_running ? 'running' : 'stopped'}`}>
                    {latest.motor_running ? 'RUNNING' : 'STOPPED'}
                  </span>
                </div>
              </div>

              <div className="gauge-card">
                <GaugeMeter value={latest.power?.toFixed(0) || 0} max={maxPower} unit="W" label="Power" color="var(--accent-warm)" size={140} />
                <div className="gauge-details">
                  <span className="gauge-detail-value">{latest.voltage?.toFixed(1)}V</span>
                  <span className="gauge-detail-separator">|</span>
                  <span className="gauge-detail-value">{latest.current?.toFixed(2)}A</span>
                </div>
              </div>

              <div className="gauge-card">
                <GaugeMeter value={averageTemp} max={maxTemp} unit="deg C" label="Temperature" color="var(--accent-danger)" size={140} />
                <div className="gauge-details">
                  <span className={`status-pill ${parseFloat(averageTemp) > 80 ? 'warning' : 'normal'}`}>
                    {parseFloat(averageTemp) > 80 ? 'HIGH' : 'NORMAL'}
                  </span>
                </div>
              </div>

              <div className="gauge-card uptime-card">
                <div className="uptime-display">
                  <Clock size={48} className="uptime-icon" />
                  <div className="uptime-value">{uptimeHours}</div>
                  <div className="uptime-label">Hours Uptime</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Quick Stats ───────────────────────────────────────────── */}
          <section className="metrics-section">
            <h2>Quick Stats</h2>
            <div className="metrics-grid compact">
              <MetricCard title="Voltage"      value={latest.voltage?.toFixed(1) ?? '--'}      unit="V"  icon={Zap}           delay="delay-1" />
              <MetricCard title="Current"      value={latest.current?.toFixed(2) ?? '--'}      unit="A"  icon={Activity}      delay="delay-1" />
              <MetricCard title="Power Factor" value={latest.power_factor?.toFixed(2) ?? '--'} unit=""   icon={TrendingUp}    delay="delay-2" />
              <MetricCard title="Frequency"    value={latest.frequency?.toFixed(1) ?? '--'}    unit="Hz" icon={Zap}           delay="delay-2" />
              <MetricCard title="Pulse Count"  value={latest.pulse ?? '--'}                    unit=""   icon={Activity}      delay="delay-3" />
              <MetricCard
                title="Active Faults"
                value={latest.fault_overcurrent || latest.fault_overtemp || latest.fault_stall || latest.fault_vibration ? 'YES' : 'NO'}
                unit=""
                icon={AlertTriangle}
                delay="delay-3"
                isFault={latest.fault_overcurrent || latest.fault_overtemp || latest.fault_stall || latest.fault_vibration}
              />
            </div>
          </section>

          {/* ── Motor Health & Maintenance ────────────────────────────── */}
          <section className="health-section">
            <div className="section-header-with-icon">
              <Heart size={24} />
              <h2>Motor Health &amp; Maintenance</h2>
            </div>

            {health.hasData ? (
              <div className="health-grid">

                {/* Overall Health */}
                {health.healthIndex !== null && (
                  <div className="health-card">
                    <div className="health-card__icon" style={{ background: 'rgba(29,122,85,0.12)', color: 'var(--accent-success)' }}>
                      <Heart size={20} />
                    </div>
                    <div className="health-card__body">
                      <span className="health-card__label">Overall Health</span>
                      <span className="health-card__value" style={{ color: STATUS_COLOR[health.healthStatus] ?? 'var(--text-strong)' }}>
                        {(health.healthIndex * 100).toFixed(0)}%
                      </span>
                      <div className="health-bar">
                        <div
                          className="health-bar__fill"
                          style={{
                            width: `${health.healthIndex * 100}%`,
                            background: STATUS_COLOR[health.healthStatus] ?? 'var(--accent-success)',
                          }}
                        />
                      </div>
                      {health.healthStatus && (
                        <span className="health-card__sub" style={{ color: STATUS_COLOR[health.healthStatus] }}>
                          {health.healthStatus.charAt(0).toUpperCase() + health.healthStatus.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Remaining Useful Life */}
                {health.rulDays !== null && (
                  <div className="health-card">
                    <div className="health-card__icon" style={{ background: 'rgba(15,108,189,0.12)', color: 'var(--accent-1)' }}>
                      <Clock size={20} />
                    </div>
                    <div className="health-card__body">
                      <span className="health-card__label">Est. Maintenance Date</span>
                      <span className="health-card__value" style={{ fontSize: '1.2rem' }}>
                        {health.rulDays >= 999 
                          ? 'Optimal Life' 
                          : new Date(Date.now() + health.rulDays * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        }
                      </span>
                      <span className="health-card__sub">
                        {health.rulDays >= 999 ? '> 999 days remaining' : `${health.rulDays} days remaining`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Maintenance Priority */}
                {health.maintenancePriority && (
                  <div className="health-card">
                    <div className="health-card__icon" style={{ background: `${PRIORITY_COLOR[health.maintenancePriority]}22`, color: PRIORITY_COLOR[health.maintenancePriority] }}>
                      <Wrench size={20} />
                    </div>
                    <div className="health-card__body">
                      <span className="health-card__label">Maintenance Priority</span>
                      <span className="health-card__value" style={{ color: PRIORITY_COLOR[health.maintenancePriority] ?? 'var(--text-strong)', textTransform: 'capitalize' }}>
                        {health.maintenancePriority}
                      </span>
                      <span className="health-card__sub">
                        {health.maintenancePriority === 'immediate' && 'Schedule maintenance within 24–48 hours'}
                        {health.maintenancePriority === 'schedule'  && 'Plan maintenance within the next 30 days'}
                        {health.maintenancePriority === 'monitor'   && 'Continue monitoring — no immediate action'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Bearing Health */}
                {health.bearingStatus && (
                  <div className="health-card">
                    <div className="health-card__icon" style={{ background: `${STATUS_COLOR[health.bearingStatus] ?? 'var(--accent-1)'}22`, color: STATUS_COLOR[health.bearingStatus] ?? 'var(--accent-1)' }}>
                      <Shield size={20} />
                    </div>
                    <div className="health-card__body">
                      <span className="health-card__label">Bearing Condition</span>
                      <span className="health-card__value" style={{ color: STATUS_COLOR[health.bearingStatus] ?? 'var(--text-strong)', textTransform: 'capitalize' }}>
                        {health.bearingStatus}
                      </span>
                      {health.bearingHealthIndex !== null && (
                        <div className="health-bar">
                          <div
                            className="health-bar__fill"
                            style={{
                              width: `${health.bearingHealthIndex * 100}%`,
                              background: STATUS_COLOR[health.bearingStatus] ?? 'var(--accent-success)',
                            }}
                          />
                        </div>
                      )}
                      {health.bearingRecommendation && (
                        <span className="health-card__sub">{health.bearingRecommendation}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Efficiency Degradation */}
                {health.effDegradation !== null && (
                  <div className="health-card">
                    <div className="health-card__icon" style={{ background: 'rgba(199,138,44,0.12)', color: 'var(--accent-warm)' }}>
                      <BarChart2 size={20} />
                    </div>
                    <div className="health-card__body">
                      <span className="health-card__label">Efficiency Degradation</span>
                      <span className="health-card__value">
                        {(health.effDegradation * 100).toFixed(1)}%
                      </span>
                      <span className="health-card__sub">
                        Loss vs. baseline efficiency
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="panel note-panel">
                <Brain size={18} />
                <p>
                  Health data appears here once the ML models have enough history (usually after 50+ sensor readings).
                  Make sure your ESP32 is sending data regularly.
                </p>
              </div>
            )}
          </section>

          {/* ── AI Insights preview ───────────────────────────────────── */}
          <section className="ai-summary-section">
            <div className="section-header-with-icon" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Brain size={24} />
                <h2 style={{ margin: 0 }}>AI Insights</h2>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="ai-trigger-btn"
                  onClick={handleRunLocalAnalysis}
                  disabled={runningLocal || localCooldown > 0}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.8rem', fontSize: '0.85rem',
                    background: 'var(--panel-border)', color: 'var(--text-strong)',
                    border: '1px solid var(--panel-border-hover)', borderRadius: '8px', cursor: 'pointer',
                    opacity: (runningLocal || localCooldown > 0) ? 0.7 : 1,
                    fontWeight: 600
                  }}
                  title="Run Local ML Models (Isolation Forest, RUL, etc.)"
                >
                  {runningLocal ? (
                    <><RefreshCw size={14} className="spin" /> Scanning...</>
                  ) : localCooldown > 0 ? (
                    <><Clock size={14} /> Ready in {localCooldown}s</>
                  ) : (
                    <><Cpu size={14} /> Run Local ML</>
                  )}
                </button>
                <button
                  className="ai-primary-action"
                  onClick={handleRunAnalysis}
                  disabled={runningAnalysis || cooldown > 0}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  title="Run Google Gemini AI Analysis"
                >
                  {runningAnalysis ? (
                    <><RefreshCw size={14} className="spin" /> Analyzing...</>
                  ) : cooldown > 0 ? (
                    <><Clock size={14} /> Ready in {cooldown}s</>
                  ) : (
                    <><Sparkles size={14} /> Run Gemini AI</>
                  )}
                </button>
              </div>
            </div>
            <div className="panel">
              {predictions.length > 0 ? (
                <div className="predictions-preview">
                  {predictions.slice(0, 3).map((pred, index) => (
                    <div key={pred.id ?? index} className={`prediction-pill severity-${pred.severity ?? 'low'}`}>
                      <span className="pred-type">{formatPredType(pred.prediction_type)}</span>
                      <span className="pred-confidence">{Math.round((pred.confidence ?? 0) * 100)}% confidence</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="status-ok-message">
                  <span className="status-dot" />
                  All systems normal — no predictions at this time
                </div>
              )}
            </div>
          </section>

          {/* ── Telemetry Chart ───────────────────────────────────────── */}
          <section className="chart-section">
            <h2>Telemetry History</h2>
            <div className="panel chart-panel">
              <LiveChart data={data} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Overview;
