# Verificación local de base de datos

Este es un registro histórico de la instalación inicial. Para el backend y comandos actuales, ver [BACKEND_ARCHITECTURE.md](../BACKEND_ARCHITECTURE.md) y [backend/README.md](../backend/README.md). Las tablas `auth_sessions` y `account_tokens` se agregaron posteriormente mediante las migraciones 0006 y 0007.

Fecha local: 19 de octubre de 2026.

## Estado final

**Base creada, conexión operativa y verificaciones completas.** MariaDB de XAMPP permanece activo en `127.0.0.1:3307`. El proyecto se conecta a `nexo_social` con la cuenta local `nexo_app`, sin utilizar root como usuario de aplicación.

En esta etapa histórica todavía no se habían implementado servidor HTTP, endpoints, autenticación, sesiones, CRUD, notificaciones funcionales ni integración del frontend. Esas capacidades existen en el estado actual del proyecto.

## Instalación y esquema comprobados

- XAMPP instalado en `C:\xampp 2`, con MariaDB **10.4.32**.
- Se conservaron el puerto **3307**, el directorio de datos y la configuración de phpMyAdmin existentes. El otro servicio `MySQL84` estaba detenido y no se modificó.
- El puerto 3307 estaba libre antes del arranque. Apache pasó su comprobación de configuración.
- Se confirmó que no existía `nexo_social` antes de crearla.
- `npm run db:apply` leyó y ejecutó realmente `backend/database/schema.sql` contra esa instancia. No se insertaron datos de ejemplo.
- Tras resolver el índice interno dañado, `npm run db:test` importó el pool de mysql2/promise y ejecutó **SELECT 1 con éxito usando nexo_app**.
- `npm run db:verify` terminó correctamente: **19 tablas InnoDB/utf8mb4, 73 índices declarados, 42 claves foráneas y 24 restricciones CHECK**. Se comprobaron columnas/orden/unicidad de los índices declarados, destinos y acciones de FK, nombres de CHECK y su habilitación, motores y collation.
- La verificación leyó el conteo real de cada tabla: **cero filas en las 19 tablas**. No se crearon usuarios sociales ni mensajes de prueba.
- Se abrió nuevamente la página de estructura de phpMyAdmin con un navegador: **HTTP 200 y las 19 tablas visibles**, después de la reparación.
- Se probó nuevamente db:apply con la base existente: **canceló antes de ejecutar SQL**, como corresponde. No se borró ni sobrescribió el esquema.
- El paquete de conexión pasa TypeScript estricto. Su auditoría de dependencias de producción reportó cero vulnerabilidades.
- Se comprobó en un repositorio temporal aislado que `.env` y `backend/.env` quedan ignorados, mientras `.env.example` y `backend/.env.example` permanecen publicables.

## Cuenta de conexión

`nexo_app@127.0.0.1` tiene exclusivamente SELECT, INSERT, UPDATE y DELETE sobre `nexo_social`. Se verificó la identidad de conexión y la ausencia de privilegios globales de administración. No se implementó código de negocio que utilice esos permisos.

La contraseña aleatoria se guardó únicamente en `backend/.env`, ignorado por Git, y no se imprimió en la salida de los comandos. El ejemplo contiene un valor ficticio de contraseña, no esa credencial. La cuenta de aplicación no tiene permisos de crear, alterar o eliminar esquemas; una instalación inicial diferente necesita una cuenta administrativa local para aplicar el SQL por primera vez.

## Reparación autorizada de la instalación existente

En la primera revisión, las operaciones de permisos fallaron con errores Aria. El registro existente ya mostraba corrupción de `mysql.db` desde el 10 de octubre. MariaDB llegó a detenerse durante la lectura de metadatos; las comprobaciones iniciales no se dieron por completas hasta resolverlo.

Con el servidor detenido se confirmó el daño mediante una revisión de solo lectura. Antes de solicitar autorización se respaldaron las tablas internas, la configuración y los registros Aria en:

`C:\Users\maria\AppData\Local\nexo-db-backups\20261019-203400-26f44f8c`

El usuario autorizó expresamente reparar únicamente el índice respaldado y reiniciar MariaDB. Se reconstruyó el índice `mysql/db.MAI` con recuperación QUICK. Al reabrir la tabla fue necesario completar `REPAIR TABLE mysql.db QUICK` desde el servidor para que reconociera correctamente el índice reconstruido. No se utilizaron reparaciones extendidas ni sustitución de directorios de datos.

Después se detuvo limpiamente MariaDB para comparar el SHA-256 de `mysql/db.MAD` con el respaldo: **el archivo de datos era idéntico**. Esta comprobación se hizo antes de terminar los permisos de la cuenta nueva del proyecto. Los cuatro registros previos de permisos permanecieron intactos durante la reparación.

Tras reiniciar con la misma configuración, `CHECK TABLE mysql.db` y `CHECK TABLE mysql.global_priv` devolvieron **OK**. Después se completó exclusivamente la cuenta nueva `nexo_app` y su permiso sobre la base nueva. No se modificaron datos de otras bases de aplicación.

El respaldo queda fuera del repositorio y contiene información interna de permisos: no debe publicarse. La reparación QUICK fue elegida porque actúa sobre el índice sin reconstruir los datos, según la [documentación de MariaDB](https://mariadb.com/docs/server/reference/sql-statements/table-statements/repair-table).

## Uso

1. Abrir XAMPP desde `C:\xampp 2` e iniciar MySQL en el puerto configurado **3307** si no está activo.
2. Iniciar Apache para abrir `http://127.0.0.1/phpmyadmin/` y seleccionar `nexo_social`.
3. Desde la raíz del proyecto, ejecutar `npm run db:test` para comprobar la conexión o `npm run db:verify` para revisar la estructura.

No volver a ejecutar schema.sql sobre la base instalada. No reemplazar el `.env` local por el ejemplo.

## Comprobación del frontend, fuera del alcance de esta etapa

En la comprobación previa a esta reparación, el build general detectó en `frontend/src/pages/Login.tsx` una función `enviarDatos` declarada y no utilizada (TS6133), incorporada mientras se trabajaba en la base. Ese archivo no fue modificado por esta tarea. El problema no afecta al typecheck ni a los scripts independientes de `backend/`.

## Separaci?n posterior de carpetas

La interfaz, su configuraci?n y sus pruebas se trasladaron a `frontend/`. El backend y su `.env` permanecieron en `backend/`, por lo que la ubicaci?n relativa del archivo de credenciales y del esquema SQL no cambi?. Los comandos de la ra?z delegan en cada paquete.
