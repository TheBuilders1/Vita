from datetime import date, datetime, timezone

import pytest

from app.reminders import ReminderInPast, scheduled_reminder_at


def test_reminder_uses_household_local_time_across_dst() -> None:
    before_switch = scheduled_reminder_at(
        date(2027, 4, 26),
        30,
        "Europe/Madrid",
        now=datetime(2027, 1, 1, tzinfo=timezone.utc),
    )
    after_switch = scheduled_reminder_at(
        date(2027, 4, 27),
        30,
        "Europe/Madrid",
        now=datetime(2027, 1, 1, tzinfo=timezone.utc),
    )

    assert before_switch.isoformat() == "2027-03-27T09:00:00+01:00"
    assert after_switch.isoformat() == "2027-03-28T09:00:00+02:00"


def test_reminder_in_past_is_rejected() -> None:
    with pytest.raises(ReminderInPast):
        scheduled_reminder_at(
            date(2027, 1, 1),
            30,
            "Europe/Madrid",
            now=datetime(2026, 12, 15, tzinfo=timezone.utc),
        )


def test_unknown_timezone_is_rejected() -> None:
    with pytest.raises(ValueError, match="invalid_timezone_or_date"):
        scheduled_reminder_at(
            date(2030, 12, 31),
            30,
            "Mars/Olympus",
            now=datetime(2027, 1, 1, tzinfo=timezone.utc),
        )
