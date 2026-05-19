def _make_tool(entity_list: str, action_list: list[str]) -> dict:
    return {
        "type": "function",
        "function": {
            "name": "execute_db_operation",
            "description": (
                "The universal database tool. Use this for EVERY question or request about shop data. "
                "Supports reading, listing, counting, creating, and updating any entity. "
                "Never say you cannot access data — call this tool first."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": action_list,
                        "description": (
                            "list=get multiple records, count=get total number, "
                            "get=single record by record_id, create=insert new record, update=modify existing record"
                        ),
                    },
                    "entity": {
                        "type": "string",
                        "description": entity_list,
                    },
                    "filters": {
                        "type": "object",
                        "description": (
                            "Key-value filter conditions. Examples: "
                            "{\"status\": \"completed\"}, {\"name\": \"John\"}, "
                            "{\"from_date\": \"2025-01-01\"}, {\"low_stock\": true}, "
                            "{\"category\": \"Engine Parts\"}"
                        ),
                    },
                    "data": {
                        "type": "object",
                        "description": (
                            "For create/update: field values to set. Examples: "
                            "{\"notes\": \"Oil changed\"}, {\"status\": \"completed\"}, "
                            "{\"stock_quantity\": 10}"
                        ),
                    },
                    "record_id": {
                        "type": "integer",
                        "description": "For get/update: the primary key ID of the target record.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max records for list action. Default 20, max 100.",
                    },
                    "order_by": {
                        "type": "string",
                        "description": "Sort field + direction: 'job_date desc', 'full_name asc', 'created_at desc'",
                    },
                },
                "required": ["action", "entity"],
            },
        },
    }


# Owner — full CRU on all entities
OWNER_TOOLS = [_make_tool(
    entity_list=(
        "customers | service_jobs | parts | mechanics | sales | "
        "service_types | shop | user_profile | payments | job_parts"
    ),
    action_list=["list", "count", "get", "create", "update"],
)]

# Staff — no financial data (sales/payments hidden from schema); CRU on customers + service_jobs only
STAFF_TOOLS = [_make_tool(
    entity_list=(
        "customers | service_jobs | parts | mechanics | "
        "service_types | shop | user_profile | job_parts"
    ),
    action_list=["list", "count", "get", "create", "update"],
)]

# Mechanic — own jobs only; can update jobs but not create new ones
MECHANIC_TOOLS = [_make_tool(
    entity_list="service_jobs | job_parts | user_profile",
    action_list=["list", "count", "get", "update"],
)]

# Customer — own data only; can book (create) service jobs but not modify existing records
CUSTOMER_TOOLS = [_make_tool(
    entity_list="service_jobs | job_parts | payments | service_types | shop | user_profile",
    action_list=["list", "count", "get", "create"],
)]
