/**
 * Cron Expression Humanizer
 *
 * Converts cron expressions into human-readable descriptions
 * for display in the Node Detail Drawer.
 *
 * Supports standard 5-field cron syntax.
 *
 * @module lib/workflow-graph/cron-humanizer
 */

/**
/**
 * Convert a cron expression to a human-readable string.
 *
 * Examples:
 *   humanizeCron('0 9 1-5') returns "At 09:00, Monday through Friday"
 *   humanizeCron('0 0') returns "At midnight, every day"
 */
export function humanizeCron(expression: string): string {
  if (!expression || typeof expression !== 'string') {
    return expression ?? '';
  }

  const trimmed = expression.trim();
  const parts = trimmed.split(/\s+/);

  // Need exactly 5 fields (minute hour day-of-month month day-of-week)
  if (parts.length !== 5) {
    return trimmed; // Return as-is if not standard format
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Common patterns
  if (trimmed === '* * * * *') return 'Every minute';
  if (trimmed === '0 * * * *') return 'Every hour';
  if (trimmed === '0 0 * * *') return 'At midnight, every day';
  if (trimmed === '0 12 * * *') return 'At noon, every day';

  const fragments: string[] = [];

  // Minute/Hour
  if (minute.startsWith('*/') && hour === '*') {
    fragments.push(`Every ${minute.slice(2)} minutes`);
  } else if (hour.startsWith('*/') && minute === '0') {
    fragments.push(`Every ${hour.slice(2)} hours`);
  } else if (minute !== '*' && hour !== '*') {
    const h = hour.padStart(2, '0');
    const m = minute.padStart(2, '0');
    fragments.push(`At ${h}:${m}`);
  } else if (minute !== '*') {
    fragments.push(`At minute ${minute}`);
  }

  // Day of month
  if (dayOfMonth !== '*') {
    if (dayOfMonth.includes(',')) {
      fragments.push(`on days ${dayOfMonth}`);
    } else if (dayOfMonth.includes('-')) {
      fragments.push(`on days ${dayOfMonth}`);
    } else {
      fragments.push(`on day ${dayOfMonth}`);
    }
  }

  // Month
  if (month !== '*') {
    const monthNames: Record<string, string> = {
      '1': 'January', '2': 'February', '3': 'March', '4': 'April',
      '5': 'May', '6': 'June', '7': 'July', '8': 'August',
      '9': 'September', '10': 'October', '11': 'November', '12': 'December',
    };
    if (month.includes(',')) {
      const ms = month.split(',').map((m) => monthNames[m] ?? m).join(', ');
      fragments.push(`in ${ms}`);
    } else {
      fragments.push(`in ${monthNames[month] ?? `month ${month}`}`);
    }
  }

  // Day of week
  if (dayOfWeek !== '*') {
    const dayNames: Record<string, string> = {
      '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday',
      '4': 'Thursday', '5': 'Friday', '6': 'Saturday', '7': 'Sunday',
    };
    if (dayOfWeek.includes('-')) {
      const [start, end] = dayOfWeek.split('-');
      const startName = dayNames[start] ?? start;
      const endName = dayNames[end] ?? end;
      fragments.push(`${startName} through ${endName}`);
    } else if (dayOfWeek.includes(',')) {
      const ds = dayOfWeek.split(',').map((d) => dayNames[d] ?? d).join(', ');
      fragments.push(`on ${ds}`);
    } else {
      fragments.push(`on ${dayNames[dayOfWeek] ?? `day ${dayOfWeek}`}`);
    }
  }

  if (fragments.length === 0) {
    return trimmed;
  }

  return fragments.join(', ');
}
