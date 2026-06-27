"""Pydantic v2 schemas — the API request/response contracts.

Keeping these separate from the ORM models gives us a validated, explicit API
surface and avoids leaking database internals to clients.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from .models import MeetingStatus, MeetingType, ParticipantRole


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    avatar_color: str


# --------------------------------------------------------------------------- #
# Participants
# --------------------------------------------------------------------------- #
class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    role: ParticipantRole
    is_muted: bool
    is_video_on: bool
    joined_at: datetime
    left_at: Optional[datetime] = None


# --------------------------------------------------------------------------- #
# Meetings
# --------------------------------------------------------------------------- #
class MeetingBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)


class InstantMeetingCreate(MeetingBase):
    title: str = Field(default="Instant Meeting", min_length=1, max_length=200)


class ScheduledMeetingCreate(MeetingBase):
    scheduled_start: datetime
    duration_minutes: int = Field(default=30, ge=1, le=1440)


class MeetingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    title: str
    description: Optional[str]
    type: MeetingType
    status: MeetingStatus
    host: UserOut
    scheduled_start: Optional[datetime]
    duration_minutes: Optional[int]
    created_at: datetime
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    invite_link: str
    participant_count: int = 0


class MeetingListOut(BaseModel):
    upcoming: List[MeetingOut]
    recent: List[MeetingOut]


class JoinRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=120)


class JoinResponse(BaseModel):
    meeting: MeetingOut
    participant: ParticipantOut
