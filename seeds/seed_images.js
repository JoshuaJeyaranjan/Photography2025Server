// server/seeds/seed_images.js
const path = require('path'); // Moved path import to the top
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Load .env from parent directory
const fs = require('fs').promises; // Using the promise-based version of fs
const knexConfig = require('../knexfile'); // Adjusted path to Knex configuration
const knex = require('knex')(knexConfig[process.env.NODE_ENV || 'development']); // Initialize Knex

const imagesDirectory = path.join(__dirname, '..', 'public', 'images'); // Adjusted path to images directory
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']; // Add or remove extensions as needed

console.log(`Script __dirname: ${__dirname}`);
console.log(`Attempting to load .env from: ${path.resolve(__dirname, '../.env')}`);
console.log(`Knexfile path: ${path.resolve(__dirname, '../knexfile.js')}`);
console.log(`Images directory path: ${imagesDirectory}`);

async function seedDatabaseWithImages() {
  try {
    console.log(`Reading image files from: ${imagesDirectory}`);
    const filesInDirectory = await fs.readdir(imagesDirectory);

    const imageFilenames = filesInDirectory.filter(file => {
      const extension = path.extname(file).toLowerCase();
      return allowedExtensions.includes(extension);
    });

    if (imageFilenames.length === 0) {
      console.log('No new image files found in the directory to seed.');
      return;
    }

    console.log(`Found ${imageFilenames.length} image files. Checking database...`);

    for (const filename of imageFilenames) {
      // Check if the image already exists in the database
      const existingImage = await knex('images').where({ filename: filename }).first();

      if (existingImage) {
        console.log(`Image "${filename}" already exists in the database. Skipping.`);
        continue;
      }

      // Determine category based on filename
      let category = 'Uncategorized'; // Default category
      const lowerFilename = filename.toLowerCase();

      if (lowerFilename.startsWith('portrait_') || lowerFilename.startsWith('portrait-')) {
        category = 'portrait';
      } else if (lowerFilename.startsWith('street_') || lowerFilename.startsWith('street-')) {
        category = 'street';
      }

      // Prepare image data for insertion
      // You can customize the default title, description, and category
      const imageData = {
        filename: filename,
        title: path.parse(filename).name.replace(/[-_]/g, ' '), // Creates a title from filename
        description: `A ${category} photo titled ${path.parse(filename).name.replace(/[-_]/g, ' ')}.`,
        category: category,
        // 'uploaded_at' will use the database default (current timestamp)
      };

      await knex('images').insert(imageData);
      console.log(`Added "${filename}" to the database.`);
    }

    console.log('Image seeding process completed.');

  } catch (error) {
    console.error('Error during image seeding process:', error);
  } finally {
    // Ensure the database connection is closed
    await knex.destroy();
    console.log('Database connection closed.');
  }
}

seedDatabaseWithImages();