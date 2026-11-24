import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

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

const reportOutcome = Type.Union([
  dateOutcome,
  Type.Object(
    {
      status: Type.Literal("failed"),
      errorCode: Type.Literal("document_agent_failed"),
    },
    { additionalProperties: false },
  ),
]);

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
  },
});
