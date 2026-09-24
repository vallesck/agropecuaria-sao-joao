const { put } = require("@vercel/blob");
const { requireAdmin, handler } = require("./_lib/store");

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

// A Vercel so entrega o corpo binario em req.body (Buffer) quando o
// Content-Type e application/octet-stream; o tipo real da imagem vem no
// cabecalho X-Image-Type. Fora da Vercel, lemos o stream manualmente.
async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

// Recebe a imagem como corpo binario e devolve a URL publica.
module.exports = handler({
  POST: async (req, res) => {
    const db = await requireAdmin(req, res);
    if (!db) return;
    const type = String(req.headers["x-image-type"] || "").toLowerCase();
    if (!TYPES[type]) return res.status(400).json({ error: "Envie uma imagem JPG, PNG, WEBP ou GIF." });
    const body = await readRawBody(req);
    if (!body.length) return res.status(400).json({ error: "Arquivo vazio." });
    if (body.length > MAX_BYTES) return res.status(400).json({ error: "Imagem muito grande (máx. 4MB)." });
    const blob = await put("produtos/foto." + TYPES[type], body, {
      access: "public",
      addRandomSuffix: true,
      contentType: type,
    });
    res.status(200).json({ url: blob.url });
  },
});
