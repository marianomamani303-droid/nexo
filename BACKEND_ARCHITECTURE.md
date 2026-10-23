# Backend de Nexo

Node.js 20.19+, Express 5, TypeScript estricto y MySQL/MariaDB. El esquema local es MariaDB de XAMPP. No se requieren contenedores.

## Carpetas y responsabilidades

```text
backend/
  src/
    app.ts                 composición HTTP; no abre puertos
    server.ts              arranque y cierre del proceso
    config/                variables de entorno, pool y cookies
    database/              consultas tipadas, transacciones y verificación de sesiones
    middleware/            sesión, CSRF/CORS, límites, requestId y errores
    modules/               auth, users, posts, comments, communities,
                           notifications, feed, messages, projects, health
    shared/                errores, validadores, tipos y reglas de visibilidad
    contracts/             definición y generación del contrato API
  database/                esquema inicial y migraciones incrementales
  contracts/openapi.json   especificación OpenAPI generada
  scripts/                 mantenimiento explícito y runner de pruebas
  tests/                   pruebas unitarias e integración HTTP con MySQL real
```

Cada módulo usa rutas → controlador → servicio → repositorio cuando necesita las cuatro capas. Las rutas eligen middleware y operación. El controlador valida con Zod y convierte la petición/respuesta HTTP. El servicio decide permisos y coordina el caso de uso. El repositorio contiene el SQL parametrizado y convierte filas a DTO públicos. Health y feed son pequeños y reutilizan lo existente.

Una petición pasa por requestId, cabeceras de seguridad, CORS/CSRF y límite por IP. Tras leer JSON/cookies, se resuelve la sesión opcional y se limita la frecuencia de escrituras. La ruta exige autenticación cuando corresponde; el servicio vuelve a verificar propiedad, membresía o visibilidad del recurso. Un único middleware convierte errores a `{ code, message, requestId, details? }` sin exponer SQL, hashes, tokens ni trazas.

## Base de datos

Un único pool se configura desde `backend/.env`. Todas las conexiones fijan UTC tanto en el driver como en la sesión SQL. `select<T>` y `execute` concentran las consultas; `transaction` garantiza commit, rollback y liberación. Los DTO tipados describen las columnas seleccionadas; las entradas HTTP se validan en ejecución.

Las relaciones usan las PK/FK/índices existentes. Publicaciones, comentarios, comunidades, proyectos y mensajes se eliminan lógicamente. Seguir, reaccionar, guardar y crear una conversación directa son operaciones idempotentes. Las notificaciones se insertan en la misma transacción que el evento y usan una clave de deduplicación. Los bloqueos de fila protegen cambios de rol, escrituras dependientes de publicaciones y cambios de credenciales; los pares de usuarios se bloquean en orden para reducir interbloqueos.

Las colecciones tienen cursor por fecha e ID descendentes, con límite de 1 a 100. El cursor está vinculado a los filtros y, cuando aplica, al usuario. No otorga permisos: cada página vuelve a evaluar la visibilidad. Feed y guardados se ordenan por fecha de publicación; conversaciones por fecha de creación, para mantener un orden estable. Los contadores se resuelven en SQL, sin una consulta de aplicación adicional por elemento.

`schema.sql` es exclusivamente para una base nueva. `npm run db:migrate` muestra el plan sin aplicar DDL. El modo `--apply` requiere una identidad administrativa separada en `MIGRATION_DB_USER`/`MIGRATION_DB_PASSWORD`; usa bloqueo de exclusión, checksums y registro de estado. El DDL de MySQL puede hacer commit implícito: una migración interrumpida queda marcada para revisión manual. La tabla de sesiones existente puede adoptarse con `--baseline-existing` después de verificar su estructura. No se migran esquemas automáticamente al iniciar la API.

## Autenticación y permisos

Registro crea usuario, perfil y sesión atómicamente. Las contraseñas nuevas usan scrypt de Node con sal aleatoria, N=32768, r=8 y p=3. Los hashes anteriores siguen verificándose y se actualizan después de un login válido. [Referencia de parámetros de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).

El JWT HS256 incluye emisor, audiencia, vencimiento e ID aleatorio de sesión. Se envía únicamente en `nexo_session`, una cookie HttpOnly/SameSite=Lax, Secure en producción. Cada petición verifica firma y registro vigente en MySQL, además del estado activo del usuario. Logout revoca la sesión; cambiar o restablecer la contraseña revoca todas. Los enlaces de recuperación y verificación usan tokens aleatorios almacenados solo como SHA-256, con vencimiento y consumo único. Login y cambio de contraseña bloquean la misma fila para impedir que credenciales obsoletas creen una sesión nueva.

Las escrituras requieren `X-Nexo-CSRF: 1`; los orígenes diferentes de `FRONTEND_ORIGIN` son rechazados. La cabecera obliga a un preflight en navegadores de otro origen. CORS solo autoriza el origen exacto y credenciales. No se confía en `X-Forwarded-For`: una configuración futura de proxy debe ser explícita.

Publicaciones personales admiten `public` o `followers`. Las de comunidad requieren membresía al crear y respetan la privacidad de la comunidad al leer. La misma regla protege detalle, listas, feed, guardados, comentarios, reacciones y notificaciones. Proyectos en borrador/archivados solo son visibles para el autor. En comunidades, el propietario administra configuración y moderadores; un moderador administra miembros ordinarios y puede retirar publicaciones. Las conversaciones implementadas son directas y solo sus participantes acceden a los mensajes.

## Agregar un módulo

1. Revisar si el esquema ya cubre el caso. Si necesita cambios, agregar una migración nueva; no editar SQL ya aplicado.
2. Crear validadores de entrada y DTO de salida explícitos.
3. Escribir el repositorio con consultas parametrizadas, índices adecuados y paginación.
4. Implementar permisos y transacciones en el servicio. Reutilizar reglas de acceso existentes.
5. Conectar controlador/rutas en `app.ts`, agregar pruebas de éxito, permisos y errores.
6. Actualizar `src/contracts/openapi.ts`, generar el contrato y ejecutar los controles.

## Ejecutar y probar

Desde `backend/`:

```sh
npm install
npm run dev
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:integration
npm run check
npm run db:verify
npm run db:migrate
npm run api:generate
npm run api:check
```

Copiar `.env.example` solo para una instalación nueva; conservar el `.env` local existente y generar un `JWT_SECRET` aleatorio. MySQL debe estar activo para integración y verificación. `npm run test:unit` no abre conexiones de base de datos. Las pruebas de integración usan HTTP real en puertos efímeros, cuentas UUID temporales y limpieza limitada a esas cuentas. El runner las ejecuta por archivo en serie para compartir con seguridad la base local; las pruebas de concurrencia la ejercitan de forma explícita. Se rechazan bases remotas y NODE_ENV=production. Para trabajo de equipo/CI conviene una base exclusiva de pruebas.

Los límites están en memoria por proceso: para varias instancias hace falta un almacén compartido. La búsqueda actual usa coincidencias de texto parametrizadas; FULLTEXT y mediciones de carga quedan para una migración posterior. Bloqueos/reportes globales, archivos, grupos y tiempo real permanecen fuera del alcance actual. El frontend consume la API mediante su adaptador REST y conserva datos controlados únicamente dentro de Playwright.
