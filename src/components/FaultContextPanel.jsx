// filepath: src/components/FaultContextPanel.jsx
import { useState, useEffect } from 'react';
import { fetchFaultContext } from '../api';
import { AlertTriangle, Thermometer, Zap, Gauge, Activity } from 'lucide-react';
import './FaultContextPanel.css';

export default function FaultContextPanel({ faultId }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!faultId) return;
    
    const loadContext = async () => {
      try {
        setLoading(true);
        const data = await fetchFaultContext(faultId);
        setContext(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadContext();
  }, [faultId]);

  if (loading) {
    return (
      <div className="fault-context-panel loading">
        <div className="context-header">
          <AlertTriangle size={18} />
          <span>Why did this fault happen?</span>
        </div>
        <div className="skeleton-grid">
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fault-context-panel error">
        <div className="context-header">
          <AlertTriangle size={18} />
          <span>Why did this fault happen?</span>
        </div>
        <p className="error-message">Unable to load fault context: {error}</p>
      </div>
    );
  }

  if (!context) return null;

  const { sensor_snapshot: snapshot, diagnosis } = context;

  // Helper to render sensor value with threshold comparison
  const renderSensorValue = (label, value, unit, threshold, isTriggered = false) => {
    if (value === undefined || value === null) return null;
    
    const isOver = threshold !== undefined && value > threshold;
    const displayValue = typeof value === 'number' ? value.toFixed(1) : value;
    
    return (
      <div key={label} className={`sensor-item ${isTriggered ? 'triggered' : ''} ${isOver ? 'over-threshold' : ''}`}>
        <span className="sensor-label">{label}</span>
        <span className="sensor-value">
          {displayValue}
          <span className="sensor-unit">{unit}</span>
        </span>
        {threshold !== undefined && (
          <span className="sensor-threshold">Max: {threshold}</span>
        )}
      </div>
    );
  };

  // Get icon for fault type
  const getFaultIcon = (type) => {
    switch (type) {
      case 'overcurrent':
      case 'high_current':
        return <Zap size={16} />;
      case 'overtemp':
      case 'high_temp':
        return <Thermometer size={16} />;
      case 'stall':
        return <Gauge size={16} />;
      case 'vibration':
        return <Activity size={16} />;
      default:
        return <AlertTriangle size={16} />;
    }
  };

  return (
    <div className="fault-context-panel">
      <div className="context-header">
        {getFaultIcon(diagnosis.triggered_by)}
        <span>Why did this fault happen?</span>
      </div>

      {/* Sensor values at fault time */}
      {snapshot && Object.keys(snapshot).length > 0 && (
        <div className="sensor-grid">
          {renderSensorValue('Current', snapshot.current, 'A', 10.0, diagnosis.triggered_by === 'overcurrent')}
          {renderSensorValue('Voltage', snapshot.voltage, 'V', 260.0, diagnosis.triggered_by === 'overvoltage' || diagnosis.triggered_by === 'undervoltage')}
          {renderSensorValue('Temp 1', snapshot.temp1, '°C', 80.0, diagnosis.triggered_by === 'overtemp')}
          {renderSensorValue('Temp 2', snapshot.temp2, '°C', 80.0, diagnosis.triggered_by === 'overtemp')}
          {renderSensorValue('RPM', snapshot.rpm, '', 100.0, diagnosis.triggered_by === 'stall')}
          {renderSensorValue('Accel X', snapshot.accel_x, 'g', null, diagnosis.triggered_by === 'vibration')}
          {renderSensorValue('Accel Y', snapshot.accel_y, 'g', null, diagnosis.triggered_by === 'vibration')}
          {renderSensorValue('Accel Z', snapshot.accel_z, 'g', null, diagnosis.triggered_by === 'vibration')}
        </div>
      )}

      {/* Diagnosis explanation */}
      {diagnosis.human_explanation && (
        <div className="diagnosis-section">
          <p className="diagnosis-text">{diagnosis.human_explanation}</p>
        </div>
      )}

      {/* Contributing factors */}
      {diagnosis.contributing_factors && diagnosis.contributing_factors.length > 0 && (
        <div className="factors-section">
          <h4>Contributing Factors</h4>
          <ul className="factors-list">
            {diagnosis.contributing_factors.map((factor, idx) => (
              <li key={idx}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended actions */}
      {diagnosis.recommended_actions && diagnosis.recommended_actions.length > 0 && (
        <div className="actions-section">
          <h4>Recommended Actions</h4>
          <ul className="actions-list">
            {diagnosis.recommended_actions.map((action, idx) => (
              <li key={idx}>{action}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}