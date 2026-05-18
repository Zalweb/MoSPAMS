OWNER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_low_stock_parts",
            "description": "Returns parts that are at or below their reorder level.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_revenue",
            "description": "Returns total net revenue for a date range.",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "to_date":   {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_service_jobs",
            "description": "Returns service jobs filtered by status and/or date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status":    {"type": "string", "description": "pending | in_progress | completed"},
                    "from_date": {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_mechanic_performance",
            "description": "Returns jobs completed per mechanic.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_sales",
            "description": "Returns the N most recent transactions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Number of records (default 5)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_parts",
            "description": "Returns best-selling parts by units sold.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Top N parts (default 5)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_info",
            "description": "Returns a customer's profile and service history by name or email.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Name or email to search"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_count",
            "description": "Returns the total number of customers registered in the shop.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]

CUSTOMER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_my_service_history",
            "description": "Returns the customer's own service job history.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_payments",
            "description": "Returns the customer's own payment records.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_service_info",
            "description": "Returns available service types with price and duration.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_shop_info",
            "description": "Returns the shop/website name, business hours, address, phone, and email. Use this for any question about the shop name, website name, contact details, or opening hours.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_profile",
            "description": "Returns the current customer's own profile: name, email, phone, and account details. Use this when the customer asks about their own info, name, or account.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_service_request",
            "description": "Books a new service job for the customer's motorcycle.",
            "parameters": {
                "type": "object",
                "properties": {
                    "service_type_id": {"type": "integer"},
                    "motorcycle_model": {"type": "string"},
                    "notes": {"type": "string"},
                    "job_date": {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": ["service_type_id", "motorcycle_model", "job_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_service_request",
            "description": "Cancels a pending service job. Only works if status is pending.",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_id": {"type": "integer"},
                },
                "required": ["job_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_vehicle",
            "description": "Registers a new motorcycle under the customer's account.",
            "parameters": {
                "type": "object",
                "properties": {
                    "make":         {"type": "string"},
                    "model":        {"type": "string"},
                    "year":         {"type": "integer"},
                    "plate_number": {"type": "string"},
                },
                "required": ["make", "model", "year", "plate_number"],
            },
        },
    },
]
