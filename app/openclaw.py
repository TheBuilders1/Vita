from __future__ import annotations

import httpx

from app.config import Settings


class GatewayError(RuntimeError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


class GatewayTimeout(GatewayError):
    def __init__(self):
        super().__init__("gateway_timeout")


class OpenClawClient:
    def __init__(
        self,
        settings: Settings,
        transport: httpx.BaseTransport | None = None,
    ):
        self.settings = settings
        self.transport = transport

    def start_run(self, session_key: str, prompt: str) -> None:
        if not self.settings.openclaw_token:
            raise GatewayError("gateway_not_configured")

        timeout = self.settings.openclaw_timeout_seconds + 5
        try:
            with httpx.Client(
                timeout=timeout,
                transport=self.transport,
                trust_env=False,
            ) as client:
                response = client.post(
                    f"{self.settings.openclaw_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.settings.openclaw_token}",
                        "Content-Type": "application/json",
                        "x-openclaw-session-key": session_key,
                    },
                    json={
                        "model": f"openclaw/{self.settings.openclaw_agent_id}",
                        "stream": False,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                )
        except httpx.TimeoutException as exc:
            raise GatewayTimeout from exc
        except httpx.HTTPError as exc:
            raise GatewayError("gateway_unavailable") from exc

        if not response.is_success:
            raise GatewayError("gateway_error")
        try:
            response.json()
        except ValueError as exc:
            raise GatewayError("gateway_error") from exc
