import uuid
import time
from typing import Optional
from ..config import get_settings


class SearchSession:
    def __init__(self, session_id: str, person_id: str, photo_ids: list[str], created_at: float):
        self.session_id = session_id
        self.person_id = person_id
        self.photo_ids = photo_ids
        self.created_at = created_at


class SessionManager:
    def __init__(self):
        self._sessions: dict[str, SearchSession] = {}

    def create_session(self, person_id: str, photo_ids: list[str]) -> str:
        settings = get_settings()
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = SearchSession(
            session_id=session_id,
            person_id=person_id,
            photo_ids=photo_ids,
            created_at=time.time(),
        )
        self._cleanup_expired(settings.search_session_minutes)
        return session_id

    def get_session(self, session_id: str) -> Optional[SearchSession]:
        settings = get_settings()
        session = self._sessions.get(session_id)
        if session is None:
            return None
        elapsed = time.time() - session.created_at
        if elapsed > settings.search_session_minutes * 60:
            del self._sessions[session_id]
            return None
        return session

    def is_photo_in_session(self, session_id: str, photo_id: str) -> bool:
        session = self.get_session(session_id)
        if session is None:
            return False
        return photo_id in session.photo_ids

    def _cleanup_expired(self, max_minutes: int):
        now = time.time()
        expired = [
            sid for sid, s in self._sessions.items()
            if now - s.created_at > max_minutes * 60
        ]
        for sid in expired:
            del self._sessions[sid]


session_manager = SessionManager()
