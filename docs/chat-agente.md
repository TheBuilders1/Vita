# Vita conectada

Con un servidor del hogar configurado, el chat de Vita habla a través del orquestador de OpenClaw. El ajuste «Vita conectada» viene activado y se puede apagar en Ajustes. Sin servidor (por ejemplo, en GitHub Pages) o con el ajuste apagado, contestan las reglas del navegador.

## Qué se resuelve en el dispositivo y qué va al orquestador

| Mensaje | Quién contesta | Qué sale del dispositivo |
|---|---|---|
| Apuntar algo (citas, tareas, compra), marcar como hecho, emergencias | El navegador. Nada se guarda hasta que la persona lo confirma en la tarjeta. | Nada |
| Saludo, «¿qué puedes hacer?» o algo que las reglas no entienden | El orquestador | El mensaje |
| Consultas del hogar («¿cuándo caduca mi DNI?», «¿qué tengo hoy?») | El orquestador redacta la respuesta. El navegador muestra además la ficha o la agenda. | El mensaje y solo los datos que mostraría la respuesta, como máximo 20 |
| Pregunta con archivos adjuntos | El orquestador | El mensaje y el texto extraído de los archivos. El archivo se lee en el servidor del hogar y no se guarda. |

Al saludar, el orquestador contesta exactamente «¡Hola! Soy Vita, tu asistente personal. ¿En qué puedo ayudarte?». Si después le preguntan qué puede hacer, explica las funciones de Vita sin ofrecer otras. Sin servidor, el navegador saluda con la misma frase.

## Petición

El navegador hace `POST /api/v1/chat` con la cabecera `x-vita: 1`. El proxy de Vite admite solo las rutas previstas y solo desde este equipo, añade el token y quita el prefijo `/api`. El navegador no conoce el token.

| Campo | Contenido |
|---|---|
| `message` | Lo que escribe la persona, de 1 a 500 caracteres |
| `conversationId` | 32 caracteres hexadecimales. Cambia al empezar de nuevo o al cambiar de perfil. OpenClaw guarda el hilo con este identificador. |
| `context` | Hasta 20 datos visibles `{title, detail}` |
| `attachments` | Hasta 3 textos `{text}`, extraídos antes con `POST /api/v1/chat/attachments` |

La respuesta es `{"message": "…"}`. El navegador espera hasta 20 segundos. Si el servidor falla o tarda, se queda la respuesta local y, si no la hay, se dice qué ha fallado.

## Probar sin OpenClaw

Desde la raíz, ejecuta `node tools/chat-mock.mjs`. Imita el contrato del backend en el puerto 8787. Sus respuestas llevan «Respuesta de prueba», salvo el saludo, que es el mismo que el del orquestador.

```sh
curl -X POST http://127.0.0.1:8787/v1/chat \
  -H 'Authorization: Bearer demo-local' -H 'Content-Type: application/json' \
  -d '{"message":"Hola","conversationId":"0123456789abcdef0123456789abcdef","context":[],"attachments":[]}'
```

Para probarlo desde la interfaz, arranca Vite desde `frontend/`:

```sh
VITA_API_URL=http://127.0.0.1:8787 VITA_API_TOKEN=demo-local VITA_HOUSEHOLD_ID=11111111-1111-4111-8111-111111111111 pnpm dev
```
