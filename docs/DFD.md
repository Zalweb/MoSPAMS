# MoSPAMS — Data Flow Diagram

> **System:** Motorcycle Service and Parts Management System (Multi-Tenant SaaS)
> **Stack:** React + TypeScript (Frontend) · Laravel (API) · MySQL (Database)
> **Generated from:** live codebase — routes, migrations, and feature modules

---

## Level 0 — Context Diagram

Highest-level view. Shows all external entities and what they send to and receive from the platform.

```mermaid
flowchart LR
    C([Customer])
    O([Owner / Staff])
    M([Mechanic])
    SA([SuperAdmin])
    G([Google OAuth])
    PM([PayMongo])

    SYS(("MoSPAMS\nPlatform"))

    C -->|"Registration, vehicle info,\nservice requests, payment"| SYS
    SYS -->|"Service status, receipts,\nnotifications, history"| C

    O -->|"Shop setup, inventory,\nservices, sales, report requests"| SYS
    SYS -->|"Dashboards, reports,\naudit logs, alerts"| O

    M -->|"Job progress, remarks,\ncompletion updates"| SYS
    SYS -->|"Assigned jobs,\nservice details"| M

    SA -->|"Shop approval, subscriptions,\nplatform config"| SYS
    SYS -->|"Platform analytics,\ntenant audit data"| SA

    G -->|"OAuth token + profile"| SYS
    SYS -->|"Auth request"| G

    PM -->|"Payment webhook confirmation"| SYS
    SYS -->|"Payment charge request"| PM
```

---

## Level 1 — Major Processes

Breaks the system into its eight major functional processes and the data stores they access.

```mermaid
flowchart TB
    C([Customer])
    O([Owner / Staff])
    M([Mechanic])
    SA([SuperAdmin])
    G([Google OAuth])
    PM([PayMongo])

    P1(("1.0\nAuth &\nAccess Control"))
    P2(("2.0\nShop Registration\n& Administration"))
    P3(("3.0\nCustomer & Mechanic\nManagement"))
    P4(("4.0\nInventory\nManagement"))
    P5(("5.0\nService Job\nManagement"))
    P6(("6.0\nSales & Payment\nProcessing"))
    P7(("7.0\nReporting &\nAnalytics"))
    P8(("8.0\nSuperAdmin Platform\nManagement"))

    D1[(D1\nAccounts &\nAccess Control)]
    D2[(D2\nShops &\nSubscriptions)]
    D3[(D3\nCustomers &\nMechanics)]
    D4[(D4\nInventory)]
    D5[(D5\nService Jobs)]
    D6[(D6\nSales &\nPayments)]
    D7[(D7\nAudit &\nNotifications)]

    C & O & M & SA -->|"Credentials / session"| P1
    G -->|"OAuth token"| P1
    P1 <-->|"Account, membership, role"| D1
    P1 <-->|"Shop status, subdomain"| D2
    P1 -->|"Auth token, role context"| C & O & M & SA

    O -->|"Shop setup, branding, domain"| P2
    SA -->|"Approval, suspension"| P2
    P2 <-->|"Shop records, plans, payments"| D2
    P2 <-->|"User memberships"| D1

    O -->|"Customer / mechanic actions"| P3
    C -->|"Vehicle registration"| P3
    P3 <-->|"Customer & mechanic records"| D3
    P3 -->|"Profile and vehicle data"| C & O

    O -->|"Part CRUD, stock adjustments"| P4
    P4 <-->|"Parts, categories"| D4
    P4 -->|"Stock levels, alerts"| O

    O & M -->|"Job creation, progress, completion"| P5
    P5 <-->|"Customers, mechanics"| D3
    P5 <-->|"Jobs, labor, parts used"| D5
    P5 <-->|"Deduct stock"| D4
    P5 -->|"Job status, totals"| O & M & C

    O -->|"Sale details, payment info"| P6
    PM -->|"Webhook: payment result"| P6
    P6 <-->|"Sales, payments"| D6
    P6 <-->|"Part stock deduction"| D4
    P6 -->|"Receipt, payment status"| O & C
    P6 -->|"Charge request"| PM

    O & SA -->|"Report requests"| P7
    P7 -->|"Queries"| D4 & D5 & D6
    P7 -->|"Dashboards, reports"| O & SA

    SA -->|"Platform actions"| P8
    P8 <-->|"All shops, subscriptions, analytics"| D2
    P8 <-->|"Platform admins, audit logs"| D1 & D7
    P8 -->|"Platform status, reports"| SA

    P1 & P2 & P3 & P4 & P5 & P6 -->|"Events"| D7
```

---

## Level 2 — Authentication & Access Control

```mermaid
flowchart LR
    U([Any User])
    G([Google OAuth])

    L(("1.1\nEmail/Password\nLogin"))
    R(("1.2\nUser Registration"))
    GO(("1.3\nGoogle OAuth\nLogin"))
    TC(("1.4\nTenant &\nRole Resolution"))
    JS(("1.5\nJoin Shop"))

    D1[(Accounts)]
    D2[(Shop Memberships)]
    D3[(Shops)]
    D7[(Activity Logs)]

    U -->|"Email + password"| L
    L <-->|"Verify credentials"| D1
    L -->|"Unscoped token"| TC

    U -->|"Name, email, password"| R
    R -->|"Create account"| D1
    R -->|"Registration log"| D7

    U -->|"Google login intent"| GO
    GO -->|"Auth request"| G
    G -->|"Token + profile"| GO
    GO <-->|"Upsert account"| D1
    GO -->|"Unscoped token"| TC

    TC <-->|"Read memberships & roles"| D2
    TC <-->|"Read shop status & subdomain"| D3
    TC -->|"Scoped token: role + shop context"| U

    U -->|"Shop code / invite"| JS
    JS -->|"Create membership"| D2
    JS -->|"Joined log"| D7
```

---

## Level 2 — Shop Registration & Administration

```mermaid
flowchart LR
    PA([Prospective Owner])
    O([Owner])
    SA([SuperAdmin])

    REG(("2.1\nPublic Shop\nRegistration"))
    APR(("2.2\nSuperAdmin\nApproval"))
    SUB(("2.3\nSubscription\nManagement"))
    BRD(("2.4\nBranding &\nDomain Setup"))

    DS[(Shops)]
    DP[(Subscription Plans)]
    DSP[(Shop Subscriptions)]
    DM[(Shop Memberships)]
    DL[(Activity Logs)]

    PA -->|"Shop name, contact, owner details"| REG
    REG -->|"Pending shop record"| DS
    REG -->|"Membership: Owner role"| DM
    REG -->|"Registration event"| DL

    SA -->|"Approve / reject / suspend"| APR
    APR <-->|"Update shop status"| DS
    APR -->|"Approval log"| DL

    SA -->|"Assign plan"| SUB
    O -->|"Upgrade / renew"| SUB
    SUB <-->|"Subscription plans"| DP
    SUB -->|"Active subscription record"| DSP

    O -->|"Logo, colors, shop name"| BRD
    BRD -->|"Branding fields"| DS
    O -->|"Subdomain / custom domain request"| BRD
    BRD -->|"Domain status"| DS
```

---

## Level 2 — Inventory Management

```mermaid
flowchart LR
    OS([Owner / Staff])

    MP(("4.1\nManage Parts\n& Categories"))
    SM(("4.2\nRecord Stock\nMovement"))
    LS(("4.3\nLow-Stock\nCheck"))

    DP[(Parts)]
    DC[(Categories)]
    DM[(Stock Movements)]
    DN[(Notifications)]
    DL[(Activity Logs)]

    OS -->|"Part / category form"| MP
    MP <-->|"Create, update, deactivate"| DP
    MP <-->|"Category assignment"| DC
    MP -->|"Inventory event"| DL

    OS -->|"Stock adjustment"| SM
    SM -->|"Update quantity"| DP
    SM -->|"Movement record"| DM
    SM -->|"Stock event"| DL
    SM -->|"Updated level"| LS

    LS <-->|"Read stock quantities"| DP
    LS -->|"Low-stock alert"| DN
    LS -->|"Alert result"| OS
```

---

## Level 2 — Service Job Management

```mermaid
flowchart LR
    C([Customer])
    OS([Owner / Staff])
    ME([Mechanic])

    CJ(("5.1\nCreate\nJob"))
    AM(("5.2\nAssign\nMechanic"))
    WK(("5.3\nRecord Work\n& Parts Used"))
    CMP(("5.4\nComplete Job\n& Bill"))

    DC[(Customers)]
    DM[(Mechanics)]
    DJ[(Service Jobs)]
    DI[(Job Items / Labor)]
    DJP[(Job Parts)]
    DP[(Parts)]
    DSM[(Stock Movements)]
    DN[(Notifications)]
    DL[(Activity Logs)]

    C -->|"Service request"| OS
    OS -->|"Job details"| CJ
    CJ <-->|"Customer lookup"| DC
    CJ -->|"New job record"| DJ
    CJ -->|"Job created log"| DL

    OS -->|"Assign mechanic"| AM
    AM <-->|"Mechanic availability"| DM
    AM -->|"Mechanic + status"| DJ
    AM -->|"Assignment alert"| DN

    ME & OS -->|"Labor lines, parts consumed"| WK
    WK -->|"Labor records"| DI
    WK -->|"Parts-used records"| DJP
    WK -->|"Deduct stock"| DP
    WK -->|"Movement records"| DSM
    WK -->|"Progress log"| DL

    WK --> CMP
    CMP -->|"Final status + date"| DJ
    CMP -->|"Completion notice"| DN
    CMP -->|"Job summary"| OS & C
```

---

## Level 2 — Sales & Payment Processing

```mermaid
flowchart LR
    OS([Owner / Staff])
    C([Customer])
    PM([PayMongo])

    CS(("6.1\nCreate Sale\n& Validate"))
    RP(("6.2\nRecord\nPayment"))
    GR(("6.3\nGenerate Receipt\n& Log"))

    DCU[(Customers)]
    DSJ[(Service Jobs)]
    DPT[(Parts)]
    DS[(Sales)]
    DSI[(Sale Items)]
    DPY[(Payments)]
    DSM[(Stock Movements)]
    DN[(Notifications)]
    DL[(Activity Logs)]

    C -->|"Purchase details"| OS
    OS -->|"Customer, items, discount, type"| CS
    CS <-->|"Customer lookup"| DCU
    CS <-->|"Job reference (if service billing)"| DSJ
    CS <-->|"Price & stock check"| DPT
    CS -->|"Sale header"| DS
    CS -->|"Line items"| DSI
    CS -->|"Deduct sold stock"| DPT
    CS -->|"Movement record"| DSM

    OS -->|"Method, amount, reference"| RP
    PM -->|"Webhook: payment confirmed"| RP
    RP -->|"Payment record"| DPY
    RP --> GR

    GR -->|"Transaction alert"| DN
    GR -->|"Audit entries"| DL
    GR -->|"Receipt + status"| OS & C
```

---

## Level 2 — SuperAdmin Platform Management

```mermaid
flowchart LR
    SA([SuperAdmin])

    MS(("8.1\nManage Shops\n& Approvals"))
    MP(("8.2\nManage\nSubscriptions"))
    AN(("8.3\nPlatform\nAnalytics"))
    AU(("8.4\nAudit &\nAdmin Users"))

    DS[(Shops)]
    DP[(Subscription Plans)]
    DSP[(Shop Subscriptions)]
    DA[(Platform Admins)]
    DL[(Audit Logs)]

    SA -->|"Approve, suspend, delete"| MS
    MS <-->|"Shop records"| DS
    MS -->|"Status change log"| DL

    SA -->|"Create / modify plans, assign subscriptions"| MP
    MP <-->|"Subscription plans"| DP
    MP <-->|"Shop subscriptions"| DSP

    SA -->|"Analytics request"| AN
    AN -->|"Aggregated queries"| DS & DSP
    AN -->|"Platform reports, revenue, growth"| SA

    SA -->|"Add / remove admins"| AU
    AU <-->|"Platform admin records"| DA
    AU <-->|"Audit log queries"| DL
    AU -->|"Admin list, audit trail"| SA
```

---

## Data Stores Reference

| ID | Store | Key Tables | Purpose |
|----|-------|-----------|---------|
| D1 | Accounts & Access Control | `accounts`, `shop_memberships`, `platform_admins`, `roles` | Identity, authentication, role-based access, tenant membership |
| D2 | Shops & Subscriptions | `shops`, `subscription_plans`, `shop_subscriptions`, `subscription_payments` | Multi-tenant shop records, billing tiers, domain config, branding |
| D3 | Customers & Mechanics | `customers`, `mechanics`, `customer_vehicles`, `mechanic_statuses` | Customer profiles, vehicles, mechanic records and availability |
| D4 | Inventory | `parts`, `categories`, `part_statuses`, `category_statuses` | Parts catalog, pricing, stock quantities, category classification |
| D5 | Service Jobs | `service_jobs`, `service_job_items`, `service_job_parts`, `service_types` | Job lifecycle, labor lines, parts consumed per job |
| D6 | Sales & Payments | `sales`, `sale_items`, `payments`, `payment_statuses` | Point-of-sale records, service billing, payment tracking |
| D7 | Audit & Notifications | `activity_logs`, `notifications`, `tenant_audit_events` | System-wide audit trail and user-facing alerts |
| D4/SM | Stock Movements | `stock_movements` | Inventory audit trail — all quantity changes with references |

---

## External Entities Reference

| Entity | Sends to System | Receives from System |
|--------|----------------|---------------------|
| Customer | Registration, vehicle info, service requests, payments | Service status, receipts, notifications, history |
| Owner / Staff | Shop config, inventory, services, sales, report requests | Dashboards, reports, records, alerts, audit logs |
| Mechanic | Job progress, remarks, completion updates | Assigned jobs, customer/service details, notifications |
| SuperAdmin | Shop approvals, plan management, platform actions | Platform analytics, tenant audit data, revenue reports |
| Google OAuth | OAuth token + Google profile | Auth redirect request |
| PayMongo | Payment webhook (confirmed / failed) | Payment charge request |

---

## Key Data Flow Rules

1. **Tenant isolation** — Every shop-scoped query is filtered by `shop_id` resolved from the authenticated session's subdomain or JWT context. Cross-tenant access is blocked at middleware.
2. **Role enforcement** — Owner, Staff, Mechanic, and Customer roles are enforced per route via Laravel policies. SuperAdmin and Platform Admin bypass shop-scope checks.
3. **Stock double-write** — Every stock change writes to both `parts.stock_quantity` (current level) and `stock_movements` (audit trail with user and reference).
4. **Payment webhook** — PayMongo posts a signed webhook to the platform; payments are only marked `paid` after webhook verification, not on frontend confirmation.
5. **Google OAuth upsert** — Login via Google creates the account if it does not exist, or links the Google ID to an existing account matched by email.
6. **Notifications** — Low-stock, mechanic assignment, job completion, subscription changes, and payment events all produce `notifications` records for the relevant user.
7. **SuperAdmin scope** — SuperAdmin operates above all tenant boundaries and can access platform-wide analytics, all shop records, and subscription data.
