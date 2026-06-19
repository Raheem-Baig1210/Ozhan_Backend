const Product = require("../models/Product");

const getProductDocuments = async () => {
  const products = await Product.find({});

  const documents = products.map((product) => ({
    id: product._id.toString(),

    content: `
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
`
  }));

  return documents;
};

module.exports = {
  getProductDocuments,
};