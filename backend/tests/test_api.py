"""API tests covering the core meeting workflows from the assignment spec."""
import re

CODE_RE = re.compile(r"^\d{3}-\d{4}-\d{3}$")


def test_health(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_default_user(client):
    r = client.get("/api/me")
    assert r.status_code == 200
    body = r.json()
    assert body["name"]
    assert "@" in body["email"]


def test_seeded_dashboard(client):
    r = client.get("/api/meetings")
    assert r.status_code == 200
    data = r.json()
    assert len(data["upcoming"]) >= 1  # scheduled meetings seeded
    assert len(data["recent"]) >= 1    # ended meetings seeded


def test_instant_meeting_has_unique_code_and_link(client):
    r1 = client.post("/api/meetings/instant", json={})
    r2 = client.post("/api/meetings/instant", json={"title": "Standup"})
    assert r1.status_code == 201 and r2.status_code == 201
    m1, m2 = r1.json(), r2.json()
    assert CODE_RE.match(m1["code"]) and CODE_RE.match(m2["code"])
    assert m1["code"] != m2["code"]                     # unique
    assert m1["invite_link"].endswith(m1["code"])       # shareable link
    assert m1["status"] == "active"
    assert m2["title"] == "Standup"


def test_get_meeting_by_code(client):
    created = client.post("/api/meetings/instant", json={}).json()
    r = client.get(f"/api/meetings/{created['code']}")
    assert r.status_code == 200
    assert r.json()["code"] == created["code"]


def test_get_nonexistent_meeting_returns_404(client):
    r = client.get("/api/meetings/000-0000-000")
    assert r.status_code == 404


def test_join_creates_participant_and_first_is_host(client):
    created = client.post("/api/meetings/instant", json={}).json()
    r = client.post(f"/api/meetings/{created['code']}/join", json={"display_name": "Alice"})
    assert r.status_code == 200
    body = r.json()
    assert body["participant"]["display_name"] == "Alice"
    assert body["participant"]["role"] == "host"  # first joiner hosts


def test_join_requires_display_name(client):
    created = client.post("/api/meetings/instant", json={}).json()
    r = client.post(f"/api/meetings/{created['code']}/join", json={"display_name": ""})
    assert r.status_code == 422  # validation error


def test_schedule_meeting_appears_in_upcoming(client):
    payload = {
        "title": "Quarterly Review",
        "description": "Numbers and roadmap",
        "scheduled_start": "2099-01-01T10:00:00Z",
        "duration_minutes": 60,
    }
    r = client.post("/api/meetings/schedule", json=payload)
    assert r.status_code == 201
    created = r.json()
    assert created["type"] == "scheduled"
    assert created["status"] == "scheduled"
    assert created["duration_minutes"] == 60

    upcoming = client.get("/api/meetings").json()["upcoming"]
    assert any(m["code"] == created["code"] for m in upcoming)


def test_end_meeting(client):
    created = client.post("/api/meetings/instant", json={}).json()
    r = client.post(f"/api/meetings/{created['code']}/end")
    assert r.status_code == 200
    assert r.json()["status"] == "ended"
    # Ended meetings are rejected for new joins.
    j = client.post(f"/api/meetings/{created['code']}/join", json={"display_name": "Late"})
    assert j.status_code == 410


def test_oversized_body_rejected(client):
    big = {"title": "x" * (300 * 1024)}
    r = client.post("/api/meetings/instant", json=big)
    assert r.status_code == 413
