import { AlertTriangle, Activity, Thermometer, Zap, Clock, TrendingDown, Cpu, MessageSquare, ShieldAlert, Wrench, BarChart2 } from 'lucide-react';

// ── Prediction type metadata ────────────────────────────────────────────────
const PREDICTION_META = {
  advanced_anomaly_detection: {
    title: 'Anomaly Detected',
    desc: 'Multiple ML models flagged unusual motor behaviour vs. historical baseline.',
    Icon: ShieldAlert,
    getHighlights: (d) => [
      d.anomalous_feature && { label: 'Anomalous parameter', value: d.anomalous_feature.replace(/_/g, ' ') },
      d.anomaly_votes != null && { label: 'Model votes', value: `${d.anomaly_votes} / 3 models flagged` },
      d.ensemble_score != null && { label: 'Anomaly score', value: d.ensemble_score.toFixed(3) },
    ].filter(Boolean),
  },

  nasa_bearing_analysis: {
    title: 'Bearing Wear Risk',
    desc: 'NASA vibration analysis detected signs of bearing wear or a developing fault.',
    Icon: Activity,
    getHighlights: (d) => [
      d.bearing_health_index != null && { label: 'Bearing health index', value: `${(d.bearing_health_index * 100).toFixed(0)}% degraded` },
      d.health_status && { label: 'Status', value: capitalize(d.health_status) },
      d.fault_type && { label: 'Fault type', value: d.fault_type.replace(/_/g, ' ') },
      d.recommendation && { label: 'Recommended action', value: d.recommendation, isText: true },
    ].filter(Boolean),
  },

  advanced_overheating_prediction: {
    title: 'Overheating Risk',
    desc: 'Temperature trend models predict the motor will exceed its thermal limit soon.',
    Icon: Thermometer,
    getHighlights: (d) => [
      d.current_temp != null && { label: 'Current temp', value: `${Number(d.current_temp).toFixed(1)} °C` },
      d.max_predicted_temp != null && { label: 'Predicted peak', value: `${Number(d.max_predicted_temp).toFixed(1)} °C` },
      d.temp_threshold != null && { label: 'Safety limit', value: `${d.temp_threshold} °C` },
      d.time_to_threshold_minutes != null && { label: 'Time to limit', value: `~${d.time_to_threshold_minutes} min` },
    ].filter(Boolean),
  },

  stall_risk_random_forest: {
    title: 'Stall Risk',
    desc: 'Random Forest classifier detected conditions that may lead to a motor stall.',
    Icon: Zap,
    getHighlights: (d) => [
      d.stall_probability != null && { label: 'Stall probability', value: `${(d.stall_probability * 100).toFixed(0)}%` },
      d.risk_factors?.high_current && { label: 'High current', value: 'Detected' },
      d.risk_factors?.low_rpm && { label: 'Low RPM', value: 'Detected' },
      d.current_efficiency != null && { label: 'Motor efficiency', value: d.current_efficiency.toFixed(2) },
    ].filter(Boolean),
  },

  advanced_efficiency_degradation: {
    title: 'Efficiency Degradation',
    desc: 'Long-term trend analysis shows the motor is gradually losing efficiency.',
    Icon: TrendingDown,
    getHighlights: (d) => [
      d.degradation_rate != null && { label: 'Current degradation', value: `${(d.degradation_rate * 100).toFixed(1)}%` },
      d.future_degradation != null && { label: 'Predicted degradation', value: `${(d.future_degradation * 100).toFixed(1)}%` },
      d.prediction_horizon && { label: 'Forecast horizon', value: d.prediction_horizon },
    ].filter(Boolean),
  },

  remaining_useful_life: {
    title: 'Remaining Useful Life',
    desc: 'Combined health indicators estimate how much operational life remains before maintenance is needed.',
    Icon: Clock,
    getHighlights: (d) => [
      d.rul_days != null && { label: 'Remaining life', value: d.rul_days >= 999 ? '> 999 days' : `${d.rul_days} days` },
      d.health_index != null && { label: 'Health index', value: `${(d.health_index * 100).toFixed(0)}%` },
      d.health_status && { label: 'Health status', value: capitalize(d.health_status) },
      d.maintenance_priority && { label: 'Maintenance priority', value: capitalize(d.maintenance_priority) },
    ].filter(Boolean),
  },

  ai_comment: {
    title: 'AI Expert Commentary',
    desc: 'Gemini AI interpretation of the current ML analysis results.',
    Icon: MessageSquare,
    getHighlights: (d) => d.comment ? [{ label: 'Analysis', value: d.comment, isText: true }] : [],
  },

  ai_analysis: {
    title: 'AI Failure Prediction',
    desc: 'Gemini AI direct assessment of failure risk and recommended actions.',
    Icon: Cpu,
    getHighlights: (d) => [
      d.failure_probability_24h != null && { label: '24 h failure risk', value: `${(Number(d.failure_probability_24h) * 100).toFixed(0)}%` },
      d.likely_failure_mode && { label: 'Most likely failure', value: d.likely_failure_mode },
      d.estimated_rul_days != null && { label: 'Est. remaining life', value: `${d.estimated_rul_days} days` },
    ].filter(Boolean),
  },

  // ── ml_prediction.py types ──────────────────────────────────────────────
  anomaly_detection: {
    title: 'Anomaly Detected',
    desc: 'Isolation Forest detected unusual motor behaviour vs. historical baseline.',
    Icon: ShieldAlert,
    getHighlights: (d) => [
      d.anomalous_feature && { label: 'Anomalous parameter', value: d.anomalous_feature.replace(/_/g, ' ') },
      d.anomaly_score != null && { label: 'Anomaly score', value: d.anomaly_score.toFixed(3) },
      d.feature_deviation != null && { label: 'Deviation', value: d.feature_deviation.toFixed(3) },
    ].filter(Boolean),
  },

  overheating_prediction: {
    title: 'Overheating Risk',
    desc: 'Linear regression trend predicts the motor will exceed its thermal limit.',
    Icon: Thermometer,
    getHighlights: (d) => [
      d.current_temp != null && { label: 'Current temp', value: `${Number(d.current_temp).toFixed(1)} °C` },
      d.max_predicted_temp != null && { label: 'Predicted peak', value: `${Number(d.max_predicted_temp).toFixed(1)} °C` },
      d.temp_threshold != null && { label: 'Safety limit', value: `${d.temp_threshold} °C` },
      d.time_to_threshold_minutes != null && { label: 'Time to limit', value: `~${d.time_to_threshold_minutes} min` },
    ].filter(Boolean),
  },

  bearing_failure_prediction: {
    title: 'Bearing Failure Risk',
    desc: 'Vibration trend analysis detected a developing bearing fault.',
    Icon: Activity,
    getHighlights: (d) => [
      d.z_score != null && { label: 'Vibration Z-score', value: d.z_score.toFixed(2) },
      d.trend_slope != null && { label: 'Trend slope', value: d.trend_slope.toFixed(4) },
      Array.isArray(d.risk_factors) && d.risk_factors.length > 0 && { label: 'Risk factors', value: d.risk_factors.join(', '), isText: true },
    ].filter(Boolean),
  },

  stall_risk_prediction: {
    title: 'Stall Risk',
    desc: 'Power and current analysis detected conditions that may cause a motor stall.',
    Icon: Zap,
    getHighlights: (d) => [
      d.risk_score != null && { label: 'Risk score', value: `${(d.risk_score * 100).toFixed(0)}%` },
      d.current_efficiency != null && { label: 'Motor efficiency', value: d.current_efficiency.toFixed(4) },
      Array.isArray(d.risk_factors) && d.risk_factors.length > 0 && { label: 'Causes', value: d.risk_factors.join(', '), isText: true },
    ].filter(Boolean),
  },

  efficiency_degradation_prediction: {
    title: 'Efficiency Degradation',
    desc: 'Polynomial trend analysis shows the motor is gradually losing efficiency.',
    Icon: TrendingDown,
    getHighlights: (d) => [
      d.degradation_rate != null && { label: 'Current degradation', value: `${(d.degradation_rate * 100).toFixed(1)}%` },
      d.future_degradation != null && { label: 'Predicted degradation', value: `${(d.future_degradation * 100).toFixed(1)}%` },
      d.efficiency_trend && { label: 'Trend', value: capitalize(d.efficiency_trend) },
    ].filter(Boolean),
  },

  maintenance_prediction_ml: {
    title: 'Maintenance Required',
    desc: 'Usage pattern analysis shows the motor is approaching or past its service interval.',
    Icon: Wrench,
    getHighlights: (d) => [
      d.time_remaining != null && { label: 'Remaining time', value: `${Math.round(d.time_remaining)} h` },
      d.hours_limit != null && { label: 'Service limit', value: `${d.hours_limit} h` },
      d.usage_pattern && { label: 'Usage pattern', value: capitalize(d.usage_pattern.replace(/_/g, ' ')) },
      d.recommended_action && { label: 'Action', value: d.recommended_action, isText: true },
    ].filter(Boolean),
  },

  // ── enhanced_prediction.py types ─────────────────────────────────────────
  overheating: {
    title: 'Overheating Alert',
    desc: 'Motor temperature is currently above the configured safety threshold.',
    Icon: Thermometer,
    getHighlights: (d) => [
      d.avg_temp != null && { label: 'Current temp', value: `${Number(d.avg_temp).toFixed(1)} °C` },
      d.max_temp != null && { label: 'Limit', value: `${d.max_temp} °C` },
      d.trend && { label: 'Trend', value: capitalize(d.trend) },
    ].filter(Boolean),
  },

  stall_risk: {
    title: 'Stall Risk',
    desc: 'High current and low RPM indicate a potential motor stall.',
    Icon: Zap,
    getHighlights: (d) => [
      d.current != null && { label: 'Current', value: `${Number(d.current).toFixed(2)} A` },
      d.rpm != null && { label: 'RPM', value: String(d.rpm) },
      d.power != null && { label: 'Power', value: `${Number(d.power).toFixed(0)} W` },
    ].filter(Boolean),
  },

  bearing_fault: {
    title: 'Bearing Fault',
    desc: 'Vibration magnitude or trend exceeded statistical thresholds.',
    Icon: Activity,
    getHighlights: (d) => [
      d.vibration_magnitude != null && { label: 'Vibration magnitude', value: Number(d.vibration_magnitude).toFixed(3) },
      d.z_score != null && { label: 'Z-score', value: Number(d.z_score).toFixed(2) },
      d.trend && { label: 'Trend', value: capitalize(d.trend) },
    ].filter(Boolean),
  },

  efficiency_drop: {
    title: 'Efficiency Drop',
    desc: 'Motor efficiency dropped more than 20% below recent average.',
    Icon: TrendingDown,
    getHighlights: (d) => [
      d.efficiency_loss != null && { label: 'Efficiency loss', value: `${Number(d.efficiency_loss).toFixed(1)}%` },
      d.current_efficiency != null && { label: 'Current efficiency', value: Number(d.current_efficiency).toFixed(4) },
      d.historical_avg != null && { label: 'Historical average', value: Number(d.historical_avg).toFixed(4) },
    ].filter(Boolean),
  },

  maintenance_due: {
    title: 'Maintenance Due',
    desc: 'Motor has reached or is near its scheduled maintenance interval.',
    Icon: Wrench,
    getHighlights: (d) => [
      d.total_hours != null && { label: 'Hours run', value: `${d.total_hours} h` },
      d.limit != null && { label: 'Service limit', value: `${d.limit} h` },
      d.overdue_by != null && { label: 'Overdue by', value: `${d.overdue_by} h` },
      d.recommendation && { label: 'Recommendation', value: d.recommendation, isText: true },
    ].filter(Boolean),
  },

  // ── prebuilt_models.py types ──────────────────────────────────────────────
  lof_anomaly_detection: {
    title: 'Anomaly Detected',
    desc: 'Local Outlier Factor algorithm found the current readings are statistically unusual.',
    Icon: ShieldAlert,
    getHighlights: (d) => [
      d.anomalous_feature && { label: 'Anomalous parameter', value: d.anomalous_feature.replace(/_/g, ' ') },
      d.lof_score != null && { label: 'Outlier score', value: Number(d.lof_score).toFixed(3) },
      d.feature_deviation != null && { label: 'Deviation', value: Number(d.feature_deviation).toFixed(3) },
    ].filter(Boolean),
  },

  elliptic_anomaly_detection: {
    title: 'Statistical Anomaly',
    desc: 'Elliptic Envelope (Gaussian model) flagged current readings as an outlier.',
    Icon: ShieldAlert,
    getHighlights: (d) => [
      d.elliptic_score != null && { label: 'Outlier score', value: Number(d.elliptic_score).toFixed(3) },
      d.mahalanobis_distance != null && { label: 'Mahalanobis distance', value: Number(d.mahalanobis_distance).toFixed(2) },
    ].filter(Boolean),
  },

  ridge_temperature_prediction: {
    title: 'Temperature Warning',
    desc: 'Ridge regression predicts the motor temperature will exceed the safety limit.',
    Icon: Thermometer,
    getHighlights: (d) => [
      d.avg_predicted_temp != null && { label: 'Predicted avg temp', value: `${Number(d.avg_predicted_temp).toFixed(1)} °C` },
      d.current_avg_temp != null && { label: 'Current temp', value: `${Number(d.current_avg_temp).toFixed(1)} °C` },
      d.temp_threshold != null && { label: 'Safety limit', value: `${d.temp_threshold} °C` },
    ].filter(Boolean),
  },

  lasso_power_prediction: {
    title: 'Power Anomaly',
    desc: 'Lasso regression detected a significant deviation between expected and actual power draw.',
    Icon: Zap,
    getHighlights: (d) => [
      d.power_deviation_percent != null && { label: 'Power deviation', value: `${Number(d.power_deviation_percent).toFixed(1)}%` },
      d.predicted_power != null && { label: 'Expected power', value: `${Number(d.predicted_power).toFixed(0)} W` },
      d.actual_power != null && { label: 'Actual power', value: `${Number(d.actual_power).toFixed(0)} W` },
    ].filter(Boolean),
  },

  gbr_vibration_prediction: {
    title: 'Vibration Increase Warning',
    desc: 'Gradient Boosting model predicts a significant vibration increase based on current motor conditions.',
    Icon: Activity,
    getHighlights: (d) => [
      d.vibration_increase_percent != null && { label: 'Predicted increase', value: `${Number(d.vibration_increase_percent).toFixed(1)}%` },
      d.current_vibration != null && { label: 'Current vibration', value: Number(d.current_vibration).toFixed(3) },
    ].filter(Boolean),
  },

  svr_efficiency_prediction: {
    title: 'Efficiency Drop Warning',
    desc: 'Support Vector Regression detected the motor running below expected efficiency.',
    Icon: BarChart2,
    getHighlights: (d) => [
      d.efficiency_drop_percent != null && { label: 'Efficiency drop', value: `${Number(d.efficiency_drop_percent).toFixed(1)}%` },
      d.actual_efficiency != null && { label: 'Actual efficiency', value: Number(d.actual_efficiency).toFixed(4) },
      d.predicted_efficiency != null && { label: 'Expected efficiency', value: Number(d.predicted_efficiency).toFixed(4) },
    ].filter(Boolean),
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function parseDetails(details) {
  if (!details) return {};
  if (typeof details === 'string') {
    try { return JSON.parse(details); } catch { return {}; }
  }
  return details;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function PredictionsBadge({ predictions }) {
  if (!predictions || predictions.length === 0) {
    return <div className="empty-copy">No active AI alerts.</div>;
  }

  // Sort: high severity first, ai_comment last
  const sorted = [...predictions].sort((a, b) => {
    if (a.prediction_type === 'ai_comment') return 1;
    if (b.prediction_type === 'ai_comment') return -1;
    const sevOrder = { high: 0, medium: 1, low: 2 };
    return (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
  });

  return (
    <div className="predictions-badge-list">
      {sorted.map((prediction, index) => {
        const type = prediction.prediction_type ?? 'unknown';
        const meta = PREDICTION_META[type] ?? {
          title: type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          desc: 'ML model alert.',
          Icon: AlertTriangle,
          getHighlights: () => [],
        };
        const details = parseDetails(prediction.details);
        const highlights = meta.getHighlights(details);
        const { Icon } = meta;
        const severity = prediction.severity ?? 'low';
        const conf = Math.round((prediction.confidence ?? 0) * 100);

        return (
          <div
            key={prediction.id ?? `${type}-${index}`}
            className={`pred-card pred-card--${severity}`}
          >
            {/* Header */}
            <div className="pred-card__header">
              <div className="pred-card__icon-wrap">
                <Icon size={18} />
              </div>
              <div className="pred-card__title-block">
                <span className="pred-card__title">{meta.title}</span>
                <span className="pred-card__desc">{meta.desc}</span>
              </div>
              <div className="pred-card__badges">
                <span className={`pred-sev-badge pred-sev-badge--${severity}`}>
                  {capitalize(severity)}
                </span>
                <span className="pred-conf-badge">{conf}% conf</span>
              </div>
            </div>

            {/* Key highlights */}
            {highlights.length > 0 && (
              <div className={`pred-card__body ${highlights.some(h => h.isText) ? 'pred-card__body--text' : ''}`}>
                {highlights.map((h, i) =>
                  h.isText ? (
                    <p key={i} className="pred-highlight-text">{h.value}</p>
                  ) : (
                    <div key={i} className="pred-highlight-item">
                      <span className="pred-highlight-label">{h.label}</span>
                      <span className="pred-highlight-value">{h.value}</span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
