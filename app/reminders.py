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
        reminder_date = expires_on - timedelta(days=days_before)
    except (ZoneInfoNotFoundError, OverflowError) as exc:
        raise ValueError("invalid_timezone_or_date") from exc

    local_time = datetime.combine(reminder_date, time(hour=9), tzinfo=zone)
    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        raise ValueError("now_must_be_timezone_aware")
    if local_time.astimezone(timezone.utc) <= current_time.astimezone(timezone.utc):
        raise ReminderInPast
    return local_time
