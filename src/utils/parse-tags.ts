/**
 * Safely parse array properties from database storage
 * Handles various formats: JSON string, comma-separated string, or array
 */
export function parseArrayProperty(
  data: string | string[] | null | undefined,
  propertyName?: string
): string[] {
  if (!data) return [];

  // If already an array, return as is
  if (Array.isArray(data)) return data;

  // If string, try to parse as JSON
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      // If JSON parse fails, try to split by comma for tags-like properties
      const isCommaSplittable =
        propertyName === 'tags' ||
        (typeof data === 'string' && data.includes(',') && data.length < 200);

      if (isCommaSplittable) {
        // No warning needed - this is expected behavior for comma-separated data
        return data
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);
      } else {
        // For longer text properties, split by newlines (multiline strings from database)
        const isMultilineProperty = ['when_to_use', 'benefits', 'drawbacks', 'use_cases'].includes(
          propertyName || ''
        );
        if (isMultilineProperty && data.includes('\n')) {
          return data
            .split('\n')
            .map(item => item.trim())
            .filter(item => item.length > 0);
        } else {
          // For other longer text properties, treat as single item
          console.warn(
            `Failed to parse ${propertyName || 'property'} as JSON, treating as single item`,
            {
              data: data.substring(0, 50) + '...',
              error: error instanceof Error ? error.message : String(error),
            }
          );
          return [data];
        }
      }
    }
  }

  return [];
}

/**
 * Safely parse tags from database storage
 * Handles various formats: JSON string, comma-separated string, or array
 */
export function parseTags(tags: string | string[] | null | undefined): string[] {
  return parseArrayProperty(tags, 'tags');
}
