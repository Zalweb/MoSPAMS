from collections import defaultdict
import config

_sessions: dict[str, list[dict]] = defaultdict(list)

def get_history(session_id: str) -> list[dict]:
    return list(_sessions[session_id][-config.MAX_HISTORY_MESSAGES:])

def append_message(session_id: str, role: str, content: str) -> None:
    _sessions[session_id].append({"role": role, "content": content})
    cap = config.MAX_HISTORY_MESSAGES * 2
    if len(_sessions[session_id]) > cap:
        _sessions[session_id] = _sessions[session_id][-config.MAX_HISTORY_MESSAGES:]

def clear_session(session_id: str) -> None:
    _sessions.pop(session_id, None)
