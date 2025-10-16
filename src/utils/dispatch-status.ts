// Utility functions for parsing dispatch comments and extracting unit statuses

export interface UnitStatus {
  unit: string;
  status: string;
  timestamp: string;
  location?: string;
}

export interface StatusColorConfig {
  className: string;
  label: string;
}

// Status color mapping - following PulsePoint unit status legend
export const STATUS_COLORS: Record<string, StatusColorConfig> = {
  'dispatched': {
    className: 'bg-orange-500 text-white border-orange-500',
    label: 'Dispatched'
  },
  'acknowledged': {
    className: 'bg-orange-500 text-white border-orange-500',
    label: 'Acknowledged'
  },
  'enroute': {
    className: 'bg-green-500 text-white border-green-500',
    label: 'Enroute'
  },
  'on_scene': {
    className: 'bg-red-500 text-white border-red-500',
    label: 'On Scene'
  },
  'arrived': {
    className: 'bg-red-500 text-white border-red-500',
    label: 'On Scene'
  },
  'available_on_scene': {
    className: 'bg-red-500 text-white border-red-500',
    label: 'On Scene'
  },
  'transporting': {
    className: 'bg-yellow-400 text-black border-yellow-400',
    label: 'Transport'
  },
  'at_hospital': {
    className: 'bg-blue-500 text-white border-blue-500',
    label: 'Arrived'
  },
  'transport_arrived': {
    className: 'bg-blue-500 text-white border-blue-500',
    label: 'Transport Arrived'
  },
  'clear': {
    className: 'bg-gray-500 text-white border-gray-500',
    label: 'Cleared'
  },
  'available': {
    className: 'bg-gray-500 text-white border-gray-500',
    label: 'Cleared'
  }
}

// Status patterns - case insensitive matching
const STATUS_PATTERNS: Record<string, RegExp[]> = {
  'dispatched': [
    /dispatched/i,
    /assign/i,
    /assigned/i
  ],
  'acknowledged': [
    /acknowledged/i,
    /ack/i,
    /received/i
  ],
  'enroute': [
    /enroute/i,
    /en route/i,
    /unit dispatched & enroute/i,
    /responding/i
  ],
  'on_scene': [
    /on scene/i,
    /arrived at.*location/i,
    /arrived on scene/i
  ],
  'arrived': [
    /arrived at/i,
    /arrived/i
  ],
  'available_on_scene': [
    /available.*scene/i,
    /on scene.*available/i
  ],
  'transporting': [
    /transporting/i,
    /transport/i,
    /enroute to hospital/i
  ],
  'at_hospital': [
    /arrived.*hospital/i,
    /at hospital/i,
    /hospital arrival/i,
    /transporting.*hospital/i,
    /location:.*hospital/i
  ],
  'clear': [
    /clear/i,
    /cleared/i,
    /clear alarms/i,
    /complete/i,
    /completed/i
  ],
  'available': [
    /available/i,
    /in service/i,
    /in serv/i
  ]
}

/**
 * Parse a single line from dispatch comments to extract unit status
 */
function parseDispatchLine(line: string): UnitStatus | null {
  // Expected format: "HH:MM:SS: UNIT, STATUS (optional location info)"
  const lineMatch = line.match(/^(\d{2}:\d{2}:\d{2}):\s*([A-Z0-9]+),?\s*(.+)$/i)
  
  if (!lineMatch) {
    return null
  }
  
  const [, timestamp, unit, statusText] = lineMatch
  
  // Extract location if present
  const locationMatch = statusText.match(/\(Location:\s*([^)]+)\)/i)
  const location = locationMatch ? locationMatch[1] : undefined
  
  // Determine status category based on patterns
  let statusCategory = 'unknown'
  
  // Normal pattern matching - check status text first
  for (const [category, patterns] of Object.entries(STATUS_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(statusText)) {
        statusCategory = category
        break
      }
    }
    if (statusCategory !== 'unknown') break
  }
  
  // Special case: if we didn't find a status but location indicates hospital arrival
  if (statusCategory === 'unknown' && location && /hospital/i.test(location) && /arrived/i.test(statusText)) {
    statusCategory = 'at_hospital'
  }
  
  return {
    unit: unit.toUpperCase(),
    status: statusCategory,
    timestamp,
    location
  }
}

/**
 * Parse dispatch comments to extract latest status for each unit
 */
export function parseDispatchComments(dispatchComment: string, unitCodes: string[]): Map<string, UnitStatus> {
  const unitStatuses = new Map<string, UnitStatus>()
  
  if (!dispatchComment) {
    return unitStatuses
  }
  
  // Split into lines and process from most recent (first) to oldest
  const lines = dispatchComment.split('\n').filter(line => line.trim())
  
  for (const line of lines) {
    const parsedStatus = parseDispatchLine(line)
    
    if (parsedStatus && unitCodes.includes(parsedStatus.unit)) {
      // Only update if we haven't seen this unit yet (since we're going chronologically backwards)
      if (!unitStatuses.has(parsedStatus.unit)) {
        unitStatuses.set(parsedStatus.unit, parsedStatus)
      }
    }
  }
  
  return unitStatuses
}

/**
 * Get status color configuration for a given status
 */
export function getStatusColor(status: string): StatusColorConfig {
  return STATUS_COLORS[status] || {
    className: 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-500',
    label: status
  }
}

/**
 * Get the latest status for a specific unit from parsed statuses
 */
export function getUnitLatestStatus(unit: string, unitStatuses: Map<string, UnitStatus>): UnitStatus | null {
  return unitStatuses.get(unit.toUpperCase()) || null
}

/**
 * Direct parsing of unit status from call notes - simple and reliable
 */
export interface UnitStatusResult {
  status: string;
  label: string;
  className: string;
  borderClass: string;
}

export function getUnitStatusFromCallNotes(unitCode: string, callNotes: string | null, isOurUnit: boolean, useRing: boolean = false): UnitStatusResult | null {
  if (!callNotes) return null;

  // Split lines and process from most recent (first) to oldest
  const lines = callNotes.split(/\\n|\n/).filter(line => line.trim());

  // Find first occurrence of this unit in the call notes
  for (const line of lines) {
    // Look for pattern: "HH:MM:SS: UNIT, STATUS..."
    const match = line.match(/^\d{2}:\d{2}:\d{2}:\s*([A-Z0-9]+),?\s*(.+)$/i);
    if (match && match[1].toUpperCase() === unitCode.toUpperCase()) {
      const statusText = match[2].trim();
      const upperStatusText = statusText.toUpperCase();

      // Priority 1: Check for COMPLETE/AVAILABLE first (highest priority)
      if (upperStatusText.includes('COMPLETE') || upperStatusText.includes('AVAILABLE')) {
        return {
          status: 'clear',
          label: 'Cleared',
          className: 'bg-gray-500 text-white',
          borderClass: isOurUnit
            ? useRing ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-blue-500 dark:border-blue-400'
            : 'border-gray-500'
        };
      }

      // Priority 2: Check for TRANSPORTING INDIVIDUAL (before general TRANSPORTING)
      if (upperStatusText.includes('TRANSPORTING INDIVIDUAL')) {
        return {
          status: 'transporting',
          label: 'Transport',
          className: 'bg-yellow-400 text-black',
          borderClass: isOurUnit
            ? useRing ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-blue-500 dark:border-blue-400'
            : 'border-yellow-400'
        };
      }

      // Priority 3: Check for general TRANSPORTING
      if (upperStatusText.includes('TRANSPORTING')) {
        return {
          status: 'transporting',
          label: 'Transport',
          className: 'bg-yellow-400 text-black',
          borderClass: isOurUnit
            ? useRing ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-blue-500 dark:border-blue-400'
            : 'border-yellow-400'
        };
      }

      // Priority 4: Check for ARRIVED AT (with special handling for hospital/LZ)
      if (upperStatusText.includes('ARRIVED AT')) {
        if (upperStatusText.includes('HOSPITAL') || upperStatusText.includes('LZ')) {
          return {
            status: 'transport_arrived',
            label: 'Transport Arrived',
            className: 'bg-blue-500 text-white',
            borderClass: isOurUnit
              ? useRing ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-blue-500 dark:border-blue-400'
              : 'border-blue-500'
          };
        } else {
          return {
            status: 'on_scene',
            label: 'On Scene',
            className: 'bg-red-500 text-white',
            borderClass: isOurUnit
              ? useRing ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-blue-500 dark:border-blue-400'
              : 'border-red-500'
          };
        }
      }

      // Priority 5: Check for UNIT ON LOCATION
      if (upperStatusText.includes('UNIT ON LOCATION')) {
        return {
          status: 'on_scene',
          label: 'On Scene',
          className: 'bg-red-500 text-white',
          borderClass: isOurUnit
            ? useRing ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-blue-500 dark:border-blue-400'
            : 'border-red-500'
        };
      }

      // Priority 6: Check for ON SCENE
      if (upperStatusText.includes('ON SCENE')) {
        return {
          status: 'on_scene',
          label: 'On Scene',
          className: 'bg-red-500 text-white',
          borderClass: isOurUnit
            ? useRing ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-blue-500 dark:border-blue-400'
            : 'border-red-500'
        };
      }

      // Priority 7: Check for UNIT DISPATCHED & ARRIVED ON SCENE
      if (upperStatusText.includes('UNIT DISPATCHED & ARRIVED ON SCENE')) {
        return {
          status: 'on_scene',
          label: 'On Scene',
          className: 'bg-red-500 text-white',
          borderClass: isOurUnit
            ? useRing ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-blue-500 dark:border-blue-400'
            : 'border-red-500'
        };
      }

      // Priority 8: Check for ENROUTE
      if (upperStatusText.includes('ENROUTE')) {
        return {
          status: 'enroute',
          label: 'Enroute',
          className: 'bg-green-500 text-white',
          borderClass: isOurUnit
            ? useRing ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-blue-500 dark:border-blue-400'
            : 'border-green-500'
        };
      }

      // Priority 9: Check for UNIT DISPATCHED or DISPATCHED
      if (upperStatusText.includes('UNIT DISPATCHED') || upperStatusText.includes('DISPATCHED')) {
        return {
          status: 'dispatched',
          label: 'Dispatched',
          className: 'bg-orange-500 text-white',
          borderClass: isOurUnit
            ? useRing ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-blue-500 dark:border-blue-400'
            : 'border-orange-500'
        };
      }

      // Default for unrecognized status
      return {
        status: 'dispatched',
        label: 'Dispatched',
        className: 'bg-orange-500 text-white',
        borderClass: isOurUnit
          ? useRing ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-blue-500 dark:border-blue-400'
          : 'border-orange-500'
      };
    }
  }

  return null;
}