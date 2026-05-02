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
  History,
  Activity,
  Shield,
  CheckCircle2,
  Clock,
  AlertCircle,
  Terminal,
  Download,
} from 'lucide-react';
import {
  fetchDeviceData,
  sendSetProtection,
  sendSetMaintenance,
  sendSetRuntime,
  sendResetEnergy,
  sendClearMaintenance,
  fetchPendingCommand,
  fetchCommandHistory,
  exportSensorData,
  exportFaultLogs,
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
  { key: 'tapThresholdMg', label: 'Tap Threshold', unit: 'mg', icon: Activity, step: 62, min: 62, max: 16000, dataKey: 'prot_tap_threshold_mg', desc: 'ADXL345 tap detection sensitivity (62–16000 mg)' },
  { key: 'tapDurationUs', label: 'Tap Duration', unit: 'µs', icon: Timer, step: 625, min: 625, max: 160000, dataKey: 'prot_tap_duration_us', desc: 'ADXL345 minimum tap duration (625–160000 µs)' },
];

const DEFAULT_FORM = Object.fromEntries(FIELD_DEFS.map((f) => [f.key, '']));
const DEFAULT_MAINT_FORM = {
  nextMaintenanceTime: '',
  totalLifeCycleHours: '',
  maintenanceHoursLimit: '',
  runtimeHours: '',
};

function formatLocalOffsetDateTime(value) {
  if (!value) return '';
  const match = String(value).trim().match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})?$/
  );
  if (!match) return '';
  const [, year, month, day, hour, minute] = match;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toIso8601WithLocalTimezone(value) {
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const dt = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0
  );
  if (Number.isNaN(dt.getTime())) return null;
  const offsetMinutes = -dt.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffsetMinutes = Math.abs(offsetMinutes);
  const pad = (n) => String(n).padStart(2, '0');
  const tzHours = Math.floor(absOffsetMinutes / 60);
  const tzMinutes = absOffsetMinutes % 60;
  return `${year}-${month}-${day}T${hour}:${minute}:00${sign}${pad(tzHours)}:${pad(tzMinutes)}`;
}

function toDateTimeLocalValue(value) {
  return formatLocalOffsetDateTime(value);
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
  const [pendingCommand, setPendingCommand] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [commandError, setCommandError] = useState('');
  const [actionError, setActionError] = useState('');

  const [exportingSensor, setExportingSensor] = useState(false);
  const [exportingFaults, setExportingFaults] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const [exportCategories, setExportCategories] = useState({
    motor: true,
    power: true,
    temperature: true,
    vibration: true,
    faults: true,
    protection: false,
  });

  const handleCategoryToggle = (cat) => {
    setExportCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleExportSensorData = async () => {
    setExportingSensor(true);
    setActionError('');
    try {
      const sDate = exportStartDate ? new Date(exportStartDate).toISOString() : null;
      const eDate = exportEndDate ? new Date(exportEndDate).toISOString() : null;
      const selectedCats = Object.keys(exportCategories).filter(k => exportCategories[k]);
      const blob = await exportSensorData(deviceId, selectedCats, sDate, eDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sensor_data_${deviceId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Sensor data downloaded successfully.', true);
    } catch (err) {
      setActionError(`Export failed: ${err.message}`);
      showToast(`Failed to export sensor data: ${err.message}`, false);
    } finally {
      setExportingSensor(false);
    }
  };

  const handleExportFaultLogs = async () => {
    setExportingFaults(true);
    setActionError('');
    try {
      const sDate = exportStartDate ? new Date(exportStartDate).toISOString() : null;
      const eDate = exportEndDate ? new Date(exportEndDate).toISOString() : null;
      const blob = await exportFaultLogs(deviceId, sDate, eDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fault_logs_${deviceId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Fault logs downloaded successfully.', true);
    } catch (err) {
      setActionError(`Export failed: ${err.message}`);
      showToast(`Failed to export fault logs: ${err.message}`, false);
    } finally {
      setExportingFaults(false);
    }
  };

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 4500);
  };

  const buildQueuedMessage = (baseMessage, response) => {
    const replaced = Number(response?.replacedPendingCommands || 0);
    if (replaced > 0) {
      return `${baseMessage} Replaced ${replaced} older pending command${replaced === 1 ? '' : 's'}.`;
    }
    return baseMessage;
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

  useEffect(() => {
    let alive = true;

    async function loadCommandDebug() {
      try {
        const [pending, history] = await Promise.all([
          fetchPendingCommand(deviceId),
          fetchCommandHistory(deviceId, 8),
        ]);
        if (!alive) return;
        setPendingCommand(pending?.command ? pending : null);
        setCommandHistory(Array.isArray(history?.commands) ? history.commands : []);
        setCommandError('');
      } catch (err) {
        if (!alive) return;
        setCommandError('Unable to load command status');
      }
    }

    loadCommandDebug();
    const interval = setInterval(loadCommandDebug, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
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
    setActionError('');
    try {
      const payload = {};
      FIELD_DEFS.forEach((f) => {
        const raw = form[f.key];
        if (raw === '' || raw === null || raw === undefined) return;
        payload[f.key] = f.step < 1 ? parseFloat(raw) : parseInt(raw, 10);
      });
      const response = await sendSetProtection(deviceId, payload);
      setActionError('');
      showToast(buildQueuedMessage('Protection settings queued. ESP32 will apply them on the next poll.', response), true);
      setDirty(false);
    } catch (err) {
      setActionError(`Protection settings rejected: ${err.message}`);
      showToast(`Failed to send protection settings: ${err.message}`, false);
    } finally {
      setSending(false);
    }
  };

  const handleMaintenanceSend = async () => {
    setMaintSending(true);
    setActionError('');
    try {
      const payload = {};

      if (maintForm.nextMaintenanceTime) {
        const nextMaintenanceTime = toIso8601WithLocalTimezone(maintForm.nextMaintenanceTime);
        if (!nextMaintenanceTime) {
          throw new Error('Invalid maintenance date/time');
        }
        payload.nextMaintenanceTime = nextMaintenanceTime;
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

      const response = await sendSetMaintenance(deviceId, payload);
      setActionError('');
      showToast(buildQueuedMessage('Maintenance and runtime command queued. ESP32 will apply it on the next poll.', response), true);
      setMaintDirty(false);
    } catch (err) {
      setActionError(`Maintenance command rejected: ${err.message}`);
      showToast(`Failed to send maintenance command: ${err.message}`, false);
    } finally {
      setMaintSending(false);
    }
  };

  const handleRuntimeOnlySend = async () => {
    setMaintSending(true);
    setActionError('');
    try {
      const runtime = parseFloat(maintForm.runtimeHours);
      if (!Number.isFinite(runtime) || runtime < 0) {
        throw new Error('Enter a valid runtime in hours');
      }
      const response = await sendSetRuntime(deviceId, Math.round(runtime * 3600));
      setActionError('');
      showToast(buildQueuedMessage('Runtime command queued. ESP32 will apply it on the next poll.', response), true);
      setMaintDirty(false);
    } catch (err) {
      setActionError(`Runtime command rejected: ${err.message}`);
      showToast(`Failed to send runtime command: ${err.message}`, false);
    } finally {
      setMaintSending(false);
    }
  };

  const handleResetEnergy = async () => {
    setMaintSending(true);
    setActionError('');
    try {
      const response = await sendResetEnergy(deviceId);
      setActionError('');
      showToast(buildQueuedMessage('Energy reset command queued. ESP32 will apply it on the next poll.', response), true);
    } catch (err) {
      setActionError(`Energy reset rejected: ${err.message}`);
      showToast(`Failed to queue energy reset: ${err.message}`, false);
    } finally {
      setMaintSending(false);
    }
  };

  const handleClearMaintenance = async () => {
    setMaintSending(true);
    setActionError('');
    try {
      const response = await sendClearMaintenance(deviceId);
      setActionError('');
      showToast(buildQueuedMessage('Clear maintenance command queued. ESP32 will clear it on the next poll.', response), true);
    } catch (err) {
      setActionError(`Clear maintenance rejected: ${err.message}`);
      showToast(`Failed to queue clear maintenance: ${err.message}`, false);
    } finally {
      setMaintSending(false);
    }
  };

  const latest = data.length > 0 ? data[0] : null;
  const isLive = isReadingLive(latest);

  const formatDateTime = (value) => {
    if (!value) return '--';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const statusColor = (status) => {
    switch (status) {
      case 'acked':
        return '#27ae60';
      case 'pending':
        return '#f39c12';
      case 'cancelled':
        return '#9b59b6';
      case 'failed':
        return '#e74c3c';
      case 'expired':
        return '#95a5a6';
      default:
        return '#bdc3c7';
    }
  };

  const getCommandIcon = (cmd) => {
    if (cmd?.includes('protection')) return <Shield size={14} />;
    if (cmd?.includes('maintenance')) return <Wrench size={14} />;
    if (cmd?.includes('runtime')) return <Timer size={14} />;
    if (cmd?.includes('energy')) return <BatteryCharging size={14} />;
    if (cmd?.includes('clear')) return <RefreshCw size={14} />;
    return <Terminal size={14} />;
  };

  const formatNumeric = (value, digits = 2) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '--';
    return Number.isInteger(num) ? String(num) : num.toFixed(digits);
  };

  const currentProtectionItems = latest ? FIELD_DEFS.map((field) => ({
    key: field.key,
    label: field.label,
    value: latest[field.dataKey],
    unit: field.unit,
  })) : [];

  const currentMaintenanceItems = latest ? [
    {
      key: 'nextMaintenanceTime',
      label: 'Next Maintenance',
      value: formatDateTime(latest.maint_next_time),
      unit: '',
    },
    {
      key: 'totalLifeCycleHours',
      label: 'Total Life Cycle',
      value: formatNumeric(latest.maint_total_hours, 1),
      unit: 'h',
    },
    {
      key: 'maintenanceHoursLimit',
      label: 'Maintenance Interval',
      value: formatNumeric(latest.maint_hours_limit, 1),
      unit: 'h',
    },
    {
      key: 'runtimeHours',
      label: 'Current Runtime',
      value: latest.uptime_seconds !== null && latest.uptime_seconds !== undefined
        ? formatNumeric(Number(latest.uptime_seconds) / 3600, 2)
        : '--',
      unit: 'h',
    },
  ] : [];

  const CommandStatus = ({ status }) => (
    <div className="status-dot-indicator" style={{ color: statusColor(status) }}>
      <div className={`status-dot ${status}`} />
      {status}
    </div>
  );

  const CommandHistoryItem = ({ item, isActive = false }) => (
    <div className={`command-timeline-item ${isActive ? 'active' : ''}`}>
      <div className="command-item-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: isActive ? 'var(--accent-1)' : 'var(--text-muted)' }}>
            {getCommandIcon(item.command)}
          </span>
          <span className="command-item-name">{item.command}</span>
        </div>
        <CommandStatus status={item.status} />
      </div>
      <div className="command-item-meta">
        <span>ID {item.id} • {formatDateTime(item.created_at)}</span>
        {item.acked_at && <span>Acked {formatDateTime(item.acked_at)}</span>}
      </div>
      <pre className="compact-code">
        {JSON.stringify(item.payload ?? {}, null, 2)}
      </pre>
    </div>
  );

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
      {actionError && <div className="error-banner">{actionError}</div>}

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

          <section className="metrics-section">
            <div className="section-header-with-icon">
              <Download size={20} />
              <h2 style={{ margin: 0 }}>Data Export</h2>
            </div>
            <p style={{ margin: '0 0 16px', opacity: 0.68, fontSize: '0.88rem' }}>
              Download historical sensor readings and fault logs as CSV files for analysis. Filter by date to narrow down your export.
            </p>

            <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '16px' }}>
              <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <Clock size={14} />
                  Start Date
                </div>
                <input
                  type="datetime-local"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  style={inputStyle('rgba(255,255,255,0.4)')}
                />
              </div>

              <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <Clock size={14} />
                  End Date
                </div>
                <input
                  type="datetime-local"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  style={inputStyle('rgba(255,255,255,0.4)')}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                <Activity size={14} />
                Sensor Data Categories (Applies to Sensor Readings)
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {Object.keys(exportCategories).map(cat => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={exportCategories[cat]} 
                      onChange={() => handleCategoryToggle(cat)} 
                      style={{ cursor: 'pointer', accentColor: '#00d4ff' }}
                    />
                    <span style={{ textTransform: 'capitalize' }}>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={handleExportSensorData} 
                disabled={exportingSensor || exportingFaults} 
                style={primaryButtonStyle(!exportingSensor && !exportingFaults, '#00d4ff', '#0066ff')}
              >
                <Download size={14} />
                {exportingSensor ? 'Exporting...' : 'Download Sensor Readings'}
              </button>
              
              <button 
                onClick={handleExportFaultLogs} 
                disabled={exportingSensor || exportingFaults} 
                style={primaryButtonStyle(!exportingSensor && !exportingFaults, '#8759ff', '#4c2cc9')}
              >
                <Download size={14} />
                {exportingFaults ? 'Exporting...' : 'Download Fault Logs'}
              </button>
              
              {(exportStartDate || exportEndDate) && (
                <button 
                  onClick={() => { setExportStartDate(''); setExportEndDate(''); }} 
                  style={secondaryButtonStyle()}
                >
                  <RefreshCw size={14} /> Clear Filters
                </button>
              )}
            </div>
          </section>

          <section className="metrics-section">
            <div className="section-header-with-icon">
              <AlertCircle size={20} />
              <h2 style={{ margin: 0 }}>Current Applied Config</h2>
            </div>
            <p style={{ margin: '0 0 16px', opacity: 0.68, fontSize: '0.88rem' }}>
              These values come from the latest telemetry row, so they show what the ESP most recently reported as live.
              {latest?.ts ? ` Last update: ${formatDateTime(latest.ts)}.` : ''}
            </p>

            <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              <div className="minimal-debug-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', opacity: 0.8 }}>
                  <Shield size={16} />
                  <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    Live Protection
                  </span>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {currentProtectionItems.map((item) => (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                      <span style={{ opacity: 0.68 }}>{item.label}</span>
                      <strong>
                        {formatNumeric(item.value)}{item.unit ? ` ${item.unit}` : ''}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="minimal-debug-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', opacity: 0.8 }}>
                  <Wrench size={16} />
                  <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    Live Maintenance
                  </span>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {currentMaintenanceItems.map((item) => (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                      <span style={{ opacity: 0.68 }}>{item.label}</span>
                      <strong>
                        {item.value}{item.unit ? ` ${item.unit}` : ''}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="metrics-section">
            <div className="section-header-with-icon">
              <Activity size={20} />
              <h2 style={{ margin: 0 }}>Command Debug Panel</h2>
            </div>

            {commandError && (
              <div className="error-banner" style={{ marginBottom: '12px' }}>{commandError}</div>
            )}

            <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              <div className="minimal-debug-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', opacity: 0.8 }}>
                  <Clock size={16} />
                  <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    Pending Queue
                  </span>
                </div>
                {pendingCommand ? (
                  <CommandHistoryItem item={pendingCommand} isActive={true} />
                ) : (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.88rem' }}>
                    <CheckCircle2 size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                    <p>No commands waiting for device</p>
                  </div>
                )}
              </div>

              <div className="minimal-debug-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', opacity: 0.8 }}>
                  <History size={16} />
                  <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    Activity History
                  </span>
                </div>
                <div className="command-timeline" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                  {commandHistory.length === 0 && (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.88rem' }}>
                      <p>No activity recorded</p>
                    </div>
                  )}
                  {commandHistory.map((item) => (
                    <CommandHistoryItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default SettingsPage;
