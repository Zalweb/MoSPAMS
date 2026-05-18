# ai-service/tests/test_router.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

@pytest.fixture
def client():
    from main import app
    return TestClient(app)

def test_chat_owner_returns_response(client):
    with patch("chat.handler.handle_chat", new_callable=AsyncMock, return_value="You have 3 low parts"):
        resp = client.post("/chat/owner", json={
            "shop_id": 1, "user_id": 1, "role": "owner",
            "session_id": "s1", "message": "Low stock?"
        })
    assert resp.status_code == 200
    assert resp.json()["response"] == "You have 3 low parts"

def test_chat_missing_message_returns_422(client):
    resp = client.post("/chat/owner", json={"shop_id": 1})
    assert resp.status_code == 422

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
