from datetime import date, datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from ..core.enums import CalendarEventType


class CalendarEventResponse(BaseModel):
    id: UUID
    title: str
    customer_name: str
    technician_id: Optional[UUID] = None
    technician_name: Optional[str] = None
    event_type: CalendarEventType
    start_at: datetime
    end_at: datetime
    location: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CalendarEventCreateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    customer_name: str = Field(..., min_length=1, max_length=255)
    technician_id: Optional[UUID] = None
    event_type: CalendarEventType = CalendarEventType.APPOINTMENT
    start_at: datetime
    end_at: Optional[datetime] = None
    location: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("title", "location", "notes")
    @classmethod
    def normalize_optional_strings(cls, value: Optional[str]):
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("customer_name")
    @classmethod
    def validate_customer_name(cls, value: str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("customer_name must not be empty")
        return normalized

    @field_validator("start_at", "end_at", mode="before")
    @classmethod
    def ensure_timezone(cls, value):
        if value is None:
            return value
        if isinstance(value, datetime):
            return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
        return value

    @model_validator(mode="after")
    def validate_end_at(self):
        resolved_end_at = self.end_at or (self.start_at + timedelta(hours=1))
        if resolved_end_at <= self.start_at:
            raise ValueError("end_at must be later than start_at")
        self.end_at = resolved_end_at
        return self


class CalendarEventsQuery(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    technician_id: Optional[UUID] = None
    event_type: Optional[CalendarEventType] = None
    search: Optional[str] = None
