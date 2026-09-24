const crypto = require("crypto");
const { put, list, del } = require("@vercel/blob");

// Os dados do site (produtos, categorias e configuracoes) ficam num unico
// arquivo JSON no Vercel Blob. Cada gravacao cria um arquivo novo com nome
// aleatorio e apaga os antigos: assim a leitura nunca pega uma versao velha
// guardada em cache pelo CDN do Blob.
// Fora da producao (`vercel dev`, previews) usamos outra pasta para nao mexer
// nos dados do site no ar.
const DATA_PREFIX = process.env.VERCEL_ENV === "production" ? "data/" : "dev-data/";

const DEFAULT_CATEGORIES = [
  { id: "racoes", name: "Rações", color: "#16a34a" },
  { id: "petiscos", name: "Petiscos", color: "#ea580c" },
  { id: "medicamentos", name: "Medicamentos", color: "#d97706" },
  { id: "acessorios", name: "Acessórios", color: "#2563eb" },
  { id: "vacinas", name: "Vacinas & Cuidados", color: "#9333ea" },
];

const DEFAULT_PRODUCTS = [
  {
    name: "Ração Super Premium Cães 15kg",
    category: "racoes",
    price: 149.9,
    description: "Alimento completo balanceado para cães adultos de todas as raças. Alta digestibilidade e saúde para o pelo.",
    image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Antipulgas & Carrapatos Tablet",
    category: "medicamentos",
    price: 89.9,
    description: "Proteção rápida e prolongada contra pulgas e carrapatos. Eficácia comprovada por até 35 dias.",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Ração Gatos Castrados 10.1kg",
    category: "racoes",
    price: 125,
    description: "Controle de peso e proteção do trato urinário específica para felinos castrados.",
    image: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Kit Coleira & Guia Reforçada",
    category: "acessorios",
    price: 49.9,
    description: "Material resistente com costura reforçada e fecho de segurança para passeios seguros com seu cão.",
    image: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Suplemento Vitamínico Pet 250ml",
    category: "medicamentos",
    price: 42,
    description: "Polivitamínico indicado para recuperação física, fortalecimento imunológico e brilho da pelagem.",
    image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Aplicação de Vacina V10 / V8",
    category: "vacinas",
    price: 80,
    description: "Aplicação em clínica veterinária com emissão de carteirinha de vacinação e avaliação prévia.",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Cookie Premier cães adultos",
    category: "petiscos",
    price: 29.9,
    description: "Carne bovina: O preferido da maioria dos cães, muito usado em bifinhos e biscoitos crocantes.",
    image: "https://i0.statig.com.br/bancodeimagens/1i/1d/45/1i1d454e2uchjj9nrx7imv83e.jpg",
  },
];

function seedDB() {
  const now = new Date().toISOString();
  return {
    settings: { passwordHash: null },
    categories: structuredClone(DEFAULT_CATEGORIES),
    products: DEFAULT_PRODUCTS.map((p, i) => ({
      id: crypto.randomUUID(),
      ...p,
      promoPrice: null,
      available: true,
      visible: true,
      order: i,
      createdAt: now,
      updatedAt: now,
    })),
  };
}

async function listDataBlobs() {
  const { blobs } = await list({ prefix: DATA_PREFIX });
  return blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

async function getDB() {
  const blobs = await listDataBlobs();
  if (!blobs.length) {
    const db = seedDB();
    await saveDB(db);
    return db;
  }
  const res = await fetch(blobs[0].url, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao ler os dados do site (" + res.status + ").");
  return res.json();
}

async function saveDB(db) {
  const old = await listDataBlobs();
  await put(DATA_PREFIX + "db.json", JSON.stringify(db), {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/json",
  });
  if (old.length) await del(old.map((b) => b.url));
}

// Apaga uma foto enviada pelo painel (ignora links externos, ex: Unsplash).
async function deleteImage(url) {
  if (!url || !/\.blob\.vercel-storage\.com\//.test(url)) return;
  try {
    await del(url);
  } catch (err) {
    console.error("Falha ao apagar imagem", url, err);
  }
}

// ---- Senha e sessao ----

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}

function checkPassword(db, password) {
  if (typeof password !== "string" || !password) return false;
  const stored = db.settings && db.settings.passwordHash;
  if (!stored) {
    const initial = process.env.ADMIN_PASSWORD || "";
    return !!initial && safeEqual(password, initial);
  }
  const [salt, hash] = stored.split(":");
  return safeEqual(crypto.scryptSync(password, salt, 64).toString("hex"), hash);
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// A assinatura inclui a senha atual: trocar a senha derruba todas as sessoes.
function signingKey(db) {
  const pw = (db.settings && db.settings.passwordHash) || "env:" + (process.env.ADMIN_PASSWORD || "");
  return (process.env.SESSION_SECRET || "") + "|" + pw;
}

const SESSION_DAYS = 30;

function createToken(db) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_DAYS * 86400000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", signingKey(db)).update(payload).digest("base64url");
  return payload + "." + sig;
}

function isAdmin(req, db) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = crypto.createHmac("sha256", signingKey(db)).update(payload).digest("base64url");
  if (!safeEqual(sig, expected)) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now();
  } catch {
    return false;
  }
}

// ---- Helpers HTTP ----

function handler(methods) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const fn = methods[req.method];
    if (!fn) return res.status(405).json({ error: "Método não permitido." });
    try {
      await fn(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Erro interno." });
    }
  };
}

// Carrega o banco e exige login; responde 401 e devolve null se nao for admin.
async function requireAdmin(req, res) {
  const db = await getDB();
  if (!isAdmin(req, db)) {
    res.status(401).json({ error: "Sessão expirada. Entre novamente." });
    return null;
  }
  return db;
}

function parsePrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/\s|R\$/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

// Valida e normaliza os campos de produto vindos do painel.
function readProductInput(body, db, current) {
  const src = { ...(current || {}), ...(body || {}) };
  const name = String(src.name || "").trim();
  if (!name) return { error: "Informe o nome do produto." };
  if (!db.categories.some((c) => c.id === src.category)) return { error: "Escolha uma categoria válida." };
  const price = parsePrice(src.price);
  if (price === null || Number.isNaN(price)) return { error: "Informe um preço válido." };
  const promoPrice = parsePrice(src.promoPrice);
  if (Number.isNaN(promoPrice)) return { error: "Preço promocional inválido." };
  if (promoPrice !== null && promoPrice >= price) {
    return { error: "O preço promocional deve ser menor que o preço normal." };
  }
  return {
    value: {
      name: name.slice(0, 120),
      category: src.category,
      price,
      promoPrice,
      description: String(src.description || "").trim().slice(0, 600),
      image: String(src.image || "").trim(),
      available: src.available !== false,
      visible: src.visible !== false,
    },
  };
}

module.exports = {
  getDB,
  saveDB,
  deleteImage,
  hashPassword,
  checkPassword,
  createToken,
  isAdmin,
  handler,
  requireAdmin,
  readProductInput,
};
