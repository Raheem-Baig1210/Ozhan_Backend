const extractFilters = (query) => {
  query = query.toLowerCase();

  let filter = {};

  // Gender
  if (query.includes("women") || query.includes("female")) {
    filter.gender = "Women";
  } else if (query.includes("men") || query.includes("male")) {
    filter.gender = "Men";
  } else if (query.includes("unisex")) {
    filter.gender = "Unisex";
  }

  // Family
  if (query.includes("woody")) {
    filter.family = "Woody";
  } else if (query.includes("fresh")) {
    filter.family = "Fresh";
  } else if (query.includes("floral")) {
    filter.family = "Floral";
  } else if (query.includes("oriental")) {
    filter.family = "Oriental";
  } else if (query.includes("aquatic")) {
    filter.family = "Aquatic";
  } else if (query.includes("spicy")) {
    filter.family = "Spicy";
  } else if (query.includes("citrus")) {
    filter.family = "Citrus";
  }

  // Occasion
  if (query.includes("office")) {
    filter.occasions = "Office";
  }

  if (query.includes("party")) {
    filter.occasions = "Party";
  }

  if (query.includes("daily")) {
    filter.occasions = "Daily";
  }

  // Price
  const underPrice = query.match(/under\s*₹?(\d+)/i);

  if (underPrice) {
    filter.price = {
      $lte: Number(underPrice[1]),
    };
  }

  return filter;
};

module.exports = {
  extractFilters,
};