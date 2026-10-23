# Implementación del backend

> Registro histórico del estado al 20 de octubre de 2026. Para el estado vigente, usar el [README principal](../README.md) y el [README del backend](../backend/README.md). La recuperación/verificación de cuenta, la migración 0007 y la integración completa del frontend se incorporaron después de este informe.

Fecha: 20 de octubre de 2026. Trabajo local sobre Express, TypeScript y MariaDB existentes. No se realizó un despliegue ni se aplicaron migraciones nuevas.

## Completado

| Área            | Funcionalidades verificadas                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Autenticación   | Registro atómico de usuario/perfil/sesión, login, rotación, logout, verificación de sesión y cambio de contraseña con revocación de todas las sesiones |
| Usuarios        | Perfil público sin email, perfil personal, actualización de nombre/handle/bio/ubicación/web, búsqueda, seguidores y seguidos                           |
| Publicaciones   | CRUD de texto, público/seguidores/comunidad, feed, filtros, reacciones idempotentes y guardados                                                        |
| Comentarios     | Listado paginado, creación, respuestas dentro de la misma publicación, edición/borrado y reacciones                                                    |
| Comunidades     | CRUD, privacidad pública/privada, membresía, invitación directa por administradores, roles, jerarquía y moderación de publicaciones                    |
| Notificaciones  | Persistencia transaccional, deduplicación, filtros de visibilidad vigentes, lectura individual o total                                                 |
| Mensajería      | Conversación directa única por par, creación concurrente, mensajes/respuestas, edición/borrado propios y seguimiento de lectura                        |
| Proyectos       | CRUD de texto, borrador privado, publicación pública/para seguidores y archivado                                                                       |
| Infraestructura | Health/readiness, errores uniformes, requestId, límites, UTC, contrato OpenAPI de 57 operaciones y comandos de verificación                            |

Los borrados de contenido son lógicos. Cada módulo incluye validación, persistencia y permisos; las pruebas usan HTTP y MySQL reales.

## Arquitectura y seguridad

- `app.ts` compone middleware y rutas; `server.ts` administra arranque y cierre.
- SQL concentrado en repositorios, reglas y transacciones en servicios, validación HTTP en controladores y selección de operaciones en rutas.
- TypeScript ahora incluye **todos** los archivos de fuentes, scripts y pruebas. ESLint usa información de tipos; no se agregaron `any`, `@ts-ignore` ni conversiones inseguras para ocultar errores.
- Se eliminaron los archivos de tareas que simulaban módulos/pruebas y las migraciones 0001–0005 que solo contenían comentarios.
- Cookies HttpOnly/SameSite, Secure en producción; JWT con algoritmo/emisor/audiencia/vencimiento y sesión revocable en base de datos.
- scrypt reforzado con compatibilidad y actualización automática de hashes anteriores tras un login válido.
- Registro/sesión atómicos y bloqueo compartido entre login y cambio de contraseña para evitar nuevas sesiones con credenciales obsoletas.
- Autorización por recurso, jerarquía de roles y visibilidad reutilizada en listas, detalle, comentarios, reacciones, guardados y notificaciones.
- Consultas parametrizadas, cuerpos estrictos, paginación acotada, CORS exacto, cabecera CSRF obligatoria, Helmet y límites por IP/usuario.
- Conexiones SQL en UTC, rollback y liberación garantizada; contadores agregados sin consultas de aplicación por cada fila.

Dependencias agregadas con un propósito concreto: Zod para validación de límites HTTP; Helmet y express-rate-limit para controles HTTP mantenidos; ESLint/TypeScript ESLint/Prettier para calidad; Swagger Parser para verificar OpenAPI. Se mantuvo el resto del stack.

## Archivos principales

- [Composición HTTP](../backend/src/app.ts) y [arranque](../backend/src/server.ts).
- [Módulos de negocio](../backend/src/modules/).
- [Consultas tipadas](../backend/src/database/query.ts), [transacciones](../backend/src/database/transaction.ts) y [regla de visibilidad](../backend/src/shared/security/post-access.ts).
- [Middleware de sesión](../backend/src/middleware/require-session.ts), [errores](../backend/src/middleware/error-handler.ts) y [CORS/CSRF](../backend/src/middleware/csrf.ts).
- [Contrato generado](../backend/contracts/openapi.json), [runner de migraciones](../backend/scripts/migrate.ts) y [configuración de ESLint](../backend/eslint.config.mjs).
- [Guía de arquitectura](../BACKEND_ARCHITECTURE.md), [README del backend](../backend/README.md) y pruebas en `backend/tests/`.

## Verificaciones ejecutadas

| Verificación                            | Resultado                                                                                                                                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm --prefix backend run check`        | Correcto: TypeScript, ESLint, Prettier, contrato actualizado y 17 pruebas aprobadas; ninguna omitida                                                                                                       |
| OpenAPI con Swagger Parser              | Documento válido y referencias resueltas                                                                                                                                                                   |
| Integración                             | Registro/login/logout, hashes heredados, sesiones, cambio de contraseña, perfiles, relaciones, privacidad, roles, contenido, notificaciones, mensajes, proyectos y concurrencia de conversación directa    |
| Seguridad                               | JWT vencido/algoritmo/emisor/audiencia inválidos, CSRF, origen externo, IDOR, suplantación de autor, JSON inválido, 413, 429, errores sin trazas, rollback y cookies Secure en configuración de producción |
| `npm run typecheck` desde la raíz       | Frontend y backend correctos                                                                                                                                                                               |
| `npm run build`                         | Build del frontend correcto                                                                                                                                                                                |
| Playwright `tests/auth-flow.spec.ts`    | 3 pruebas aprobadas con API interceptada                                                                                                                                                                   |
| Navegador real contra API/MySQL locales | Registro, cookie HttpOnly inaccesible a JavaScript, restauración al recargar, logout y nuevo login correctos                                                                                               |
| `npm --prefix backend audit --omit=dev` | 0 vulnerabilidades informadas                                                                                                                                                                              |
| `npm run db:verify`                     | 19 tablas base + estructura de sesiones; 73 índices base, 43 FK y 24 CHECK comprobados                                                                                                                     |
| `npm run db:migrate`                    | Plan de solo lectura correcto; ninguna migración aplicada                                                                                                                                                  |

Los tests generan cuentas temporales con UUID y eliminan únicamente sus datos. Se comprobó la limpieza posterior; no quedan cuentas ni contenido de prueba. Los archivos de integración se ejecutan en serie para no provocar bloqueos entre sus limpiezas sobre la misma base local.

## Parcial o con alcance delimitado

- El backend social funciona por API; el frontend social aún no tiene su adaptador REST conectado. La autenticación de la interfaz sí conserva su integración.
- Publicaciones, proyectos y mensajes implementan texto. Las tablas de medios existentes se preservaron, pero no hay endpoints de subida ni entrega de archivos.
- La moderación implementada es por comunidad/publicación. No hay administración ni roles globales.
- El runner de migraciones incluye exclusión, checksums, estado de ejecución y adopción verificada de la tabla histórica. Su **aplicación DDL no se ejecutó ni se probó** en esta sesión; requiere una base de prueba con credenciales de migración. La adopción de `auth_sessions` en el registro de migraciones queda como paso administrativo explícito.
- No se ejecutaron pruebas de carga. Los límites en memoria son por proceso; la búsqueda es por coincidencia de texto y debe evolucionar a FULLTEXT al crecer los datos.

## Pendiente y próximos pasos

1. Conectar el adaptador REST del frontend a las operaciones ya documentadas y probar navegación social completa.
2. Preparar una base exclusiva de integración/CI y probar el modo de aplicación de migraciones antes de usarlo fuera del entorno local.
3. Incorporar recuperación/verificación por email con transporte real y tokens de un solo uso almacenados de forma segura.
4. Diseñar migraciones revisadas para bloqueos/reportes, privacidad global y hashtags persistidos.
5. Implementar archivos con validación de contenido y permisos, conversaciones grupales y tiempo real.
6. Agregar retención de sesiones vencidas, límites compartidos entre instancias, FULLTEXT y mediciones de carga.
