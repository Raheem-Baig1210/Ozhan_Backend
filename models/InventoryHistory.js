const mongoose = require('mongoose');

const inventoryHistorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Product',
    },
    action: {
      type: String,
      required: true,
      enum: ['Add', 'Reduce', 'Adjustment'],
    },
    quantity: {
      type: Number,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const InventoryHistory = mongoose.model('InventoryHistory', inventoryHistorySchema);

module.exports = InventoryHistory;
