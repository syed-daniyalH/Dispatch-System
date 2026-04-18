from uuid import uuid4

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, String, Text, Uuid, text
from sqlalchemy.sql import func

from .base import Base


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    title = Column(String(255), nullable=False)
    customer_name = Column(String(255), nullable=False)
    technician_id = Column(Uuid(as_uuid=True), ForeignKey("technicians.id"), nullable=True)
    event_type = Column(String(32), nullable=False, server_default=text("'appointment'"))
    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=False)
    location = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(
            "event_type IN ('appointment','delivery','invoice','custom')",
            name="calendar_events_event_type_chk",
        ),
        CheckConstraint("end_at > start_at", name="calendar_events_window_chk"),
    )
