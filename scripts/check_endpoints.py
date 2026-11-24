"""Comprueba que los modelos por defecto de VITA responden."""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vita.llm import chat, load_models_config  # noqa: E402

config = load_models_config()
ok = True
for role, ref in config["defaults"].items():
    t0 = time.time()
    try:
        answer = chat(ref, [{"role": "user", "content": "Responde solo: OK"}], max_tokens=200)
        print(f"[OK]    {role:<12} {ref:<28} {time.time() - t0:5.1f}s  -> {answer.strip()[:60]!r}")
    except Exception as e:  # noqa: BLE001
        ok = False
        print(f"[FALLO] {role:<12} {ref:<28} {e}")
sys.exit(0 if ok else 1)
