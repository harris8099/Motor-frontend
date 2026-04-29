import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  AlertTriangle, Zap, Flame, Wind, CheckCircle, Clock, 
  ChevronDown, ChevronUp, X, AlertCircle, Info
} from 'lucide-react';
import { fetchDeviceData, fetchDeviceFaults, resolveFault, sendAckFaults } from '../api';
import MetricCard from '../components/MetricCard';
import Breadcrumbs from '../components/Breadcrumbs';
import LiveIndicator from '../components/LiveIndicator';
import SkeletonCard from '../components/SkeletonCard';
import FaultContextPanel from '../components/FaultContextPanel';
import { isReadingLive } from '../utils/deviceStatus';
import './PageStyles.css';
import './FaultsPageEnhanced.css';

const ROOT_CAUSES = [
  { value: 'power_issue', label: 'Power Issue' },
  { value: 'mechanical_failure', label: 'Mechanical Failure' },
  { value: 'sensor_error', label: 'Sensor Error' },
  { value: 'software_bug', label: 'Software Bug' },
  { value: 'wear_and_tear', label: 'Wear and Tear' },
  { value: 'overload', label: 'Overload' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: '#b5473d', label: 'Critical' },
  warning: { icon: AlertCircle, color: '#c78a2c', label: 'Warning' },
  info: { icon: Info, color: '#0f6cbd', label: 'Info' },
};

function FaultsPage() {
  const { deviceId } = useParams();
  const [data, setData] = useState([]);
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFault, setExpandedFault] = useState(null);
  const [resolvingFault, setResolvingFault] = useState(null);
  const [ackingFaults, setAckingFaults] = useState(false);
  const [ackToast, setAckToast] = useState('');
  const [faultFilter, setFaultFilter] = useState('all');
  const [resolutionForm, setResolutionForm] = useState({
    root_cause: '',
    actions_taken: '',
    parts_replaced: '',
    resolved_by: '',
    notes: ''
  });

  const showToast = (msg) => {
    setAckToast(msg);
    setTimeout(() => setAckToast(''), 4000);
  };

  const handleAckAll = async () => {
    setAckingFaults(true);
    try {
      await sendAckFaults(deviceId);
      showToast('✓ Acknowledge all faults command queued — ESP32 will apply on next poll');
    } catch (err) {
      showToast('✗ Failed: ' + err.message);
    } finally {
      setAckingFaults(false);
    }
  };

  const handleAckSingle = async (faultName) => {
    setAckingFaults(true);
    try {
      await sendAckFaults(deviceId, [faultName]);
      showToast(`✓ Acknowledge "${faultName}" command queued`);
    } catch (err) {
      showToast('✗ Failed: ' + err.message);
    } finally {
      setAckingFaults(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const [dataRes, faultsRes] = await Promise.all([
          fetchDeviceData(deviceId),
          fetchDeviceFaults(deviceId, 50),
        ]);
        setData(dataRes.data || []);
        setFaults(faultsRes || []);
      } catch (err) {
        console.error('Failed to load faults data', err);
        setError('Could not load fault data. Please check API connection.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [deviceId]);

  const handleResolve = async (faultId) => {
    if (!resolutionForm.root_cause || !resolutionForm.actions_taken || !resolutionForm.resolved_by) {
      alert('Please fill in all required fields: Root Cause, Actions Taken, and Resolved By');
      return;
    }

    try {
      await resolveFault(faultId, resolutionForm);
      setResolvingFault(null);
      setResolutionForm({
        root_cause: '',
        actions_taken: '',
        parts_replaced: '',
        resolved_by: '',
        notes: ''
      });
      // Refresh data
      const faultsRes = await fetchDeviceFaults(deviceId, 50);
      setFaults(faultsRes || []);
    } catch (err) {
      alert('Failed to resolve fault: ' + err.message);
    }
  };

  const latest = data.length > 0 ? data[0] : null;
  const isLive = isReadingLive(latest);

  const faultTypes = [
    { key: 'fault_overcurrent', name: 'Over Current', icon: Zap },
    { key: 'fault_overtemp', name: 'Over Temperature', icon: Flame },
    { key: 'fault_stall', name: 'Motor Stall', icon: AlertTriangle },
    { key: 'fault_vibration', name: 'Vibration', icon: Wind },
    { key: 'fault_overvoltage', name: 'Over Voltage', icon: Zap },
    { key: 'fault_undervoltage', name: 'Under Voltage', icon: Zap },
  ];

  const activeFaults = latest ? faultTypes.filter(f => latest[f.key]) : [];
  const activeLoggedFaults = faults.filter(f => f.status === 'active');
  const resolvedFaults = faults.filter(f => f.status === 'resolved');

  const filteredFaults = faults.filter(f => faultFilter === 'all' || f.status === faultFilter);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="page-container">
      <Breadcrumbs />
      
      <header className="page-header">
        <div className="header-with-icon">
          <div className="header-icon-wrapper faults">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h1>Fault Management</h1>
            <p className="page-subtitle">
              {activeLoggedFaults.length > 0 
                ? `${activeLoggedFaults.length} active fault${activeLoggedFaults.length > 1 ? 's' : ''} - requires attention`
                : 'No active faults - all systems operating normally'
              }
            </p>
          </div>
        </div>
        <div className="header-meta">
          <LiveIndicator isLive={!loading && !error && isLive} />
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}
      
      {loading && (
        <div className="skeleton-grid">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {latest && (
        <>
          {/* Current Sensor Fault Status */}
          <section className="metrics-section">
            <h2>Current Sensor Status</h2>
            <div className="metrics-grid faults-grid">
              {faultTypes.map((fault, idx) => (
                <MetricCard 
                  key={fault.key}
                  title={fault.name} 
                  value={latest[fault.key] ? 'FAULT' : 'OK'} 
                  unit="" 
                  icon={fault.icon} 
                  delay={`delay-${(idx % 3) + 1}`}
                  isFault={latest[fault.key]}
                />
              ))}
            </div>
          </section>

          {/* Active Faults Summary (Real-time from sensor) */}
          <section className="active-faults-section">
            <h2>Real-time Fault Status</h2>
            {ackToast && (
              <div className="ack-toast" style={{
                background: ackToast.startsWith('✓') ? 'rgba(39,174,96,0.15)' : 'rgba(192,57,43,0.15)',
                border: `1px solid ${ackToast.startsWith('✓') ? '#27ae60' : '#c0392b'}`,
                color: ackToast.startsWith('✓') ? '#27ae60' : '#c0392b',
                padding: '10px 16px', borderRadius: '8px', marginBottom: '12px',
                fontSize: '0.9rem', fontWeight: 500,
              }}>{ackToast}</div>
            )}
            <div className="panel">
              {activeFaults.length > 0 ? (
                <>
                  <div className="active-faults-list">
                    {activeFaults.map((fault) => {
                      const faultKey = fault.key.replace('fault_', '');
                      return (
                        <div key={fault.key} className="active-fault-item">
                          <fault.icon size={24} />
                          <div className="fault-details">
                            <span className="fault-name">{fault.name}</span>
                            <span className="fault-status">ACTIVE</span>
                          </div>
                          <button
                            className="ack-single-btn"
                            onClick={() => handleAckSingle(faultKey)}
                            disabled={ackingFaults}
                            title={`Acknowledge ${fault.name} on ESP32`}
                            style={{
                              marginLeft: 'auto', padding: '4px 12px',
                              background: 'rgba(39,174,96,0.12)', border: '1px solid #27ae60',
                              color: '#27ae60', borderRadius: '6px', cursor: 'pointer',
                              fontSize: '0.78rem', fontWeight: 600,
                            }}
                          >
                            ACK
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="resolve-btn"
                      onClick={handleAckAll}
                      disabled={ackingFaults}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <CheckCircle size={16} />
                      {ackingFaults ? 'Sending…' : 'Acknowledge All Faults'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-faults-message">
                  <CheckCircle size={32} />
                  <p>No active sensor faults - all systems operating normally</p>
                </div>
              )}
            </div>
          </section>

          {/* Logged Faults with Resolution */}
          <section className="faults-history-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2>
                Fault History & Resolution
                {activeLoggedFaults.length > 0 && (
                  <span className="fault-count-badge active">{activeLoggedFaults.length} Active</span>
                )}
              </h2>
              
              <div className="filter-tabs" style={{ display: 'flex', gap: '0.5rem', background: 'var(--panel-bg)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <button 
                  className={`filter-tab ${faultFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setFaultFilter('all')}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: faultFilter === 'all' ? 'var(--accent-1)' : 'transparent', color: faultFilter === 'all' ? 'white' : 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  All ({faults.length})
                </button>
                <button 
                  className={`filter-tab ${faultFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setFaultFilter('active')}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: faultFilter === 'active' ? 'var(--accent-1)' : 'transparent', color: faultFilter === 'active' ? 'white' : 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  Active ({activeLoggedFaults.length})
                </button>
                <button 
                  className={`filter-tab ${faultFilter === 'resolved' ? 'active' : ''}`}
                  onClick={() => setFaultFilter('resolved')}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: faultFilter === 'resolved' ? 'var(--accent-1)' : 'transparent', color: faultFilter === 'resolved' ? 'white' : 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  Resolved ({resolvedFaults.length})
                </button>
              </div>
            </div>
            
            {filteredFaults.length === 0 ? (
              <div className="panel empty-panel">
                <CheckCircle size={48} />
                <p>{faults.length === 0 ? 'No fault records found' : `No ${faultFilter} faults found`}</p>
              </div>
            ) : (
              <div className="faults-list">
                {filteredFaults.map((fault) => {
                  const SeverityIcon = SEVERITY_CONFIG[fault.severity]?.icon || Info;
                  const isExpanded = expandedFault === fault.id;
                  const isResolving = resolvingFault === fault.id;

                  return (
                    <div 
                      key={fault.id} 
                      className={`fault-card ${fault.severity} ${fault.status} ${isExpanded ? 'expanded' : ''}`}
                    >
                      <div 
                        className="fault-header"
                        onClick={() => setExpandedFault(isExpanded ? null : fault.id)}
                      >
                        <div className="fault-severity-icon">
                          <SeverityIcon size={20} />
                        </div>
                        <div className="fault-info">
                          <h4 className="fault-type">{fault.fault_type}</h4>
                          <p className="fault-message-preview">{fault.message}</p>
                        </div>
                        <div className="fault-meta">
                          <span className={`status-badge ${fault.status}`}>
                            {fault.status}
                          </span>
                          <span className="fault-time">
                            <Clock size={12} />
                            {formatDate(fault.detected_at)}
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>

                      {isExpanded && (
                        <div className="fault-details">
                          {/* Fault Context Panel - "Why did this fault happen?" */}
                          <FaultContextPanel faultId={fault.id} />

                          {fault.status === 'resolved' ? (
                            <div className="resolution-info">
                              <h5>Resolution Details</h5>
                              <div className="resolution-grid">
                                <div>
                                  <label>Resolved By</label>
                                  <p>{fault.resolved_by}</p>
                                </div>
                                <div>
                                  <label>Root Cause</label>
                                  <p>{ROOT_CAUSES.find(r => r.value === fault.root_cause)?.label || fault.root_cause}</p>
                                </div>
                                <div>
                                  <label>Resolved At</label>
                                  <p>{formatDate(fault.resolved_at)}</p>
                                </div>
                              </div>
                              <div className="resolution-field">
                                <label>Actions Taken</label>
                                <p>{fault.actions_taken}</p>
                              </div>
                              {fault.parts_replaced && (
                                <div className="resolution-field">
                                  <label>Parts Replaced</label>
                                  <p>{fault.parts_replaced}</p>
                                </div>
                              )}
                              {fault.resolution_notes && (
                                <div className="resolution-field">
                                  <label>Additional Notes</label>
                                  <p>{fault.resolution_notes}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="fault-actions">
                              {!isResolving ? (
                                <button 
                                  className="resolve-btn"
                                  onClick={() => setResolvingFault(fault.id)}
                                >
                                  <CheckCircle size={16} />
                                  Resolve Fault
                                </button>
                              ) : (
                                <div className="resolution-form">
                                  <h5>Resolve Fault</h5>
                                  <div className="form-row">
                                    <div className="form-group required">
                                      <label>Root Cause</label>
                                      <select 
                                        value={resolutionForm.root_cause}
                                        onChange={(e) => setResolutionForm({...resolutionForm, root_cause: e.target.value})}
                                      >
                                        <option value="">Select cause...</option>
                                        {ROOT_CAUSES.map(c => (
                                          <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="form-group required">
                                      <label>Resolved By</label>
                                      <input 
                                        type="text"
                                        value={resolutionForm.resolved_by}
                                        onChange={(e) => setResolutionForm({...resolutionForm, resolved_by: e.target.value})}
                                        placeholder="Your name"
                                      />
                                    </div>
                                  </div>
                                  <div className="form-group required">
                                    <label>Actions Taken</label>
                                    <textarea 
                                      value={resolutionForm.actions_taken}
                                      onChange={(e) => setResolutionForm({...resolutionForm, actions_taken: e.target.value})}
                                      placeholder="Describe the steps taken to resolve this fault..."
                                      rows={3}
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label>Parts Replaced (optional)</label>
                                    <input 
                                      type="text"
                                      value={resolutionForm.parts_replaced}
                                      onChange={(e) => setResolutionForm({...resolutionForm, parts_replaced: e.target.value})}
                                      placeholder="e.g., Motor bearing, Sensor module"
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label>Additional Notes (optional)</label>
                                    <textarea 
                                      value={resolutionForm.notes}
                                      onChange={(e) => setResolutionForm({...resolutionForm, notes: e.target.value})}
                                      placeholder="Any additional information..."
                                      rows={2}
                                    />
                                  </div>
                                  <div className="form-actions">
                                    <button 
                                      className="submit-btn"
                                      onClick={() => handleResolve(fault.id)}
                                    >
                                      <CheckCircle size={16} />
                                      Submit Resolution
                                    </button>
                                    <button 
                                      className="cancel-btn"
                                      onClick={() => {
                                        setResolvingFault(null);
                                        setResolutionForm({
                                          root_cause: '',
                                          actions_taken: '',
                                          parts_replaced: '',
                                          resolved_by: '',
                                          notes: ''
                                        });
                                      }}
                                    >
                                      <X size={16} />
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Protection Statistics */}
          <section className="trip-count-section">
            <h2>Protection Statistics</h2>
            <div className="metrics-grid compact">
              <MetricCard 
                title="Total Fault Trips" 
                value={latest.prot_fault_trip_count ?? 0} 
                unit="" 
                icon={AlertTriangle} 
                delay="delay-1" 
              />
              <MetricCard 
                title="Uptime" 
                value={Math.floor(latest.uptime_seconds / 3600)} 
                unit="hrs" 
                icon={Clock} 
                delay="delay-2" 
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default FaultsPage;
