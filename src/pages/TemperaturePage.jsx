import React, { useState, useEffect } from 'react';
import { useCityTemp } from '../context/LocationContext';
import { useParams } from 'react-router-dom';
import { Thermometer, ThermometerSun, Flame, TrendingUp } from 'lucide-react';
import { fetchDeviceData } from '../api';
import MetricCard from '../components/MetricCard';
import LiveChart from '../components/LiveChart';
import TemperatureChart from '../components/TemperatureChart';
import Breadcrumbs from '../components/Breadcrumbs';
import LiveIndicator from '../components/LiveIndicator';
import SkeletonCard from '../components/SkeletonCard';
import { isReadingLive } from '../utils/deviceStatus';
import './PageStyles.css';

function TemperaturePage() {
  const { deviceId } = useParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  //const [cityTemp, setCityTemp] = useState(null);
  const { cityTemp } = useCityTemp();

  // Data fetching
  useEffect(() => {
    async function loadData(silent = false) {
      try {
        if (!silent) setLoading(true);
        setError('');
        const dataRes = await fetchDeviceData(deviceId);
        setData(dataRes.data || []);
      } catch (err) {
        console.error('Failed to load temperature data', err);
        setError('Could not load temperature data. Please check API connection.');
      } finally {
        if (!silent) setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(() => loadData(true), 5000);
    return () => clearInterval(interval);
  }, [deviceId]);

  // City temperature via geolocation
  // useEffect(() => {
  //   if (navigator.geolocation) {
  //     navigator.geolocation.getCurrentPosition(
  //       (pos) => {
  //         const { latitude, longitude } = pos.coords;
  //         fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`)
  //           .then(r => r.json())
  //           .then(d => setCityTemp(d.current?.temperature_2m ?? null))
  //           .catch(() => { });
  //       },
  //       () => {
  //         // fallback to Udaipur if user denies location
  //         fetch('https://api.open-meteo.com/v1/forecast?latitude=24.58&longitude=73.68&current=temperature_2m')
  //           .then(r => r.json())
  //           .then(d => setCityTemp(d.current?.temperature_2m ?? null))
  //           .catch(() => { });
  //       }
  //     );
  //   }
  // }, []);

  const latest = data.length > 0 ? data[0] : null;
  const isLive = isReadingLive(latest);
  const motorTemp = latest ? (latest.temp1 ?? 0).toFixed(1) : '0.0';
  const tempDiff = latest && cityTemp !== null
    ? (latest.temp1 - cityTemp).toFixed(1)
    : '0.0';

  // Calculate temperature trend using temp1 only
  const getTempTrend = () => {
    if (data.length < 5) return 'stable';
    const recent = data.slice(0, 5);
    const avgRecent = recent.reduce((sum, d) => sum + (d.temp1 ?? 0), 0) / recent.length;
    const older = data.slice(5, 10);
    if (older.length === 0) return 'stable';
    const avgOlder = older.reduce((sum, d) => sum + (d.temp1 ?? 0), 0) / older.length;
    if (avgRecent > avgOlder + 2) return 'rising';
    if (avgRecent < avgOlder - 2) return 'falling';
    return 'stable';
  };

  const trend = getTempTrend();

  return (
    <div className="page-container">
      <Breadcrumbs />

      <header className="page-header">
        <div className="header-with-icon">
          <div className="header-icon-wrapper temperature">
            <Thermometer size={28} />
          </div>
          <div>
            <h1>Temperature</h1>
            <p className="page-subtitle">Thermal monitoring and analysis</p>
          </div>
        </div>
        <div className="header-meta">
          <LiveIndicator isLive={!loading && !error && isLive} />
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="skeleton-grid">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {latest && (
        <>
          <section className="metrics-section">
            <h2>Current Temperatures</h2>
            <div className="metrics-grid">
              <MetricCard
                title="Motor Temp"
                value={motorTemp}
                unit="°C"
                icon={Thermometer}
                delay="delay-1"
              />
              <MetricCard
                title="City Temp"
                value={cityTemp?.toFixed(1) ?? '--'}
                unit="°C"
                icon={ThermometerSun}
                delay="delay-1"
              />
              <MetricCard
                title="Motor vs City"
                value={Math.abs(tempDiff)}
                unit={`°C ${parseFloat(tempDiff) > 0 ? '(Motor > City)' : '(City > Motor)'}`}
                icon={TrendingUp}
                delay="delay-2"
              />
            </div>
          </section>

          <section className="temp-status-section">
            <h2>Temperature Status</h2>
            <div className="panel status-panel">
              <div className="status-row">
                <span className="status-label">Over Temperature Fault:</span>
                <span className={`status-value ${latest.fault_overtemp ? 'fault' : 'ok'}`}>
                  {latest.fault_overtemp ? 'ACTIVE' : 'OK'}
                </span>
              </div>
              <div className="status-row">
                <span className="status-label">Max Temperature Limit:</span>
                <span className="status-value">{latest.prot_max_temp?.toFixed(1) ?? '--'} °C</span>
              </div>
              <div className="status-row">
                <span className="status-label">Temperature Trend:</span>
                <span className={`status-value trend-${trend}`}>
                  {trend === 'rising' ? 'RISING ↑' : trend === 'falling' ? 'FALLING ↓' : 'STABLE →'}
                </span>
              </div>
            </div>
          </section>

          <section className="chart-section">
            <h2>Temperature History</h2>
            <div className="panel chart-panel">
              <TemperatureChart data={data} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default TemperaturePage;
