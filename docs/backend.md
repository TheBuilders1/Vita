# Backend

Backend de demostración para un asistente personal por hogar. El proyecto delega tareas a subagentes de OpenClaw, consulta Google Calendar en modo de solo lectura mediante OAuth y analiza imágenes privadas con OCR local para proponer fechas de caducidad. El usuario debe confirmar la fecha antes de que Vita persista un recordatorio.

Está pensado para una demo local del hackathon, ejecutada desde `curl` o, de forma opcional, desde el frontend en desarrollo; no entrega notificaciones. Calendar consulta el calendario principal del usuario, con autorización explícita y un rango de hasta 31 días; no crea ni modifica eventos. Todas las personas, imágenes y fechas de ejemplo son ficticias. **No uses documentos reales ni publiques la API o el Gateway de OpenClaw.**

## Funcionalidad

- Autenticación local mediante tokens de demostración asociados a usuarios sembrados.
- Comprobación de pertenencia al hogar y propiedad de ejecuciones y documentos.
- Ejecuciones asíncronas de Vita hacia un Gateway privado de OpenClaw, con resultado estructurado y validado.
- Chat conversacional para mensajes generales; cada usuario y conversación tienen una sesión de OpenClaw aislada.
- Adjuntos efímeros en el chat: OCR local de imágenes JPG/PNG/WebP y PDF escaneados, y extracción local de PDF, TXT y DOCX.
- Conexión OAuth individual a Google Calendar, refresh token cifrado y consultas de solo lectura delegadas a un subagente especializado.
- Carga privada de imágenes JPEG/PNG con límites de tamaño, dimensiones y decodificación.
- OCR local con Tesseract; se extrae únicamente una fecha vinculada a una etiqueta de caducidad.
- Confirmación o corrección explícita de la fecha antes de crear un recordatorio persistido en PostgreSQL.
- Pruebas unitarias para validación, OCR, cliente OpenClaw, esquemas y cálculo horario.

## Arquitectura

```text
Cliente (curl)
  └─ FastAPI: autentica, autoriza, valida y persiste
    ├─ PostgreSQL: hogares, ejecuciones, documentos, recordatorios y credenciales OAuth cifradas
       ├─ Volumen privado: archivos de imagen
       └─ Gateway OpenClaw privado
      └─ orquestador ──delegación──> documentos / calendario
                 ├─ vita_scan_document ──> API interna ──> Tesseract local
        ├─ vita_read_google_calendar ──> API interna ──> Google Calendar API
        └─ vita_report_result ──> API interna ──> resultado validado
```

OpenClaw se encarga de conversar, interpretar y delegar. No accede directamente a PostgreSQL, al volumen de imágenes ni a credenciales OAuth. La API es la autoridad para permisos, rangos, resultados, estados y escrituras; el texto final de un agente no se considera prueba de que una operación haya terminado. En el chat normal recibe solo una selección local y limitada de datos visibles para responder; no puede consultar el hogar ni modificar datos mediante herramientas.

### Componentes

| Ubicación | Responsabilidad |
| --- | --- |
| `app/main.py` | Rutas HTTP, autorización, carga de imágenes, confirmación e integración de endpoints internos. |
| `app/worker.py` | Despacho de ejecuciones, espera del resultado y transiciones de estado. |
| `app/openclaw.py` | Cliente HTTP del Gateway OpenClaw. |
| `app/security.py` | Lectura de Bearer tokens y asociación servidor-token-usuario. |
| `app/images.py` | Verificación del contenido, MIME, tamaño y dimensiones de imágenes. |
| `app/ocr.py` | Ejecución de Tesseract y selección conservadora de fechas de caducidad. |
| `app/google_calendar.py` | Flujo OAuth de Google, cifrado de credenciales y cliente de Calendar API de solo lectura. |
| `app/reminders.py` | Cálculo de la hora local del recordatorio, con zona horaria IANA. |
| `app/schemas.py` | Validación estricta de peticiones, resultados y respuestas con Pydantic. |
| `app/database.py`, `app/migrate.py` | Conexión PostgreSQL, recuperación de ejecuciones interrumpidas y migraciones SQL. |
| `migrations/` | Esquema relacional y datos ficticios iniciales. |
| `openclaw/agents/` | Instrucciones y restricciones de `orquestador`, `documentos` y `calendario`. |
| `openclaw/vita-tools/` | Plugin local que expone `vita_scan_document`, `vita_read_google_calendar` y `vita_report_result`. |
| `tests/backend/` | Pruebas unitarias y de integración del backend. Las del frontend están en `frontend/tests/`. |

### Datos

PostgreSQL usa una sola instancia y dos esquemas con propietarios separados:

- `gestion`: `users`, `households` y `memberships`.
- `producto`: `runs`, `documents`, `reminders`, conexiones de Google Calendar y estados OAuth.

Las tablas de producto relacionan los datos con un hogar y su propietario. Los metadatos de imágenes quedan en PostgreSQL; el archivo se guarda bajo una clave aleatoria en el volumen privado. No se almacena el texto OCR bruto. La fecha detectada se conserva como propuesta y solo pasa a confirmada cuando el usuario confirma.

## Requisitos

- Linux para `docker compose`: los servicios web comparten la red del host y se enlazan a loopback para comunicarse sin publicar servicios en la LAN.
- Docker Engine y Docker Compose.
- OpenClaw `2026.11.8` con Gateway HTTP privado. La versión está fijada porque el plugin usa la API experimental de OpenClaw.
- Una [API key de Ollama Cloud](https://ollama.com/settings/keys) y acceso a internet desde el Gateway. No hace falta instalar Ollama.
- Para procesar PDF, Poppler (`poppler-utils`); el Dockerfile incluido ya lo instala.
- Node.js `24.22.1` o superior para el runtime del plugin.
- Para ejecutar las pruebas fuera de Docker: Python `3.11` o superior. La imagen Docker del proyecto usa Python `3.12`.

El Dockerfile instala Tesseract, Poppler y los datos de idioma español. En Docker Desktop, la configuración de red incluida no es directamente equivalente: ejecuta la API en el host o configura una red privada y un bind restringido antes de cambiar las URLs.

## Puesta en marcha local

### 1. Preparar las variables

Desde la raíz del repositorio:

```bash
cp .env.example .env
chmod 600 .env
```

Edita `.env` y reemplaza las contraseñas y tokens de ejemplo. Para las contraseñas PostgreSQL, usa valores URL-safe —por ejemplo, generados con `openssl rand -hex 32`— para evitar problemas de escapado en las URLs de conexión. Mantén `OPENCLAW_TOKEN` igual en el backend y en el entorno del Gateway. No subas `.env` al repositorio.

`VITA_DEMO_TOKENS` es un objeto JSON cuya clave es el Bearer token y cuyo valor es el UUID del usuario sembrado. Si cambias los tokens, actualiza también los encabezados de los ejemplos de esta guía. Los valores de `.env.example` solo sirven para desarrollo local.

### 2. Configurar OpenClaw

Combina [`openclaw/config.example.json5`](../openclaw/config.example.json5) con tu configuración existente; reemplaza `/absolute/path/to/Vita` por la ruta absoluta de este repositorio. **No sobrescribas tu `openclaw.json`.** El ejemplo configura el Gateway con bind loopback, autenticación por token, el plugin y tres agentes con permisos limitados.

El harness nativo usa `ollama-cloud/glm-5.2` para `orquestador` y `ollama-cloud/minimax-m3` para `documentos` y `calendario`. El plugin integrado `ollama` conecta directamente a `https://ollama.com` por la API nativa; no requiere `ollama signin`, `ollama serve` ni `ollama pull`. Si migras una configuración anterior de Vita, elimina `models.providers.ollama`. Usa solo datos ficticios en el chat y en el calendario de prueba.

Instala la dependencia TypeBox del plugin. El ejemplo ya carga `vita-tools` desde `plugins.load.paths`:

```bash
npm --prefix openclaw/vita-tools install --no-save --package-lock=false --legacy-peer-deps
```

Guarda `OLLAMA_API_KEY` en el `.env` de Vita. Desde la raíz del repositorio, exporta solo las dos credenciales que necesita el Gateway; OpenClaw no toma automáticamente las claves de proveedor del `.env` del proyecto:

```bash
export OLLAMA_API_KEY="$(node -p 'require("node:util").parseEnv(require("node:fs").readFileSync(".env")).OLLAMA_API_KEY ?? ""')"
export OPENCLAW_TOKEN="$(node -p 'require("node:util").parseEnv(require("node:fs").readFileSync(".env")).OPENCLAW_TOKEN ?? ""')"
export VITA_API_URL='http://127.0.0.1:8000'
```

Arranca el Gateway desde esa terminal. Si usas el perfil separado `vita-demo`, ejecuta `openclaw --profile vita-demo gateway run --port 18789`. Para comprobar el catálogo, usa `openclaw --profile vita-demo models list --provider ollama-cloud`. Si tu configuración ya define `agents.defaults.subagents.model`, quita ese ajuste del Gateway de Vita: tiene prioridad sobre el modelo del agente destino.

Verifica que los agentes tengan cargados sus `AGENTS.md` y que sus herramientas estén restringidas como se indica en el ejemplo:

- `orquestador`: `sessions_spawn`, `sessions_yield` y `vita_report_result`; solo puede delegar en `documentos` o `calendario`. También lista `vita_scan_document` y `vita_read_google_calendar` para que cada hijo pueda heredarlas; sus instrucciones le prohíben llamarlas directamente.
- `documentos`: solo `vita_scan_document`; no puede delegar, acceder a archivos directamente, ejecutar comandos ni usar navegador o mensajería.
- `calendario`: solo `vita_read_google_calendar`; no puede delegar, acceder a tokens, escribir en Calendar, ejecutar comandos, usar navegador ni mensajería.

Para activar Calendar, crea en Google Cloud un cliente OAuth de tipo Web, habilita Google Calendar API y registra como redirect URI autorizada el valor exacto de `GOOGLE_OAUTH_REDIRECT_URI` (por ejemplo, `http://localhost:8000/v1/calendar/oauth/callback` en local). Se solicitan únicamente `openid` y `calendar.events.readonly`; Vita valida `state`, PKCE y el `nonce` del ID token, vincula la cuenta por su `sub` verificado y redirige a una URL limpia tras procesar el código. Configura `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` y `GOOGLE_TOKEN_ENCRYPTION_KEY` en `.env`. Genera una clave Fernet persistente y externa al repositorio; no la rotes mientras existan tokens cifrados ni la compartas con el Gateway. Las cuatro variables deben configurarse juntas; si están vacías, Calendar queda desactivado.

Si el Gateway corre en otro contenedor, no expongas el puerto en la LAN: configura una red privada compartida y restringe el acceso antes de cambiar `OPENCLAW_BASE_URL` y `VITA_API_URL`.

### 3. Arrancar la API y PostgreSQL

Para habilitar el proxy seguro del frontend, copia `frontend/.env.example` a `frontend/.env.local`. Usa un token que esté incluido en `VITA_DEMO_TOKENS` y el UUID del hogar correspondiente; el archivo queda fuera del repositorio.

```bash
docker compose up --build
```

Compose inicializa PostgreSQL, aplica las migraciones y arranca Uvicorn, OpenClaw y Vite. No hace falta ejecutar el Gateway aparte con `npm exec`; el servicio `openclaw` usa el perfil `vita-demo` y el puerto `18790` para evitar chocar con el Gateway local del host en `18789`. La primera compilación descarga OpenClaw y puede tardar varios minutos. El frontend usa el puerto `5174` para evitar chocar con Vite del host en `5173`. Por defecto:

- Frontend: `http://127.0.0.1:5174`
- API: `http://127.0.0.1:8000`
- Gateway OpenClaw: `127.0.0.1:18790` (solo loopback; sin puerto publicado por Docker; configurable con `OPENCLAW_GATEWAY_PORT`)
- PostgreSQL: `127.0.0.1:55432` (solo loopback)
- Health check: `http://127.0.0.1:8000/healthz`
- Documentación interactiva FastAPI: `http://127.0.0.1:8000/docs`

La primera inicialización de PostgreSQL crea roles y hogares ficticios. Cambiar las contraseñas del `.env` no rota las credenciales de un volumen ya inicializado. `docker compose down` conserva los volúmenes; antes de borrar datos, exporta o conserva lo que necesites.

## API de demostración

Las rutas de usuario usan `Authorization: Bearer <token>`. El cliente no puede enviar `userId`: el servidor lo obtiene del token. Los campos JSON usan nombres camelCase. La API oculta ejecuciones ajenas respondiendo `404`, incluso si el usuario pertenece al mismo hogar.

| Método y ruta | Uso |
| --- | --- |
| `GET /healthz` | Comprueba la conexión a PostgreSQL; no requiere autenticación. |
| `POST /v1/chat` | Responde a un mensaje de conversación general con el orquestador; no consulta los datos del hogar. |
| `POST /v1/chat/attachments` | Extrae texto localmente de una imagen JPG/PNG/WebP, PDF, TXT o DOCX; no guarda el archivo. |
| `POST /v1/chat/attachments` | Extrae texto localmente de una imagen, PDF, TXT o DOCX; no guarda el archivo. |
| `POST /v1/runs` | Crea una ejecución y devuelve `202` con `runId`; admite `documentId` opcional. |
| `GET /v1/runs/{run_id}` | Consulta estado y resultado; solo el usuario creador. |
| `POST /v1/documents` | Carga una imagen JPEG/PNG como multipart (`householdId` y `file`). |
| `POST /v1/runs/{run_id}/confirm` | Confirma o corrige la fecha y persiste un recordatorio. |
| `POST /v1/calendar/connect` | Inicia OAuth de solo lectura para el usuario autenticado. |
| `GET /v1/calendar/status` | Informa si el usuario autenticado conectó su cuenta. |
| `DELETE /v1/calendar/connection` | Desconecta y elimina el refresh token cifrado del usuario. |

`GET /v1/calendar/oauth/callback` es el redirect URI configurado en Google. La API valida un `state` de un solo uso asociado al usuario y con vencimiento de 10 minutos, intercambia el código en servidor y redirige a una página limpia. El token no se devuelve al cliente ni se comparte con OpenClaw.

Para consultar eventos, `POST /v1/runs` admite `calendar: {"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD"}`. El rango es inclusivo, máximo 31 días, y se interpreta en la zona horaria del hogar. `calendar` no puede combinarse con `documentId`. El subagente consulta hasta 50 eventos del calendario principal y devuelve título, inicio, fin e indicador de día completo. La API verifica que lo reportado coincida con la respuesta obtenida del proveedor.

Los endpoints `/v1/internal/scan`, `/v1/internal/calendar/read` y `/v1/internal/report-result` son exclusivamente para el plugin. Se autentican con referencias aleatorias de vida limitada, no con tokens de usuario, y no forman parte del contrato para clientes.

Los mensajes de `POST /v1/chat`, el texto extraído de los adjuntos y el contexto de esa conversación se procesan con Ollama Cloud. Para una pregunta sobre el hogar, el frontend añade como máximo 20 datos breves que su propia respuesta local ya filtró por permisos; no envía las fichas completas, identificadores internos ni archivos originales. Los adjuntos se leen en memoria o en un directorio temporal protegido y no se guardan. Se admiten hasta 3 archivos de 10 MiB cada uno; se extraen como máximo las primeras 10 páginas PDF con texto o 3 páginas escaneadas. El chat no puede llamar herramientas ni escribir datos. OpenClaw puede conservar la conversación según la retención configurada localmente. Esta API y el Gateway son solo para la demo local: Pages no conecta con ellos y no se deben publicar.

### Conectar una cuenta y consultar Google Calendar

Solicita la URL de autorización con el token del usuario, ábrela en un navegador y completa el consentimiento de Google:

```bash
curl -X POST http://127.0.0.1:8000/v1/calendar/connect \
  -H 'Authorization: Bearer alba-demo-token-change-me'
```

Después de conectar la cuenta, crea una ejecución con un rango explícito de hasta 31 días:

```bash
curl -i http://127.0.0.1:8000/v1/runs \
  -H 'Authorization: Bearer alba-demo-token-change-me' \
  -H 'Content-Type: application/json' \
  -d '{
    "householdId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "message": "Resume mis eventos próximos",
    "calendar": {"startDate": "2027-03-28", "endDate": "2027-04-03"}
  }'
```

Para revocar la conexión:

```bash
curl -X DELETE http://127.0.0.1:8000/v1/calendar/connection \
  -H 'Authorization: Bearer alba-demo-token-change-me'
```

## Hito 1: delegación y resultado estructurado

Los hogares y usuarios ficticios se insertan en la migración inicial:

| Usuario | Token de ejemplo en `.env.example` | Hogar |
| --- | --- | --- |
| Alba | `alba-demo-token-change-me` | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` |
| Bruno | `bruno-demo-token-change-me` | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` |
| Carla | `carla-demo-token-change-me` | `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb` |

Alba y Bruno comparten hogar, pero cada uno solo puede consultar sus propias ejecuciones y documentos. Carla pertenece a otro hogar. Estos tokens no son credenciales de producción.

Crea una ejecución sin documento:

```bash
curl -i http://127.0.0.1:8000/v1/runs \
  -H 'Authorization: Bearer alba-demo-token-change-me' \
  -H 'Content-Type: application/json' \
  -d '{
    "householdId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "message": "Analiza la muestra ficticia de caducidad"
  }'
```

La respuesta `202` incluye un `runId`. Consulta esa ejecución hasta que llegue a un estado terminal:

```bash
curl http://127.0.0.1:8000/v1/runs/RUN_ID \
  -H 'Authorization: Bearer alba-demo-token-change-me'
```

Los estados son `queued`, `running`, `completed`, `failed` y `timed_out`. En el modo simulado, el subagente devuelve `2030-12-31`. Para comprobar ramas controladas, añade al mensaje `[demo:missing]`, `[demo:ambiguous]` o `[demo:failure]`. Estos marcadores solo afectan al flujo simulado sin documento; con un documento adjunto se utiliza el resultado del escaneo.

Prueba el aislamiento repitiendo el `GET` con el token de Bruno o Carla: la ejecución de Alba debe responder `404`.

## Hito 2: imagen, OCR y confirmación

### Generar y cargar una imagen ficticia

El script genera `vita-demo-document.png` en el directorio actual. La imagen está marcada como prueba y no contiene datos personales:

```bash
python scripts/make_demo_sample.py
```

Sube el archivo. El backend valida el MIME real, que se pueda decodificar y que respete los límites configurados antes de guardarlo en el volumen privado:

```bash
curl -i http://127.0.0.1:8000/v1/documents \
  -H 'Authorization: Bearer alba-demo-token-change-me' \
  -F 'householdId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' \
  -F 'file=@vita-demo-document.png;type=image/png'
```

Guarda el `documentId` de la respuesta y úsalo para crear una ejecución:

```bash
curl -i http://127.0.0.1:8000/v1/runs \
  -H 'Authorization: Bearer alba-demo-token-change-me' \
  -H 'Content-Type: application/json' \
  -d '{
    "householdId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "documentId": "DOCUMENT_ID",
    "message": "Escanea el documento y propón su fecha de caducidad"
  }'
```

El orquestador delega en `documentos`; el plugin pide al backend escanear el archivo con Tesseract local. Solo el estado y una fecha candidata vuelven al agente. El OCR bruto no se guarda ni se envía al modelo. El resultado puede ser `date_found`, `date_missing` o `date_ambiguous`.

### Confirmar la fecha y guardar el recordatorio

Consulta el `runId` hasta que tenga estado `completed`. La fecha del resultado es una propuesta: el usuario puede confirmarla o corregirla. Si no se encontró una fecha o el resultado es ambiguo, también puede introducirla manualmente.

```bash
curl -i http://127.0.0.1:8000/v1/runs/RUN_ID/confirm \
  -H 'Authorization: Bearer alba-demo-token-change-me' \
  -H 'Content-Type: application/json' \
  -d '{"expiresOn":"2030-12-31","daysBefore":30}'
```

La respuesta incluye `reminderId` y `scheduledAt`. El aviso se calcula para las 09:00 de la zona horaria del hogar (`Europe/Madrid` en los hogares de demo), 30 días naturales antes por defecto. Si la hora calculada ya pasó, la API rechaza la confirmación. Repetir la misma confirmación devuelve el recordatorio existente; cambiar la fecha o el plazo para esa ejecución devuelve `409`.

**El recordatorio queda guardado, no enviado.** Este proyecto no incluye un worker de notificaciones.

## Seguridad y privacidad de la demo

- Mantén la API y el Gateway en loopback o en una red privada. El token del Gateway es una credencial de operador y no debe compartirse con clientes.
- Los tokens de usuario son una simplificación local; no hay registro ni gestión de contraseñas. El OAuth de esta demo se usa solo para conectar Google Calendar.
- La API comprueba membresía al hogar y propiedad del documento. Los documentos y ejecuciones no se comparten automáticamente con otros miembros del hogar.
- Cada ejecución usa referencias aleatorias, específicas y con vencimiento. En PostgreSQL se guardan sus hashes, no las referencias en claro.
- Los resultados se validan con esquemas estrictos. Una respuesta textual de OpenClaw no completa una ejecución.
- Las imágenes se validan y guardan en un volumen privado. El texto OCR bruto no se persiste ni se manda a OpenClaw; los logs de la API tampoco deben contener imágenes, mensajes, referencias ni tokens.
- OpenClaw conserva sus sesiones según la política de retención configurada localmente. Revisa esa configuración antes de cualquier uso con datos reales.
- No uses documentos de identidad reales para la demo. Antes de un piloto real harían falta, entre otras cosas, autenticación adecuada, aislamiento de usuarios y Gateway, cifrado, borrado y retención definidos, y una vía fiable para procesar trabajos y entregar avisos.

## Límites operativos y fuera de alcance

- La API está diseñada para **una sola instancia/proceso**. Usa un dispatcher en memoria con un grupo acotado de hilos, no una cola persistente.
- Al reiniciar la API, las ejecuciones que sigan en `queued` o `running` se marcan `failed` con `interrupted`; no se reanudan ni se vuelven a delegar automáticamente.
- Una ejecución se considera completada únicamente al recibir un resultado estructurado válido antes de su plazo. Informes duplicados o tardíos no reabren un estado final.
- No hay envío de avisos, sistema de registro ni integración con documentos reales.
- El Gateway y la API no son una frontera de seguridad adecuada para hogares mutuamente no confiables sin aislamiento adicional.

## Pruebas

Desde la raíz del repositorio, crea y activa un entorno virtual con Python 3.11 o superior. En Linux puede usarse `python3` para crear el entorno; los comandos siguientes usan el `python` del entorno ya activado. Ejecuta las pruebas de frontend desde `frontend/` con pnpm, según su README:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
python -m pytest
```

La suite automatizada de `tests/backend/` prueba imágenes, fechas OCR, cliente OpenClaw, autenticación, esquemas, OAuth y consultas Calendar normalizadas. Las pruebas de integración que necesitan servicios externos se omiten si no se configura su base de datos de prueba. Para recorrer la demo completa hacen falta PostgreSQL, Tesseract y un Gateway privado con el plugin habilitado.

## Configuración de OpenClaw y variables

El archivo [`openclaw/config.example.json5`](../openclaw/config.example.json5) contiene el ejemplo de configuración del Gateway, los agentes y los permisos del plugin. El contrato de trabajo y las decisiones de arquitectura están ampliados en [`vita-backend.md`](../vita-backend.md).

Las variables principales de `.env` son:

| Variable | Propósito |
| --- | --- |
| `POSTGRES_DB` | Base de datos de la demo; por defecto `vita`. |
| `POSTGRES_PASSWORD` | Contraseña del superusuario de inicialización de PostgreSQL. |
| `VITA_API_PASSWORD` | Credencial PostgreSQL de la API, con permisos limitados. |
| `VITA_MIGRATOR_PASSWORD` | Credencial separada usada para aplicar migraciones. |
| `VITA_DEMO_TOKENS` | Objeto JSON de tokens Bearer a UUID de usuario. |
| `OPENCLAW_BASE_URL` | URL HTTP(S) privada del Gateway; en Compose usa `http://127.0.0.1:18790/v1` por defecto. |
| `OPENCLAW_TOKEN` | Token compartido con el Gateway privado. |
| `OPENCLAW_AGENT_ID` | Agente inicial; por defecto `orquestador`. |
| `OPENCLAW_TIMEOUT_SECONDS` | Límite de tiempo de la ejecución; por defecto 120 segundos. |
| `GOOGLE_OAUTH_CLIENT_ID` | Client ID OAuth Web de Google; vacío desactiva Calendar. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Client secret OAuth, privado para Vita. |
| `GOOGLE_OAUTH_REDIRECT_URI` | URL callback OAuth autorizada en Google Cloud. |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Clave Fernet externa al repo que cifra refresh tokens en PostgreSQL. |
| `VITA_MAX_UPLOAD_BYTES` | Máximo de bytes por imagen; por defecto 10 MiB. |
| `VITA_MAX_IMAGE_DIMENSION` | Máximo por lado; por defecto 8000 píxeles. |
| `VITA_MAX_IMAGE_PIXELS` | Máximo de píxeles totales; por defecto 20 millones. |
| `VITA_STORAGE_DIR` | Directorio privado de imágenes; en Compose se monta en `/data/private`. |
| `POSTGRES_PORT` | Puerto local publicado por Compose; por defecto `55432`. |

Compose construye `DATABASE_URL` y `MIGRATION_DATABASE_URL` a partir de las contraseñas y la configuración de PostgreSQL. Los secretos deben ser distintos y los valores de ejemplo deben sustituirse antes de iniciar servicios accesibles por otras personas.
