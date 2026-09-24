const { getDB, checkPassword, createToken, handler } = require("./_lib/store");

module.exports = handler({
  POST: async (req, res) => {
    const db = await getDB();
    if (!checkPassword(db, (req.body || {}).password)) {
      return res.status(401).json({ error: "Senha incorreta." });
    }
    res.status(200).json({ token: createToken(db) });
  },
});
