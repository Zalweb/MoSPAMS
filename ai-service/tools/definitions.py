_DB_OPERATION_TOOL = {
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
                    "enum": ["list", "count", "get", "create", "update"],
                    "description": (
                        "list=get multiple records, count=get total number, "
                        "get=single record by record_id, create=insert new record, update=modify existing record"
                    ),
                },
                "entity": {
                    "type": "string",
                    "description": (
                        "customers | service_jobs | parts | mechanics | sales | "
                        "service_types | shop | user_profile | payments"
                    ),
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

OWNER_TOOLS    = [_DB_OPERATION_TOOL]
STAFF_TOOLS    = [_DB_OPERATION_TOOL]
MECHANIC_TOOLS = [_DB_OPERATION_TOOL]
CUSTOMER_TOOLS = [_DB_OPERATION_TOOL]
