const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_API_KEY || 'your-secret-key-same-as-esp32';

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
};

export async function fetchDeviceData(deviceId, limit = 50) {
  const res = await fetch(`${API_BASE_URL}/data/${deviceId}?limit=${limit}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
}

export async function fetchDeviceFaults(deviceId, limit = 10) {
  const res = await fetch(`${API_BASE_URL}/faults/device/${deviceId}?limit=${limit}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch faults');
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced Fault Management API
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchActiveFaults() {
  const res = await fetch(`${API_BASE_URL}/faults/active`, { headers });
  if (!res.ok) throw new Error('Failed to fetch active faults');
  return res.json();
}

export async function fetchFaultsSummary() {
  const res = await fetch(`${API_BASE_URL}/faults/summary`, { headers });
  if (!res.ok) throw new Error('Failed to fetch faults summary');
  return res.json();
}

export async function fetchDeviceFaultLogs(deviceId, status = null, limit = 50) {
  const url = new URL(`${API_BASE_URL}/faults/device/${deviceId}`);
  if (status) url.searchParams.append('status', status);
  url.searchParams.append('limit', limit);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to fetch device fault logs');
  return res.json();
}

export async function fetchAllFaults(status = null, severity = null, deviceId = null, limit = 100) {
  const url = new URL(`${API_BASE_URL}/faults`);
  if (status) url.searchParams.append('status', status);
  if (severity) url.searchParams.append('severity', severity);
  if (deviceId) url.searchParams.append('device_id', deviceId);
  url.searchParams.append('limit', limit);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to fetch all faults');
  return res.json();
}

export async function resolveFault(faultId, resolutionData) {
  const res = await fetch(`${API_BASE_URL}/faults/${faultId}/resolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify(resolutionData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to resolve fault');
  }
  return res.json();
}

export async function deleteFault(faultId) {
  const res = await fetch(`${API_BASE_URL}/faults/${faultId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete fault');
  }
  return res.json();
}

export async function fetchFaultContext(faultId) {
  const res = await fetch(`${API_BASE_URL}/faults/${faultId}/context`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch fault context');
  }
  return res.json();
}

export async function fetchDevicePredictions(deviceId, limit = 50) {
  const res = await fetch(`${API_BASE_URL}/predictions/${deviceId}?limit=${limit}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch predictions');
  return res.json();
}

export async function triggerCloudAnalysis(deviceId) {
  const res = await fetch(`${API_BASE_URL}/ai/analyze/${deviceId}`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to trigger Cloud AI analysis');
  return res.json();
}

export async function setAIMode(mode) {
  const res = await fetch(`${API_BASE_URL}/ai/mode`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error('Failed to update AI mode');
  return res.json();
}

export async function triggerLocalAnalysis(deviceId) {
  const res = await fetch(`${API_BASE_URL}/ai/local-analyze/${deviceId}`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to trigger local AI analysis');
  return res.json();
}

export async function fetchLatestAIResult(deviceId) {
  const res = await fetch(`${API_BASE_URL}/ai/latest/${deviceId}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch latest AI result');
  return res.json();
}


export async function fetchPowerForecast(deviceId, electricityRate = 0.12, hours = 24) {
  const res = await fetch(`${API_BASE_URL}/forecast/${deviceId}?electricity_rate=${electricityRate}&hours=${hours}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch forecast');
  return res.json();
}

// Devices API
export async function fetchDevices() {
  // Include inactive devices so toggled-off devices don't disappear
  const res = await fetch(`${API_BASE_URL}/devices?include_inactive=true`, { headers });
  if (!res.ok) throw new Error('Failed to fetch devices');
  return res.json();
}

export async function createDevice(device) {
  const res = await fetch(`${API_BASE_URL}/devices`, {
    method: 'POST',
    headers,
    body: JSON.stringify(device),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create device');
  }
  return res.json();
}

export async function createDevicesBulk(devices) {
  const res = await fetch(`${API_BASE_URL}/devices/bulk`, {
    method: 'POST',
    headers,
    body: JSON.stringify(devices),
  });
  if (!res.ok) throw new Error('Failed to create devices');
  return res.json();
}

export async function updateDevice(deviceId, updates) {
  const res = await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update device');
  return res.json();
}

export async function deleteDevice(deviceId) {
  const res = await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete device');
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Remote Command API (cloud → ESP32 via poll)
// ─────────────────────────────────────────────────────────────────────────────

/** Send an ack-faults command. Pass an array of fault names to ack specific ones,
 *  or omit / pass empty array to ack all faults. */
export async function sendAckFaults(deviceId, faults = []) {
  const body = faults.length > 0 ? { faults } : {};
  const res = await fetch(`${API_BASE_URL}/command/${deviceId}/ack_faults`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send ack_faults command');
  }
  return res.json();
}

/** Send a set-protection command with the full protection config object. */
export async function sendSetProtection(deviceId, protectionConfig) {
  const res = await fetch(`${API_BASE_URL}/command/${deviceId}/set_protection`, {
    method: 'POST',
    headers,
    body: JSON.stringify(protectionConfig),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send set_protection command');
  }
  return res.json();
}

/** Fetch the current pending command for a device (useful for debug/status UI). */
export async function fetchPendingCommand(deviceId) {
  const res = await fetch(`${API_BASE_URL}/command/${deviceId}/pending`, { headers });
  if (!res.ok) throw new Error('Failed to fetch pending command');
  return res.json();
}
