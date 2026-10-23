# API de Nexo

API REST modular construida con Express 5, TypeScript estricto y MariaDB/MySQL. Implementa la autenticación y las reglas sociales de Nexo con validación en el límite HTTP, autorización por recurso y persistencia transaccional.

Base URL local: `http://127.0.0.1:3000/api/v1`

## Módulos

| Área          | Capacidades principales                                                                      |
| ------------- | -------------------------------------------------------------------------------------------- |
| Auth          | registro, login, logout, sesión, cambio y recuperación de contraseña, verificación de correo |
| Usuarios      | perfil público/personal, edición, búsqueda, seguidores y seguidos                            |
| Publicaciones | CRUD, visibilidad, feed, búsqueda, reacciones y guardados                                    |
| Comentarios   | respuestas, edición, borrado, reacciones y permisos                                          |
| Comunidades   | privacidad, membresías, roles y moderación                                                   |
| Mensajes      | conversaciones directas, respuestas, edición, borrado y lectura                              |
| Proyectos     | borrador, publicación, archivo y visibilidad                                                 |
| Operación     | health/readiness, request IDs, errores uniformes y OpenAPI                                   |

Todas las colecciones devuelven `{ items, nextCursor }`. Las fechas se serializan en ISO UTC y los identificadores son UUID.

## Organización

```text
src/
  config/       entorno, base, correo y cookies
  contracts/    fuente tipada del documento OpenAPI
  database/     consultas, transacciones y validación de esquema
  middleware/   sesión, CSRF/CORS, rate limits, request ID y errores
  modules/      rutas, validadores, servicios y repositorios por dominio
  shared/       errores, paginación, seguridad y tipos comunes
database/
  schema.sql    esquema completo para una base nueva
  migrations/  cambios incrementales inmutables
scripts/        aplicación/verificación de DB, migrador, contrato y test runner
tests/          pruebas unitarias e integración HTTP contra MySQL
```

## Desarrollo local con XAMPP

1. Iniciar MySQL. La instalación usada durante el desarrollo escucha en `127.0.0.1:3307`.
2. Copiar `.env.example` a `.env` y completar credenciales propias.
3. Instalar dependencias con `npm install` dentro de `backend/`.
4. Preparar una base nueva con `npm run db:apply` y luego `npm run db:migrate -- --apply`.
5. Verificar el esquema con `npm run db:verify`.
6. Iniciar la API con `npm run dev`.

```bash
npm install
npm run db:test
npm run dev
```

La aplicación no ejecuta DDL al arrancar. Sí comprueba que las tablas operativas creadas por las migraciones coincidan con el contrato esperado; si falta una migración, el proceso no declara la API lista.

## Migraciones

- `0006_auth_sessions.sql`: sesiones revocables.
- `0007_account_tokens.sql`: recuperación de contraseña y verificación de correo.

El migrador usa un lock de base, registra checksum y estado, y rechaza cambios sobre migraciones ya aplicadas. `--baseline-existing` permite adoptar una tabla histórica únicamente después de validar su estructura.

```bash
npm run db:migrate                    # plan de solo lectura
npm run db:migrate -- --apply         # aplicar pendientes
npm run db:verify                     # integridad y estructura
```

Para aplicar cambios deben existir `MIGRATION_DB_USER` y `MIGRATION_DB_PASSWORD`. Estas credenciales no son usadas por la API y no deben guardarse en el repositorio. La cuenta de ejecución debe limitarse a operaciones DML.

## Autenticación

La cookie `nexo_session` contiene un JWT HS256 con `sub`, `jti`, emisor, audiencia y vencimiento. Cada `jti` debe existir también en `auth_sessions`, lo que permite logout real, rotación y revocación global al cambiar/restablecer la contraseña.

Las contraseñas se almacenan con `scrypt-v2`, sal aleatoria y parámetros resistentes. Los hashes heredados se actualizan al iniciar sesión. Los tokens de cuenta son aleatorios, se guardan únicamente como SHA-256, vencen y se consumen una sola vez.

Las mutaciones requieren:

```http
Content-Type: application/json
X-Nexo-CSRF: 1
```

El navegador debe enviar cookies con credenciales. `FRONTEND_ORIGIN` debe coincidir exactamente con el origen real del frontend.

## Endpoints principales

| Método y ruta                | Uso                                         |
| ---------------------------- | ------------------------------------------- |
| `GET /health`                | proceso activo                              |
| `GET /health/ready`          | conexión con MySQL disponible               |
| `POST /auth/register`        | crear cuenta y sesión                       |
| `POST /auth/login`           | iniciar sesión                              |
| `POST /auth/forgot-password` | solicitar recuperación sin enumerar cuentas |
| `POST /auth/reset-password`  | canjear token y revocar sesiones            |
| `POST /auth/verification`    | solicitar verificación de correo            |
| `GET/PATCH /users/me`        | consultar o editar perfil propio            |
| `GET/POST /posts`            | explorar o publicar                         |
| `GET /feed`                  | contenido de conexiones                     |
| `GET/POST /communities`      | comunidades y membresías                    |
| `GET/POST /conversations`    | mensajería directa                          |
| `GET/POST /projects`         | proyectos del perfil                        |

El contrato completo está en [`contracts/openapi.json`](contracts/openapi.json). Se genera desde los validadores y las definiciones en `src/contracts/openapi.ts`.

## Verificación

```bash
npm run typecheck
npm run lint
npm run format:check
npm run api:check
npm run test:unit
npm run test:integration
npm run check
npm audit
```

`npm run check` ejecuta tipos, lint, formato, contrato y todas las pruebas. Las pruebas de integración exigen una base local y se niegan a ejecutarse con `NODE_ENV=production` o contra un host remoto.

## Producción

Configurar HTTPS, `NODE_ENV=production`, un `JWT_SECRET` exclusivo, el origen exacto y SMTP autenticado. El proceso permanece ligado a una interfaz explícita y no confía en cabeceras de proxy por defecto.

La instalación pública también debe aportar backups, observabilidad, rotación de secretos, almacenamiento de medios, rate limits compartidos entre instancias y limpieza programada de sesiones/tokens vencidos.

Más detalle: [arquitectura](../BACKEND_ARCHITECTURE.md) y [base de datos](database/README.md).
