export function formatProbabilityPercent(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return '--';
  }

  const numeric = Number(value);
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return `${Math.round(percent)}%`;
}

// India timezone formatter (IST = UTC+5:30)
const IST_OPTIONS = {
  timeZone: 'Asia/Kolkata',
  hour12: true,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
};

const IST_DATE_OPTIONS = {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric'
};

export function formatISTTime(date) {
  if (!date) return '--';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-IN', IST_OPTIONS);
}

export function formatISTDate(date) {
  if (!date) return '--';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', IST_DATE_OPTIONS);
}

export function formatISTDateTime(date) {
  if (!date) return '--';
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${formatISTDate(d)} ${formatISTTime(d)}`;
}
