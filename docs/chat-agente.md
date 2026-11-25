# Vita conectada

El navegador resuelve primero las consultas que entiende. Solo consulta el servidor si el motor local no reconoce la frase, el equipo tiene servidor configurado y está activo «Vita conectada» en Ajustes. El ajuste viene apagado.

## Petición

El navegador hace un `POST /api/v1/chat` con JSON y la cabecera `x-vita: 1`. El proxy de desarrollo acepta la ruta exacta desde el propio equipo, comprueba la procedencia, elimina las cookies, añade el token de servidor y quita el prefijo `/api`. El backend recibe `POST /v1/chat` con `Authorization: Bearer …`. El navegador no conoce el token. En la web estática publicada este servicio está desactivado.

| Campo | Contenido |
|---|---|
| `message` | Texto escrito por la persona, entre 1 y 500 caracteres. Puede contener datos personales si los escribe. |
| `today`, `timeZone` | Fecha local en formato AAAA-MM-DD y zona IANA del dispositivo. Sirven para interpretar «mañana». |
| `actor`, `members` | Perfil activo y lista de perfiles. Cada uno contiene exclusivamente `id` y `name`. |
| `origin` | Identificador de la habitación accesible desde la que se abrió Vita, `calendar` o `null`. |
| `history` | Hasta seis intercambios anteriores atendidos por el servidor, del más antiguo al más reciente. Cada uno contiene `message` y `reply` como cadenas. Se excluyen las tarjetas, los fallos y todos los turnos locales. |

El navegador no adjunta registros, saldos, fichas de salud, citas de la agenda, documentos, fotos ni datos de emergencia. El contrato tampoco incluye permisos ni credenciales del hogar. El backend debe identificar el hogar por la configuración autenticada. Los identificadores que manda el navegador sirven para preparar propuestas.

## Respuesta

Un éxito devuelve HTTP 200 y JSON con una única clave `reply`. Se aceptan estas dos formas.

```json
{"reply":{"kind":"text","text":"¿Para qué día quieres la tarea?"}}
```

```json
{"reply":{"kind":"proposals","text":"Revisa la tarea antes de guardarla.","proposals":[{"typeId":"task","data":{"title":"Preparar la mochila","dueDate":"2026-11-26"}}]}}
```

El texto debe tener entre 1 y 2000 caracteres y ser texto plano. En una respuesta con propuestas se admiten de 1 a 20. Los únicos tipos son `task`, `event`, `appointment`, `dentalVisit`, `shoppingList` y `shoppingItem`. El objeto `data` debe cumplir el esquema completo del tipo en el registro de módulos del frontend. Si falta un campo obligatorio o se desconoce una referencia, el agente puede preguntar con una respuesta de texto. Una propuesta inválida descarta la respuesta entera. Vita usa la tarjeta habitual para revisar, cambiar o guardar. El repositorio local aplica los permisos al guardar.

## Errores y ejecución del agente

El navegador espera hasta 20 segundos, incluida la lectura del cuerpo. Un error de red, un estado HTTP de error, un JSON ilegible o una respuesta inválida recuperan la ayuda del motor local con el aviso «No he podido consultar al asistente del servidor». No hay reintento automático. Cerrar el panel o borrar la conversación cancela la espera.

Para la integración de Pedro, el backend puede delegar en el mecanismo de ejecuciones de `/v1/runs` y pedir al agente «agenda» de OpenClaw que devuelva texto o propuestas. Esa coordinación queda dentro del backend. El navegador espera la respuesta final en la misma petición. Conviene cancelar la ejecución al desconectar y devolver 504 si se agota el plazo, 400 para una petición inválida, 401 o 403 para un problema de acceso y 502 si falla el agente. Validar también el resultado en el backend. El agente solo necesita proponer, sin acceso de escritura ni herramientas que ejecuten acciones del hogar. Evitar registrar cuerpos de conversación y tokens.

## Probar con el servidor de demostración

Desde la raíz, ejecuta `node tools/chat-mock.mjs`. Escucha en el puerto 8787 de este equipo. Todas sus respuestas de chat llevan «Respuesta de prueba». Este ejemplo llama directamente al servidor de demostración.

```sh
curl -X POST http://127.0.0.1:8787/v1/chat \
  -H 'Authorization: Bearer demo-local' -H 'Content-Type: application/json' \
  -d '{"message":"Organiza mi día","today":"2026-11-25","timeZone":"Europe/Madrid","actor":{"id":"ana","name":"Ana"},"members":[{"id":"ana","name":"Ana"}],"origin":"calendar","history":[]}'
```

Para probar desde la interfaz, arranca Vite desde `frontend/` con la configuración de demostración.

```sh
VITA_API_URL=http://127.0.0.1:8787 VITA_API_TOKEN=demo-local VITA_HOUSEHOLD_ID=11111111-1111-4111-8111-111111111111 pnpm dev
```

Activa «Vita conectada» en Ajustes con un perfil admin. «Organiza mi día» muestra una tarea de prueba. «Dame una idea» muestra texto de prueba. «¿Qué tengo hoy?» sigue consultando la agenda en el dispositivo. Para ensayar el fallo de conexión, detén el servidor de demostración y vuelve a escribir «Dame una idea».
