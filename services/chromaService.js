const { ChromaClient } = require("chromadb");

const client = new ChromaClient();

const getCollection = async () => {
  return await client.getOrCreateCollection({
    name: "perfume-products",
  });
};

module.exports = {
  getCollection,
};