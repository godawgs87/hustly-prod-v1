/**
 * Utility functions for cleaning up and normalizing data
 */

/**
 * Remove undefined, null, and empty string values from an object
 */
export function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key as keyof T] = value;
    }
  }
  
  return cleaned;
}

/**
 * Remove duplicate items from an array based on a key function
 */
export function removeDuplicates<T>(
  array: T[], 
  keyFn: (item: T) => string | number = (item) => JSON.stringify(item)
): T[] {
  const seen = new Set<string | number>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Clean and normalize keywords array
 */
export function cleanKeywords(keywords?: string[]): string[] {
  if (!keywords) return [];
  
  return keywords
    .filter(keyword => keyword && keyword.trim())
    .map(keyword => keyword.trim().toLowerCase())
    .filter((keyword, index, arr) => arr.indexOf(keyword) === index) // Remove duplicates
    .slice(0, 20); // Limit to 20 keywords
}

/**
 * Clean and validate price values
 */
export function cleanPrice(price: any): number | null {
  if (price === null || price === undefined || price === '') {
    return null;
  }
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : Number(price);
  
  if (isNaN(numPrice) || numPrice < 0) {
    return null;
  }
  
  // Round to 2 decimal places
  return Math.round(numPrice * 100) / 100;
}

/**
 * Clean phone number to standard format
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX if 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  return phone; // Return original if not 10 digits
}

/**
 * Clean and normalize email
 */
export function cleanEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Clean measurement values and ensure they're positive numbers
 */
export function cleanMeasurements(measurements: any): Record<string, number> {
  if (!measurements || typeof measurements !== 'object') {
    return {};
  }
  
  const cleaned: Record<string, number> = {};
  
  for (const [key, value] of Object.entries(measurements)) {
    const numValue = cleanPrice(value);
    if (numValue !== null && numValue > 0) {
      cleaned[key] = numValue;
    }
  }
  
  return cleaned;
}