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
