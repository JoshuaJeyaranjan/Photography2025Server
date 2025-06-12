exports.up = function(knex) {
  return knex.schema
    .createTable('about_section', table => {
      table.increments('id').primary();
      table.text('expertise').notNullable();
      table.text('creativeVision').notNullable();
      table.text('impact').notNullable();
      table.timestamps(true, true);
    })
    .createTable('profile_image', table => {
      table.increments('id').primary();
      table.string('image_path').notNullable();
      table.timestamps(true, true);
    })
    .createTable('portfolio_images', table => {
      table.increments('id').primary();
      table.string('image_path').notNullable();
      table.string('title').notNullable();
      table.text('description');
      table.integer('display_order').notNullable();
      table.timestamps(true, true);
    })
    .then(() => {
      // Insert initial about section content
      return knex('about_section').insert({
        expertise: 'As an experienced portrait photographer, I specialize in capturing the essence of individuals through both creative and classic approaches. My work combines technical excellence with artistic vision to create portraits that tell unique stories.',
        creativeVision: 'I embrace unorthodox and creative approaches to portrait photography, pushing boundaries while maintaining professional quality. Whether you\'re looking for something avant-garde or a timeless classic portrait, I bring your vision to life with attention to detail and artistic flair.',
        impact: 'Beyond photography, I\'m committed to making a positive difference in our community. 10% of all profits from my photography services are donated to homeless charities in Toronto, supporting those in need while pursuing my passion for capturing beautiful moments.'
      });
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('portfolio_images')
    .dropTableIfExists('profile_image')
    .dropTableIfExists('about_section');
}; 