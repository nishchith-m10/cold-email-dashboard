# Timezone Functionality

## Overview

The dashboard now has comprehensive timezone support that allows users to view all dates and times in their preferred timezone. The timezone selection is:

1. **Auto-detected** from the user's system by default
2. **Synced** with workspace settings
3. **Persistent** across browser sessions via localStorage
4. **Consistent** across all dashboard pages

## Architecture

### Core Components

#### 1. TimezoneProvider (`lib/timezone-context.tsx`)

The timezone provider wraps the entire app and provides timezone state globally.

**Features:**
- Auto-detects system timezone on first load
- Syncs with workspace settings via API
- Persists to localStorage
- Listens for storage events (cross-tab synchronization)

**Usage:**
```tsx
import { TimezoneProvider, useTimezone } from '@/lib/timezone-context';

// In layout wrapper:
<TimezoneProvider>
  <YourApp />
</TimezoneProvider>

// In any component:
const { timezone, setTimezone } = useTimezone();
```

#### 2. TimezoneSelector Component (`components/dashboard/timezone-selector.tsx`)

A dropdown selector that allows users to change their timezone preference.

**Features:**
- Shows common timezones (US, Europe, Asia-Pacific)
- Auto-detection indicator
- Persists selection to workspace settings

#### 3. useFormatDate Hook (`hooks/use-format-date.ts`)

A convenience hook that provides timezone-aware date formatting.

**Usage:**
```tsx
import { useFormatDate } from '@/hooks/use-format-date';

function MyComponent() {
  const { formatDate, timezone } = useFormatDate();
  
  return (
    <div>
      {formatDate(new Date(), 'datetime')} {/* Nov 25, 10:30 AM */}
      {formatDate(new Date(), 'short')} {/* Nov 25 */}
      {formatDate(new Date(), 'long')} {/* November 25, 2024 */}
    </div>
  );
}
```

### Utility Functions

#### formatInTimezone()

Formats a date in a specific timezone with various format options.

```tsx
import { formatInTimezone } from '@/lib/timezone-context';

const formatted = formatInTimezone(new Date(), 'America/New_York', 'datetime');
// Result: "Nov 25, 10:30 AM"
```

**Format Options:**
- `'short'` - "Nov 25"
- `'long'` - "November 25, 2024"
- `'datetime'` - "Nov 25, 10:30 AM"
- `'datetime-full'` - "Nov 25, 2024, 10:30:45 AM"
- `'time'` - "10:30 AM"
- `'time-24'` - "22:30"
- `'iso'` - "2024-11-25" (YYYY-MM-DD)
- `'full'` - "Monday, November 25, 2024"

#### getTodayInTimezone()

Gets the current date in ISO format (YYYY-MM-DD) for a specific timezone.

```tsx
import { getTodayInTimezone } from '@/lib/timezone-context';

const today = getTodayInTimezone('America/Los_Angeles');
// Result: "2024-11-25"
```

## Implementation in Pages

### Dashboard Page

The dashboard page uses the timezone context to:
- Display dates in charts
- Format metric timestamps
- Calculate date ranges

```tsx
import { useTimezone } from '@/lib/timezone-context';

function DashboardPage() {
  const { timezone, setTimezone } = useTimezone();
  
  return (
    <TimezoneSelector
      selectedTimezone={timezone}
      onTimezoneChange={setTimezone}
    />
  );
}
```

### Analytics Page

Similar implementation to the dashboard page, with timezone-aware cost and usage charts.

## Chart Components

All chart components that display dates have been updated to use the user's selected timezone:

- **TimeSeriesChart** - Uses `useFormatDate()` hook
- **DailyCostChart** - Accepts timezone prop with fallback to context
- **DailySendsChart** - Similar implementation

## Workspace Settings Sync

When a user changes their timezone:

1. **Immediate**: Updates localStorage for instant persistence
2. **Background**: Makes API call to `/api/workspaces/settings`
3. **Workspace**: Timezone saved to workspace settings
4. **Cross-tab**: Storage events sync timezone across browser tabs

## Default Behavior

The timezone selection follows this priority:

1. **Workspace Settings** - If user has saved a preference in workspace settings
2. **localStorage** - If user has a saved preference in browser storage
3. **Auto-detected** - System timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone`
4. **Fallback** - UTC if all else fails

## API Integration

The timezone setting is stored in the workspace settings:

```sql
-- workspace_settings table
{
  "timezone": "America/Los_Angeles",
  "date_format": "US",
  "currency": "USD"
}
```

## Testing

To test timezone functionality:

1. **Change timezone** via the timezone selector dropdown
2. **Verify dates** in charts update to reflect new timezone
3. **Refresh page** to ensure timezone persists
4. **Open new tab** to verify cross-tab synchronization
5. **Check settings** page to see timezone saved

## Browser Support

Timezone detection uses `Intl.DateTimeFormat`, which is supported in all modern browsers:
- Chrome 24+
- Firefox 29+
- Safari 10+
- Edge 12+

## Future Enhancements

Potential improvements for timezone functionality:

1. **More timezones** - Add support for all IANA timezones
2. **Timezone search** - Allow searching/filtering timezone list
3. **Recent timezones** - Show recently used timezones
4. **Timezone abbreviations** - Display timezone offset (e.g., "PST (UTC-8)")
5. **Date format preferences** - Allow customizing date display format per user
