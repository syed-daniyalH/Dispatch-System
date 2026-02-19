from datetime import date, datetime, time
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, validator

from ..core.enums import TechnicianStatus, TimeOffEntryType


class ZoneResponse(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class SkillResponse(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class ZoneCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

    @validator("name")
    def validate_name(cls, name: str):
        normalized = name.strip()
        if not normalized:
            raise ValueError("name must not be empty")
        return normalized


class SkillCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

    @validator("name")
    def validate_name(cls, name: str):
        normalized = name.strip()
        if not normalized:
            raise ValueError("name must not be empty")
        return normalized


class WeeklyScheduleResponseItem(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    is_enabled: bool
    start_time: Optional[time] = None
    end_time: Optional[time] = None

    class Config:
        from_attributes = True


class TimeOffResponseItem(BaseModel):
    id: UUID
    technician_id: UUID
    entry_type: TimeOffEntryType
    start_date: date
    end_date: date
    reason: str
    created_at: datetime
    cancelled_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TechnicianProfileResponse(BaseModel):
    id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    status: TechnicianStatus
    manual_availability: bool
    effective_availability: bool
    on_leave_now: bool
    current_shift_window: Optional[str] = None
    next_time_off_start: Optional[date] = None
    zones: List[ZoneResponse]
    skills: List[SkillResponse]
    weekly_schedule: List[WeeklyScheduleResponseItem]
    upcoming_time_off: List[TimeOffResponseItem]


class TechnicianListItemResponse(BaseModel):
    id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    status: TechnicianStatus
    manual_availability: bool
    effective_availability: bool
    on_leave_now: bool
    current_shift_window: Optional[str] = None
    next_time_off_start: Optional[date] = None
    zones: List[ZoneResponse]
    skills: List[SkillResponse]
    current_jobs_count: int


class TechnicianUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[TechnicianStatus] = None
    manual_availability: Optional[bool] = None

    @validator("name")
    def validate_name(cls, name: Optional[str]):
        if name is None:
            return None
        normalized = name.strip()
        if not normalized:
            raise ValueError("name must not be empty")
        return normalized


class TechnicianCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=50)
    status: TechnicianStatus = TechnicianStatus.ACTIVE
    manual_availability: bool = True

    @validator("email")
    def validate_email(cls, email: str):
        normalized = email.strip().lower()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("email must be valid")
        return normalized

    @validator("name")
    def validate_name(cls, name: str):
        normalized = name.strip()
        if not normalized:
            raise ValueError("name must not be empty")
        return normalized

    @validator("phone")
    def validate_phone(cls, phone: Optional[str]):
        if phone is None:
            return None
        normalized = phone.strip()
        return normalized or None


class TechnicianZoneAssignRequest(BaseModel):
    zone_id: UUID


class TechnicianSkillAssignRequest(BaseModel):
    skill_id: UUID


class WeeklyScheduleUpdateItem(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    is_enabled: bool
    start_time: time
    end_time: time

    @validator("end_time")
    def validate_day_window(cls, end_time: time, values):
        start_time = values.get("start_time")
        if start_time is not None and end_time <= start_time:
            raise ValueError("end_time must be greater than start_time")
        return end_time


class TimeOffCreateRequest(BaseModel):
    entry_type: TimeOffEntryType
    start_date: date
    end_date: date
    reason: str = Field(..., min_length=1)

    @validator("end_date")
    def validate_date_window(cls, end_date: date, values):
        start_date = values.get("start_date")
        if start_date and end_date < start_date:
            raise ValueError("end_date must be on or after start_date")
        return end_date


class AdminTimeOffCreateRequest(BaseModel):
    start_date: date
    end_date: date
    reason: str = Field(..., min_length=1)
    entry_type: Optional[TimeOffEntryType] = None

    @validator("end_date")
    def validate_date_window(cls, end_date: date, values):
        start_date = values.get("start_date")
        if start_date and end_date < start_date:
            raise ValueError("end_date must be on or after start_date")
        return end_date


class AssignmentReadinessResponse(BaseModel):
    technician_id: UUID
    job_id: UUID
    effective_availability: bool
    zone_match: bool
    skill_match: bool
    can_assign: bool
