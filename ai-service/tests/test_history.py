# ai-service/tests/test_history.py
def test_append_and_get():
    from chat.history import append_message, get_history
    append_message("sess-1", "user", "Hello")
    append_message("sess-1", "assistant", "Hi there!")
    history = get_history("sess-1")
    assert len(history) == 2
    assert history[0]["role"] == "user"

def test_history_trimmed_to_max():
    from chat.history import append_message, get_history, _sessions
    _sessions.clear()
    for i in range(25):
        append_message("sess-2", "user", f"msg {i}")
    history = get_history("sess-2")
    assert len(history) <= 10

def test_different_sessions_isolated():
    from chat.history import append_message, get_history, _sessions
    _sessions.clear()
    append_message("sess-A", "user", "session A message")
    append_message("sess-B", "user", "session B message")
    assert get_history("sess-A")[0]["content"] == "session A message"
    assert get_history("sess-B")[0]["content"] == "session B message"
