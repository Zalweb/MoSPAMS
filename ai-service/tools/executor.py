from __future__ import annotations
import json
import httpx
import config

def _headers(shop_id: int) -> dict:
    return {
        "Authorization": f"Bearer {config.INTERNAL_SERVICE_TOKEN}",
        "X-Shop-Id": str(shop_id),
        "Accept": "application/json",
    }

def _get(path: str, shop_id: int, params: dict | None = None) -> str:
    url = f"{config.LARAVEL_INTERNAL_URL}{path}"
    resp = httpx.get(url, headers=_headers(shop_id), params=params or {}, timeout=15.0)
    resp.raise_for_status()
    return json.dumps(resp.json())

def _post(path: str, shop_id: int, body: dict) -> str:
    url = f"{config.LARAVEL_INTERNAL_URL}{path}"
    resp = httpx.post(url, headers=_headers(shop_id), json=body, timeout=15.0)
    resp.raise_for_status()
    return json.dumps(resp.json())

def _patch(path: str, shop_id: int) -> str:
    url = f"{config.LARAVEL_INTERNAL_URL}{path}"
    resp = httpx.patch(url, headers=_headers(shop_id), timeout=15.0)
    resp.raise_for_status()
    return json.dumps(resp.json())

def execute_tool(name: str, arguments: dict, shop_id: int, user_id: int) -> str:
    try:
        match name:
            case "get_low_stock_parts":
                return _get("/api/internal/parts/low-stock", shop_id)
            case "get_revenue":
                return _get("/api/internal/revenue", shop_id, {
                    "from_date": arguments.get("from_date", ""),
                    "to_date":   arguments.get("to_date", ""),
                })
            case "get_service_jobs":
                return _get("/api/internal/service-jobs", shop_id, {
                    "status":    arguments.get("status", ""),
                    "from_date": arguments.get("from_date", ""),
                })
            case "get_mechanic_performance":
                return _get("/api/internal/mechanics/performance", shop_id)
            case "get_recent_sales":
                return _get("/api/internal/sales/recent", shop_id, {
                    "limit": arguments.get("limit", 5)
                })
            case "get_top_parts":
                return _get("/api/internal/parts/top", shop_id, {
                    "limit": arguments.get("limit", 5)
                })
            case "get_customer_info":
                return _get("/api/internal/customer/search", shop_id, {
                    "query": arguments.get("query", "")
                })
            case "get_customer_count":
                return _get("/api/internal/customers/count", shop_id)
            case "get_my_service_history":
                return _get(f"/api/internal/customer/{user_id}/services", shop_id)
            case "get_my_payments":
                return _get(f"/api/internal/customer/{user_id}/payments", shop_id)
            case "get_service_info":
                return _get("/api/internal/service-types", shop_id)
            case "get_shop_info":
                return _get("/api/internal/shop-info", shop_id)
            case "create_service_request":
                return _post("/api/internal/service-request", shop_id, {
                    **arguments, "user_id": user_id
                })
            case "cancel_service_request":
                return _patch(f"/api/internal/service-request/{arguments['job_id']}/cancel", shop_id)
            case "create_vehicle":
                return _post("/api/internal/customer/vehicle", shop_id, {
                    **arguments, "user_id": user_id
                })
            case _:
                return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})
