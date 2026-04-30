# MoSPAMS Project Memory

MoSPAMS is a Motorcycle Service and Parts Management System for small-to-medium motorcycle repair shops and parts retailers.

## Product Direction

- The app is web-based now and may later be wrapped with Capacitor to produce an APK.
- Production data must be shared through a backend database, not saved only on one browser or device.
- The required stack is PHP + Laravel + MySQL for the backend and React + TypeScript + Vite for the frontend.
- Version 1 stays aligned to the project document features: inventory, service jobs, sales/transactions, reports, users, roles, authentication, and activity logs.

## Role Direction

- Version 1 exposes Admin and Staff workflows.
- Admin has full system access, including users, reports, deletes, and audit logs.
- Staff has operational access to inventory viewing/stock movement, service jobs, and sales.
- Mechanic and Customer roles must exist in the backend schema now for future expansion.
- Future Mechanics should be able to track assigned jobs and job-related payables.
- Future Customers should be able to track service status, payments, and parts used so they know when to return to the shop.

## Implementation Defaults

- Backend lives in `Backend/`.
- MySQL database name is `mospams_db`.
- Local MySQL runs through Docker Compose.
- Laravel runs locally through PHP/Artisan.
- Frontend should call the Laravel API and avoid browser persistence for production data.
