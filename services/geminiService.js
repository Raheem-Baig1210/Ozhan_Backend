require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const generateAnswer = async (question, products) => {
    if (!products.length) {
    return "Sorry, I couldn't find any perfumes matching your requirements.";
  }
  const context = products
    .map(
      (p) => `
Name: ${p.name}
Brand: ${p.brand}
Category: ${p.category}
Family: ${p.family}
Gender: ${p.gender}
Price: ₹${p.price}
Description: ${p.description}
`
    )
    .join("\n-----------------\n");

  const prompt = `
You are an expert perfume recommendation assistant for an e-commerce website.

User Question:
${question}

Available Products:
${context}

Instructions:
1. Recommend the most suitable products.
2. Explain why they are suitable.
3. Write in plain English.
4. Do NOT use bullet points.
5. Do NOT use asterisks (*), markdown, or special characters.
6. Keep the response concise and professional.
7. Make the answer sound natural, like a shopping assistant.
8. Return only plain text.

Example:

For office use, I recommend YSL My Self. It is a versatile fragrance suitable for everyday wear and professional environments. Its balanced scent profile makes it an excellent choice for regular office use.

Now answer the user's question.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text;
};

module.exports = {
  generateAnswer,
};