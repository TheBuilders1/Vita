import { readFileSync, writeFileSync } from "node:fs";

const VITA_AGENT_IDS = ["vita-vision-orquestador", "vita-vision"];

export function mergeVitaConfig(config, defaults) {
  config.models ??= {};
  config.models.providers ??= {};
  const provider = config.models.providers["ollama-cloud"];
  const defaultProvider = defaults.models?.providers?.["ollama-cloud"];
  if (!provider) {
    config.models.providers["ollama-cloud"] = structuredClone(defaultProvider);
  } else {
    provider.models ??= [];
    for (const model of defaultProvider?.models ?? []) {
      if (!provider.models.some((current) => current.id === model.id)) {
        provider.models.push(structuredClone(model));
      }
    }
  }

  config.agents ??= {};
  config.agents.entries ??= {};
  for (const agentId of VITA_AGENT_IDS) {
    if (!config.agents.entries[agentId] && defaults.agents?.entries?.[agentId]) {
      config.agents.entries[agentId] = structuredClone(defaults.agents.entries[agentId]);
    }
  }
  return config;
}

if (import.meta.main) {
  const [configPath, defaultsPath] = process.argv.slice(2);
  if (!configPath || !defaultsPath) {
    throw new Error("Usage: merge-vita-config.mjs <config> <defaults>");
  }
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const defaults = JSON.parse(readFileSync(defaultsPath, "utf8"));
  writeFileSync(configPath, `${JSON.stringify(mergeVitaConfig(config, defaults), null, 2)}\n`, {
    mode: 0o600,
  });
}
