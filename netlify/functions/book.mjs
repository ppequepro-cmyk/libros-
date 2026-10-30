const ALLOWED = new Set(["64465","55514","46000","77072","29731","67248","61244","59154","29506","64589","17073","62361","17341","10825","75613","19543","29799","74604","74605","10814","41106","66591","46201","49063","79356","46279","67819","63823","71131","66626","20099","57648","57303","12275","17013","28002","17340","15725","52392","16961","21831","25956","55563","66979","63412","17223","16484","52093","27214","17430","17317","22092","17338","13210"]);

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
