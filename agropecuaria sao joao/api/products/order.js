const { requireAdmin, saveDB, handler } = require("../_lib/store");

// Recebe a lista de ids na ordem em que devem aparecer no site.
module.exports = handler({
  PUT: async (req, res) => {
    const db = await requireAdmin(req, res);
    if (!db) return;
    const ids = (req.body || {}).ids;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "Lista inválida." });
    const position = new Map(ids.map((id, i) => [id, i]));
    for (const p of db.products) p.order = position.has(p.id) ? position.get(p.id) : ids.length + p.order;
    await saveDB(db);
    res.status(200).json({ ok: true });
  },
});
