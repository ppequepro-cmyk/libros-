const ALLOWED = new Set(["64465","55514","46000","77072","29731","67248","61244","59154","29506","64589","17073","62361","17341","10825","75613","19543","29799","61189","60464","51858","58298","55157","12848","40544","43432","43033","74566","13264","74604","74605","10814","41106","66591","46201","49063","15531","79356","46279","54430","67819","63823","71131","16109","66626","20099","47287","47631","48903","74041","74065","78437","57648","57303","12275"]);

export default async (request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!ALLOWED.has(id)) return new Response("Libro no disponible.", { status: 404 });
  try {
    const upstream = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, {
      headers: { "User-Agent": "EntrePaginasLibrary/1.0 (public-domain reader)" }
    });
    if (!upstream.ok) return new Response("No se pudo cargar el texto desde Project Gutenberg.", { status: 502 });
    const text = await upstream.text();
    return new Response(text, { headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff"
    }});
  } catch {
    return new Response("Error al conectar con la biblioteca de origen.", { status: 502 });
  }
};
