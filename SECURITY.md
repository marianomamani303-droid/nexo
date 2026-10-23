# Seguridad

## Versiones soportadas

Mientras Nexo esté en desarrollo, la rama `main` es la única versión que recibe correcciones de seguridad.

## Reportar una vulnerabilidad

No publiques credenciales, tokens, datos personales ni detalles explotables en un issue público. Usá un aviso privado de seguridad de GitHub cuando esté habilitado en el repositorio.

Incluí una descripción del impacto, pasos mínimos para reproducirlo y la versión o commit observado. No incluyas datos reales de terceros.

## Secretos

Los archivos `.env`, certificados, claves, credenciales de servicios y dumps están excluidos por `.gitignore`. Si un secreto llega al historial de Git, ignorarlo después no lo elimina: debe revocarse y rotarse inmediatamente antes de limpiar el historial.
