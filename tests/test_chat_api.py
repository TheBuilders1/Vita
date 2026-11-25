from uuid import UUID

from fastapi.testclient import TestClient

from app.config import Settings
from app.chat_vision import VisionImage
from app.main import create_app

ALBA_TOKEN = "alba-demo-token-for-chat"
ALBA_ID = UUID("11111111-1111-4111-8111-111111111111")
CARLA_TOKEN = "carla-demo-token-for-chat"
CARLA_ID = UUID("33333333-3333-4333-8333-333333333333")
CONVERSATION_ID = "a" * 32


class FakeGateway:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, list[dict[str, str]], list[str], list[str]]] = []

    def chat(
        self,
        conversation_key: str,
        message: str,
        context: list[dict[str, str]],
        attachments: list[str],
        vision_refs: list[str],
    ) -> str:
        self.calls.append((conversation_key, message, context, attachments, vision_refs))
        return "¡Hola! ¿En qué te puedo ayudar?"


def test_chat_requires_auth_and_scopes_conversation_to_user() -> None:
    app = create_app(
        Settings(
            openclaw_token="gateway-secret",
            demo_tokens={ALBA_TOKEN: ALBA_ID, CARLA_TOKEN: CARLA_ID},
        )
    )
    gateway = FakeGateway()
    app.state.openclaw_client = gateway
    client = TestClient(app)
    body = {"conversationId": CONVERSATION_ID, "message": "Hola"}

    assert client.post("/v1/chat", json=body).status_code == 401

    alba = client.post(
        "/v1/chat",
        headers={"Authorization": f"Bearer {ALBA_TOKEN}"},
        json=body,
    )
    carla = client.post(
        "/v1/chat",
        headers={"Authorization": f"Bearer {CARLA_TOKEN}"},
        json=body,
    )

    assert alba.status_code == carla.status_code == 200
    assert alba.json() == {"message": "¡Hola! ¿En qué te puedo ayudar?"}
    assert gateway.calls == [
        (f"vita:{ALBA_ID}:{CONVERSATION_ID}", "Hola", [], [], []),
        (f"vita:{CARLA_ID}:{CONVERSATION_ID}", "Hola", [], [], []),
    ]


def test_chat_attachment_text_is_extracted_locally_and_requires_auth() -> None:
    app = create_app(
        Settings(
            openclaw_token="gateway-secret",
            demo_tokens={ALBA_TOKEN: ALBA_ID},
        )
    )

    class FakeOcr:
        def read_text(self, _data: bytes) -> str:
            return "Caducidad: 31/12/2030"

    app.state.ocr = FakeOcr()
    client = TestClient(app)
    attachment = ("doc.txt", b"Caducidad: 31/12/2030", "text/plain")

    assert client.post("/v1/chat/attachments", files={"file": attachment}).status_code == 401
    response = client.post(
        "/v1/chat/attachments",
        headers={"Authorization": f"Bearer {ALBA_TOKEN}"},
        files={"file": attachment},
    )

    assert response.status_code == 200
    assert response.json() == {"text": "Caducidad: 31/12/2030"}


def test_chat_forwards_extracted_attachment_text_to_the_orchestrator() -> None:
    app = create_app(
        Settings(
            openclaw_token="gateway-secret",
            demo_tokens={ALBA_TOKEN: ALBA_ID},
        )
    )
    gateway = FakeGateway()
    app.state.openclaw_client = gateway

    response = TestClient(app).post(
        "/v1/chat",
        headers={"Authorization": f"Bearer {ALBA_TOKEN}"},
        json={
            "conversationId": CONVERSATION_ID,
            "message": "¿Cuándo caduca?",
            "context": [],
            "attachments": [{"text": "Caducidad: 31/12/2030"}],
        },
    )

    assert response.status_code == 200
    assert gateway.calls == [
        (f"vita:{ALBA_ID}:{CONVERSATION_ID}", "¿Cuándo caduca?", [], ["Caducidad: 31/12/2030"], [])
    ]


def test_chat_forwards_only_opaque_vision_references_and_discards_them_afterward() -> None:
    app = create_app(
        Settings(
            openclaw_token="gateway-secret",
            demo_tokens={ALBA_TOKEN: ALBA_ID},
        )
    )
    gateway = FakeGateway()
    app.state.openclaw_client = gateway
    reference = app.state.chat_vision.store(
        ALBA_ID,
        [VisionImage(b"private-image", "image/png")],
    )[0]

    response = TestClient(app).post(
        "/v1/chat",
        headers={"Authorization": f"Bearer {ALBA_TOKEN}"},
        json={
            "conversationId": CONVERSATION_ID,
            "message": "¿Qué se ve en la foto?",
            "visionRefs": [reference],
        },
    )

    assert response.status_code == 200
    assert gateway.calls == [
        (f"vita:{ALBA_ID}:{CONVERSATION_ID}", "¿Qué se ve en la foto?", [], [], [reference])
    ]
    assert not app.state.chat_vision.belongs_to([reference], ALBA_ID)


def test_chat_rejects_another_users_vision_reference_without_consuming_it() -> None:
    app = create_app(
        Settings(
            openclaw_token="gateway-secret",
            demo_tokens={ALBA_TOKEN: ALBA_ID, CARLA_TOKEN: CARLA_ID},
        )
    )
    gateway = FakeGateway()
    app.state.openclaw_client = gateway
    reference = app.state.chat_vision.store(
        ALBA_ID,
        [VisionImage(b"private-image", "image/png")],
    )[0]

    response = TestClient(app).post(
        "/v1/chat",
        headers={"Authorization": f"Bearer {CARLA_TOKEN}"},
        json={
            "conversationId": CONVERSATION_ID,
            "message": "Analiza esta imagen.",
            "visionRefs": [reference],
        },
    )

    assert response.status_code == 422
    assert app.state.chat_vision.belongs_to([reference], ALBA_ID)
    assert gateway.calls == []


def test_vision_upload_requires_auth_and_internal_read_is_single_use() -> None:
    from io import BytesIO

    from PIL import Image

    output = BytesIO()
    Image.new("RGB", (8, 8), "white").save(output, format="PNG")
    data = output.getvalue()
    app = create_app(
        Settings(
            openclaw_token="gateway-secret",
            demo_tokens={ALBA_TOKEN: ALBA_ID},
        )
    )
    client = TestClient(app)
    files = [("files", ("photo.png", data, "image/png"))]

    assert client.post("/v1/chat/vision-attachments", files=files).status_code == 401
    upload = client.post(
        "/v1/chat/vision-attachments",
        headers={"Authorization": f"Bearer {ALBA_TOKEN}"},
        files=files,
    )
    assert upload.status_code == 200
    reference = upload.json()["visionRefs"][0]
    assert upload.json()["expiresIn"] == 300

    assert client.post("/v1/internal/chat-image").status_code == 401
    image = client.post(
        "/v1/internal/chat-image",
        headers={"Authorization": f"Bearer {reference}"},
    )
    assert image.status_code == 200
    assert image.headers["cache-control"] == "private, no-store"
    assert image.content == data
    assert client.post(
        "/v1/internal/chat-image",
        headers={"Authorization": f"Bearer {reference}"},
    ).status_code == 404


def test_chat_rejects_invalid_conversation_ids_and_unbounded_messages() -> None:
    app = create_app(
        Settings(
            openclaw_token="gateway-secret",
            demo_tokens={ALBA_TOKEN: ALBA_ID},
        )
    )
    gateway = FakeGateway()
    app.state.openclaw_client = gateway
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {ALBA_TOKEN}"}

    assert client.post(
        "/v1/chat",
        headers=headers,
        json={"conversationId": "not-an-id", "message": "Hola"},
    ).status_code == 422
    assert client.post(
        "/v1/chat",
        headers=headers,
        json={"conversationId": CONVERSATION_ID, "message": "x" * 501},
    ).status_code == 422
    assert client.post(
        "/v1/chat",
        headers=headers,
        json={
            "conversationId": CONVERSATION_ID,
            "message": "Hola",
            "context": [{"title": "Visible", "detail": "dato"}] * 21,
        },
    ).status_code == 422
    assert client.post(
        "/v1/chat",
        headers=headers,
        json={
            "conversationId": CONVERSATION_ID,
            "message": "Hola",
            "attachments": [{"text": "dato"}] * 4,
        },
    ).status_code == 422
    assert client.post(
        "/v1/chat",
        headers=headers,
        json={
            "conversationId": CONVERSATION_ID,
            "message": "Hola",
            "visionRefs": ["no-es-una-referencia"],
        },
    ).status_code == 422
    assert client.post(
        "/v1/chat",
        headers=headers,
        json={
            "conversationId": CONVERSATION_ID,
            "message": "Hola",
            "visionRefs": ["a" * 43] * 4,
        },
    ).status_code == 422
    assert gateway.calls == []
