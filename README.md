# Entre Páginas

Biblioteca digital responsive para descubrir romance, fantasía, ficción y libros adaptados al cine o la animación.

## Funciones del sitio
- Catálogo con portadas de Open Library Covers, buscador y filtros.
- Fichas de libros con autor, año, descripción y etiquetas.
- Asistente IA conectado a un proveedor compatible con la API de chat completions.
- Lector de archivos PDF y EPUB en el navegador. Los archivos elegidos permanecen en el dispositivo.
- Seguimiento de progreso del lector en el navegador.
- Estadísticas globales de visitas, lecturas iniciadas y terminadas mediante Cloudflare D1.
- Límite inicial de 60 consultas IA por hora para toda la web.

## Despliegue requerido

**GitHub Pages no ejecuta las funciones de servidor de este proyecto.** Para activar las estadísticas globales y la IA, despliega este repositorio como un proyecto **Cloudflare Pages** conectado a GitHub. El lector local y el catálogo estático sí pueden funcionar en hosting estático, pero las rutas `/api/*` necesitan Cloudflare Pages Functions.

### 1. Crear la base de datos D1
1. En Cloudflare Dashboard abre **Workers & Pages → D1 SQL Database**.
2. Crea una base de datos llamada `entre-paginas-db`.
3. Abre su consola SQL y ejecuta todo el contenido de `schema.sql`.

### 2. Conectar D1 al proyecto Pages
1. Crea/importa el proyecto Pages desde este repositorio y usa la rama `main`.
2. No configures un comando de build. Directorio de salida: `/`.
3. En **Settings → Functions → D1 database bindings**, agrega un binding con variable **DB** y selecciona `entre-paginas-db`.
4. Guarda y vuelve a desplegar.

### 3. Configurar la IA sin publicar la clave
En el proyecto Cloudflare Pages abre **Settings → Variables and Secrets** y añade estas variables para Production (y Preview si también lo necesitas):
- `AI_API_KEY`: clave privada del proveedor. Configúrala como Secret, nunca dentro de `index.html` ni en GitHub.
- `AI_BASE_URL`: endpoint compatible con OpenAI Chat Completions, por ejemplo el endpoint `/v1/chat/completions` del proveedor.
- `AI_MODEL`: identificador exacto del modelo habilitado en tu proveedor.

Guarda los cambios y vuelve a desplegar. El servidor no devuelve la clave al navegador.

### 4. Verificar
- Abre `/api/stats` en el dominio publicado. Debe responder con `visits`, `started` y `finished`.
- Abre la web en una ventana nueva y comprueba que aumente el contador global.
- Envía una pregunta al asistente para probar el proveedor IA.
- Abre un PDF o EPUB propio en la sección Lector.

## Privacidad y límites
- El identificador de sesión se genera aleatoriamente en el navegador. D1 guarda ese identificador, eventos de lectura y fechas; no guarda nombres ni el contenido de los archivos.
- El lector abre archivos locales. No aloja, distribuye ni desbloquea libros protegidos por derechos de autor.
- El progreso del lector se guarda localmente en el navegador y no se sincroniza entre dispositivos.
- Las estadísticas globales cuentan sesiones y eventos únicos por sesión/libro. No equivalen a personas únicas.
- El asistente envía la pregunta y el catálogo de esta web al proveedor IA configurado. El límite inicial es compartido por hora y puede ajustarse en `functions/api/ask.js`.
- Los libros incluidos son una selección de ejemplo editable en el arreglo `books` de `index.html`.
