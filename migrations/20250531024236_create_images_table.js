// server/db/migrations/YYYYMMDDHHMMSS_create_images_table.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('images', function(table) {
      table.increments('id').primary(); // Auto-incrementing ID, primary key
      table.string('filename', 255).notNullable().unique();
      table.string('title', 255);
      table.text('description');
      table.string('category', 100);
      table.timestamp('uploaded_at').defaultTo(knex.fn.now());
      // Add any other columns you need
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('images');
  };
  