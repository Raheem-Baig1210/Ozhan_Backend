const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
  const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ragRoutes = require("./routes/ragRoutes");

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// HTTP Request Logging Middleware (Development only)
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  app.use(morgan('dev'));
}

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve /uploads folder statically as a legacy fallback for any remaining local images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Route Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/rag", ragRoutes);

// Root Check Endpoint
app.get('/', (req, res) => {
  res.send('Perfume E-Commerce API is running...');
});

// Centralized Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

// Set Port and Bootstrap Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
  );
});