# Rediseño visual de Nexo

Dirección: revista experimental y taller de ideas. Azul eléctrico, papel cálido, amarillo ácido y naranja señal; titulares de cartel, navegación numerada, geometría de interferencias y líneas editoriales. Sin fuentes remotas, imágenes externas ni nuevas dependencias.

## Alcance

Shell de escritorio y móvil, acceso y registro, feed, exploración, comunidades, perfil, notificaciones, proyectos, guardados, publicaciones, mensajes, formularios, estados vacíos y errores. Se conservaron rutas, adaptadores REST, protección de sesión y contratos del backend. Los datos de prueba están exclusivamente en Playwright.

Se reutiliza GSAP para entradas y profundidad. El símbolo SVG usa una transición breve al pasar el cursor, sin animaciones continuas. Se respetan la preferencia del sistema y la opción de movimiento reducido de Nexo. Navegación por teclado, foco visible, modales con contención/restauración de foco y pestañas con flechas.

## Verificación

- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`
- `npm --prefix frontend test`
- Playwright: 15 rutas con sesión y respuestas REST controladas, anchos 320/375/768/1440; acceso y registro en móvil/tablet/escritorio; publicación, comentarios, búsqueda, menú móvil, foco del modal, preferencias persistentes, estados vacíos y recuperación de errores.
- Capturas en `frontend/test-results/nexo-*.png` al ejecutar la suite.

## Límites

Durante el rediseño inicial la API local no estaba disponible, por lo que la verificación visual usó respuestas interceptadas con el formato real. Posteriormente se iniciaron XAMPP y la API, se aplicaron las migraciones y el backend recibió su propia suite de integración contra MySQL.

El build termina correctamente. Zod emite dos advertencias de anotaciones PURE en archivos de su dependencia; Rollup elimina esos comentarios. La separación de chunks evita el aviso de archivos mayores a 500 kB.
