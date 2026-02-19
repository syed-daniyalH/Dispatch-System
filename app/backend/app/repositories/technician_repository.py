from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional, Sequence
from uuid import UUID

from sqlalchemy import and_, delete, func, insert, select, text, update
from sqlalchemy.orm import Session

from ..models.job import Job
from ..models.skill import Skill, technician_skills
from ..models.technician import Technician
from ..models.time_off import TimeOff
from ..models.working_hours import WorkingHours
from ..models.zone import Zone, technician_zones


class TechnicianRepository:
    ACTIVE_ASSIGNMENT_STATUSES = ("ASSIGNED", "IN_PROGRESS", "DELAYED", "assigned", "in_progress", "delayed")

    def __init__(self, db: Session):
        self.db = db

    def list_technicians(self) -> List[Technician]:
        return self.db.query(Technician).order_by(Technician.name.asc()).all()

    def get_technician_by_id(self, technician_id: UUID) -> Optional[Technician]:
        return self.db.query(Technician).filter(Technician.id == technician_id).first()

    def email_exists(self, email: str) -> bool:
        return self.db.query(Technician.id).filter(Technician.email == email).first() is not None

    def create_technician(
        self,
        *,
        name: str,
        email: str,
        phone: Optional[str],
        status: str,
        manual_availability: bool,
    ) -> Technician:
        technician = Technician(
            name=name,
            email=email,
            phone=phone,
            status=status,
            manual_availability=manual_availability,
        )
        self.db.add(technician)
        self.db.flush()
        self.db.refresh(technician)
        return technician

    def update_technician_fields(self, technician_id: UUID, fields: Dict[str, Any]) -> Optional[Technician]:
        technician = self.get_technician_by_id(technician_id)
        if technician is None:
            return None

        for key, value in fields.items():
            setattr(technician, key, value)

        self.db.flush()
        self.db.refresh(technician)
        return technician

    def list_technician_zones(self, technician_id: UUID) -> List[Zone]:
        return (
            self.db.query(Zone)
            .join(technician_zones, technician_zones.c.zone_id == Zone.id)
            .filter(technician_zones.c.technician_id == technician_id)
            .order_by(Zone.name.asc())
            .all()
        )

    def list_technician_skills(self, technician_id: UUID) -> List[Skill]:
        return (
            self.db.query(Skill)
            .join(technician_skills, technician_skills.c.skill_id == Skill.id)
            .filter(technician_skills.c.technician_id == technician_id)
            .order_by(Skill.name.asc())
            .all()
        )

    def list_zones(self) -> List[Zone]:
        return self.db.query(Zone).order_by(Zone.name.asc()).all()

    def list_skills(self) -> List[Skill]:
        return self.db.query(Skill).order_by(Skill.name.asc()).all()

    def get_zone_by_name(self, name: str) -> Optional[Zone]:
        return self.db.query(Zone).filter(func.lower(Zone.name) == name.lower()).first()

    def get_skill_by_name(self, name: str) -> Optional[Skill]:
        return self.db.query(Skill).filter(func.lower(Skill.name) == name.lower()).first()

    def create_zone(self, name: str) -> Zone:
        zone = Zone(name=name)
        self.db.add(zone)
        self.db.flush()
        self.db.refresh(zone)
        return zone

    def create_skill(self, name: str) -> Skill:
        skill = Skill(name=name)
        self.db.add(skill)
        self.db.flush()
        self.db.refresh(skill)
        return skill

    def zone_exists(self, zone_id: UUID) -> bool:
        return self.db.query(Zone.id).filter(Zone.id == zone_id).first() is not None

    def skill_exists(self, skill_id: UUID) -> bool:
        return self.db.query(Skill.id).filter(Skill.id == skill_id).first() is not None

    def add_zone_assignment(self, technician_id: UUID, zone_id: UUID) -> bool:
        exists = self.db.execute(
            select(technician_zones.c.technician_id).where(
                and_(
                    technician_zones.c.technician_id == technician_id,
                    technician_zones.c.zone_id == zone_id,
                )
            )
        ).first()
        if exists:
            return False

        self.db.execute(
            insert(technician_zones).values(technician_id=technician_id, zone_id=zone_id)
        )
        self.db.flush()
        return True

    def remove_zone_assignment(self, technician_id: UUID, zone_id: UUID) -> bool:
        deleted = self.db.execute(
            delete(technician_zones).where(
                and_(
                    technician_zones.c.technician_id == technician_id,
                    technician_zones.c.zone_id == zone_id,
                )
            )
        )
        self.db.flush()
        return deleted.rowcount > 0

    def add_skill_assignment(self, technician_id: UUID, skill_id: UUID) -> bool:
        exists = self.db.execute(
            select(technician_skills.c.technician_id).where(
                and_(
                    technician_skills.c.technician_id == technician_id,
                    technician_skills.c.skill_id == skill_id,
                )
            )
        ).first()
        if exists:
            return False

        self.db.execute(
            insert(technician_skills).values(technician_id=technician_id, skill_id=skill_id)
        )
        self.db.flush()
        return True

    def remove_skill_assignment(self, technician_id: UUID, skill_id: UUID) -> bool:
        deleted = self.db.execute(
            delete(technician_skills).where(
                and_(
                    technician_skills.c.technician_id == technician_id,
                    technician_skills.c.skill_id == skill_id,
                )
            )
        )
        self.db.flush()
        return deleted.rowcount > 0

    def list_weekly_schedule(self, technician_id: UUID) -> List[WorkingHours]:
        return (
            self.db.query(WorkingHours)
            .filter(WorkingHours.technician_id == technician_id)
            .order_by(WorkingHours.day_of_week.asc())
            .all()
        )

    def get_working_hours_for_day(self, technician_id: UUID, day_of_week: int) -> Optional[WorkingHours]:
        return (
            self.db.query(WorkingHours)
            .filter(
                WorkingHours.technician_id == technician_id,
                WorkingHours.day_of_week == day_of_week,
            )
            .first()
        )

    def replace_weekly_schedule(self, technician_id: UUID, items: Sequence[Dict[str, Any]]) -> List[WorkingHours]:
        self.db.query(WorkingHours).filter(WorkingHours.technician_id == technician_id).delete()

        for item in items:
            self.db.add(
                WorkingHours(
                    technician_id=technician_id,
                    day_of_week=item["day_of_week"],
                    is_enabled=item["is_enabled"],
                    start_time=item["start_time"],
                    end_time=item["end_time"],
                )
            )

        self.db.flush()
        return self.list_weekly_schedule(technician_id)

    def list_non_cancelled_time_off(self, technician_id: UUID) -> List[TimeOff]:
        return (
            self.db.query(TimeOff)
            .filter(
                TimeOff.technician_id == technician_id,
                TimeOff.cancelled_at.is_(None),
            )
            .order_by(TimeOff.start_date.asc(), TimeOff.created_at.asc())
            .all()
        )

    def list_upcoming_time_off(self, technician_id: UUID, from_date: date) -> List[TimeOff]:
        return (
            self.db.query(TimeOff)
            .filter(
                TimeOff.technician_id == technician_id,
                TimeOff.cancelled_at.is_(None),
                TimeOff.end_date >= from_date,
            )
            .order_by(TimeOff.start_date.asc(), TimeOff.created_at.asc())
            .all()
        )

    def get_next_time_off_start(self, technician_id: UUID, from_date: date) -> Optional[date]:
        row = (
            self.db.query(func.min(TimeOff.start_date))
            .filter(
                TimeOff.technician_id == technician_id,
                TimeOff.cancelled_at.is_(None),
                TimeOff.start_date >= from_date,
            )
            .first()
        )
        if not row:
            return None
        return row[0]

    def has_active_time_off(self, technician_id: UUID, current_date: date) -> bool:
        return (
            self.db.query(TimeOff.id)
            .filter(
                TimeOff.technician_id == technician_id,
                TimeOff.cancelled_at.is_(None),
                TimeOff.start_date <= current_date,
                TimeOff.end_date >= current_date,
            )
            .first()
            is not None
        )

    def has_overlapping_time_off(self, technician_id: UUID, start_date: date, end_date: date) -> bool:
        return (
            self.db.query(TimeOff.id)
            .filter(
                TimeOff.technician_id == technician_id,
                TimeOff.cancelled_at.is_(None),
                TimeOff.start_date <= end_date,
                TimeOff.end_date >= start_date,
            )
            .first()
            is not None
        )

    def create_time_off(
        self,
        technician_id: UUID,
        *,
        entry_type: str,
        start_date: date,
        end_date: date,
        reason: str,
    ) -> TimeOff:
        row = TimeOff(
            technician_id=technician_id,
            entry_type=entry_type,
            start_date=start_date,
            end_date=end_date,
            reason=reason,
        )
        self.db.add(row)
        self.db.flush()
        self.db.refresh(row)
        return row

    def get_time_off_by_id_for_technician(self, technician_id: UUID, time_off_id: UUID) -> Optional[TimeOff]:
        return (
            self.db.query(TimeOff)
            .filter(
                TimeOff.id == time_off_id,
                TimeOff.technician_id == technician_id,
            )
            .first()
        )

    def cancel_time_off(self, time_off_id: UUID, cancelled_at: datetime) -> None:
        self.db.execute(
            update(TimeOff)
            .where(TimeOff.id == time_off_id)
            .values(cancelled_at=cancelled_at)
        )
        self.db.flush()

    def get_job_by_id(self, job_id: UUID) -> Optional[Job]:
        return self.db.query(Job).filter(Job.id == job_id).first()

    def get_current_jobs_count(self, technician_id: UUID) -> int:
        row = (
            self.db.query(func.count(Job.id))
            .filter(
                Job.assigned_tech_id == technician_id,
                Job.status.in_(self.ACTIVE_ASSIGNMENT_STATUSES),
            )
            .first()
        )
        return int(row[0] if row and row[0] is not None else 0)

    def has_zone_match(self, technician_id: UUID, zone_id: Optional[UUID]) -> bool:
        if zone_id is None:
            return False

        return (
            self.db.execute(
                select(technician_zones.c.technician_id).where(
                    and_(
                        technician_zones.c.technician_id == technician_id,
                        technician_zones.c.zone_id == zone_id,
                    )
                )
            ).first()
            is not None
        )

    def has_skill_match(self, technician_id: UUID, skill_id: Optional[UUID]) -> bool:
        if skill_id is None:
            return False

        return (
            self.db.execute(
                select(technician_skills.c.technician_id).where(
                    and_(
                        technician_skills.c.technician_id == technician_id,
                        technician_skills.c.skill_id == skill_id,
                    )
                )
            ).first()
            is not None
        )

    def notifications_table_exists(self) -> bool:
        row = self.db.execute(
            text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'notifications'
                )
                """
            )
        ).first()
        return bool(row and row[0])

    def create_admin_notification_if_supported(self, payload: Dict[str, Any]) -> None:
        if not self.notifications_table_exists():
            return

        # Best-effort insert: only executes when a compatible notifications table exists.
        self.db.execute(
            text(
                """
                INSERT INTO notifications (recipient_role, message, metadata, created_at)
                VALUES (:recipient_role, :message, CAST(:metadata AS jsonb), NOW())
                """
            ),
            {
                "recipient_role": "admin",
                "message": payload.get("message", "Technician time-off updated"),
                "metadata": payload.get("metadata_json", "{}"),
            },
        )
        self.db.flush()
