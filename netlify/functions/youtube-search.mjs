const BASE_URL = "https://music.youtube.com";
const FILTERS = {
  songs: "EgWKAQIIAWoSEAUQAxAJEAoQERAQEAQQDhAV",
  videos: "EgWKAQIQAWoSEAUQAxAJEAoQERAQEAQQDhAV",
  albums: "EgWKAQIYAWoSEAUQAxAJEAoQERAQEAQQDhAV",
  artists: "EgWKAQIgAWoSEAUQAxAJEAoQERAQEAQQDhAV",
  playlists: "EgeKAQQoADgBahIQBRADEAkQChAREBAQBBAOEBU="
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
});

function textOf(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(" ");
  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text;
    if (Array.isArray(value.runs)) return value.runs.map(x => x.text || "").join("");
    if (value.simpleText) return value.simpleText;
  }
  return "";
}

function findVideoId(item) {
  return item?.playlistItemData?.videoId
    || item?.navigationEndpoint?.watchEndpoint?.videoId
    || item?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId
    || null;
}

function thumbnailOf(item) {
  const thumbs = item?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails
    || item?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails
    || item?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails
    || [];
  return thumbs.at(-1)?.url || "";
}

function parseItem(item) {
  const renderer = item?.musicResponsiveListItemRenderer
    || item?.musicTwoRowItemRenderer
    || item?.musicImmersiveArtistRenderer;
  if (!renderer) return null;

  const flex = renderer.flexColumns || [];
  const titleRuns = flex[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
  const subtitleRuns = flex[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
  const title = titleRuns.map(r => r.text || "").join("").trim()
    || textOf(renderer.title)
    || textOf(renderer.name);
  if (!title) return null;

  const artists = subtitleRuns
    .filter(r => r.navigationEndpoint?.browseEndpoint?.browseId?.startsWith("UC"))
    .map(r => r.text).filter(Boolean);
  const subtitle = subtitleRuns.map(r => r.text || "").join("").trim();
  const videoId = findVideoId(renderer);
  const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId
    || renderer.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
    || null;
  const fixed = (renderer.fixedColumns || [])
    .map(c => textOf(c.musicResponsiveListItemFixedColumnRenderer?.text))
    .filter(Boolean);
  const duration = fixed.find(s => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(s))
    || subtitleRuns.map(r => r.text || "").find(s => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(s))
    || "";
  const type = videoId ? "song" : (browseId?.startsWith("UC") ? "artist" : "collection");

  return {
    title,
    artist: artists.join(", ") || subtitle,
    duration,
    videoId,
    browseId,
    type,
    thumbnail: thumbnailOf(renderer),
    url: videoId ? `https://music.youtube.com/watch?v=${encodeURIComponent(videoId)}`
      : browseId ? `https://music.youtube.com/browse/${encodeURIComponent(browseId)}`
      : "https://music.youtube.com/"
  };
}

function collectItems(root) {
  const found = [];
  const seen = new Set();
  const walk = value => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const child of value) walk(child);
      return;
    }
    const parsed = parseItem(value);
    if (parsed) {
      const key = parsed.videoId || parsed.browseId || parsed.title;
      if (!seen.has(key)) {
        seen.add(key);
        found.push(parsed);
      }
    }
    for (const child of Object.values(value)) walk(child);
  };
  walk(root);
  return found;
}

export default async request => {
  if (request.method === "OPTIONS") return json({ ok: true });
  if (request.method !== "GET") return json({ error: "Método no permitido." }, 405);

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 100);
  const filter = url.searchParams.get("filter") || "songs";
  if (query.length < 2) return json({ error: "Escribe al menos dos caracteres." }, 400);
  if (!Object.hasOwn(FILTERS, filter)) return json({ error: "Filtro no válido." }, 400);

  try {
    const page = await fetch(BASE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-MX,es;q=0.9,en;q=0.8"
      },
      signal: AbortSignal.timeout(12000)
    });
    if (!page.ok) throw new Error(`YouTube Music respondió ${page.status}`);
    const html = await page.text();
    const apiKey = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/)?.[1];
    const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1];
    if (!apiKey) throw new Error("No se pudo obtener la configuración pública de YouTube Music.");

    const response = await fetch(`${BASE_URL}/youtubei/v1/search?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": BASE_URL,
        "Referer": `${BASE_URL}/`,
        "User-Agent": "Mozilla/5.0"
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: clientVersion || "1.20261011.16.00",
            hl: "es",
            gl: "MX"
          }
        },
        query,
        params: FILTERS[filter]
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`La búsqueda respondió ${response.status}`);
    const data = await response.json();
    const results = collectItems(data).slice(0, 20);
    return json({ ok: true, query, filter, results });
  } catch (error) {
    console.error("YouTube Music search:", error);
    return json({
      error: "No se pudo consultar YouTube Music en este momento.",
      detail: error instanceof Error ? error.message : "Error desconocido"
    }, 502);
  }
};
