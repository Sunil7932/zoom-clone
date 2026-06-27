"""REST endpoints for meeting lifecycle: create, list, fetch, join, end."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..models import MeetingStatus

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


@router.get("", response_model=schemas.MeetingListOut)
def list_meetings(db: Session = Depends(get_db)):
    """Dashboard data: upcoming (scheduled) and recent meetings."""
    return crud.list_meetings(db)


@router.post("/instant", response_model=schemas.MeetingOut, status_code=status.HTTP_201_CREATED)
def create_instant(
    payload: Optional[schemas.InstantMeetingCreate] = None,
    db: Session = Depends(get_db),
):
    """Create an instant meeting and return it (with code + invite link)."""
    host = crud.get_default_user(db)
    data = payload or schemas.InstantMeetingCreate()
    meeting = crud.create_instant_meeting(db, host, data)
    return crud.serialize_meeting(meeting)


@router.post("/schedule", response_model=schemas.MeetingOut, status_code=status.HTTP_201_CREATED)
def schedule(payload: schemas.ScheduledMeetingCreate, db: Session = Depends(get_db)):
    """Create a scheduled meeting for a future date/time."""
    host = crud.get_default_user(db)
    meeting = crud.create_scheduled_meeting(db, host, payload)
    return crud.serialize_meeting(meeting)


@router.get("/{code}", response_model=schemas.MeetingOut)
def get_meeting(code: str, db: Session = Depends(get_db)):
    """Validate a meeting exists (used by the join flow) and return its details."""
    meeting = crud.get_meeting_by_code(db, code)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.status == MeetingStatus.ended:
        raise HTTPException(status_code=410, detail="This meeting has ended")
    return crud.serialize_meeting(meeting)


@router.post("/{code}/join", response_model=schemas.JoinResponse)
def join_meeting(code: str, payload: schemas.JoinRequest, db: Session = Depends(get_db)):
    """Register a participant against a meeting and activate it if needed."""
    meeting = crud.get_meeting_by_code(db, code)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.status == MeetingStatus.ended:
        raise HTTPException(status_code=410, detail="This meeting has ended")

    default_user = crud.get_default_user(db)
    # Link to the default user only when the name matches (otherwise it's a guest).
    user_id = default_user.id if payload.display_name.strip() == default_user.name else None

    meeting = crud.mark_active(db, meeting)
    participant = crud.add_participant(db, meeting, payload.display_name, user_id=user_id)

    return schemas.JoinResponse(
        meeting=crud.serialize_meeting(meeting),
        participant=schemas.ParticipantOut.model_validate(participant),
    )


@router.post("/{code}/end", response_model=schemas.MeetingOut)
def end_meeting(code: str, db: Session = Depends(get_db)):
    """End a meeting (host action)."""
    meeting = crud.get_meeting_by_code(db, code)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    meeting = crud.end_meeting(db, meeting)
    return crud.serialize_meeting(meeting)
