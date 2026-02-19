from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base
from sqlalchemy.sql import func

class JobRejection(Base):
    __tablename__ = "job_rejections"

    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True)
    tech_id = Column(UUID(as_uuid=True), ForeignKey("technicians.id", ondelete="CASCADE"), primary_key=True)
    rejected_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    reason = Column(Text)

    technician = relationship("Technician", back_populates="rejections")
    # job = relationship("Job", back_populates="rejections")
