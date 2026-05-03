# MoSPAMS - Product Overview

## Purpose
MoSPAMS (Motorcycle Service and Parts Management System) is a web-based business management platform for small-to-medium motorcycle repair shops and parts retailers. It centralizes inventory, service jobs, sales, and reporting into a single system accessible by shop staff and administrators.

## Value Proposition
- Replaces manual/paper-based shop management with a digital system
- Provides real-time inventory tracking and stock movement history
- Enables service job tracking from booking to completion
- Delivers sales and income reporting for business decisions
- Supports future mobile deployment via Capacitor APK wrapping

## Key Features

### Inventory Management
- Parts catalog with categories
- Stock movement tracking (in/out)
- Low-stock visibility

### Service Management
- Service job creation and tracking
- Service type catalog management
- Mechanic assignment to jobs

### Sales & Transactions
- Transaction recording with parts and services
- Payment tracking
- Sales history

### Reports
- Sales reports
- Inventory reports
- Services reports
- Income reports

### User & Access Management
- Role-based access control (Admin, Staff, Mechanic, Customer)
- User creation, status management, and deletion (Admin only)
- Role upgrade request and approval workflow
- Activity/audit logs (Admin only)

### Customer Portal
- Service booking
- Service history viewing
- Payment tracking

## Target Users

| Role | Access Level |
|------|-------------|
| Admin | Full system access: users, reports, deletes, audit logs, all operations |
| Staff | Operational: inventory viewing/stock movement, service jobs, sales |
| Mechanic | Future: assigned job tracking, job-related payables |
| Customer | Future: service status, payments, parts used history |

## Current Version Scope (V1 MVP)
Version 1 implements Admin and Staff workflows. Mechanic and Customer roles exist in the schema for future expansion but have limited active functionality.

## Deployment
- Web-based application (primary)
- Backend hosted on a server with MySQL database
- Frontend deployed on Vercel (`mospams-frontend.vercel.app`)
- Future: Capacitor APK wrapping for mobile
