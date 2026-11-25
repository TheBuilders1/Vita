# Vita: plan del backend

## Objetivo y alcance

Construir para el hackathon un backend que reciba peticiones, las delegue desde OpenClaw a un subagente especializado y devuelva un resultado verificable. La demo se hará desde `curl`, sin interfaz web y con datos ficticios.

- **Entrega obligatoria:** orquestador real, subagente documental de OpenClaw y extracción simulada. La demo muestra delegación, resultado y fallo controlado.
- **Primera ampliación:** cargar una foto ficticia, guardarla, extraer la fecha de caducidad con OCR y programar un recordatorio tras confirmación.
- **Después del hackathon:** calendario real, envío de avisos e incorporación de hogares con datos reales.

## Decisiones de arquitectura

- **API:** Python con FastAPI, Uvicorn y `psycopg` 3 para PostgreSQL. Usar migraciones SQL y Docker Compose para el entorno local. Un proceso de API basta para la demo.
- **OpenClaw:** gateway privado. El orquestador acepta una petición y delega en `documentos` mediante `sessions_spawn`. Usar un subagente nativo con `context: "isolated"`, lista de agentes permitidos y sin delegación adicional. Los agentes no tienen acceso directo a la base de datos, al almacenamiento ni a herramientas de ejecución, navegador o mensajería.
- **Calendar:** `calendario` es otro subagente aislado, sin delegación adicional. La API maneja OAuth de usuario, conserva cifrado el refresh token y consulta Calendar API de solo lectura. El subagente recibe una referencia efímera, nunca credenciales, y devuelve al orquestador una respuesta estructurada y verificable. Acotar a calendario principal, máximo 31 días y 50 eventos. No permitir escrituras en Calendar.
- **Responsabilidades:** OpenClaw interpreta y delega. La API autentica, comprueba permisos, valida resultados y ejecuta todas las escrituras. Un mensaje del agente no acredita el éxito de una operación ni equivale a una confirmación del usuario.
- **PostgreSQL:** una instancia y dos esquemas para la demo: `gestion`, para usuarios y hogares, y `producto`, para ejecuciones, documentos y recordatorios. Usar roles de base de datos separados. Si gestión necesita aislamiento operativo o restauración independiente, moverla a otra instancia.
- **Sin esquema por usuario ni base de grafos.** Usar tablas compartidas con `household_id` y, donde corresponda, `owner_user_id`. Los `JOIN` cubren las consultas del MVP. Revisar el grafo solo si aparecen recorridos que el modelo relacional no resuelve bien.

## Hito 1 — Demostrar la orquestación

### 1. Validar OpenClaw antes de construir la API completa

1. Fijar la versión de OpenClaw y un modelo que admita llamadas a herramientas.
2. Configurar `orquestador` y `documentos`. Para la demo, el subagente devuelve una fecha de una muestra ficticia; no simular la delegación.
3. Probar desde un cliente de backend el envío de una petición y el retorno del resultado del hijo al padre. Empezar por la API HTTP privada del Gateway. Validar `sessions_yield` y la continuación del padre, que puede ocurrir en otro turno. No confundir la primera respuesta ni el acuse de `sessions_spawn` con el resultado final.
4. Validar una vía estructurada de retorno: una herramienta del orquestador, `vita_report_result`, informa a la API interna cuando termina el flujo. Correlacionar la llamada con una referencia opaca de la ejecución, de alcance limitado y con caducidad. Verificar en esta prueba que el retorno funciona también cuando el padre se reanuda en otro turno. La herramienta no puede crear documentos ni recordatorios.

Si la prueba no cierra el recorrido, resolver el retorno antes de añadir OCR o calendario. Una respuesta textual que afirma que hubo delegación no basta como prueba.

### 2. Exponer el contrato mínimo

| Ruta | Comportamiento |
| --- | --- |
| `POST /v1/runs` | Recibe `message` y `householdId`. Comprueba membresía, crea una ejecución y responde `202` con `runId`. En la ampliación acepta `documentId`. |
| `POST /v1/calendar/connect` | Inicia OAuth de solo lectura para el usuario autenticado. |
| `GET /v1/calendar/status` | Informa del estado de la conexión propia. |
| `DELETE /v1/calendar/connection` | Elimina el refresh token cifrado propio. |
| `GET /v1/runs/{run_id}` | Devuelve estado y, cuando corresponda, resultado validado o código de error. Solo puede leerlo quien inició la ejecución. |

- Sembrar dos hogares y usuarios ficticios. Para la demo local, asociar tokens de prueba a usuarios en el servidor; no aceptar `userId` ni identificadores de sesión de OpenClaw suministrados por el cliente. No implementar registro, OAuth ni gestión de contraseñas.
- Crear una sesión de OpenClaw por ejecución. Guardar en `producto.runs` los identificadores internos, propietario, hogar, estado y plazo. No exponer claves de sesión ni respuestas crudas del gateway.
- Estados del primer hito: `queued`, `running`, `completed`, `failed`, `timed_out`. Aceptar resultados solo para la ejecución activa y dentro del plazo. Los resultados duplicados o tardíos no cambian un estado final.
- La ejecución se despacha en el proceso de API. Tras un reinicio, marcar como fallidas las ejecuciones interrumpidas; no reanudarlas ni repetir la delegación automáticamente.
- La API valida la forma del resultado antes de exponerlo. Ejemplo: `status: "date_found"` con `expiresOn` (`YYYY-MM-DD`), o `status: "date_missing"` sin fecha.
- Para Calendar, `POST /v1/runs` también acepta `{ "calendar": { "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" } }`. La API asocia a la ejecución una referencia opaca y de vida limitada; `vita_read_google_calendar` aplica la autorización del usuario y obtiene eventos de la ventana. Se almacena el resultado obtenido y no se acepta que el agente lo altere. `calendar` y `documentId` son mutuamente excluyentes.

**Criterio de salida:** el guion de `curl` lanza una ejecución y muestra el resultado. La traza de OpenClaw confirma qué subagente se ejecutó. Un fallo del hijo o un timeout produce un estado terminal, no un éxito. Un usuario ajeno no puede consultar la ejecución.

## Hito 2 — Foto, OCR y recordatorio

### Flujo

1. **Carga:** `POST /v1/documents` acepta una foto JPEG o PNG y aplica límites de tamaño y dimensiones tras verificar que se puede decodificar. La API genera la clave del archivo y lo guarda en un volumen privado de la demo. PostgreSQL guarda metadatos y referencia, no una URL pública.
2. **Escaneo:** la petición incluye el `documentId`. La API comprueba que el solicitante sea el propietario y que pertenezca al hogar. Delega una referencia de trabajo acotada al documento; una herramienta del subagente llama al OCR local, sin enviar la imagen a OpenClaw ni al modelo. Usar Tesseract como primer adaptador y muestras sintéticas con fecha de caducidad visible.
3. **Propuesta:** extraer y validar solo la fecha de caducidad. No persistir el texto bruto ni confundir la caducidad con el nacimiento o la expedición. Si hay varias fechas plausibles, ninguna o contradicciones, pedir que el usuario indique la fecha. Guardar la propuesta con estado `needs_confirmation`.
4. **Confirmación:** `POST /v1/runs/{run_id}/confirm` recibe la fecha confirmada o corregida y el plazo de aviso. La API vuelve a validar propietario, documento y estado. Calcula la fecha de aviso de forma determinista y guarda fecha confirmada y recordatorio en una transacción. Una restricción única por ejecución evita duplicados incluso con peticiones simultáneas. Si se repite la misma confirmación, devolver el resultado previo; si difiere, responder con conflicto.
5. **Programación:** guardar la caducidad como `date` y el instante del aviso como `timestamptz`. Configurar la zona IANA del hogar; usar `Europe/Madrid` en la demo. Ejemplo: avisar 30 días naturales antes a las 09:00 locales. Si el aviso ya quedaría en el pasado, pedir otra fecha en lugar de guardarlo. En este hito, «programado» significa persistido, no entregado.

### Datos mínimos

| Esquema | Tablas | Campos clave |
| --- | --- | --- |
| `gestion` | `users`, `households`, `memberships` | Identidad, zona horaria y pertenencia al hogar. |
| `producto` | `runs` | Hogar, propietario, estado, plazo, referencia de ejecución y resultado validado. |
| `producto` | `documents` | Hogar, propietario, clave privada de almacenamiento y caducidad confirmada. |
| `producto` | `reminders` | Hogar, propietario, documento, ejecución de origen e instante programado. |

Los documentos y avisos son privados para su propietario. Pertenecer al hogar, incluso como administrador, no basta para consultarlos.

**Criterio de salida:** una foto ficticia queda guardada en privado, el OCR propone una fecha y el aviso solo aparece tras confirmación. Una foto ilegible permite introducir la fecha manualmente. Una confirmación repetida no genera un segundo aviso.

## Hito 3 — Google Calendar en modo de lectura

1. Crear OAuth client de tipo Web en Google Cloud, activar Calendar API y autorizar exactamente la URL callback de Vita. Usar `calendar.events.readonly`, nunca el scope de escritura. Usar un `state` aleatorio fuerte y redirigir tras procesar el callback a una URL limpia.
2. El usuario inicia `/v1/calendar/connect` autenticado con Vita. Guardar el `state` hash y el nonce OIDC cifrado, ligados al usuario, junto con el PKCE verifier cifrado, con TTL de 10 minutos; consumirlos una sola vez. Validar ID token y asociar la conexión con su `sub` verificado.
3. Cifrar refresh tokens en PostgreSQL con una clave Fernet externa al repo. El backend canjea/refresca tokens; OpenClaw nunca recibe tokens ni puede consultar Google de manera directa.
4. Al crear un run, exigir un rango explícito e inclusivo de hasta 31 días. Consultar el calendario `primary`, expandir recurrencias y limitar a 50 eventos. Convertir inicios y finales con hora a UTC; incluir la zona IANA del hogar para interpretar y presentar horas locales.
5. El plugin consume una `calendarRef` ligada al usuario/run, una sola vez y antes del deadline. El backend filtra la respuesta del proveedor a `summary`, `start`, `end` y `allDay`, la guarda y verifica coincidencia exacta cuando el orquestador la informa. No incluir links, asistentes ni descripciones.
6. No guardar los eventos más allá de la ejecución, ni hacer escrituras en Google Calendar. Desconectar elimina el refresh token almacenado.

**Criterio de salida:** OAuth con `state` no reutilizable, aislamiento por usuario, acceso de mínimo privilegio, rango/eventos acotados y un resultado de agente que el backend contrasta con la respuesta real de Google.

## Pruebas y guion de demo

- Probar una delegación correcta, un resultado con formato inválido y un timeout. Un retorno tardío no cambia el estado final.
- Probar acceso denegado desde otro hogar y desde otro miembro del mismo hogar. Aplicarlo también a la foto y a la confirmación.
- En la ampliación, probar una imagen inválida, OCR ambiguo, confirmación duplicada y cálculo del aviso alrededor de un cambio de hora.
- Registrar identificadores de ejecución, estado, duración y código de error. No registrar fotos, texto extraído, mensajes de usuario ni tokens.
- Mostrar primero el hito 1 completo. Si el OCR falla o no está listo, mantener la demo con el escaneo simulado e indicarlo.

## Fuera de alcance y paso a producción

No construir frontend, envío de notificaciones, memoria de grafo ni registro público para el hackathon. La integración real de Calendar se mantiene acotada al agente especializado y al calendario principal en solo lectura.

No usar DNI reales ni publicar el gateway. OpenClaw no debe servir como frontera de seguridad entre usuarios que no confían entre sí. Antes de un piloto, definir aislamiento de gateways, almacenamiento cifrado, borrado, retención y requisitos de protección de datos en España.

Referencias: [seguridad de OpenClaw](https://docs.openclaw.ai/gateway/security), [API HTTP del Gateway](https://docs.openclaw.ai/gateway/openai-http-api), [contrato de subagentes](https://docs.openclaw.ai/tools/subagents/tool-reference).
