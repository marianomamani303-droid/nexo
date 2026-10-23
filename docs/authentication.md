# Autenticación

Implementación y decisiones: [arquitectura](../BACKEND_ARCHITECTURE.md#autenticación-y-permisos). Configuración y ejecución: [backend](../backend/README.md). Contrato completo: [OpenAPI](../backend/contracts/openapi.json).

- `POST /api/v1/auth/register`: `{ name, email, password }`, crea cuenta y sesión atómicamente.
- `POST /api/v1/auth/login`: `{ email, password }`, inicia sesión y rota la cookie presente.
- `GET /api/v1/auth/session`: `{ user }` o 401.
- `POST /api/v1/auth/logout`: revoca la sesión presente y elimina la cookie; 204.
- `POST /api/v1/auth/password`: `{ currentPassword, newPassword }`, cambia la contraseña y revoca todas las sesiones; 204.

El JWT permanece en una cookie HttpOnly/SameSite=Lax y Secure en producción. Las peticiones del navegador incluyen `credentials: 'include'` y las mutaciones `X-Nexo-CSRF: 1`. Cada petición verifica también la sesión en MySQL. No se guardan tokens en localStorage ni se devuelven en JSON.

Las cuentas con hashes anteriores continúan funcionando; un login válido actualiza el hash a los parámetros actuales de scrypt. La recuperación y verificación por correo usan tokens aleatorios, almacenados únicamente como SHA-256, con vencimiento y consumo único.
