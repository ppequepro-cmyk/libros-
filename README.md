# Entre Páginas

Biblioteca digital responsive para descubrir libros de romance, fantasía, ficción y obras adaptadas al cine o la animación.

## Funciones
- Catálogo con portadas solicitadas a Open Library Covers.
- Búsqueda por título y autor, y filtros por género.
- Ficha de libro con descripción y registro de lectura iniciada/terminada.
- Contador de sesiones en el navegador.
- Asistente de búsqueda que comprueba si un título está registrado.

## Publicación
La web está en `index.html` y no necesita compilación. En GitHub abre **Settings → Pages** y configura la rama `main` con la carpeta raíz (`/`). Si el repositorio privado no permite Pages en tu plan, necesitarás cambiar la visibilidad o usar otro alojamiento compatible.

## Límites actuales
Las estadísticas usan `localStorage` y `sessionStorage`: solo reflejan la actividad de ese navegador, no las visitas de todos los usuarios. Para estadísticas globales se necesita un backend o proveedor de analítica compartido.

El asistente actual busca en el catálogo; no es un modelo generativo conectado a una API. Para conectarlo a una IA real hace falta un backend que proteja la clave de API. Los libros de ejemplo se pueden editar en el arreglo `books` de `index.html`.