// migrations/YYYYMMDDHHMMSS_categorize_first_five_portraits.js
// Replace YYYYMMDDHHMMSS with the actual timestamp in your filename

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Get the IDs of the first 5 images (ordered by ID, assuming it's an auto-incrementing primary key)
    // You might want to order by 'uploaded_at' or another relevant column if ID isn't sequential or desired
    const imagesToUpdate = await knex('images')
      .select('id')
      .orderBy('id', 'asc') // Or 'uploaded_at', 'asc'
      .limit(5);
  
    if (imagesToUpdate.length > 0) {
      const imageIds = imagesToUpdate.map(image => image.id);
      return knex('images')
        .whereIn('id', imageIds)
        .update({
          category: 'portrait'
        });
    }
    // If no images, do nothing
    return Promise.resolve();
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = async function(knex) {
    // This will revert the category for the *current* first 5 images that are 'portrait'.
    // This might not be the exact original 5 if other changes occurred.
    // A more robust down migration would store original categories, but for this case,
    // we'll revert them to 'Uncategorized' if they are 'portrait'.
    const imagesToRevert = await knex('images')
      .select('id')
      .where({ category: 'portrait' })
      .orderBy('id', 'asc') // Or 'uploaded_at', 'asc'
      .limit(5);
  
    if (imagesToRevert.length > 0) {
      const imageIds = imagesToRevert.map(image => image.id);
      return knex('images')
        .whereIn('id', imageIds)
        .update({
          category: 'Uncategorized' // Or whatever their previous default was
        });
    }
    return Promise.resolve();
  };
  