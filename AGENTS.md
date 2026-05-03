# MoSPAMS Agent Rules

## Required Technology Stack

This repository uses the following required backend stack:

- Backend: PHP + Laravel
- Database: MySQL
- Frontend: React + TypeScript + Vite

All agents working in this repository, including Codex and Claude, must follow this stack unless the user explicitly changes it.

## Backend Rules

- Build backend features inside a Laravel application.
- Use MySQL as the database.
- Use Laravel migrations for schema changes.
- Use Eloquent models for database access.
- Use Laravel controllers, Form Requests, middleware, policies, and feature tests where appropriate.
- Do not introduce Node/Express, Firebase, Supabase, MongoDB, SQLite, or another backend persistence layer unless explicitly requested by the user.

## Frontend Rules

- Keep the existing frontend in `Frontend/`.
- The frontend stack is React + TypeScript + Vite.
- Do not replace the frontend with Laravel Blade unless explicitly requested.
- Do not use frontend `localStorage` as production persistence once the Laravel backend exists.

## Project Direction

MoSPAMS is a Motorcycle Service and Parts Management System. Future backend work should support inventory, services, sales/transactions, reports, user roles, authentication, and activity logs.

See `docs/PROJECT_MEMORY.md` before planning or implementing major backend, frontend, role, or data-model changes.

## Database Schema Reference (`mospams_db`)

Use this as the source of truth when planning Eloquent models, migrations, API responses, and frontend types.

### activity_logs
| Column | Type | Notes |
|---|---|---|
| log_id | int | PK |
| user_id_fk | int | FK → users |
| action | varchar(100) | |
| table_name | varchar(100) | nullable |
| record_id | int | nullable |
| log_date | datetime | nullable |
| description | text | nullable |

### categories
| Column | Type | Notes |
|---|---|---|
| category_id | int | PK |
| category_name | varchar(100) | |
| description | text | nullable |
| category_status_id_fk | int | FK → category_statuses |
| updated_at | datetime | nullable |

### category_statuses
| Column | Type | Notes |
|---|---|---|
| category_status_id | int | PK |
| status_code | varchar(30) | UNIQUE |
| status_name | varchar(50) | |
| description | text | nullable |

### customers
| Column | Type | Notes |
|---|---|---|
| customer_id | int | PK |
| full_name | varchar(100) | |
| phone | varchar(20) | nullable |
| email | varchar(100) | nullable |
| address | text | nullable |
| created_at | datetime | nullable |
| updated_at | datetime | nullable |

### mechanics
| Column | Type | Notes |
|---|---|---|
| mechanic_id | int | PK |
| full_name | varchar(100) | |
| phone | varchar(20) | nullable |
| email | varchar(100) | nullable |
| address | text | nullable |
| created_at | datetime | nullable |
| mechanic_status_id_fk | int | FK → mechanic_statuses |
| updated_at | datetime | nullable |

### mechanic_statuses
| Column | Type | Notes |
|---|---|---|
| mechanic_status_id | int | PK |
| status_code | varchar(30) | UNIQUE |
| status_name | varchar(50) | |
| description | text | nullable |

### notifications
| Column | Type | Notes |
|---|---|---|
| notification_id | int | PK |
| user_id_fk | int | FK → users |
| notification_type | varchar(50) | |
| title | varchar(150) | |
| message | text | |
| reference_type | varchar(50) | nullable |
| reference_id | int | nullable |
| is_read | tinyint(1) | nullable |
| created_at | datetime | nullable |

### parts
| Column | Type | Notes |
|---|---|---|
| part_id | int | PK |
| category_id_fk | int | FK → categories |
| part_name | varchar(100) | |
| barcode | varchar(100) | nullable |
| description | text | nullable |
| unit_price | decimal(10,2) | |
| stock_quantity | int | |
| reorder_level | int | |
| part_status_id_fk | int | FK → part_statuses |
| created_at | datetime | nullable |
| updated_at | datetime | nullable |

### part_statuses
| Column | Type | Notes |
|---|---|---|
| part_status_id | int | PK |
| status_code | varchar(30) | UNIQUE |
| status_name | varchar(50) | |
| description | text | nullable |

### payments
| Column | Type | Notes |
|---|---|---|
| payment_id | int | PK |
| sale_id_fk | int | FK → sales |
| payment_method | varchar(50) | |
| amount_paid | decimal(10,2) | |
| payment_date | datetime | nullable |
| reference_number | varchar(100) | nullable |
| payment_status_id_fk | int | FK → payment_statuses |

### payment_statuses
| Column | Type | Notes |
|---|---|---|
| payment_status_id | int | PK |
| status_code | varchar(30) | UNIQUE |
| status_name | varchar(50) | |
| description | text | nullable |

### roles
| Column | Type | Notes |
|---|---|---|
| role_id | int | PK |
| role_name | varchar(50) | UNIQUE |

### sales
| Column | Type | Notes |
|---|---|---|
| sale_id | int | PK |
| customer_id_fk | int | FK → customers |
| job_id_fk | int | FK → service_jobs, nullable |
| processed_by_fk | int | FK → users |
| sale_type | varchar(30) | |
| total_amount | decimal(10,2) | |
| discount | decimal(10,2) | |
| net_amount | decimal(10,2) | |
| sale_date | datetime | nullable |
| updated_at | datetime | nullable |

### sale_items
| Column | Type | Notes |
|---|---|---|
| sale_item_id | int | PK |
| sale_id_fk | int | FK → sales |
| part_id_fk | int | FK → parts |
| quantity | int | |
| unit_price | decimal(10,2) | |
| subtotal | decimal(10,2) | |

### service_jobs
| Column | Type | Notes |
|---|---|---|
| job_id | int | PK |
| customer_id_fk | int | FK → customers |
| assigned_mechanic_id_fk | int | FK → mechanics, nullable |
| created_by_fk | int | FK → users |
| service_job_status_id_fk | int | FK → service_job_statuses |
| job_date | date | |
| completion_date | date | nullable |
| notes | text | nullable |
| updated_at | datetime | nullable |

### service_job_items
| Column | Type | Notes |
|---|---|---|
| job_item_id | int | PK |
| job_id_fk | int | FK → service_jobs |
| service_type_id_fk | int | FK → service_types |
| labor_cost | decimal(10,2) | |
| remarks | text | nullable |

### service_job_parts
| Column | Type | Notes |
|---|---|---|
| job_part_id | int | PK |
| job_id_fk | int | FK → service_jobs |
| part_id_fk | int | FK → parts |
| quantity | int | |
| unit_price | decimal(10,2) | |
| subtotal | decimal(10,2) | |

### service_job_statuses
| Column | Type | Notes |
|---|---|---|
| service_job_status_id | int | PK |
| status_code | varchar(30) | UNIQUE |
| status_name | varchar(50) | |
| description | text | nullable |

### service_types
| Column | Type | Notes |
|---|---|---|
| service_type_id | int | PK |
| service_name | varchar(100) | |
| description | text | nullable |
| labor_cost | decimal(10,2) | |
| estimated_duration | varchar(50) | nullable |
| service_type_status_id_fk | int | FK → service_type_statuses |
| updated_at | datetime | nullable |

### service_type_statuses
| Column | Type | Notes |
|---|---|---|
| service_type_status_id | int | PK |
| status_code | varchar(30) | UNIQUE |
| status_name | varchar(50) | |
| description | text | nullable |

### stock_movements
| Column | Type | Notes |
|---|---|---|
| movement_id | int | PK |
| part_id_fk | int | FK → parts |
| user_id_fk | int | FK → users |
| movement_type | varchar(30) | |
| quantity | int | |
| reference_type | varchar(50) | nullable |
| reference_id | int | nullable |
| movement_date | datetime | nullable |
| remarks | text | nullable |

### users
| Column | Type | Notes |
|---|---|---|
| user_id | int | PK |
| role_id_fk | int | FK → roles |
| full_name | varchar(100) | |
| username | varchar(50) | UNIQUE |
| password_hash | varchar(255) | |
| user_status_id_fk | int | FK → user_statuses |
| created_at | datetime | nullable |
| updated_at | datetime | nullable |

### user_statuses
| Column | Type | Notes |
|---|---|---|
| user_status_id | int | PK |
| status_code | varchar(30) | UNIQUE |
| status_name | varchar(50) | |
| description | text | nullable |

### Views

**vw_low_stock_parts** — parts where stock_quantity < reorder_level
| Column | Type |
|---|---|
| part_id | int |
| part_name | varchar(100) |
| barcode | varchar(100) |
| category_name | varchar(100) |
| stock_quantity | int |
| reorder_level | int |
| shortage | bigint |

**vw_service_job_totals** — aggregated labor + parts cost per job
| Column | Type |
|---|---|
| job_id | int |
| job_date | date |
| customer_name | varchar(100) |
| mechanic_name | varchar(100) |
| status | varchar(50) |
| labor_total | decimal(32,2) |
| parts_total | decimal(32,2) |
| grand_total | decimal(33,2) |

# Repository Instructions

- For every backend code change under `backend/`, update the documentation in `docs/backend/`.
- Update any affected backend guide with the changed logic, routes, schemas, models, migrations, or configuration.
- If a backend change affects runtime behavior, document how to test it.
- Do not implement hardcoded answers or preset question-to-answer mappings for chat. Responses must be generated from model reasoning based on the user's prompt and available context.
- When git merging, ensure that ONLY the `pilot` branch has the `seeder/` folder. It MUST NOT be present in `preproduction` or `production` branches.

