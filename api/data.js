const { requireAdmin, usingInitialPassword, handler } = require("./_lib/store");

// Tudo que o painel precisa, incluindo produtos ocultos.
module.exports = handler({
  GET: async (req, res) => {
    const db = await requireAdmin(req, res);
    if (!db) return;
    res.status(200).json({
      categories: db.categories,
      products: [...db.products].sort((a, b) => a.order - b.order),
      initialPassword: usingInitialPassword(db),
    });
  },
});
