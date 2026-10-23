export function databaseError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    ECONNREFUSED:
      'No hay un servidor escuchando en DB_HOST:DB_PORT. Iniciá MySQL desde XAMPP y comprobá el puerto.',
    ETIMEDOUT: 'Se agotó el tiempo de conexión. Revisá host, puerto y firewall.',
    ENOTFOUND: 'No se pudo resolver DB_HOST.',
    ECONNRESET:
      'El servidor cerró la conexión. Revisá el registro de MariaDB/XAMPP; no se reparan tablas automáticamente.',
    PROTOCOL_CONNECTION_LOST:
      'Se perdió la conexión con MariaDB. Comprobá que siga activo y revisá su registro.',
    PROTOCOL_SEQUENCE_TIMEOUT:
      'La consulta excedió el tiempo permitido. Revisá el estado del servidor.',
    ER_ACCESS_DENIED_ERROR:
      'Acceso rechazado. Revisá DB_USER y DB_PASSWORD en backend/.env y los permisos del usuario.',
    ER_BAD_DB_ERROR: 'DB_NAME no existe todavía. Aplicá schema.sql con una cuenta autorizada.',
    ER_DB_CREATE_EXISTS:
      'La base ya existe. No se sobrescribió: revisá su estructura o prepará una migración.',
    ER_DBACCESS_DENIED_ERROR:
      'La cuenta no tiene permiso para esa base u operación. La cuenta runtime no debe crear esquemas.',
  };
  if (messages[code]) return messages[code];
  // No imprimir sql, sqlMessage, configuraciones o credenciales de errores del driver.
  if (code)
    return `Error de base de datos (${code}). Revisá los permisos y la estructura sin publicar credenciales.`;
  return error instanceof Error ? error.message : 'Error de base de datos desconocido.';
}
