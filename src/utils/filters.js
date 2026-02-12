const toDate = (value) => new Date(`${value}T00:00:00`);

export const timeWindows = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  all: 'All Time'
};

export const dashboardWindows = {
  day: 'Today',
  week: 'Last 7 Days',
  month: 'Last 30 Days',
  year: 'Year to Date',
  all: 'All Time'
};

export const filterByWindow = (records, key, dateField = 'date') => {
  if (key === 'all') return records;

  const now = new Date();
  const threshold = new Date(now);

  if (key === 'daily') threshold.setDate(now.getDate() - 1);
  if (key === 'weekly') threshold.setDate(now.getDate() - 7);
  if (key === 'monthly') threshold.setDate(now.getDate() - 30);
  if (key === 'yearly') threshold.setFullYear(now.getFullYear() - 1);

  return records.filter((item) => toDate(item[dateField]) >= threshold);
};

export const filterByDashboardWindow = (records, key, dateField = 'date') => {
  if (key === 'all') return records;

  const now = new Date();
  const threshold = new Date(now);

  if (key === 'day') threshold.setDate(now.getDate() - 1);
  if (key === 'week') threshold.setDate(now.getDate() - 7);
  if (key === 'month') threshold.setDate(now.getDate() - 30);
  if (key === 'year') threshold.setMonth(0, 1);

  return records.filter((item) => toDate(item[dateField]) >= threshold);
};

export const filterByMonthRange = (records, from, to, dateField = 'date') => {
  if (!from && !to) return records;

  return records.filter((item) => {
    const date = toDate(item[dateField]);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (from && monthKey < from) return false;
    if (to && monthKey > to) return false;

    return true;
  });
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);

export const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
