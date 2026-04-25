function formatPredictionName(value) {
  if (!value) {
    return 'Unknown Prediction';
  }

  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDetails(details) {
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      return formatDetails(parsed);
    } catch {
      return details.replace(/["{}]/g, ' ').trim();
    }
  }

  if (details && typeof details === 'object') {
    if (details.comment) {
      return (
        <div className="ai-comment">
          <div className="comment-text">{details.comment}</div>
          <div className="comment-meta">
            <small>Expert analysis based on {details.ml_predictions_count ?? 0} ML predictions</small>
          </div>
        </div>
      );
    }

    if (details.health_assessment) {
      return (
        <div className="ai-analysis">
          <div className="ai-health">
            <strong>Health:</strong> {details.health_assessment}
          </div>
          {details.key_concerns && (
            <div className="ai-concerns">
              <strong>Concerns:</strong> {details.key_concerns}
            </div>
          )}
          {details.recommended_actions && (
            <div className="ai-actions">
              <strong>Actions:</strong> {details.recommended_actions}
            </div>
          )}
          {details.maintenance_timeline && (
            <div className="ai-timeline">
              <strong>Timeline:</strong> {details.maintenance_timeline}
            </div>
          )}
        </div>
      );
    }

    return Object.entries(details)
      .map(([key, value]) => {
        if (['analysis_type', 'ml_predictions_count'].includes(key)) {
          return null;
        }

        let displayValue = value;
        if (typeof value === 'number') {
          if (key.includes('rate') || key.includes('ratio')) {
            displayValue = `${(value * 100).toFixed(1)}%`;
          } else if (key.includes('time') && key.includes('minutes')) {
            displayValue = `${Math.round(value)} min`;
          } else if (
            key.includes('temp') ||
            key.includes('power') ||
            key.includes('current') ||
            key.includes('vibration')
          ) {
            displayValue = value.toFixed(2);
          } else {
            displayValue = value.toFixed(3);
          }
        }

        return (
          <div key={key}>
            <strong>{key.replace(/_/g, ' ')}:</strong> {String(displayValue)}
          </div>
        );
      })
      .filter(Boolean);
  }

  return JSON.stringify(details ?? '').replace(/["{}]/g, ' ').trim();
}

export default function PredictionsBadge({ predictions }) {
  if (!predictions || predictions.length === 0) {
    return <div className="empty-copy">No active AI alerts.</div>;
  }

  const sortedPredictions = [...predictions].sort((a, b) => {
    if (a.prediction_type === 'ai_comment') return 1;
    if (b.prediction_type === 'ai_comment') return -1;
    return (b.confidence || 0) - (a.confidence || 0);
  });

  return (
    <div>
      {sortedPredictions.map((prediction, index) => (
        <div
          key={prediction.id ?? `${prediction.prediction_type ?? 'prediction'}-${index}`}
          className={`prediction-badge severity-${prediction.severity ?? 'low'} ${
            prediction.prediction_type === 'ai_comment'
              ? 'ai-comment-badge'
              : prediction.prediction_type === 'ai_analysis'
                ? 'ai-analysis-badge'
                : ''
          }`}
        >
          <div className="prediction-header">
            <span className="prediction-type">
              {prediction.prediction_type === 'ai_comment'
                ? 'AI Expert Commentary'
                : prediction.prediction_type === 'ai_analysis'
                  ? 'AI Analysis'
                  : formatPredictionName(prediction.prediction_type)}
            </span>
            <span className="prediction-conf">
              {((prediction.confidence ?? 0) * 100).toFixed(0)}% conf
            </span>
          </div>
          {prediction.details && (
            <div className="prediction-details">
              {formatDetails(prediction.details)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
