/**
 * Date utilities for Costa Rica timezone (UTC-6)
 */

/**
 * Parse a timestamp and adjust for Costa Rica display
 * The backend saves timestamps in UTC with timezone info
 * We need to display them in Costa Rica time (UTC-6)
 */
const parseTimestamp = (timestamp) => {
  if (!timestamp) return null;

  try {
    let dateStr = timestamp;

    // Check if timestamp has timezone info
    const hasTimezoneZ = timestamp.includes('Z');
    const hasTimezoneOffset = /[+-]\d{2}:\d{2}$/.test(timestamp);

    // If no timezone info, assume it's UTC and add Z
    if (!hasTimezoneZ && !hasTimezoneOffset) {
      dateStr = timestamp + 'Z';
    }

    return new Date(dateStr);
  } catch (e) {
    console.error('Error parsing timestamp:', e);
    return null;
  }
};

/**
 * Format a timestamp for display in Costa Rica
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @param {object} options - formatting options
 */
export const formatDateCR = (timestamp, options = {}) => {
  if (!timestamp) return '';

  const defaultOptions = {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    const date = typeof timestamp === 'string' ? parseTimestamp(timestamp) : timestamp;
    if (!date || isNaN(date.getTime())) return '';

    // Format the date - use es-CR locale
    const formatted = date.toLocaleString('es-CR', {
      ...mergedOptions,
      timeZone: 'America/Costa_Rica'
    });

    return formatted;
  } catch (e) {
    console.error('Error formatting date:', e);
    return String(timestamp);
  }
};

/**
 * Format date without year (shorter format)
 */
export const formatDateShortCR = (timestamp) => {
  return formatDateCR(timestamp, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format only time
 */
export const formatTimeCR = (timestamp) => {
  return formatDateCR(timestamp, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Get relative time (e.g., "hace 5 min")
 */
export const getTimeSince = (timestamp) => {
  if (!timestamp) return '';

  try {
    const now = new Date();
    const date = typeof timestamp === 'string' ? parseTimestamp(timestamp) : timestamp;
    if (!date || isNaN(date.getTime())) return '';

    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 0) return 'ahora'; // Future date
    if (diffSecs < 60) return 'hace un momento';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;

    return formatDateShortCR(timestamp);
  } catch (e) {
    console.error('Error calculating time since:', e);
    return '';
  }
};

/**
 * Format date for display in Costa Rica full format
 */
export const formatFullDateCR = (timestamp) => {
  return formatDateCR(timestamp, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Get current time in Costa Rica as ISO string
 */
export const getNowCRIso = () => {
  return new Date().toISOString();
};

export default {
  formatDateCR,
  formatDateShortCR,
  formatTimeCR,
  getTimeSince,
  formatFullDateCR,
  getNowCRIso
};
