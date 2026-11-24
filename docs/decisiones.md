# Decisiones de diseño

Registro de decisiones (qué, por qué, alternativas descartadas). Una entrada por decisión, con fecha.

## 2026-11-24 — Arranque
- Proyecto creado en spark-holux (`~/vita`), junto a los modelos locales.
- Python 3.12 + venv. Modelos vía API OpenAI-compatible (vLLM y Ollama).
- Pendiente: elegir patrón de orquestación (planner/executor, pizarra compartida, mercado de tareas…), formato de mensajes entre agentes y cómo se aíslan las nubes (procesos, contenedores).
