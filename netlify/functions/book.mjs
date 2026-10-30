const ALLOWED = new Set(["64465", "55514", "46000", "77072"]);

export default async (request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!ALLOWED.has(id)) {
    return new Response("Libro no disponible.", { status: 404 });
  }

  try {
    const upstream = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, {
      headers: { "User-Agent": "EntrePaginasLibrary/1.0 (public-domain reader)" }
    });
    if (!upstream.ok) {
      return new Response("No se pudo cargar el texto desde Project Gutenberg.", { status: 502 });
    }
    const text = await upstream.text();
    return new Response(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return new Response("Error al conectar con la biblioteca de origen.", { status: 502 });
  }
};
