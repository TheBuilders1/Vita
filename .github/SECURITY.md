# Seguridad de Vita

Comunica cualquier vulnerabilidad en privado desde **Security → Report a vulnerability**. Indica la versión, los pasos para reproducir el problema con datos ficticios y el impacto observado. Omite credenciales y documentos del hogar. [Abrir un informe privado](../../../security/advisories/new).

## Protecciones

- El guardián comprueba las rutas versionadas, busca patrones de credenciales y revisa permisos, referencias de acciones y condiciones de despliegue. Gitleaks examina también el historial.
- El contrato de agentes comprueba las herramientas permitidas, la delegación y el origen de las peticiones a la API. También revisa que los puertos de Compose estén ligados a la interfaz local.
- La portada y la página 404 incorporan una política de contenido (CSP) que limita scripts y conexiones al propio origen y bloquea el envío de formularios.
- La publicación ordinaria desde `development` exige las revisiones de la web y del backend. El empaquetado firma la procedencia de los archivos. Tras publicar, la prueba de humo compara los bytes que sirve Pages con el artefacto revisado. El modo mantenimiento publica una página estática independiente.

## Límites

Los datos del hogar se guardan sin cifrar en el navegador. Quien tenga acceso al perfil puede leerlos. Los roles de la interfaz no constituyen una frontera de seguridad.

Las webs de un mismo propietario en `github.io` comparten origen: otro proyecto suyo podría leer los datos guardados por Vita. Se evita con una organización dedicada o un dominio propio.

GitHub Pages no admite cabeceras HTTP propias y la CSP en una etiqueta meta no admite `frame-ancestors`. Vita no puede impedir por esa vía que otro sitio la incruste en un marco. Pages publica únicamente la web estática. La API no se publica con este flujo.
