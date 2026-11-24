from uuid import UUID

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas import ConfirmBody, CreateRunBody, run_outcome_adapter
from app.security import token_digest, user_for_token


def test_tokens_are_mapped_server_side_to_users() -> None:
    user_id = UUID("11111111-1111-4111-8111-111111111111")

    assert user_for_token("alba-demo-token-change-me", {
        "alba-demo-token-change-me": user_id
    }) == user_id
    assert token_digest("secret") != token_digest("another-secret")

    with pytest.raises(HTTPException) as error:
        user_for_token("unknown-token", {"alba-demo-token-change-me": user_id})
    assert error.value.status_code == 401


def test_run_result_is_strict_and_date_is_real() -> None:
    outcome = run_outcome_adapter.validate_python(
        {"status": "date_found", "expiresOn": "2030-12-31"}
    )
    assert outcome.model_dump(mode="json", by_alias=True) == {
        "status": "date_found",
        "expiresOn": "2030-12-31",
    }

    with pytest.raises(ValidationError):
        run_outcome_adapter.validate_python(
            {"status": "date_found", "expiresOn": "2030-02-31"}
        )
    with pytest.raises(ValidationError):
        run_outcome_adapter.validate_python(
            {"status": "date_missing", "expiresOn": "2030-12-31"}
        )
    with pytest.raises(ValidationError):
        run_outcome_adapter.validate_python(
            {"status": "failed", "errorCode": "arbitrary"}
        )


def test_client_cannot_supply_user_identity_or_invalid_confirmation() -> None:
    with pytest.raises(ValidationError):
        CreateRunBody.model_validate(
            {
                "message": "test",
                "householdId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "userId": "11111111-1111-4111-8111-111111111111",
            }
        )

    with pytest.raises(ValidationError):
        ConfirmBody.model_validate(
            {"expiresOn": "2030-02-31", "daysBefore": 30}
        )
