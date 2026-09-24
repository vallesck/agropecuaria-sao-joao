const { requireAdmin, checkPassword, hashPassword, createToken, saveDB, handler } = require("./_lib/store");

module.exports = handler({
  POST: async (req, res) => {
    const db = await requireAdmin(req, res);
    if (!db) return;
    const { current, next } = req.body || {};
    if (!checkPassword(db, current)) return res.status(400).json({ error: "A senha atual está incorreta." });
    if (typeof next !== "string" || next.length < 6) {
      return res.status(400).json({ error: "A nova senha precisa ter pelo menos 6 caracteres." });
    }
    db.settings = { ...db.settings, passwordHash: hashPassword(next) };
    await saveDB(db);
    // A troca invalida as sessoes antigas; devolve uma nova para este navegador.
    res.status(200).json({ token: createToken(db) });
  },
});
