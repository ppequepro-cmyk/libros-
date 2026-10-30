import { getStore } from "@netlify/blobs";

const store = getStore("entre-paginas-ranking");
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
});

function currentWeekKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

async function listAll(prefix) {
  const items = [];
  let cursor;
  do {
    const result = await store.list({ prefix, ...(cursor ? { cursor } : {}) });
    items.push(...(result.blobs || []));
    cursor = result.cursor;
  } while (cursor);
  return items;
}

export default async (request) => {
  if (request.method === "OPTIONS") return json({ ok: true });
  const week = currentWeekKey();

  try {
    if (request.method === "GET") {
      const blobs = await listAll(`weeks/${week}/`);
      const totals = new Map();
      for (const blob of blobs) {
        const item = await store.get(blob.key, { type: "json" });
        if (!item || !item.userId || !item.nickname) continue;
        const current = totals.get(item.userId) || { nickname: item.nickname, books: 0 };
        current.nickname = item.nickname;
        current.books += 1;
        totals.set(item.userId, current);
      }
      const top = [...totals.values()]
        .sort((a, b) => b.books - a.books || a.nickname.localeCompare(b.nickname, "es"))
        .slice(0, 10);
      return json({ week, top });
    }

    if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Solicitud inválida." }, 400); }

    const userId = String(body?.userId || "");
    const nickname = String(body?.nickname || "").trim().replace(/\\s+/g, " ");
    const bookId = String(body?.bookId || "");

    if (!/^[a-f0-9-]{36}$/i.test(userId)) return json({ error: "Identificador de lector inválido." }, 400);
    if (nickname.length < 2 || nickname.length > 20) return json({ error: "El apodo debe tener entre 2 y 20 caracteres." }, 400);
    if (!/^\\d{1,4}$/.test(bookId)) return json({ error: "Solo se aceptan libros del catálogo." }, 400);

    const key = `weeks/${week}/${userId}/${bookId}.json`;
    const previous = await store.get(key, { type: "json" });
    if (previous) return json({ ok: true, duplicate: true, week });

    await store.setJSON(key, {
      userId,
      nickname,
      bookId,
      completedAt: new Date().toISOString(),
      week
    });
    return json({ ok: true, duplicate: false, week });
  } catch (error) {
    console.error("Weekly leaderboard error:", error);
    return json({ error: "El ranking todavía no está disponible. Comprueba el despliegue de Netlify." }, 503);
  }
};
