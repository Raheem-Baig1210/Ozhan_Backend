const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { generateEmbedding } = require("../services/embeddingService");
const { generateAnswer } = require("../services/geminiService");
const { extractFilters } = require("../services/queryFilterService");


// Generate embeddings for all products
router.get("/generate-embeddings", async (req, res) => {
  try {
    const products = await Product.find({
  $or: [
    { embedding: { $exists: false } },
    { embedding: { $size: 0 } }
  ]
});

    let updatedCount = 0;

    for (const product of products) {
      const text = `
Name: ${product.name}
Brand: ${product.brand}
Category: ${product.category}
Price: ₹${product.price}
Family: ${product.family}
Gender: ${product.gender}
Top Notes: ${product.topNotes.join(", ")}
Middle Notes: ${product.middleNotes.join(", ")}
Base Notes: ${product.baseNotes.join(", ")}
Occasions: ${product.occasions.join(", ")}
Description: ${product.description}
`;

      const embedding = await generateEmbedding(text);

      product.embedding = embedding;

      await product.save();

      updatedCount++;
    }

    res.json({
      message: "Embeddings generated successfully",
      updatedProducts: updatedCount,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});


// Semantic search endpoint
router.get("/search", async (req, res) => {
  try {
    const query = req.query.query;

    if (!query) {
      return res.status(400).json({
        message: "Query is required",
      });
    }

    // Generate embedding for user query
    const queryEmbedding = await generateEmbedding(query);

    const filters = extractFilters(query);
    // Vector search
    const results = await Product.aggregate([
      {
      $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: queryEmbedding,
      numCandidates: 100,
      limit: 3,
      filter: filters
        }
      },
      {
        $project: {
          name: 1,
          brand: 1,
          category: 1,
          family: 1,
          gender: 1,
          price: 1,
          description: 1,
          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ]);

    res.json(results);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});


router.get("/chat", async (req, res) => {
  try {
    const query = req.query.query;

    if (!query) {
      return res.status(400).json({
        message: "Query is required",
      });
    }

    const queryEmbedding = await generateEmbedding(query);

    const filters = extractFilters(query);

    let products = await Product.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: 10,
          // limit: 10,
        },
      },
      {
        $project: {
          name: 1,
          brand: 1,
          category: 1,
          family: 1,
          gender: 1,
          price: 1,
          occasions: 1,
          description: 1,
          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ]);

    // Apply filters in Node.js
    products = products.filter((product) => {

      if (
        filters.gender &&
        product.gender !== filters.gender
      ) {
        return false;
      }

      if (
        filters.family &&
        product.family !== filters.family
      ) {
        return false;
      }

      if (
        filters.price &&
        product.price > filters.price.$lte
      ) {
        return false;
      }

      if (
        filters.occasions &&
        !product.occasions?.includes(filters.occasions)
      ) {
        return false;
      }

      return true;
    });

    // Keep top 5
    products = products.slice(0, 5);

    let answer;

try {
  answer = await generateAnswer(query, products);
} catch (error) {

  if (
    error.message.includes("429") ||
    error.message.includes("RESOURCE_EXHAUSTED")
  ) {

    answer =
      "AI recommendations are temporarily unavailable because the Gemini API usage limit has been reached. Please try again later.";

  } else {
    throw error;
  }
}

    res.json({
      question: query,
      answer,
      products,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;