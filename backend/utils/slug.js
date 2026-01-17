/**
 * Generate a URL-friendly slug from a string
 * @param {string} text - The text to convert to a slug
 * @returns {string} - The generated slug
 */
function generateSlug(text) {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    // Remove special characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Generate a unique slug for an ad
 * @param {string} title - The ad title
 * @param {string} adId - The ad ID (to ensure uniqueness)
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {string} categoryId - Category ID
 * @param {string} subcategoryId - Subcategory ID (optional)
 * @returns {Promise<string>} - The unique slug
 */
async function generateUniqueAdSlug(title, adId, prisma, categoryId, subcategoryId = null) {
  const baseSlug = generateSlug(title);
  
  // If slug is empty, use a fallback
  if (!baseSlug) {
    return `ad-${adId}`;
  }
  
  // Try base slug first
  let slug = baseSlug;
  let counter = 1;
  
  // Check if slug already exists for this category/subcategory combination
  while (true) {
    const existingAd = await prisma.ad.findFirst({
      where: {
        slug: slug,
        categoryId: categoryId,
        ...(subcategoryId && { subcategoryId: subcategoryId }),
        ...(adId && { id: { not: adId } }) // Exclude current ad if updating
      }
    });
    
    if (!existingAd) {
      return slug;
    }
    
    // If slug exists, append counter
    slug = `${baseSlug}-${counter}`;
    counter++;
    
    // Safety limit to prevent infinite loops
    if (counter > 1000) {
      return `${baseSlug}-${Date.now()}`;
    }
  }
}

module.exports = {
  generateSlug,
  generateUniqueAdSlug
};

