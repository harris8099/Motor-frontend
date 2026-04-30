import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Settings,
  Zap,
  Thermometer,
  Gauge,
  Timer,
  Send,
  RefreshCw,
  Wrench,
  RotateCcw,
  BatteryCharging,
} from 'lucide-react';
import {
  fetchDeviceData,
  sendSetProtection,
  sendSetMaintenance,
  sendSetRuntime,
  sendResetEnergy,
  sendClearMaintenance,
} from '../api';
import Breadcrumbs from '../components/Breadcrumbs';
import LiveIndicator from '../components/LiveIndicator';
import SkeletonCard from '../components/SkeletonCard';
import { isReadingLive } from '../utils/deviceStatus';
import './PageStyles.css';

const FIELD_DEFS = [
  { key: 'maxCurrentA', label: 'Max Current', unit: 'A', icon: Zap, step: 0.1, min: 0, max: 100, dataKey: 'prot_max_current', desc: 'Overcurrent protection threshold' },
  { key: 'maxTempC', label: 'Max Temperature', unit: 'deg C', icon: Thermometer, step: 0.5, min: 0, max: 200, dataKey: 'prot_max_temp', desc: 'Overtemperature protection threshold' },
  { key: 'minRpm', label: 'Min RPM (Stall)', unit: 'rpm', icon: Gauge, step: 1, min: 0, max: 10000, dataKey: 'prot_min_rpm', desc: 'Minimum RPM to detect stall' },
  { key: 'overvoltageV', label: 'Over Voltage', unit: 'V', icon: Zap, step: 0.5, min: 0, max: 500, dataKey: 'prot_overvoltage_v', desc: 'Upper voltage limit' },
  { key: 'undervoltageV', label: 'Under Voltage', unit: 'V', icon: Zap, step: 0.5, min: 0, max: 500, dataKey: 'prot_undervoltage_v', desc: 'Lower voltage limit' },
  { key: 'stallCurrentA', label: 'Stall Current', unit: 'A', icon: Zap, step: 0.1, min: 0, max: 100, dataKey: 'prot_stall_current_a', desc: 'Current threshold to detect stall' },
  { key: 'startupGraceMs', label: 'Startup Grace', unit: 'ms', icon: Timer, step: 100, min: 0, max: 30000, dataKey: 'prot_startup_grace_ms', desc: 'Delay before protection checks begin' },
  { key: 'faultTripCount', label: 'Fault Trip Count', unit: '', icon: Settings, step: 1, min: 0, max: 1000, dataKey: 'prot_fault_trip_count', desc: 'Accumulated fault trip count' },
  { key: 'vibrationAckGraceMs', label: 'Vibration Ack Grace', unit: 'ms', icon: Timer, step: 100, min: 0, max: 30000, dataKey: 'prot_vibration_ack_grace_ms', desc: 'Grace period after vibration ack' },
];

const DEFAULT_FORM = Object.fromEntries(FIELD_DEFS.map((f) => [f.key, '']));
const DEFAULT_MAINT_FORM = {
  nextMaintenanceTime: '',
  totalLifeCycleHours: '',
  maintenanceHoursLimit: '',
  runtimeHours: '',
};

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function primaryButtonStyle(enabled, colorA, colorB) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 20px',
    borderRadius: '8px',
    background: enabled ? `linear-gradient(135deg,${colorA},${colorB})` : 'rgba(255,255,255,0.08)',
    border: 'none',
    color: enabled ? '#fff' : 'rgba(255,255,255,0.3)',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontSize: '0.88rem',
    fontWeight: 600,
  };
}

function secondaryButtonStyle() {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.8)',
    cursor: 'pointer',
    fontSize: '0.85rem',
  };
}

function dangerButtonStyle() {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    background: 'rgba(192,57,43,0.12)',
    border: '1px solid rgba(192,57,43,0.35)',
    color: '#ff8f85',
    cursor: 'pointer',
    fontSize: '0.85rem',
  };
}

function inputStyle(highlightColor) {
  return {
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${highlightColor}`,
    borderRadius: '6px',
    color: '#fff',
    padding: '8px 10px',
    fontSize: '0.95rem',
    fontWeight: 500,
    outline: 'none',
    width: '100%',
  };
}

function SettingsPage() {
  const { deviceId } = useParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [dirty, setDirty] = useState(false);
  const [sending, setSending] = useState(false);
  const [maintForm, setMaintForm] = useState(DEFAULT_MAINT_FORM);
  const [maintDirty, setMaintDirty] = useState(false);
  const [maintSending, setMaintSending] = useState(false);
  const [toast, setToast] = useState({ msg: '', ok: true });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 4500);
  };

  const populateForm = (row) => {
    const next = {};
    FIELD_DEFS.forEach((f) => {
      const val = row[f.dataKey];
      next[f.key] = val !== null && val !== undefined ? val : '';
    });
    setForm(next);
    setDirty(false);
  };

  const populateMaintenanceForm = (row) => {
    setMaintForm({
      nextMaintenanceTime: toDateTimeLocalValue(row.maint_next_time),
      totalLifeCycleHours: row.maint_total_hours ?? '',
      maintenanceHoursLimit: row.maint_hours_limit ?? '',
      runtimeHours: row.uptime_seconds !== null && row.uptime_seconds !== undefined
        ? (Number(row.uptime_seconds) / 3600).toFixed(2)
        : '',
    });
    setMaintDirty(false);
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const res = await fetchDeviceData(deviceId, 1);
        const rows = res.data || [];
        setData(rows);
        if (rows.length > 0) {
          populateForm(rows[0]);
          populateMaintenanceForm(rows[0]);
        }
      } catch (err) {
        console.error('Failed to load settings data', err);
        setError('Could not load settings. Please check API connection.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(async () => {
      try {
        const res = await fetchDeviceData(deviceId, 1);
        const rows = res.data || [];
        setData(rows);
      } catch (_) {}
    }, 10000);
    return () => clearInterval(interval);
  }, [deviceId]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleMaintenanceChange = (key, value) => {
    setMaintForm((prev) => ({ ...prev, [key]: value }));
    setMaintDirty(true);
  };

  const handleReset = () => {
    if (data.length > 0) populateForm(data[0]);
  };

  const handleMaintenanceReset = () => {
    if (data.length > 0) populateMaintenanceForm(data[0]);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const payload = {};
      FIELD_DEFS.forEach((f) => {
        const raw = form[f.key];
        if (raw === '' || raw === null || raw === undefined) return;
        payload[f.key] = f.step < 1 ? parseFloat(raw) : parseInt(raw, 10);
      });
      await sendSetProtection(deviceId, payload);
      showToast('Protection settings queued. ESP32 will apply them on the next poll.', true);
      setDirty(false);
    } catch (err) {
      showToast(`Failed to send protection settings: ${err.message}`, false);
    } finally {
      setSending(false);
    }
  };

  const handleMaintenanceSend = async () => {
    setMaintSending(true);
    try {
      const payload = {};

      if (maintForm.nextMaintenanceTime) {
        const dt = new Date(maintForm.nextMaintenanceTime);
        if (Number.isNaN(dt.getTime())) {
          throw new Error('Invalid maintenance date/time');
        }
        payload.nextMaintenanceTime = dt.toISOString().replace('Z', '+00:00');
      }

      if (maintForm.totalLifeCycleHours !== '') {
        const total = parseFloat(maintForm.totalLifeCycleHours);
        if (!Number.isFinite(total) || total < 0) throw new Error('Invalid total life cycle hours');
        payload.totalLifeCycleHours = total;
        payload.totalLifeCycleSeconds = Math.round(total * 3600);
      }

      if (maintForm.maintenanceHoursLimit !== '') {
        const limit = parseFloat(maintForm.maintenanceHoursLimit);
        if (!Number.isFinite(limit) || limit < 0) throw new Error('Invalid maintenance interval');
        payload.maintenanceHoursLimit = limit;
        payload.maintenanceHoursLimitSeconds = Math.round(limit * 3600);
      }

      if (maintForm.runtimeHours !== '') {
        const runtime = parseFloat(maintForm.runtimeHours);
        if (!Number.isFinite(runtime) || runtime < 0) throw new Error('Invalid runtime hours');
        payload.uptimeSeconds = Math.round(runtime * 3600);
      }

      await sendSetMaintenance(deviceId, payload);
      showToast('Maintenance and runtime command queued. ESP32 will apply it on the next poll.', true);
      setMaintDirty(false);
    } catch (err) {
      showToast(`Failed to send maintenance command: ${err.message}`, false);
    } finally {
      setMaintSending(false);
    }
  };

  const handleRuntimeOnlySend = async () => {
    setMaintSending(true);
    try {
      const runtime = parseFloat(maintForm.runtimeHours);
      if (!Number.isFinite(runtime) || runtime < 0) {
        throw new Error('Enter a valid runtime in hours');
      }
      await sendSetRuntime(deviceId, Math.round(runtime * 3600));
      showToast('Runtime command queued. ESP32 will apply it on the next poll.', true);
      setMaintDirty(false);
    } catch (err) {
      showToast(`Failed to send runtime command: ${err.message}`, false);
    } finally {
      setMaintSending(false);
    }
  };

  const handleResetEnergy = async () => {
    setMaintSending(true);
    try {
      await sendResetEnergy(deviceId);
      showToast('Energy reset command queued. ESP32 will apply it on the next poll.', true);
    } catch (err) {
      showToast(`Failed to queue energy reset: ${err.message}`, false);
    } finally {
      setMaintSending(false);
    }
  };

  const handleClearMaintenance = async () => {
    setMaintSending(true);
    try {
      await sendClearMaintenance(deviceId);
      showToast('Clear maintenance command queued. ESP32 will clear it on the next poll.', true);
    } catch (err) {
      showToast(`Failed to queue clear maintenance: ${err.message}`, false);
    } finally {
      setMaintSending(false);
    }
  };

  const latest = data.length > 0 ? data[0] : null;
  const isLive = isReadingLive(latest);

  return (
    <div className="page-container">
      <Breadcrumbs />

      <header className="page-header">
        <div className="header-with-icon">
          <div className="header-icon-wrapper settings">
            <Settings size={28} />
          </div>
          <div>
            <h1>Device Settings</h1>
            <p className="page-subtitle">
              {dirty || maintDirty
                ? 'Unsaved changes ready to queue to the ESP32'
                : 'Protection, maintenance, runtime, and reset commands'}
            </p>
          </div>
        </div>
        <div className="header-meta">
          <LiveIndicator isLive={!loading && !error && isLive} />
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {toast.msg && (
        <div
          style={{
            background: toast.ok ? 'rgba(39,174,96,0.12)' : 'rgba(192,57,43,0.12)',
            border: `1px solid ${toast.ok ? '#27ae60' : '#c0392b'}`,
            color: toast.ok ? '#27ae60' : '#c0392b',
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '18px',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          {toast.msg}
        </div>
      )}

      {loading && (
        <div className="skeleton-grid">
          {[...Array(9)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && (
        <>
          <section className="metrics-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Protection Thresholds</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                {dirty && (
                  <button onClick={handleReset} style={secondaryButtonStyle()}>
                    <RefreshCw size={14} /> Reset
                  </button>
                )}
                <button onClick={handleSend} disabled={sending || !dirty} style={primaryButtonStyle(dirty && !sending, '#00d4ff', '#0066ff')}>
                  <Send size={14} />
                  {sending ? 'Sending...' : 'Send to Device'}
                </button>
              </div>
            </div>

            <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {FIELD_DEFS.map((f, idx) => {
                const IconComp = f.icon;
                return (
                  <div key={f.key} className={`metric-card delay-${(idx % 3) + 1}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      <IconComp size={14} />
                      {f.label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        id={`prot-${f.key}`}
                        value={form[f.key]}
                        step={f.step}
                        min={f.min}
                        max={f.max}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        style={inputStyle(dirty ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.12)')}
                      />
                      {f.unit && <span style={{ opacity: 0.55, fontSize: '0.8rem', minWidth: '32px' }}>{f.unit}</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.45 }}>{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="metrics-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>Maintenance and Runtime</h2>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {maintDirty && (
                  <button onClick={handleMaintenanceReset} style={secondaryButtonStyle()}>
                    <RefreshCw size={14} /> Reset
                  </button>
                )}
                <button
                  onClick={handleRuntimeOnlySend}
                  disabled={maintSending || maintForm.runtimeHours === ''}
                  style={primaryButtonStyle(!maintSending && maintForm.runtimeHours !== '', '#8759ff', '#4c2cc9')}
                >
                  <Timer size={14} />
                  Runtime Only
                </button>
                <button
                  onClick={handleMaintenanceSend}
                  disabled={maintSending || !maintDirty}
                  style={primaryButtonStyle(maintDirty && !maintSending, '#19c37d', '#0f7a5d')}
                >
                  <Send size={14} />
                  {maintSending ? 'Sending...' : 'Send Maintenance'}
                </button>
              </div>
            </div>

            <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <Wrench size={14} />
                  Next Maintenance
                </div>
                <input
                  type="datetime-local"
                  value={maintForm.nextMaintenanceTime}
                  onChange={(e) => handleMaintenanceChange('nextMaintenanceTime', e.target.value)}
                  style={inputStyle(maintDirty ? 'rgba(25,195,125,0.45)' : 'rgba(255,255,255,0.12)')}
                />
                <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.45 }}>Next maintenance target date and time.</p>
              </div>

              <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <Wrench size={14} />
                  Total Life Cycle
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={maintForm.totalLifeCycleHours}
                  onChange={(e) => handleMaintenanceChange('totalLifeCycleHours', e.target.value)}
                  style={inputStyle(maintDirty ? 'rgba(25,195,125,0.45)' : 'rgba(255,255,255,0.12)')}
                />
                <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.45 }}>Total target operating life in hours.</p>
              </div>

              <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <RotateCcw size={14} />
                  Maintenance Interval
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={maintForm.maintenanceHoursLimit}
                  onChange={(e) => handleMaintenanceChange('maintenanceHoursLimit', e.target.value)}
                  style={inputStyle(maintDirty ? 'rgba(25,195,125,0.45)' : 'rgba(255,255,255,0.12)')}
                />
                <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.45 }}>Hours between maintenance cycles.</p>
              </div>

              <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <Timer size={14} />
                  Current Runtime
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maintForm.runtimeHours}
                  onChange={(e) => handleMaintenanceChange('runtimeHours', e.target.value)}
                  style={inputStyle(maintDirty ? 'rgba(25,195,125,0.45)' : 'rgba(255,255,255,0.12)')}
                />
                <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.45 }}>Runtime in hours. Render sends this to ESP as uptime seconds.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
              <button onClick={handleResetEnergy} disabled={maintSending} style={secondaryButtonStyle()}>
                <BatteryCharging size={14} /> Reset Energy Counter
              </button>
              <button onClick={handleClearMaintenance} disabled={maintSending} style={dangerButtonStyle()}>
                <RotateCcw size={14} /> Clear Maintenance
              </button>
            </div>
          </section>

          <section className="note-section">
            <div className="panel note-panel" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Send size={20} style={{ marginTop: '2px', flexShrink: 0, color: '#00d4ff' }} />
              <div>
                <strong>How remote config works:</strong>
                <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: '0.85rem' }}>
                  Changes on this page are queued in Render. On the next telemetry poll, the ESP32 fetches the
                  pending command, applies the new protection or maintenance/runtime settings, then acknowledges
                  the command back to the backend.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default SettingsPage;
