const { requireAdmin, saveDB, handler } = require("./_lib/store");

function slugify(name) {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "categoria"
  );
}

// Substitui a lista inteira de categorias (ordem, nomes e cores).
module.exports = handler({
  PUT: async (req, res) => {
    const db = await requireAdmin(req, res);
    if (!db) return;
    const input = (req.body || {}).categories;
    if (!Array.isArray(input) || !input.length) {
      return res.status(400).json({ error: "Mantenha pelo menos uma categoria." });
    }
    const existing = new Set(db.categories.map((c) => c.id));
    const ids = new Set();
    const categories = [];
    for (const c of input) {
      const name = String(c.name || "").trim().slice(0, 40);
      if (!name) return res.status(400).json({ error: "Toda categoria precisa de um nome." });
      let id = existing.has(c.id) ? c.id : slugify(name);
      if (!existing.has(c.id)) {
        const base = id;
        for (let n = 2; ids.has(id) || existing.has(id); n++) id = base + "-" + n;
      }
      ids.add(id);
      const color = /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : "#16a34a";
      categories.push({ id, name, color });
    }
    const orphan = db.products.find((p) => !ids.has(p.category));
    if (orphan) {
      const cat = db.categories.find((c) => c.id === orphan.category);
      return res.status(400).json({
        error: `A categoria "${cat ? cat.name : orphan.category}" ainda tem produtos (ex: ${orphan.name}). Mova ou exclua esses produtos antes.`,
      });
    }
    db.categories = categories;
    await saveDB(db);
    res.status(200).json({ categories });
  },
});
