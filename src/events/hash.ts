/**
 * Creates a stable hash from any value by:
 * 1. Sorting object keys deterministically
 * 2. Converting to JSON string
 * 3. Computing a simple hash using DJB2 algorithm
 */
export function stableHash(value: any): string {
  const normalized = normalizeValue(value);
  const jsonString = JSON.stringify(normalized);
  return djb2Hash(jsonString);
}

/**
 * Recursively normalizes a value to ensure deterministic ordering
 */
function normalizeValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }
  
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  
  if (typeof value === 'object') {
    const normalized: Record<string, any> = {};
    const sortedKeys = Object.keys(value).sort();
    
    for (const key of sortedKeys) {
      normalized[key] = normalizeValue(value[key]);
    }
    
    return normalized;
  }
  
  return value;
}

/**
 * Simple DJB2 hash algorithm
 * Returns a hex string representation of the hash
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to unsigned and then to hex
  return (hash >>> 0).toString(16);
}