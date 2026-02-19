from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


class Technician(Base):
    __tablename__ = "technicians"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(50), nullable=True)
    status = Column(String(20), nullable=False, server_default=text("'active'"))
    manual_availability = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    zones = relationship("Zone", secondary="technician_zones", back_populates="technicians")
    skills = relationship("Skill", secondary="technician_skills", back_populates="technicians")
    working_hours = relationship(
        "WorkingHours",
        back_populates="technician",
        cascade="all, delete-orphan",
    )
    time_off = relationship(
        "TimeOff",
        back_populates="technician",
        cascade="all, delete-orphan",
    )
    rejections = relationship("JobRejection", back_populates="technician")

    __table_args__ = (
        CheckConstraint(
            "status IN ('active','deactivated')",
            name="technicians_status_chk",
        ),
    )
