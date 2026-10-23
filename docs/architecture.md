# Arquitectura de Nexo

La guía vigente del backend es [BACKEND_ARCHITECTURE.md](../BACKEND_ARCHITECTURE.md). Describe capas, seguridad, base de datos, permisos, paginación y pruebas. El contrato implementado está en [OpenAPI](../backend/contracts/openapi.json).

El frontend vive en `frontend/` y el backend en `backend/`; cada paquete conserva sus dependencias y no importa código del otro. La comunicación es HTTP bajo `/api/v1`.

La interfaz consume autenticación y módulos sociales mediante `frontend/src/services/rest-social-api.ts`. El backend no devuelve actividad ficticia y los datos controlados se limitan a las pruebas de navegador.
