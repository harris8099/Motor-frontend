export function formatProbabilityPercent(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return '--';
  }

  const numeric = Number(value);
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return `${Math.round(percent)}%`;
}
