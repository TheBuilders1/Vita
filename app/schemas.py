from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Any, Literal, Union
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    TypeAdapter,
    field_validator,
    model_validator,
)


class CalendarWindow(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")

    @model_validator(mode="after")
    def validate_window(self) -> CalendarWindow:
        if self.end_date < self.start_date:
            raise ValueError("endDate must be on or after startDate")
        if (self.end_date - self.start_date).days > 30:
            raise ValueError("calendar window cannot exceed 31 days")
        return self


class CreateRunBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    message: str = Field(min_length=1, max_length=4000)
    household_id: UUID = Field(alias="householdId")
    document_id: UUID | None = Field(default=None, alias="documentId")
    calendar: CalendarWindow | None = None

    @model_validator(mode="after")
    def validate_task_selection(self) -> CreateRunBody:
        if self.document_id is not None and self.calendar is not None:
            raise ValueError("documentId and calendar cannot be used in the same run")
        return self


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
    error_code: str = Field(alias="errorCode")

    @field_validator("error_code")
    @classmethod
    def validate_agent_error(cls, value: str) -> str:
        if value not in {
            "document_agent_failed",
            "calendar_agent_failed",
            "agent_failed",
        }:
            raise ValueError("unsupported agent failure code")
        return value


class CalendarEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    summary: str = Field(min_length=1, max_length=250)
    start: str = Field(min_length=10, max_length=35)
    end: str = Field(min_length=10, max_length=35)
    all_day: bool = Field(alias="allDay")

    @model_validator(mode="after")
    def validate_event_times(self) -> CalendarEvent:
        if self.all_day:
            try:
                start_date = date.fromisoformat(self.start)
                end_date = date.fromisoformat(self.end)
            except ValueError as exc:
                raise ValueError("all-day events must use ISO dates") from exc
            if end_date < start_date:
                raise ValueError("event end must not precede its start")
            return self

        try:
            start = datetime.fromisoformat(self.start.replace("Z", "+00:00"))
            end = datetime.fromisoformat(self.end.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError("timed events must use ISO datetimes") from exc
        if start.tzinfo is None or end.tzinfo is None:
            raise ValueError("timed events must include a timezone")
        if end < start:
            raise ValueError("event end must not precede its start")
        return self


class CalendarEvents(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, populate_by_name=True)

    status: Literal["calendar_events"]
    events: list[CalendarEvent] = Field(max_length=50)
    time_zone: str = Field(alias="timeZone", min_length=1, max_length=64)
    start_date: date = Field(alias="startDate", strict=False)
    end_date: date = Field(alias="endDate", strict=False)
    truncated: bool

    @model_validator(mode="after")
    def validate_event_window(self) -> CalendarEvents:
        try:
            ZoneInfo(self.time_zone)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("timeZone must be a valid IANA timezone") from exc
        if self.end_date < self.start_date:
            raise ValueError("endDate must be on or after startDate")
        if (self.end_date - self.start_date).days > 30:
            raise ValueError("calendar window cannot exceed 31 days")
        return self


RunOutcome = Annotated[
    Union[
        DateFound,
        DateMissing,
        DateAmbiguous,
        AgentFailed,
        CalendarEvents,
    ],
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
    result: dict[str, Any] | None = None
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
