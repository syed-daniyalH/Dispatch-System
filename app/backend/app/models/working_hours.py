from sqlalchemy import Boolean, CheckConstraint, Column, ForeignKey, Integer, Time, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base


class WorkingHours(Base):
    __tablename__ = "technician_working_hours"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    technician_id = Column(
        UUID(as_uuid=True),
        ForeignKey("technicians.id", ondelete="CASCADE"),
        nullable=False,
    )
    day_of_week = Column(Integer, nullable=False)  # 0=Monday ... 6=Sunday
    is_enabled = Column(Boolean, nullable=False, server_default=text("false"))
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    technician = relationship("Technician", back_populates="working_hours")

    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 0 AND 6", name="working_hours_day_of_week_chk"),
        CheckConstraint("end_time > start_time", name="working_hours_time_range_chk"),
        UniqueConstraint("technician_id", "day_of_week", name="working_hours_technician_day_uq"),
    )
