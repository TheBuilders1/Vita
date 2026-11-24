# VITA

Harness orquestador para gestionar **nubes de agentes hiperespecializados**.

> Estado: investigación. La estructura es un punto de partida; se irá ajustando a medida que decidamos la arquitectura.

## Idea

- Un **orquestador** recibe una tarea, la descompone y decide qué agentes la resuelven.
- Los **agentes** son piezas pequeñas y muy especializadas (una herramienta, un dominio, un rol), definidas de forma declarativa en `agents/`.
- Los agentes se agrupan en **nubes** (enjambres) que el orquestador levanta, coordina y cierra según la tarea.
- Los modelos se sirven en local en esta Spark (vLLM y Ollama), vía API compatible con OpenAI.

## Estructura

```
vita/
├── agents/              # Definiciones de agentes (YAML), una por agente
├── config/
│   └── models.yaml      # Endpoints y modelos disponibles
├── docs/                # Notas de investigación y decisiones de diseño
├── scripts/
│   └── check_endpoints.py  # Comprueba que los modelos responden
└── vita/                # Código Python
    ├── llm.py           # Cliente mínimo para endpoints OpenAI-compatibles
    ├── orchestrator/    # Planificación, reparto y coordinación
    └── agents/          # Runtime de agentes y registro
```

## Modelos en spark-holux

| Backend | Endpoint | Modelos |
|---|---|---|
| vLLM | `http://192.168.1.121:8000/v1` | `qwen3.8:27b`, `qwen3.8:27b-juez` (contexto 262k) |
| Ollama | `http://192.168.1.121:11434/v1` | `gemma4:31b`, `gemma4:e4b`, `qwen3.5:9b/4b/2b`, `granite4.2:8b`, `qwen2.5:72b-instruct-q6_K`, `bge-m3` (embeddings) |

## Puesta en marcha

```bash
cd ~/vita
source .venv/bin/activate
python scripts/check_endpoints.py
```
