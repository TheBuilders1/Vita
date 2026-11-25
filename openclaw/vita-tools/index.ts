import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { analyzeChatImages } from "./vision.mjs";

const dateOutcome = Type.Union([
  Type.Object(
    {
      status: Type.Literal("date_found"),
      expiresOn: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    { status: Type.Literal("date_missing") },
    { additionalProperties: false },
  ),
  Type.Object(
    { status: Type.Literal("date_ambiguous") },
    { additionalProperties: false },
  ),
]);

const calendarEventsOutcome = Type.Object(
  {
    status: Type.Literal("calendar_events"),
    events: Type.Array(
      Type.Object(
        {
          summary: Type.String({ minLength: 1, maxLength: 250 }),
          start: Type.String({ minLength: 10, maxLength: 35 }),
          end: Type.String({ minLength: 10, maxLength: 35 }),
          allDay: Type.Boolean(),
        },
        { additionalProperties: false },
      ),
      { maxItems: 50 },
    ),
    timeZone: Type.String({ minLength: 1, maxLength: 64 }),
    startDate: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
    endDate: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
    truncated: Type.Boolean(),
  },
  { additionalProperties: false },
);

const reportOutcome = Type.Union([
  dateOutcome,
  calendarEventsOutcome,
  Type.Object(
    {
      status: Type.Literal("failed"),
      errorCode: Type.Union([
        Type.Literal("document_agent_failed"),
        Type.Literal("calendar_agent_failed"),
        Type.Literal("agent_failed"),
      ]),
    },
    { additionalProperties: false },
  ),
]);

const visionAnalysis = Type.Object(
  { text: Type.String({ minLength: 1, maxLength: 6000 }) },
  { additionalProperties: false },
);

async function callVita(
  path: string,
  reference: string,
  body?: unknown,
): Promise<any> {
  const base = process.env.VITA_API_URL;
  if (!base) {
    throw new Error("VITA_API_URL is not configured");
  }

  const parsedBase = new URL(base);
  if (parsedBase.protocol !== "http:" && parsedBase.protocol !== "https:") {
    throw new Error("VITA_API_URL must use HTTP or HTTPS");
  }

  const response = await fetch(new URL(path, parsedBase.origin), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${reference}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error("Vita rejected the internal operation");
  }
  return response.json();
}

export default definePluginEntry({
  id: "vita-tools",
  name: "Vita tools",
  description: "Herramientas internas y acotadas para el backend Vita",
  register(api) {
    api.registerTool({
      name: "vita_scan_document",
      description:
        "Ejecuta OCR local sobre el documento de esta ejecución. Devuelve solo el estado y una posible fecha de caducidad.",
      parameters: Type.Object(
        { scanRef: Type.String({ minLength: 32, maxLength: 128 }) },
        { additionalProperties: false },
      ),
      outputSchema: dateOutcome,
      async execute(_id, params) {
        const result = await callVita("v1/internal/scan", params.scanRef);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          details: result,
        };
      },
    });

    api.registerTool({
      name: "vita_read_google_calendar",
      description:
        "Lee eventos de la cuenta Google conectada para el rango aprobado. Requiere calendarRef opaca; nunca recibe ni devuelve credenciales OAuth. Los instantes start/end están en UTC; interpreta fechas y horas del hogar usando timeZone.",
      parameters: Type.Object(
        { calendarRef: Type.String({ minLength: 32, maxLength: 128 }) },
        { additionalProperties: false },
      ),
      outputSchema: calendarEventsOutcome,
      async execute(_id, params) {
        const result = await callVita(
          "v1/internal/calendar/read",
          params.calendarRef,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          details: result,
        };
      },
    });

    api.registerTool({
      name: "vita_report_result",
      description:
        "Envía al backend Vita el resultado estructurado de esta ejecución. Solo acepta el resultado vinculado a la referencia recibida.",
      parameters: Type.Object(
        {
          reportRef: Type.String({ minLength: 32, maxLength: 128 }),
          outcome: reportOutcome,
        },
        { additionalProperties: false },
      ),
      outputSchema: Type.Object(
        { accepted: Type.Boolean() },
        { additionalProperties: false },
      ),
      async execute(_id, params) {
        const result = await callVita(
          "v1/internal/report-result",
          params.reportRef,
          params.outcome,
        );
        return {
          content: [
            {
              type: "text",
              text: result.accepted ? "Resultado registrado" : "Resultado no registrado",
            },
          ],
          details: result,
        };
      },
    });

    api.registerTool({
      name: "vita_analyze_chat_images",
      description:
        "Analiza imágenes que el usuario autorizó expresamente y que Vita conserva temporalmente en memoria. Envía solo imagen y pregunta a glm-5.3-flash en Ollama Cloud; nunca devuelve ni registra píxeles.",
      parameters: Type.Object(
        {
          visionRefs: Type.Array(
            Type.String({ minLength: 43, maxLength: 43, pattern: "^[A-Za-z0-9_-]{43}$" }),
            { minItems: 1, maxItems: 3 },
          ),
          question: Type.String({ minLength: 1, maxLength: 500 }),
        },
        { additionalProperties: false },
      ),
      outputSchema: visionAnalysis,
      async execute(_id, params) {
        const text = await analyzeChatImages({
          visionRefs: params.visionRefs,
          question: params.question,
          vitaApiUrl: process.env.VITA_API_URL,
        });
        return {
          content: [{ type: "text", text }],
          details: { text },
        };
      },
    });
  },
});
