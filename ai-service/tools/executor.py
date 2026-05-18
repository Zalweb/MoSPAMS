from __future__ import annotations
import json
import httpx
import config


def _headers(shop_id: int, user_id: int, role: str) -> dict:
    return {
        "Authorization": f"Bearer {config.INTERNAL_SERVICE_TOKEN}",
        "X-Shop-Id":    str(shop_id),
        "X-User-Id":    str(user_id),
        "X-User-Role":  role,
        "Accept":       "application/json",
    }


def execute_tool(
    name: str,
    arguments: dict,
    shop_id: int,
    user_id: int,
    role: str = "customer",
) -> str:
    try:
        if name != "execute_db_operation":
            return json.dumps({"error": f"Unknown tool: {name}"})

        url  = f"{config.LARAVEL_INTERNAL_URL}/api/internal/db"
        resp = httpx.post(
            url,
            headers=_headers(shop_id, user_id, role),
            json=arguments,
            timeout=15.0,
        )
        resp.raise_for_status()
        return json.dumps(resp.json())
    except httpx.HTTPStatusError as e:
        try:
            err = e.response.json()
        except Exception:
            err = {"error": e.response.text}
        return json.dumps(err)
    except Exception as e:
        return json.dumps({"error": str(e)})
