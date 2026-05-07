import { useEffect, useState } from 'react';
import { Zap, Plus, Cpu, ArrowRight, Trash2, Search, Wifi, WifiOff, Clock, Layers, X, RefreshCw, Info, LogOut, Edit2, Check, XCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchDevices, createDevice, createDevicesBulk, deleteDevice, updateDevice, fetchActiveFaults, fetchFaultsSummary } from '../api';
import ThemeToggle from '../components/ThemeToggle';
import FaultsBanner from '../components/FaultsBanner';
import { getDeviceStatus } from '../utils/deviceStatus';
import { formatISTDateTime } from '../utils/formatters';
import './Home.css';

function Home({ onLogout }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('lastSeen');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Single device add
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  
  // Bulk add
  const [bulkInput, setBulkInput] = useState('');
  
  // Edit device name
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editDeviceName, setEditDeviceName] = useState('');
  
  // Active faults for fault indicators
  const [activeFaults, setActiveFaults] = useState([]);
  const [faultSummary, setFaultSummary] = useState({
    critical_count: 0,
    warning_count: 0,
    info_count: 0,
    total_active: 0,
  });
  const [faultsLoading, setFaultsLoading] = useState(true);

  async function loadDevices(silent = false) {
    try {
      if (!silent) setLoading(true);
      const data = await fetchDevices();
      // Transform backend data to frontend format
      const transformed = data.map(d => ({
        id: d.id,
        name: d.name || d.id,
        added: d.created_at,
        lastSeen: d.last_seen_at,
        status: getDeviceStatus(d),
        is_active: d.is_active !== false,
      }));
      setDevices(transformed);
      setError('');
    } catch (err) {
      console.error('Failed to load devices:', err);
      setError('Failed to load devices. Please check API connection.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadActiveFaults() {
    try {
      const [faults, summary] = await Promise.all([
        fetchActiveFaults(),
        fetchFaultsSummary(),
      ]);
      setActiveFaults(faults);
      setFaultSummary(summary);
    } catch (err) {
      console.error('Failed to load active faults:', err);
    } finally {
      setFaultsLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
    loadActiveFaults();
    const interval = setInterval(() => {
      if (document.hidden) return;
      loadDevices(true);
      loadActiveFaults();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const addSingleDevice = async (e) => {
    e.preventDefault();
    const trimmedId = newDeviceId.trim();
    if (!trimmedId) return;
    
    setIsSubmitting(true);
    try {
      const existingDevice = devices.find(d => d.id === trimmedId);
      await createDevice({
        id: trimmedId,
        name: newDeviceName.trim() || undefined
      });
      
      await loadDevices();
      setNewDeviceId('');
      setNewDeviceName('');
      setShowAddPanel(false);
      if (existingDevice) {
        alert(`Device ${trimmedId} was reactivated and updated.`);
      }
    } catch (err) {
      alert(`Failed to add device: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBulkDevices = async (e) => {
    e.preventDefault();
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(l => l);
    const devicesToCreate = [];
    const seenIds = new Set();
    
    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim());
      const id = parts[0];
      const name = parts[1] || undefined;
      
      if (!id) return;
      if (seenIds.has(id)) return;

      seenIds.add(id);
      devicesToCreate.push({ id, name });
    });
    
    if (devicesToCreate.length === 0) {
      alert('No valid devices to add');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const existingIds = new Set(devices.map(d => d.id));
      const reactivatedCount = devicesToCreate.filter(device => existingIds.has(device.id)).length;
      await createDevicesBulk(devicesToCreate);
      await loadDevices();
      setBulkInput('');
      setShowAddPanel(false);
      setBulkMode(false);
      if (reactivatedCount > 0) {
        alert(`Saved ${devicesToCreate.length} devices. Reactivated/updated ${reactivatedCount} existing device(s).`);
      }
    } catch (err) {
      alert(`Failed to add devices: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeDevice = async (deviceId) => {
    if (confirm(`Remove device ${deviceId}?`)) {
      try {
        await deleteDevice(deviceId);
        await loadDevices();
      } catch (err) {
        alert(`Failed to remove device: ${err.message}`);
      }
    }
  };

  const toggleDeviceStatus = async (e, deviceId) => {
    e.preventDefault();
    e.stopPropagation();
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      const newStatus = !device.is_active;
      console.log(`Toggling device ${deviceId}: is_active ${device.is_active} -> ${newStatus}`);
      try {
        const result = await updateDevice(deviceId, { is_active: newStatus });
        console.log('Update result:', result);
        await loadDevices();
      } catch (err) {
        console.error('Failed to update device:', err);
        alert(`Failed to update device: ${err.message}`);
      }
    }
  };

  const startEditDevice = (e, device) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingDeviceId(device.id);
    setEditDeviceName(device.name || device.id);
  };

  const cancelEditDevice = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingDeviceId(null);
    setEditDeviceName('');
  };

  const saveEditDevice = async (e, deviceId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await updateDevice(deviceId, { name: editDeviceName.trim() || undefined });
      await loadDevices();
      setEditingDeviceId(null);
      setEditDeviceName('');
    } catch (err) {
      console.error('Failed to update device name:', err);
      alert(`Failed to update device name: ${err.message}`);
    }
  };

  const filteredDevices = devices
    .filter(d => {
      const matchesSearch = d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'id':
          return a.id.localeCompare(b.id);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'lastSeen':
        default:
          return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
      }
    });

  const formatLastSeen = (date) => {
    if (!date) return 'No data yet';

    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000);
    const istTime = formatISTDateTime(date);

    if (diff < 60) return `Just now (${istTime})`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago (${istTime})`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago (${istTime})`;
    return `${Math.floor(diff / 86400)}d ago (${istTime})`;
  };

  // Helper to get fault info for a device
  const getDeviceFaultInfo = (deviceId) => {
    const deviceFaults = activeFaults.filter(f => f.device_id === deviceId);
    if (deviceFaults.length === 0) return null;
    
    const criticalCount = deviceFaults.filter(f => f.severity === 'critical').length;
    const warningCount = deviceFaults.filter(f => f.severity === 'warning').length;
    const infoCount = deviceFaults.filter(f => f.severity === 'info').length;
    
    if (criticalCount > 0) return { severity: 'critical', count: deviceFaults.length };
    if (warningCount > 0) return { severity: 'warning', count: deviceFaults.length };
    return { severity: 'info', count: deviceFaults.length };
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="header-content">
          <div className="header-topbar">
            <div className="logo">
              <Zap size={32} />
              <h1>Smart Motor Command Center</h1>
            </div>
            <div className="header-actions">
              <Link to="/about" className="about-link-btn" title="About">
                <Info size={18} />
                About
              </Link>
              <button type="button" className="about-link-btn" onClick={onLogout} title="Logout">
                <LogOut size={18} />
                Logout
              </button>
              <ThemeToggle />
            </div>
          </div>
          <p className="subtitle">Manage and monitor your motor devices</p>
        </div>
      </header>

      <FaultsBanner summary={faultSummary} loading={faultsLoading} />

      <main className="home-main">
        {error && <div className="error-banner">{error}</div>}

        {/* Devices with Active Faults */}
        {(() => {
          const devicesWithFaults = devices.filter(d => 
            activeFaults.some(f => f.device_id === d.id)
          );
          if (devicesWithFaults.length === 0) return null;
          return (
            <section className="devices-with-faults">
              <h2>
                <AlertTriangle size={20} />
                Devices with Active Faults ({devicesWithFaults.length})
              </h2>
              <div className="faulty-devices-list">
                {devicesWithFaults.map(device => {
                  const deviceFaults = activeFaults.filter(f => f.device_id === device.id);
                  const criticalCount = deviceFaults.filter(f => f.severity === 'critical').length;
                  const warningCount = deviceFaults.filter(f => f.severity === 'warning').length;
                  return (
                    <Link 
                      key={device.id} 
                      to={`/device/${device.id}/faults`}
                      className={`faulty-device-item ${criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'info'}`}
                    >
                      <div className="faulty-device-info">
                        <span className="faulty-device-name">{device.name || device.id}</span>
                        <span className="faulty-device-count">
                          {criticalCount > 0 && <span className="badge critical">{criticalCount} Critical</span>}
                          {warningCount > 0 && <span className="badge warning">{warningCount} Warning</span>}
                        </span>
                      </div>
                      <ArrowRight size={18} />
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })()}
        
        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value">{devices.length}</span>
            <span className="stat-label">Total Devices</span>
          </div>
          <div className="stat-item">
            <span className="stat-value online">{devices.filter(d => d.status === 'online').length}</span>
            <span className="stat-label">Online</span>
          </div>
          <div className="stat-item">
            <span className="stat-value offline">{devices.filter(d => d.status !== 'online').length}</span>
            <span className="stat-label">Not Live</span>
          </div>
          <button 
            className="refresh-btn"
            onClick={() => {
              loadDevices();
              loadActiveFaults();
            }}
            title="Refresh device status"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>

        {/* Devices Section */}
        <section className="devices-section">
          <div className="section-header-row">
            <h2>Your Devices</h2>
            <button 
              className="toggle-add-btn"
              onClick={() => setShowAddPanel(!showAddPanel)}
            >
              {showAddPanel ? <X size={18} /> : <Plus size={18} />}
              {showAddPanel ? 'Cancel' : 'Add Device'}
            </button>
          </div>

          {/* Filters */}
          <div className="filters-bar">
            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search devices by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="disabled">Disabled</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Sort by:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="lastSeen">Last Seen</option>
                <option value="name">Name</option>
                <option value="id">Device ID</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          {/* Add Device Panel */}
          {showAddPanel && (
            <div className="add-device-panel">
              {isSubmitting && <div className="submitting-overlay">Processing...</div>}
              <div className="add-mode-toggle">
                <button 
                  className={!bulkMode ? 'active' : ''}
                  onClick={() => setBulkMode(false)}
                >
                  Single Device
                </button>
                <button 
                  className={bulkMode ? 'active' : ''}
                  onClick={() => setBulkMode(true)}
                >
                  <Layers size={16} />
                  Bulk Add
                </button>
              </div>

              {!bulkMode ? (
                <form onSubmit={addSingleDevice} className="add-device-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="device-id">Device ID *</label>
                      <input
                        id="device-id"
                        type="text"
                        value={newDeviceId}
                        onChange={(e) => setNewDeviceId(e.target.value)}
                        placeholder="e.g., DEVICE_002"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="device-name">Device Name</label>
                      <input
                        id="device-name"
                        type="text"
                        value={newDeviceName}
                        onChange={(e) => setNewDeviceName(e.target.value)}
                        placeholder="e.g., Motor 2"
                      />
                    </div>
                  </div>
                  <button type="submit" className="add-btn">
                    <Plus size={18} />
                    Add Device
                  </button>
                </form>
              ) : (
                <form onSubmit={addBulkDevices} className="bulk-add-form">
                  <div className="form-group">
                    <label>Bulk Device List</label>
                    <p className="help-text">Enter one device per line: ID, Name (optional)</p>
                    <textarea
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      placeholder={`DEVICE_002, Motor 2\nDEVICE_003, Motor 3\nDEVICE_004`}
                      rows={6}
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="add-btn">
                    <Layers size={18} />
                    Add {bulkInput.split('\n').filter(l => l.trim()).length || 0} Devices
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Devices Grid */}
          <div className="devices-grid">
            {filteredDevices.length === 0 ? (
              <div className="no-devices">
                <Cpu size={48} />
                <p>{searchQuery ? 'No devices match your search' : 'No devices added yet'}</p>
              </div>
            ) : (
              filteredDevices.map((device) => {
                const faultInfo = getDeviceFaultInfo(device.id);
                return (
                <Link 
                  key={device.id} 
                  to={`/device/${device.id}/overview`}
                  className={`device-card ${device.status} ${faultInfo ? 'has-fault' : ''} ${faultInfo?.severity || ''}`}
                >
                  <div className="device-header">
                    <div className="device-icon">
                      <Cpu size={24} />
                    </div>
                    {faultInfo && (
                      <div className={`device-fault-indicator ${faultInfo.severity}`}>
                        {faultInfo.severity === 'critical' ? (
                          <AlertTriangle size={16} />
                        ) : faultInfo.severity === 'warning' ? (
                          <AlertCircle size={16} />
                        ) : (
                          <Info size={16} />
                        )}
                        <span className="fault-count">{faultInfo.count}</span>
                      </div>
                    )}
                    <div className="device-header-actions">
                      <button 
                        className="remove-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeDevice(device.id);
                        }}
                        title="Delete device"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        className="edit-device-btn"
                        onClick={(e) => startEditDevice(e, device)}
                        title="Edit device name"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className={`status-toggle ${device.is_active ? 'online' : 'offline'}`}
                        onClick={(e) => toggleDeviceStatus(e, device.id)}
                        title={device.is_active ? 'Disable device' : 'Enable device'}
                      >
                        {device.is_active ? <Wifi size={16} /> : <WifiOff size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="device-info">
                    {editingDeviceId === device.id ? (
                      <form 
                        className="edit-device-form" 
                        onSubmit={(e) => saveEditDevice(e, device.id)}
                      >
                        <input
                          type="text"
                          value={editDeviceName}
                          onChange={(e) => setEditDeviceName(e.target.value)}
                          placeholder="Device name"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="edit-actions">
                          <button 
                            type="submit" 
                            className="edit-save"
                            title="Save"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            type="button" 
                            className="edit-cancel"
                            onClick={cancelEditDevice}
                            title="Cancel"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h3>{device.name}</h3>
                        <p className="device-id">{device.id}</p>
                      </>
                    )}
                  </div>

                  <div className="device-meta">
                    <span className={`status-badge ${device.status}`}>
                      {device.status === 'online' ? 'Online' : device.status === 'disabled' ? 'Disabled' : device.status === 'pending' ? 'Waiting for Data' : 'Offline'}
                    </span>
                    <span className="last-seen">
                      <Clock size={12} />
                      {formatLastSeen(device.lastSeen)}
                    </span>
                  </div>

                  <div className="device-actions">
                    <ArrowRight size={20} />
                  </div>
                </Link>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;
