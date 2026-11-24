# Vita

Backend de demostración para un asistente personal por hogar. El proyecto enseña dos flujos: delegar una tarea a agentes de OpenClaw y analizar una imagen privada con OCR local para proponer una fecha de caducidad. El usuario debe confirmar la fecha antes de que Vita persista un recordatorio.

Está pensado para una demo local del hackathon, ejecutada desde `curl`; no tiene frontend, calendario integrado ni entrega de notificaciones. Todas las personas, imágenes y fechas de ejemplo son ficticias. **No uses documentos reales ni publiques la API o el Gateway de OpenClaw.**

## Funcionalidad

- Autenticación local mediante tokens de demostración asociados a usuarios sembrados.
- Comprobación de pertenencia al hogar y propiedad de ejecuciones y documentos.
- Ejecuciones asíncronas de Vita hacia un Gateway privado de OpenClaw, con resultado estructurado y validado.
- Carga privada de imágenes JPEG/PNG con límites de tamaño, dimensiones y decodificación.
- OCR local con Tesseract; se extrae únicamente una fecha vinculada a una etiqueta de caducidad.
- Confirmación o corrección explícita de la fecha antes de crear un recordatorio persistido en PostgreSQL.
- Pruebas unitarias para validación, OCR, cliente OpenClaw, esquemas y cálculo horario.

## Arquitectura

```text
Cliente (curl)
  └─ FastAPI: autentica, autoriza, valida y persiste
       ├─ PostgreSQL: hogares, ejecuciones, documentos y recordatorios
       ├─ Volumen privado: archivos de imagen
       └─ Gateway OpenClaw privado
            └─ orquestador ──delegación──> documentos
                 ├─ vita_scan_document ──> API interna ──> Tesseract local
                 └─ vita_report_result ──> API interna ──> resultado validado
```

OpenClaw se encarga de interpretar y delegar. No accede directamente a PostgreSQL ni al volumen de imágenes. La API es la autoridad para permisos, resultados, estados y escrituras; el texto final de un agente no se considera prueba de que una operación haya terminado.

### Componentes

| Ubicación | Responsabilidad |
| --- | --- |
| `app/main.py` | Rutas HTTP, autorización, carga de imágenes, confirmación e integración de endpoints internos. |
| `app/worker.py` | Despacho de ejecuciones, espera del resultado y transiciones de estado. |
| `app/openclaw.py` | Cliente HTTP del Gateway OpenClaw. |
| `app/security.py` | Lectura de Bearer tokens y asociación servidor-token-usuario. |
| `app/images.py` | Verificación del contenido, MIME, tamaño y dimensiones de imágenes. |
| `app/ocr.py` | Ejecución de Tesseract y selección conservadora de fechas de caducidad. |
| `app/reminders.py` | Cálculo de la hora local del recordatorio, con zona horaria IANA. |
| `app/schemas.py` | Validación estricta de peticiones, resultados y respuestas con Pydantic. |
| `app/database.py`, `app/migrate.py` | Conexión PostgreSQL, recuperación de ejecuciones interrumpidas y migraciones SQL. |
| `migrations/` | Esquema relacional y datos ficticios iniciales. |
| `openclaw/agents/` | Instrucciones y restricciones de los agentes `orquestador` y `documentos`. |
| `openclaw/vita-tools/` | Plugin local que expone `vita_scan_document` y `vita_report_result`. |
| `tests/` | Pruebas unitarias de los módulos principales. |

### Datos

PostgreSQL usa una sola instancia y dos esquemas con propietarios separados:

- `gestion`: `users`, `households` y `memberships`.
- `producto`: `runs`, `documents` y `reminders`.

Las tablas de producto relacionan los datos con un hogar y su propietario. Los metadatos de imágenes quedan en PostgreSQL; el archivo se guarda bajo una clave aleatoria en el volumen privado. No se almacena el texto OCR bruto. La fecha detectada se conserva como propuesta y solo pasa a confirmada cuando el usuario confirma.

## Requisitos

- Linux para el `compose.yaml` incluido, que usa `network_mode: host` para permitir que la API en contenedor alcance un Gateway que escucha en el loopback del host.
- Docker Engine y Docker Compose.
- OpenClaw `2026.11.8` con Gateway HTTP privado y un modelo que soporte llamadas a herramientas. La versión está fijada porque el plugin usa la API experimental de OpenClaw.
- Node.js `24.22.1` o superior para el runtime del plugin.
- Para ejecutar las pruebas fuera de Docker: Python `3.10` o superior. La imagen Docker del proyecto usa Python `3.12`.

El Dockerfile instala Tesseract y los datos de idioma español. En Docker Desktop, la configuración de red incluida no es directamente equivalente: ejecuta la API en el host o configura una red privada y un bind restringido antes de cambiar las URLs.

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

Combina [`openclaw/config.example.json5`](openclaw/config.example.json5) con tu configuración existente; reemplaza `/absolute/path/to/Vita` por la ruta absoluta de este repositorio. **No sobrescribas tu `openclaw.json`.** El ejemplo configura el Gateway con bind loopback, autenticación por token, el plugin y dos agentes con permisos limitados.

Instala y comprueba el plugin desde la raíz del repositorio:

```bash
openclaw plugins install --link "$PWD/openclaw/vita-tools"
openclaw plugins enable vita-tools
openclaw plugins inspect vita-tools --runtime --json
```

El proceso del Gateway debe tener disponibles estas variables y reiniciarse después de modificar su configuración:

```bash
export OPENCLAW_TOKEN='el-mismo-token-configurado-en-.env'
export VITA_API_URL='http://127.0.0.1:8000'
```

Verifica que los agentes tengan cargados sus `AGENTS.md` y que sus herramientas estén restringidas como se indica en el ejemplo:

- `orquestador`: `sessions_spawn`, `sessions_yield` y `vita_report_result`; solo puede delegar en `documentos`.
- `documentos`: solo `vita_scan_document`; no puede delegar, acceder a archivos directamente, ejecutar comandos ni usar navegador o mensajería.

Si el Gateway corre en otro contenedor, no expongas el puerto en la LAN: configura una red privada compartida y restringe el acceso antes de cambiar `OPENCLAW_BASE_URL` y `VITA_API_URL`.

### 3. Arrancar la API y PostgreSQL

```bash
docker compose up --build
```

Compose inicializa PostgreSQL, aplica las migraciones y arranca Uvicorn. Por defecto:

- API: `http://127.0.0.1:8000`
- PostgreSQL: `127.0.0.1:55432` (solo loopback)
- Health check: `http://127.0.0.1:8000/healthz`
- Documentación interactiva FastAPI: `http://127.0.0.1:8000/docs`

La primera inicialización de PostgreSQL crea roles y hogares ficticios. Cambiar las contraseñas del `.env` no rota las credenciales de un volumen ya inicializado. `docker compose down` conserva los volúmenes; antes de borrar datos, exporta o conserva lo que necesites.

## API de demostración

Las rutas de usuario usan `Authorization: Bearer <token>`. El cliente no puede enviar `userId`: el servidor lo obtiene del token. Los campos JSON usan nombres camelCase. La API oculta ejecuciones ajenas respondiendo `404`, incluso si el usuario pertenece al mismo hogar.

| Método y ruta | Uso |
| --- | --- |
| `GET /healthz` | Comprueba la conexión a PostgreSQL; no requiere autenticación. |
| `POST /v1/runs` | Crea una ejecución y devuelve `202` con `runId`; admite `documentId` opcional. |
| `GET /v1/runs/{run_id}` | Consulta estado y resultado; solo el usuario creador. |
| `POST /v1/documents` | Carga una imagen JPEG/PNG como multipart (`householdId` y `file`). |
| `POST /v1/runs/{run_id}/confirm` | Confirma o corrige la fecha y persiste un recordatorio. |

Los endpoints `/v1/internal/scan` y `/v1/internal/report-result` son exclusivamente para el plugin. Se autentican con referencias aleatorias de vida limitada, no con tokens de usuario, y no forman parte del contrato para clientes.

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

**El recordatorio queda guardado, no enviado.** Este proyecto no incluye un worker de notificaciones ni una integración de calendario.

## Seguridad y privacidad de la demo

- Mantén la API y el Gateway en loopback o en una red privada. El token del Gateway es una credencial de operador y no debe compartirse con clientes.
- Los tokens de usuario son una simplificación local; no hay registro, OAuth ni gestión de contraseñas.
- La API comprueba membresía al hogar y propiedad del documento. Los documentos y ejecuciones no se comparten automáticamente con otros miembros del hogar.
- Cada ejecución usa referencias aleatorias, específicas y con vencimiento. En PostgreSQL se guardan sus hashes, no las referencias en claro.
- Los resultados se validan con esquemas estrictos. Una respuesta textual de OpenClaw no completa una ejecución.
- Las imágenes se validan y guardan en un volumen privado. El texto OCR bruto no se persiste ni se manda a OpenClaw; los logs de la API tampoco deben contener imágenes, mensajes, referencias ni tokens.
- OpenClaw conserva sus sesiones según la política de retención configurada localmente. Revisa esa configuración antes de cualquier uso con datos reales.
- No uses documentos de identidad reales para la demo. Antes de un piloto real harían falta, entre otras cosas, autenticación adecuada, aislamiento de usuarios y Gateway, cifrado, borrado y retención definidos, y una vía fiable para procesar trabajos y entregar avisos.

## Límites operativos y fuera de alcance

- La API está diseñada para **una sola instancia/proceso**. Usa tareas en segundo plano dentro del proceso, no una cola persistente.
- Al reiniciar la API, las ejecuciones que sigan en `queued` o `running` se marcan `failed` con `interrupted`; no se reanudan ni se vuelven a delegar automáticamente.
- Una ejecución se considera completada únicamente al recibir un resultado estructurado válido antes de su plazo. Informes duplicados o tardíos no reabren un estado final.
- No hay frontend, calendario real, envío de avisos, sistema de registro ni integración con documentos reales.
- El Gateway y la API no son una frontera de seguridad adecuada para hogares mutuamente no confiables sin aislamiento adicional.

## Pruebas

Instala el paquete y las dependencias de desarrollo en un entorno virtual con Python 3.10 o superior:

```bash
python -m pip install -e '.[dev]'
python -m pytest
```

La suite automatizada actual prueba validación de imágenes, selección conservadora de fechas OCR, manejo del cliente OpenClaw, autenticación/esquemas y cálculo horario del recordatorio. No levanta PostgreSQL ni OpenClaw. Para recorrer la demo completa manualmente hacen falta PostgreSQL, Tesseract y un Gateway privado con el plugin habilitado.

## Configuración de OpenClaw y variables

El archivo [`openclaw/config.example.json5`](openclaw/config.example.json5) contiene el ejemplo de configuración del Gateway, los agentes y los permisos del plugin. El contrato de trabajo y las decisiones de arquitectura están ampliados en [`vita-backend.md`](vita-backend.md).

Las variables principales de `.env` son:

| Variable | Propósito |
| --- | --- |
| `POSTGRES_DB` | Base de datos de la demo; por defecto `vita`. |
| `POSTGRES_PASSWORD` | Contraseña del superusuario de inicialización de PostgreSQL. |
| `VITA_API_PASSWORD` | Credencial PostgreSQL de la API, con permisos limitados. |
| `VITA_MIGRATOR_PASSWORD` | Credencial separada usada para aplicar migraciones. |
| `VITA_DEMO_TOKENS` | Objeto JSON de tokens Bearer a UUID de usuario. |
| `OPENCLAW_BASE_URL` | URL HTTP(S) privada del Gateway, por defecto `http://127.0.0.1:18789/v1`. |
| `OPENCLAW_TOKEN` | Token compartido con el Gateway privado. |
| `OPENCLAW_AGENT_ID` | Agente inicial; por defecto `orquestador`. |
| `OPENCLAW_TIMEOUT_SECONDS` | Límite de tiempo de la ejecución; por defecto 120 segundos. |
| `VITA_MAX_UPLOAD_BYTES` | Máximo de bytes por imagen; por defecto 10 MiB. |
| `VITA_MAX_IMAGE_DIMENSION` | Máximo por lado; por defecto 8000 píxeles. |
| `VITA_MAX_IMAGE_PIXELS` | Máximo de píxeles totales; por defecto 20 millones. |
| `VITA_STORAGE_DIR` | Directorio privado de imágenes; en Compose se monta en `/data/private`. |
| `POSTGRES_PORT` | Puerto local publicado por Compose; por defecto `55432`. |

Compose construye `DATABASE_URL` y `MIGRATION_DATABASE_URL` a partir de las contraseñas y la configuración de PostgreSQL. Los secretos deben ser distintos y los valores de ejemplo deben sustituirse antes de iniciar servicios accesibles por otras personas.
