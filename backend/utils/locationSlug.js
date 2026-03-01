/**
 * Normalize location slug: lowercase, hyphen, alphanumeric only
 * Used for storing and comparing - ensures consistency across sponsored ads, locations, etc.
 */
function normalizeLocationSlug(name) {
  if (!name || typeof name !== 'string') return '';
  return String(name).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

module.exports = { normalizeLocationSlug };
