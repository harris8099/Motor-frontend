const LIVE_WINDOW_MS = 2 * 60 * 1000;

export function isFreshTimestamp(timestamp, maxAgeMs = LIVE_WINDOW_MS) {
  if (!timestamp) {
    return false;
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return Date.now() - parsed.getTime() < maxAgeMs;
}

export function getDeviceStatus(device) {
  if (!device?.is_active) {
    return 'disabled';
  }

  if (isFreshTimestamp(device?.last_seen_at)) {
    return 'online';
  }

  return device?.last_seen_at ? 'offline' : 'pending';
}

export function isReadingLive(reading) {
  return isFreshTimestamp(reading?.ts);
}
