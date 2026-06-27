"""Seed the database with a default user and realistic sample meetings.

Runs automatically on startup when the DB is empty (controlled by
``SEED_ON_STARTUP``). Idempotent: it no-ops if meetings already exist.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models, utils
from .database import SessionLocal


def _code(db: Session) -> str:
    code = utils.generate_meeting_code()
    while db.scalar(select(models.Meeting).where(models.Meeting.code == code)):
        code = utils.generate_meeting_code()
    return code


def seed(db: Session) -> None:
    if db.scalar(select(models.Meeting).limit(1)) is not None:
        return  # already seeded

    # Default "logged-in" user.
    host = db.scalar(select(models.User).limit(1))
    if host is None:
        host = models.User(
            name="Sunil Kumar Yadav",
            email="sunil@zoomclone.dev",
            avatar_color="#2D8CFF",
        )
        db.add(host)
        db.commit()
        db.refresh(host)

    teammates = [
        models.User(name="Priya Sharma", email="priya@zoomclone.dev", avatar_color="#F6A609"),
        models.User(name="Arjun Mehta", email="arjun@zoomclone.dev", avatar_color="#16A34A"),
        models.User(name="Emily Carter", email="emily@zoomclone.dev", avatar_color="#9333EA"),
    ]
    db.add_all(teammates)
    db.commit()

    now = datetime.now(timezone.utc)

    # --- Upcoming (scheduled) meetings ----------------------------------- #
    upcoming = [
        models.Meeting(
            code=_code(db), title="Sprint Planning — Q3",
            description="Plan the upcoming sprint, review backlog and assign owners.",
            type=models.MeetingType.scheduled, status=models.MeetingStatus.scheduled,
            host_id=host.id, scheduled_start=now + timedelta(hours=3), duration_minutes=60,
        ),
        models.Meeting(
            code=_code(db), title="Design Review: Onboarding Flow",
            description="Walk through the new onboarding screens with the design team.",
            type=models.MeetingType.scheduled, status=models.MeetingStatus.scheduled,
            host_id=host.id, scheduled_start=now + timedelta(days=1, hours=2), duration_minutes=45,
        ),
        models.Meeting(
            code=_code(db), title="1:1 with Priya",
            description="Weekly sync.",
            type=models.MeetingType.scheduled, status=models.MeetingStatus.scheduled,
            host_id=host.id, scheduled_start=now + timedelta(days=2), duration_minutes=30,
        ),
    ]

    # --- Recent (ended) meetings ----------------------------------------- #
    recent = [
        models.Meeting(
            code=_code(db), title="Daily Standup",
            description="Quick status sync.",
            type=models.MeetingType.instant, status=models.MeetingStatus.ended,
            host_id=host.id, started_at=now - timedelta(hours=20),
            ended_at=now - timedelta(hours=20) + timedelta(minutes=15),
        ),
        models.Meeting(
            code=_code(db), title="Client Demo — Acme Corp",
            description="Demoed the new dashboard to the client.",
            type=models.MeetingType.scheduled, status=models.MeetingStatus.ended,
            host_id=host.id, scheduled_start=now - timedelta(days=1),
            started_at=now - timedelta(days=1), ended_at=now - timedelta(days=1) + timedelta(minutes=50),
            duration_minutes=60,
        ),
    ]

    db.add_all(upcoming + recent)
    db.commit()

    # Add a few participant rows to the recent meetings for richer sample data.
    standup = recent[0]
    for u in [host] + teammates:
        db.add(models.Participant(
            meeting_id=standup.id, user_id=u.id, display_name=u.name,
            role=models.ParticipantRole.host if u.id == host.id else models.ParticipantRole.participant,
            joined_at=standup.started_at, left_at=standup.ended_at,
        ))
    db.commit()


def run_seed() -> None:
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
