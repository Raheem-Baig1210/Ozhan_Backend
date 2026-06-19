const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is missing in .env file');
  process.exit(1);
}

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing in .env file');
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Import the Product model
const Product = require('./models/Product');

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully.');

    // Find products where image matches "/uploads/"
    const products = await Product.find({ image: { $regex: /^\/uploads\// } });
    console.log(`Found ${products.length} products with local image paths.`);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      // Note: product.image is like "/uploads/image-1781504598378.png"
      // Remove the leading slash if present to resolve the local file path correctly
      const relativePath = product.image.startsWith('/') ? product.image.substring(1) : product.image;
      const localFilePath = path.join(__dirname, relativePath);

      console.log(`\n[${i + 1}/${products.length}] Processing product: "${product.name}"`);
      console.log(`Local path: ${localFilePath}`);

      if (fs.existsSync(localFilePath)) {
        console.log('Uploading local image file to Cloudinary...');
        
        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
          folder: 'perfumes',
        });

        console.log(`Uploaded successfully. Cloudinary URL: ${uploadResult.secure_url}`);

        // Update document
        product.image = uploadResult.secure_url;
        await product.save();
        console.log(`Updated database record for "${product.name}" with Cloudinary URL.`);
      } else {
        console.warn(`WARNING: Local image file not found at: ${localFilePath}. Skipping.`);
      }
    }

    console.log('\nMigration complete.');
  } catch (err) {
    console.error('Migration failed with error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

run();
