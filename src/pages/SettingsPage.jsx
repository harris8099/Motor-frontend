import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, Zap, Thermometer, Gauge, Timer, Save, Send, RefreshCw } from 'lucide-react';
import { fetchDeviceData, sendSetProtection } from '../api';
import Breadcrumbs from '../components/Breadcrumbs';
import LiveIndicator from '../components/LiveIndicator';
import SkeletonCard from '../components/SkeletonCard';
import { isReadingLive } from '../utils/deviceStatus';
import './PageStyles.css';

const FIELD_DEFS = [
  { key: 'maxCurrentA',         label: 'Max Current',          unit: 'A',  icon: Zap,         step: 0.1, min: 0,    max: 100,   dataKey: 'prot_max_current',          desc: 'Overcurrent protection threshold' },
  { key: 'maxTempC',            label: 'Max Temperature',       unit: '°C', icon: Thermometer, step: 0.5, min: 0,    max: 200,   dataKey: 'prot_max_temp',             desc: 'Overtemperature protection threshold' },
  { key: 'minRpm',              label: 'Min RPM (Stall)',        unit: 'rpm',icon: Gauge,       step: 1,   min: 0,    max: 10000, dataKey: 'prot_min_rpm',              desc: 'Minimum RPM to detect stall' },
  { key: 'overvoltageV',        label: 'Over Voltage',          unit: 'V',  icon: Zap,         step: 0.5, min: 0,    max: 500,   dataKey: 'prot_overvoltage_v',        desc: 'Upper voltage limit' },
  { key: 'undervoltageV',       label: 'Under Voltage',         unit: 'V',  icon: Zap,         step: 0.5, min: 0,    max: 500,   dataKey: 'prot_undervoltage_v',       desc: 'Lower voltage limit' },
  { key: 'stallCurrentA',       label: 'Stall Current',         unit: 'A',  icon: Zap,         step: 0.1, min: 0,    max: 100,   dataKey: 'prot_stall_current_a',      desc: 'Current threshold to detect stall' },
  { key: 'startupGraceMs',      label: 'Startup Grace',         unit: 'ms', icon: Timer,       step: 100, min: 0,    max: 30000, dataKey: 'prot_startup_grace_ms',     desc: 'Delay before protection checks begin' },
  { key: 'faultTripCount',      label: 'Fault Trip Count',      unit: '',   icon: Settings,    step: 1,   min: 0,    max: 1000,  dataKey: 'prot_fault_trip_count',     desc: 'Accumulated fault trip count' },
  { key: 'vibrationAckGraceMs', label: 'Vibration Ack Grace',   unit: 'ms', icon: Timer,       step: 100, min: 0,    max: 30000, dataKey: 'prot_vibration_ack_grace_ms', desc: 'Grace period after vibration ack' },
];

const DEFAULT_FORM = Object.fromEntries(FIELD_DEFS.map(f => [f.key, '']));

function SettingsPage() {
  const { deviceId } = useParams();
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [form, setForm]     = useState(DEFAULT_FORM);
  const [dirty, setDirty]   = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast]   = useState({ msg: '', ok: true });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 4500);
  };

  const populateForm = (row) => {
    const next = {};
    FIELD_DEFS.forEach(f => {
      const val = row[f.dataKey];
      next[f.key] = val !== null && val !== undefined ? val : '';
    });
    setForm(next);
    setDirty(false);
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const res = await fetchDeviceData(deviceId, 1);
        const rows = res.data || [];
        setData(rows);
        if (rows.length > 0) populateForm(rows[0]);
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
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleReset = () => {
    if (data.length > 0) populateForm(data[0]);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const payload = {};
      FIELD_DEFS.forEach(f => {
        const raw = form[f.key];
        if (raw === '' || raw === null || raw === undefined) return;
        payload[f.key] = f.step < 1 ? parseFloat(raw) : parseInt(raw, 10);
      });
      await sendSetProtection(deviceId, payload);
      showToast('✓ Protection settings queued — ESP32 will apply on next poll', true);
      setDirty(false);
    } catch (err) {
      showToast('✗ Failed to send: ' + err.message, false);
    } finally {
      setSending(false);
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
            <h1>Protection Settings</h1>
            <p className="page-subtitle">
              {dirty
                ? 'Unsaved changes — click "Send to Device" to apply'
                : 'Current protection thresholds and limits'}
            </p>
          </div>
        </div>
        <div className="header-meta">
          <LiveIndicator isLive={!loading && !error && isLive} />
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {toast.msg && (
        <div style={{
          background: toast.ok ? 'rgba(39,174,96,0.12)' : 'rgba(192,57,43,0.12)',
          border: `1px solid ${toast.ok ? '#27ae60' : '#c0392b'}`,
          color: toast.ok ? '#27ae60' : '#c0392b',
          padding: '12px 18px', borderRadius: '8px', marginBottom: '18px',
          fontSize: '0.9rem', fontWeight: 500,
        }}>
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
          {/* Editable Protection Fields */}
          <section className="metrics-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Protection Thresholds</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                {dirty && (
                  <button
                    onClick={handleReset}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', borderRadius: '8px',
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.85rem',
                    }}
                  >
                    <RefreshCw size={14} /> Reset
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={sending || !dirty}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 20px', borderRadius: '8px',
                    background: dirty ? 'linear-gradient(135deg,#00d4ff,#0066ff)' : 'rgba(255,255,255,0.08)',
                    border: 'none', color: dirty ? '#fff' : 'rgba(255,255,255,0.3)',
                    cursor: dirty ? 'pointer' : 'not-allowed', fontSize: '0.88rem',
                    fontWeight: 600, transition: 'all 0.2s',
                    boxShadow: dirty ? '0 4px 14px rgba(0,212,255,0.3)' : 'none',
                  }}
                >
                  <Send size={14} />
                  {sending ? 'Sending…' : 'Send to Device'}
                </button>
              </div>
            </div>

            <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {FIELD_DEFS.map((f, idx) => {
                const IconComp = f.icon;
                return (
                  <div
                    key={f.key}
                    className={`metric-card delay-${(idx % 3) + 1}`}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
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
                        onChange={e => handleChange(f.key, e.target.value)}
                        style={{
                          flex: 1, background: 'rgba(255,255,255,0.06)',
                          border: dirty ? '1px solid rgba(0,212,255,0.4)' : '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '6px', color: '#fff', padding: '8px 10px',
                          fontSize: '1rem', fontWeight: 600, outline: 'none', width: '100%',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = '#00d4ff'}
                        onBlur={e => e.target.style.borderColor = dirty ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.12)'}
                      />
                      {f.unit && (
                        <span style={{ opacity: 0.55, fontSize: '0.8rem', minWidth: '24px' }}>{f.unit}</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.45 }}>{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* How it works note */}
          <section className="note-section">
            <div className="panel note-panel" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Send size={20} style={{ marginTop: '2px', flexShrink: 0, color: '#00d4ff' }} />
              <div>
                <strong>How remote config works:</strong>
                <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: '0.85rem' }}>
                  Edit the values above and click <em>Send to Device</em>. The command is queued in the backend.
                  On the next telemetry poll (every ~5 s), the ESP32 fetches the pending command, applies the new
                  protection thresholds, and acknowledges back to the server. The updated values will appear here
                  within one poll cycle.
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
