/**
 * Central cache configuration
 * All TTL values are in SECONDS unless noted.
 */

module.exports = {
  // Ads
  ADS_LIST_TTL: 60,           // 1 min - listing pages
  ADS_SINGLE_TTL: 300,        // 5 min - single ad detail
  ADS_FILTERS_TTL: 60,        // 1 min - filter schema
  ADS_RANK_TTL: 150,          // 2.5 min - ranked ads (matches rotation)

  // Static / rarely changing
  CATEGORIES_TTL: 600,        // 10 min
  LOCATIONS_TTL: 600,         // 10 min
  FILTERS_TTL: 600,           // 10 min

  // Short-lived
  SEARCH_TTL: 60,             // 1 min

  // Max TTL cap (safety)
  MAX_TTL: 3600,              // 1 hour max for API response cache
};
