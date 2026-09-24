const { getDB, handler } = require("./_lib/store");

// Dados publicos usados pela vitrine do site.
module.exports = handler({
  GET: async (req, res) => {
    const db = await getDB();
    const products = db.products
      .filter((p) => p.visible)
      .sort((a, b) => a.order - b.order)
      .map(({ id, name, category, price, promoPrice, description, image, available }) => ({
        id, name, category, price, promoPrice, description, image, available,
      }));
    res.status(200).json({ categories: db.categories, products });
  },
});
