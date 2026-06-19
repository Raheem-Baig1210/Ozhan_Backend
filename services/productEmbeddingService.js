const { generateEmbedding } = require("./embeddingService");

const buildProductText = (product) => {
  return `
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
};

const generateProductEmbedding = async (product) => {
  const text = buildProductText(product);

  return await generateEmbedding(text);
};

module.exports = {
  generateProductEmbedding,
};