"""Cliente mínimo para endpoints compatibles con OpenAI (vLLM, Ollama)."""
from __future__ import annotations

import os
from pathlib import Path

import httpx
import yaml

ROOT = Path(__file__).resolve().parent.parent


def load_models_config(path: str | os.PathLike | None = None) -> dict:
    path = Path(path or os.environ.get("VITA_MODELS_CONFIG", ROOT / "config" / "models.yaml"))
    if not path.is_absolute():
        path = ROOT / path
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def resolve(ref: str, config: dict | None = None) -> tuple[str, str]:
    """'vllm/qwen3.8:27b' -> (base_url, 'qwen3.8:27b')."""
    config = config or load_models_config()
    backend, model = ref.split("/", 1)
    return config["backends"][backend]["base_url"], model


def chat(ref: str, messages: list[dict], timeout: float = 120.0, **params) -> str:
    base_url, model = resolve(ref)
    resp = httpx.post(
        f"{base_url}/chat/completions",
        json={"model": model, "messages": messages, **params},
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]
