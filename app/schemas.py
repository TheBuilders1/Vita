from __future__ import annotations

from datetime import date
from typing import Annotated, Literal, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, field_validator


class CreateRunBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    message: str = Field(min_length=1, max_length=4000)
    household_id: UUID = Field(alias="householdId")
    document_id: UUID | None = Field(default=None, alias="documentId")


class DateFound(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True, strict=True)

    status: Literal["date_found"]
    expires_on: str = Field(
        alias="expiresOn",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )

    @field_validator("expires_on")
    @classmethod
    def validate_date(cls, value: str) -> str:
        try:
            parsed = date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("expiresOn must be a real ISO date") from exc
        if parsed.isoformat() != value:
            raise ValueError("expiresOn must use YYYY-MM-DD")
        return value


class DateMissing(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    status: Literal["date_missing"]


class DateAmbiguous(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    status: Literal["date_ambiguous"]


class AgentFailed(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    status: Literal["failed"]
    error_code: Literal["document_agent_failed"] = Field(alias="errorCode")


RunOutcome = Annotated[
    Union[DateFound, DateMissing, DateAmbiguous, AgentFailed],
    Field(discriminator="status"),
]
run_outcome_adapter = TypeAdapter(RunOutcome)


class ConfirmBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expires_on: str = Field(
        alias="expiresOn",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )
    days_before: int = Field(default=30, alias="daysBefore", ge=0, le=365, strict=True)

    @field_validator("expires_on")
    @classmethod
    def validate_date(cls, value: str) -> str:
        try:
            parsed = date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("expiresOn must be a real ISO date") from exc
        if parsed.isoformat() != value:
            raise ValueError("expiresOn must use YYYY-MM-DD")
        return value


class RunAccepted(BaseModel):
    run_id: UUID = Field(alias="runId")
    status: Literal["queued"]


class RunView(BaseModel):
    run_id: UUID = Field(alias="runId")
    status: Literal["queued", "running", "completed", "failed", "timed_out"]
    result: dict[str, str] | None = None
    error_code: str | None = Field(default=None, alias="errorCode")


class DocumentAccepted(BaseModel):
    document_id: UUID = Field(alias="documentId")
    status: Literal["uploaded"]


class ConfirmationAccepted(BaseModel):
    reminder_id: UUID = Field(alias="reminderId")
    run_id: UUID = Field(alias="runId")
    document_id: UUID = Field(alias="documentId")
    expires_on: date = Field(alias="expiresOn")
    scheduled_at: str = Field(alias="scheduledAt")
    status: Literal["scheduled"]
