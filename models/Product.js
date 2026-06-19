const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'hidden'],
      default: 'approved',
    },
    reply: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: [true, 'Please add a product name'],
      trim: true,
    },
    brand: {
      type: String,
      required: [true, 'Please add a brand name'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Please add a product image'],
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a product description'],
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      default: 0.0,
    },
    countInStock: {
      type: Number,
      required: [true, 'Please add stock count'],
      default: 0,
    },
    reservedStock: {
      type: Number,
      default: 0,
    },
    soldStock: {
      type: Number,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    topNotes: {
      type: [String],
      default: [],
    },
    middleNotes: {
      type: [String],
      default: [],
    },
    baseNotes: {
      type: [String],
      default: [],
    },
    family: {
      type: String,
      enum: ['Woody', 'Fresh', 'Citrus', 'Floral', 'Oriental', 'Aquatic', 'Spicy'],
      default: 'Floral',
    },
    gender: {
      type: String,
      enum: ['Men', 'Women', 'Unisex'],
      default: 'Unisex',
    },
    occasions: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      required: true,
      default: 0,
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0,
    },
    reviews: [reviewSchema],
    embedding: {
  type: [Number],
  default: [],
},
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
