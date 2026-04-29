import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

import { fetchFaultsSummary, fetchActiveFaults } from '../api';
import './FaultsBanner.css';

function FaultsBanner() {
  const [summary, setSummary] = useState({
    critical_count: 0,
    warning_count: 0,
    info_count: 0,
    total_active: 0
  });
  const [firstFaultDevice, setFirstFaultDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [summaryData, activeFaults] = await Promise.all([
        fetchFaultsSummary(),
        fetchActiveFaults()
      ]);
      setSummary(summaryData);
      // Get first device with a critical fault, or first with any fault
      const criticalFault = activeFaults.find(f => f.severity === 'critical');
      const warningFault = activeFaults.find(f => f.severity === 'warning');
      const anyFault = activeFaults[0];
      setFirstFaultDevice(criticalFault?.device_id || warningFault?.device_id || anyFault?.device_id);
    } catch (err) {
      console.error('Failed to load faults data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || dismissed || summary.total_active === 0) {
    return null;
  }

  const hasCritical = summary.critical_count > 0;
  const hasWarning = summary.warning_count > 0;
  const hasInfo = summary.info_count > 0;

  // Determine banner severity based on highest level
  let bannerClass = 'faults-banner';
  let Icon = Info;
  let title = 'Active Faults';

  if (hasCritical) {
    bannerClass += ' critical';
    Icon = AlertTriangle;
    title = `${summary.critical_count} Critical Fault${summary.critical_count > 1 ? 's' : ''}`;
  } else if (hasWarning) {
    bannerClass += ' warning';
    Icon = AlertCircle;
    title = `${summary.warning_count} Warning${summary.warning_count > 1 ? 's' : ''}`;
  } else {
    bannerClass += ' info';
    title = `${summary.info_count} Notification${summary.info_count > 1 ? 's' : ''}`;
  }


  return (
    <div className={bannerClass}>
      <div className="banner-content">
        <Icon size={20} className="banner-icon" />
        <div className="banner-text">
          <span className="banner-title">{title}</span>
          <span className="banner-details">
            {hasCritical && <span className="badge critical">{summary.critical_count} Critical</span>}
            {hasWarning && <span className="badge warning">{summary.warning_count} Warning</span>}
            {hasInfo && <span className="badge info">{summary.info_count} Info</span>}
          </span>
        </div>

      </div>
      <button 
        className="banner-dismiss"
        onClick={() => setDismissed(true)}
        title="Dismiss for now"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default FaultsBanner;
