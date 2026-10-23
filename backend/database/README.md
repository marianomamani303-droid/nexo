# Base de datos de Nexo

Este documento describe el esquema base inicial. El backend y sus migraciones actuales están documentados en [backend/README.md](../README.md) y [BACKEND_ARCHITECTURE.md](../../BACKEND_ARCHITECTURE.md). A las 19 tablas base se agregaron `auth_sessions` mediante la migración 0006 y `account_tokens` mediante la 0007.

`schema.sql` es el esquema inicial completo para una **base nueva y vacía** llamada `nexo_social`. Se ejecutó sobre MariaDB 10.4.32 de XAMPP. No contiene registros de ejemplo, usuarios semilla ni datos de actividad.

La instalación local usa la cuenta limitada `nexo_app`. `npm run db:verify` comprueba las 19 tablas base, las tablas operativas de migraciones, los 73 índices base, las claves foráneas y 24 restricciones CHECK. El [informe histórico](../../docs/database-verification.md) detalla la preparación inicial de XAMPP.

## Tablas

| Área                    | Tablas                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| Identidad               | `users`, `user_profiles`                                             |
| Seguimiento             | `user_follows`                                                       |
| Comunidades             | `communities`, `community_members`                                   |
| Publicaciones           | `posts`, `post_media`, `post_bookmarks`                              |
| Conversaciones públicas | `comments`, `post_reactions`, `comment_reactions`                    |
| Proyectos del perfil    | `projects`, `project_media`                                          |
| Mensajería privada      | `conversations`, `conversation_members`, `messages`, `message_media` |
| Archivos                | `media_files`                                                        |
| Actividad recibida      | `notifications`                                                      |

Una publicación de comunidad usa `posts.community_id`; no se duplica en una tabla de contenido paralela. Perfil e identidad tienen relación uno a uno. Las asociaciones muchos a muchos usan claves compuestas y restricciones únicas.

## Decisiones de integridad

- Todas las tablas usan InnoDB, `utf8mb4_unicode_ci` y formato de fila DYNAMIC. Los UUID y claves técnicas ASCII tienen un charset específico para reducir el tamaño de índices.
- UUID string como IDs, generados y validados por la aplicación.
- Email y handle únicos con comparación sin distinción de mayúsculas; la aplicación normaliza el correo antes de persistirlo.
- Una reacción por usuario/publicación o comentario; el valor `like` representa un me gusta. Cambiar la reacción actualizará esa relación cuando se implemente la lógica.
- No se permite seguirse a uno mismo. Las posiciones de medios son únicas dentro de cada publicación, mensaje o proyecto.
- Las respuestas a comentarios usan una FK compuesta que exige que padre e hijo pertenezcan a la misma publicación. Se rechaza la autorreferencia directa.
- Los mensajes exigen una membresía de conversación para el remitente. Las respuestas de mensajes se limitan a la misma conversación mediante otra FK compuesta.
- Las conversaciones directas usan un par de usuarios ordenado y único. Las conversaciones grupales no usan ese par.
- Las notificaciones tienen referencias explícitas con FK, en lugar de IDs polimórficos sin integridad. Un objetivo comentario exige también la publicación; un objetivo mensaje exige su conversación.
- El contenido principal conserva referencias restrictivas y campos de baja lógica. Las asociaciones dependientes pueden usar CASCADE; referencias opcionales de imagen/actor pueden pasar a NULL. No se desactiva `foreign_key_checks`.
- No se almacenan contadores de likes, seguidores o miembros que puedan quedar desincronizados: deben consultarse sobre relaciones indexadas.
- `DATETIME(3)` y marcas de creación/actualización; el pool y cada sesión SQL trabajan en UTC.

## Reglas de aplicación

Los servicios implementan en transacciones las reglas que abarcan varias filas: usuario y perfil, propietario y membresía, conversaciones directas únicas, permisos, notificaciones y revocación de sesiones. Las FK y CHECK protegen relaciones y valores que pueden verificarse declarativamente. Los medios, conversaciones grupales y moderación global requieren trabajo adicional.

## Aplicar y comprobar

1. Iniciar MySQL en el XAMPP instalado en `C:\xampp 2`. Esta instalación usa el puerto **3307**, no 3306.
2. Instalar las dependencias del paquete con `npm --prefix backend install` desde la raíz del proyecto.
3. Para otra máquina, copiar `.env.example` a `backend/.env` y completar credenciales locales. La copia local de esta máquina no se debe sobrescribir.
4. Para una primera instalación exclusivamente sobre una base inexistente, usar una cuenta autorizada para DDL y ejecutar `npm run db:apply` desde la raíz. El script lee y ejecuta realmente este `schema.sql` y cancela si la base ya existe.
5. Ejecutar `npm run db:test` y `npm run db:verify`.
6. Iniciar Apache desde XAMPP y abrir `http://127.0.0.1/phpmyadmin/`. Seleccionar el servidor que usa 3307 y la base `nexo_social`.

Importación manual alternativa en PowerShell, únicamente si la base todavía no existe y con contraseña solicitada de forma interactiva:

```powershell
& 'C:\xampp 2\mysql\bin\mysql.exe' --no-defaults --protocol=TCP --host=127.0.0.1 --port=3307 --user=root --password
```

Dentro del cliente:

```sql
SOURCE C:/Users/maria/OneDrive/Apps/mi red social/backend/database/schema.sql;
```

No usar `--force`, no volver a importar sobre la base creada y no borrar tablas para resolver conflictos. El script de Node es la opción recomendada porque comprueba la existencia antes de empezar. MySQL/MariaDB puede hacer commits implícitos de DDL: si una creación falla a mitad, hay que revisar el estado antes de reintentar; no se ejecuta limpieza destructiva automática.

`db:verify` compara tablas, motores, collation, PK, índices únicos/compuestos, FK y CHECK contra el archivo SQL y las migraciones. Solo lee metadatos y cantidades de filas. `db:test` importa el pool, ejecuta `SELECT 1` y libera tanto conexión como pool, también si falla.

## Evolución

Los archivos de `migrations/` son incrementales e inmutables. El migrador registra checksum y estado, y usa un lock para impedir ejecuciones simultáneas. No se debe volver a ejecutar el esquema inicial sobre una base existente ni editar una migración aplicada.

Referencias de implementación: [pool y liberación de conexiones mysql2](https://sidorares.github.io/node-mysql2/docs/examples/connections/create-pool), [integridad referencial de MariaDB](https://mariadb.com/docs/server/ha-and-performance/optimization-and-indexes/foreign-keys).
