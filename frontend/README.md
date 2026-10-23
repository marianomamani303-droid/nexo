# Frontend de Nexo

Aplicación React 19 + TypeScript + Vite conectada a la API REST de Nexo. La dirección visual mezcla revista experimental, azul eléctrico, papel cálido y geometría de interferencias sin sacrificar navegación, legibilidad o accesibilidad.

## Funcionalidades

- Feed para descubrir o seguir publicaciones, con filtros y paginación.
- Búsqueda de publicaciones, personas y comunidades.
- Comunidades públicas/privadas, miembros, roles y moderación.
- Perfiles, seguidores, proyectos y edición de datos personales.
- Reacciones, comentarios, respuestas y publicaciones guardadas.
- Mensajes directos con edición, respuesta y estado de lectura.
- Login, registro y restauración de sesión mediante cookie HttpOnly.
- Temas claro/oscuro/sistema, vista compacta y movimiento reducido.
- Estados de carga, vacío, error y feedback de acciones.

## Desarrollo

```bash
npm install
npm run dev
```

Vite sirve normalmente en `http://127.0.0.1:5173` y reenvía `/api` a `http://127.0.0.1:3000`. La API debe permitir exactamente el mismo origen configurado en el navegador.

## Calidad

```bash
npm run typecheck
npm run build
npm run format:check
npm test
```

Playwright comprueba autenticación, rutas principales, operaciones sociales, teclado, modales, preferencias, estados vacíos/errores y ausencia de desbordamiento horizontal en 320, 375, 768 y 1440 px. Las respuestas controladas existen solo dentro de las pruebas; la aplicación usa el adaptador REST real.

## Accesibilidad y rendimiento

- Enlace para saltar contenido y foco visible.
- Pestañas navegables con flechas, Home y End.
- Diálogos con Escape, contención y restauración de foco.
- Etiquetas y nombres accesibles en formularios y controles.
- Respeto por `prefers-reduced-motion`, ahorro de datos y la preferencia interna.
- Imágenes diferidas, efectos sin animación continua y chunks separados para React, GSAP y Zod.

El build generado en `dist/` necesita fallback a `index.html` para resolver las rutas del cliente.
