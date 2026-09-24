const { requireAdmin, readProductInput, saveDB, deleteImage, handler } = require("../_lib/store");

module.exports = handler({
  PUT: async (req, res) => {
    const db = await requireAdmin(req, res);
    if (!db) return;
    const idx = db.products.findIndex((p) => p.id === req.query.id);
    if (idx === -1) return res.status(404).json({ error: "Produto não encontrado." });
    const current = db.products[idx];
    const { value, error } = readProductInput(req.body, db, current);
    if (error) return res.status(400).json({ error });
    db.products[idx] = { ...current, ...value, updatedAt: new Date().toISOString() };
    await saveDB(db);
    if (current.image !== value.image) await deleteImage(current.image);
    res.status(200).json(db.products[idx]);
  },

  DELETE: async (req, res) => {
    const db = await requireAdmin(req, res);
    if (!db) return;
    const product = db.products.find((p) => p.id === req.query.id);
    if (!product) return res.status(404).json({ error: "Produto não encontrado." });
    db.products = db.products.filter((p) => p !== product);
    await saveDB(db);
    await deleteImage(product.image);
    res.status(200).json({ ok: true });
  },
});
