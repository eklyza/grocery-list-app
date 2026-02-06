import pluralize from 'pluralize';

/**
 * Check if a new item is a duplicate of any existing items
 * Handles case-insensitive comparison and singular/plural matching
 *
 * @param {string} newItem - The new item name to check
 * @param {Array} existingItems - Array of existing items with nameLower property
 * @returns {boolean} - True if duplicate found, false otherwise
 */
export const isDuplicate = (newItem, existingItems) => {
  if (!newItem || !existingItems || existingItems.length === 0) {
    return false;
  }

  const normalizedNew = newItem.trim().toLowerCase();

  if (normalizedNew === '') {
    return false;
  }

  const singularNew = pluralize.singular(normalizedNew);
  const pluralNew = pluralize.plural(normalizedNew);

  return existingItems.some(item => {
    const existingLower = item.nameLower || item.name?.toLowerCase() || '';
    const singularExisting = pluralize.singular(existingLower);
    const pluralExisting = pluralize.plural(existingLower);

    // Check exact match
    if (existingLower === normalizedNew) {
      return true;
    }

    // Check singular forms match
    if (singularExisting === singularNew) {
      return true;
    }

    // Check if new singular matches existing plural or vice versa
    if (singularNew === pluralExisting || pluralNew === singularExisting) {
      return true;
    }

    return false;
  });
};

/**
 * Find the existing duplicate item if one exists
 *
 * @param {string} newItem - The new item name to check
 * @param {Array} existingItems - Array of existing items
 * @returns {Object|null} - The duplicate item if found, null otherwise
 */
export const findDuplicate = (newItem, existingItems) => {
  if (!newItem || !existingItems || existingItems.length === 0) {
    return null;
  }

  const normalizedNew = newItem.trim().toLowerCase();

  if (normalizedNew === '') {
    return null;
  }

  const singularNew = pluralize.singular(normalizedNew);
  const pluralNew = pluralize.plural(normalizedNew);

  return existingItems.find(item => {
    const existingLower = item.nameLower || item.name?.toLowerCase() || '';
    const singularExisting = pluralize.singular(existingLower);
    const pluralExisting = pluralize.plural(existingLower);

    if (existingLower === normalizedNew) {
      return true;
    }

    if (singularExisting === singularNew) {
      return true;
    }

    if (singularNew === pluralExisting || pluralNew === singularExisting) {
      return true;
    }

    return false;
  }) || null;
};
