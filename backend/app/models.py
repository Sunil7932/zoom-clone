"""SQLAlchemy ORM models — the database schema.

Schema overview
---------------
users         A person who can host or join meetings. (Auth is out of scope per
              the brief, so a single default user is seeded and treated as the
              "logged-in" user, but the schema fully supports many users.)
meetings      A meeting room. Either ``instant`` (started now) or ``scheduled``
              (planned for the future). Identified publicly by a Zoom-style
              ``code`` like ``123-4567-890``.
participants  A join record linking a user (or an anonymous guest by name) to a
              meeting, capturing their role and live media state. One row per
              person per meeting session.

Relationships
-------------
User 1───* Meeting        (a user hosts many meetings)
User 1───* Participant    (a user appears in many meetings)
Meeting 1───* Participant  (a meeting has many participants)
"""
from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MeetingType(str, enum.Enum):
    instant = "instant"
    scheduled = "scheduled"


class MeetingStatus(str, enum.Enum):
    scheduled = "scheduled"  # planned, not started yet
    active = "active"        # currently live
    ended = "ended"          # finished


class ParticipantRole(str, enum.Enum):
    host = "host"
    participant = "participant"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    # A deterministic colour used for avatar fallbacks in the UI.
    avatar_color: Mapped[str] = mapped_column(String(9), default="#2D8CFF")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    hosted_meetings: Mapped[List["Meeting"]] = relationship(
        back_populates="host", cascade="all, delete-orphan"
    )
    participations: Mapped[List["Participant"]] = relationship(
        back_populates="user"
    )


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # Public, human-shareable identifier (e.g. "123-4567-890").
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    type: Mapped[MeetingType] = mapped_column(Enum(MeetingType), default=MeetingType.instant)
    status: Mapped[MeetingStatus] = mapped_column(
        Enum(MeetingStatus), default=MeetingStatus.active, index=True
    )

    host_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Scheduling fields (null for instant meetings).
    scheduled_start: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Lifecycle timestamps.
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    host: Mapped["User"] = relationship(back_populates="hosted_meetings")
    participants: Mapped[List["Participant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Nullable: a guest can join by display name without a user account.
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[ParticipantRole] = mapped_column(
        Enum(ParticipantRole), default=ParticipantRole.participant
    )

    # Live media state (updated over the websocket while in the room).
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_video_on: Mapped[bool] = mapped_column(Boolean, default=True)

    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    meeting: Mapped["Meeting"] = relationship(back_populates="participants")
    user: Mapped[Optional["User"]] = relationship(back_populates="participations")
