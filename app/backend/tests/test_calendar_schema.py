from datetime import datetime, timedelta, timezone
import unittest

from pydantic import ValidationError

from app.core.enums import CalendarEventType
from app.schemas.calendar import CalendarEventCreateRequest


class CalendarSchemaTests(unittest.TestCase):
    def test_defaults_end_at_to_one_hour_after_start(self):
        start_at = datetime(2026, 4, 16, 9, 0, tzinfo=timezone.utc)

        payload = CalendarEventCreateRequest(
            customer_name="Acme Fleet",
            event_type=CalendarEventType.APPOINTMENT,
            start_at=start_at,
        )

        self.assertEqual(payload.end_at, start_at + timedelta(hours=1))

    def test_rejects_blank_customer_name(self):
        with self.assertRaises(ValidationError):
            CalendarEventCreateRequest(
                customer_name="   ",
                event_type=CalendarEventType.APPOINTMENT,
                start_at=datetime(2026, 4, 16, 9, 0, tzinfo=timezone.utc),
            )

    def test_rejects_end_at_before_start_at(self):
        with self.assertRaises(ValidationError):
            CalendarEventCreateRequest(
                customer_name="Acme Fleet",
                event_type=CalendarEventType.APPOINTMENT,
                start_at=datetime(2026, 4, 16, 9, 0, tzinfo=timezone.utc),
                end_at=datetime(2026, 4, 16, 8, 30, tzinfo=timezone.utc),
            )


if __name__ == "__main__":
    unittest.main()
