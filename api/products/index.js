const crypto = require("crypto");
const { requireAdmin, readProductInput, saveDB, handler } = require("../_lib/store");

module.exports = handler({
  POST: async (req, res) => {
    const db = await requireAdmin(req, res);
    if (!db) return;
    const { value, error } = readProductInput(req.body, db);
    if (error) return res.status(400).json({ error });
    const now = new Date().toISOString();
    const product = {
      id: crypto.randomUUID(),
      ...value,
      // Produto novo aparece primeiro no site.
      order: Math.min(0, ...db.products.map((p) => p.order)) - 1,
      createdAt: now,
      updatedAt: now,
    };
    db.products.push(product);
    await saveDB(db);
    res.status(201).json(product);
  },
});
