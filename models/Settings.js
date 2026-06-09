const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      default: 'Al Özhan Parfums',
    },
    gstNumber: {
      type: String,
      default: '27AAAAA0000A1Z5',
    },
    address: {
      type: String,
      default: 'Atelier House, Colaba, Mumbai, India',
    },
    gstPercent: {
      type: Number,
      required: true,
      default: 18,
    },
    stateTax: {
      type: Number,
      required: true,
      default: 9,
    },
    logo: {
      type: String,
      default: '',
    },
    footerText: {
      type: String,
      default: 'Al Özhan Parfums - Artisanal Fragrances. All Rights Reserved.',
    },
    terms: {
      type: String,
      default: 'Products purchased are subject to return guidelines within 7 business days.',
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
