from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class ReminderInPast(ValueError):
    pass


def scheduled_reminder_at(
    expires_on: date,
    days_before: int,
    timezone_name: str,
    now: datetime | None = None,
) -> datetime:
    try:
        zone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError("invalid_timezone_or_date") from exc

    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        raise ValueError("now_must_be_timezone_aware")

    try:
        reminder_date = expires_on - timedelta(days=days_before)
        local_time = datetime.combine(reminder_date, time(hour=9), tzinfo=zone)
        is_past = local_time.astimezone(timezone.utc) <= current_time
    except OverflowError as exc:
        # Solo se sale del calendario por el principio: las 09:00 locales del
        # último día todavía caben en UTC en cualquier zona.
        raise ReminderInPast from exc
    if is_past:
        raise ReminderInPast
    return local_time
