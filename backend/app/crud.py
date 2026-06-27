"""Data-access layer.

All database reads/writes live here so the routers stay thin and the business
rules (status transitions, unique-code generation, serialization) have a single
home that is easy to test and reason about.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from . import models, schemas, utils


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
def get_default_user(db: Session) -> models.User:
    """Return the seeded default user (the brief assumes a logged-in user)."""
    user = db.scalar(select(models.User).order_by(models.User.id).limit(1))
    if user is None:
        user = models.User(
            name="Sunil Kumar Yadav",
            email="sunil@zoomclone.dev",
            avatar_color="#2D8CFF",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.get(models.User, user_id)


# --------------------------------------------------------------------------- #
# Serialization
# --------------------------------------------------------------------------- #
def serialize_meeting(meeting: models.Meeting) -> schemas.MeetingOut:
    """Convert a Meeting ORM row into the API response shape.

    ``participant_count`` reflects *live* attendees for an active meeting, and
    *total* attendance for an ended meeting (so the dashboard's recent list shows
    how many people actually attended).
    """
    if meeting.status == models.MeetingStatus.ended:
        active_count = len(meeting.participants)
    else:
        active_count = sum(1 for p in meeting.participants if p.left_at is None)
    return schemas.MeetingOut(
        id=meeting.id,
        code=meeting.code,
        title=meeting.title,
        description=meeting.description,
        type=meeting.type,
        status=meeting.status,
        host=schemas.UserOut.model_validate(meeting.host),
        scheduled_start=meeting.scheduled_start,
        duration_minutes=meeting.duration_minutes,
        created_at=meeting.created_at,
        started_at=meeting.started_at,
        ended_at=meeting.ended_at,
        invite_link=utils.build_invite_link(meeting.code),
        participant_count=active_count,
    )


# --------------------------------------------------------------------------- #
# Meetings
# --------------------------------------------------------------------------- #
def _unique_code(db: Session) -> str:
    """Generate a meeting code that is not already taken (retry on collision)."""
    for _ in range(10):
        code = utils.generate_meeting_code()
        if db.scalar(select(models.Meeting).where(models.Meeting.code == code)) is None:
            return code
    raise RuntimeError("Could not generate a unique meeting code")


def _load(db: Session, meeting_id: int) -> Optional[models.Meeting]:
    return db.scalar(
        select(models.Meeting)
        .where(models.Meeting.id == meeting_id)
        .options(
            selectinload(models.Meeting.host),
            selectinload(models.Meeting.participants),
        )
    )


def get_meeting_by_code(db: Session, code: str) -> Optional[models.Meeting]:
    return db.scalar(
        select(models.Meeting)
        .where(models.Meeting.code == code)
        .options(
            selectinload(models.Meeting.host),
            selectinload(models.Meeting.participants),
        )
    )


def create_instant_meeting(
    db: Session, host: models.User, data: schemas.InstantMeetingCreate
) -> models.Meeting:
    now = datetime.now(timezone.utc)
    meeting = models.Meeting(
        code=_unique_code(db),
        title=data.title or "Instant Meeting",
        description=data.description,
        type=models.MeetingType.instant,
        status=models.MeetingStatus.active,
        host_id=host.id,
        started_at=now,
    )
    db.add(meeting)
    db.commit()
    return _load(db, meeting.id)


def create_scheduled_meeting(
    db: Session, host: models.User, data: schemas.ScheduledMeetingCreate
) -> models.Meeting:
    meeting = models.Meeting(
        code=_unique_code(db),
        title=data.title,
        description=data.description,
        type=models.MeetingType.scheduled,
        status=models.MeetingStatus.scheduled,
        host_id=host.id,
        scheduled_start=data.scheduled_start,
        duration_minutes=data.duration_minutes,
    )
    db.add(meeting)
    db.commit()
    return _load(db, meeting.id)


def list_meetings(db: Session) -> schemas.MeetingListOut:
    """Split meetings into 'upcoming' (scheduled, future) and 'recent' (ended/active)."""
    meetings = db.scalars(
        select(models.Meeting).options(
            selectinload(models.Meeting.host),
            selectinload(models.Meeting.participants),
        )
    ).all()

    upcoming, recent = [], []
    for m in meetings:
        if m.status == models.MeetingStatus.scheduled:
            upcoming.append(m)
        else:
            recent.append(m)

    upcoming.sort(key=lambda m: m.scheduled_start or m.created_at)
    recent.sort(key=lambda m: m.started_at or m.created_at, reverse=True)

    return schemas.MeetingListOut(
        upcoming=[serialize_meeting(m) for m in upcoming],
        recent=[serialize_meeting(m) for m in recent[:8]],
    )


def mark_active(db: Session, meeting: models.Meeting) -> models.Meeting:
    """Transition a scheduled meeting to active when its first participant joins."""
    if meeting.status != models.MeetingStatus.active:
        meeting.status = models.MeetingStatus.active
        if meeting.started_at is None:
            meeting.started_at = datetime.now(timezone.utc)
        db.commit()
    return _load(db, meeting.id)


def end_meeting(db: Session, meeting: models.Meeting) -> models.Meeting:
    meeting.status = models.MeetingStatus.ended
    meeting.ended_at = datetime.now(timezone.utc)
    for p in meeting.participants:
        if p.left_at is None:
            p.left_at = datetime.now(timezone.utc)
    db.commit()
    return _load(db, meeting.id)


# --------------------------------------------------------------------------- #
# Participants
# --------------------------------------------------------------------------- #
def add_participant(
    db: Session,
    meeting: models.Meeting,
    display_name: str,
    user_id: Optional[int] = None,
) -> models.Participant:
    # First person in becomes the host (when the seeded host joins their own
    # meeting they keep the host role).
    has_host = any(
        p.role == models.ParticipantRole.host and p.left_at is None
        for p in meeting.participants
    )
    role = (
        models.ParticipantRole.host
        if (not has_host and user_id == meeting.host_id) or not meeting.participants
        else models.ParticipantRole.participant
    )
    participant = models.Participant(
        meeting_id=meeting.id,
        user_id=user_id,
        display_name=display_name.strip()[:120],
        role=role,
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


def get_participant(db: Session, participant_id: int) -> Optional[models.Participant]:
    return db.get(models.Participant, participant_id)


def mark_left(db: Session, participant: models.Participant) -> None:
    if participant.left_at is None:
        participant.left_at = datetime.now(timezone.utc)
        db.commit()


def update_participant_media(
    db: Session,
    participant: models.Participant,
    is_muted: Optional[bool] = None,
    is_video_on: Optional[bool] = None,
) -> models.Participant:
    if is_muted is not None:
        participant.is_muted = is_muted
    if is_video_on is not None:
        participant.is_video_on = is_video_on
    db.commit()
    db.refresh(participant)
    return participant
