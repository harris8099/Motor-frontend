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
  const res = await fetch(`${API_BASE_URL}/faults/${deviceId}?limit=${limit}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch faults');
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
