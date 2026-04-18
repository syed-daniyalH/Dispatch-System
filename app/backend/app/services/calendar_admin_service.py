from datetime import date, datetime, time, timezone
from typing import Iterable, List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..core.enums import AuditEntityType, CalendarEventType, UserRole
from ..core.security import AuthenticatedUser
from ..models.calendar_event import CalendarEvent
from ..models.technician import Technician
from ..schemas.calendar import CalendarEventCreateRequest, CalendarEventResponse
from .audit_service import AuditService


class CalendarAdminService:
    def __init__(self, db: Session, current_user: AuthenticatedUser):
        self.db = db
        self.current_user = current_user

    def _to_response(self, row: CalendarEvent, technician_name: Optional[str] = None) -> CalendarEventResponse:
        return CalendarEventResponse(
            id=row.id,
            title=row.title,
            customer_name=row.customer_name,
            technician_id=row.technician_id,
            technician_name=technician_name,
            event_type=CalendarEventType(row.event_type),
            start_at=row.start_at,
            end_at=row.end_at,
            location=row.location,
            notes=row.notes,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def _resolve_technician_name_map(self, rows: Iterable[CalendarEvent]) -> dict[UUID, str]:
        technician_ids = list({row.technician_id for row in rows if row.technician_id is not None})
        if not technician_ids:
            return {}

        technicians = (
            self.db.query(Technician.id, Technician.name)
            .filter(Technician.id.in_(technician_ids))
            .all()
        )
        return {row.id: row.name for row in technicians}

    def list_events(
        self,
        *,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        technician_id: Optional[UUID] = None,
        event_type: Optional[CalendarEventType] = None,
        search: Optional[str] = None,
    ) -> List[CalendarEventResponse]:
        query = self.db.query(CalendarEvent)

        if from_date is not None:
            start_dt = datetime.combine(from_date, time.min, tzinfo=timezone.utc)
            query = query.filter(CalendarEvent.end_at >= start_dt)
        if to_date is not None:
            end_dt = datetime.combine(to_date, time.max, tzinfo=timezone.utc)
            query = query.filter(CalendarEvent.start_at <= end_dt)
        if technician_id is not None:
            query = query.filter(CalendarEvent.technician_id == technician_id)
        if event_type is not None:
            query = query.filter(CalendarEvent.event_type == event_type.value)
        if search:
            pattern = f"%{search.strip().lower()}%"
            if pattern != "%%":
                query = query.filter(
                    or_(
                        func.lower(CalendarEvent.title).like(pattern),
                        func.lower(CalendarEvent.customer_name).like(pattern),
                        func.lower(func.coalesce(CalendarEvent.location, "")).like(pattern),
                        func.lower(func.coalesce(CalendarEvent.notes, "")).like(pattern),
                    )
                )

        rows = query.order_by(CalendarEvent.start_at.asc(), CalendarEvent.created_at.asc()).all()
        technician_names = self._resolve_technician_name_map(rows)
        return [self._to_response(row, technician_names.get(row.technician_id)) for row in rows]

    def create_event(self, payload: CalendarEventCreateRequest) -> CalendarEventResponse:
        technician_name: Optional[str] = None
        if payload.technician_id is not None:
            technician = self.db.query(Technician).filter(Technician.id == payload.technician_id).first()
            if technician is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician not found")
            technician_name = technician.name

        title = payload.title or f"{payload.event_type.value.title()} for {payload.customer_name}"
        row = CalendarEvent(
            title=title,
            customer_name=payload.customer_name,
            technician_id=payload.technician_id,
            event_type=payload.event_type.value,
            start_at=payload.start_at,
            end_at=payload.end_at,
            location=payload.location,
            notes=payload.notes,
        )
        self.db.add(row)
        self.db.flush()
        self.db.refresh(row)

        AuditService.log_event(
            self.db,
            actor_role=UserRole.ADMIN,
            actor_id=self.current_user.user_id,
            action="admin.calendar_event.created",
            entity_type=AuditEntityType.CALENDAR_EVENT.value,
            entity_id=row.id,
            metadata={
                "event_type": row.event_type,
                "customer_name": row.customer_name,
                "technician_id": str(row.technician_id) if row.technician_id is not None else None,
                "start_at": row.start_at.isoformat(),
                "end_at": row.end_at.isoformat(),
            },
        )
        self.db.commit()
        return self._to_response(row, technician_name)
