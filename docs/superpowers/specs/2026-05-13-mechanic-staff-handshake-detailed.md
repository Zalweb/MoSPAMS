# Functional Specification: Mechanic-Staff Service Handshake

**Date:** 2026-05-13
**Status:** Approved / Design Phase

## 1. The Workflow Narrative

### Step 1: Customer Booking (`PENDING`)
*   **Action:** Customer submits a booking via the portal.
*   **System State:** Job status is set to `pending`.
*   **Permissions:** Customer can still `Cancel` the booking. Staff can `Cancel`.

### Step 2: Staff Confirmation (`BOOKED_CONFIRMED`)
*   **Action:** Staff reviews the job and clicks **[Confirm Booking]**.
*   **System Requirement:** Staff MUST select at least one available mechanic from a picker.
*   **Customer Experience:** Status updates to `Booked & Confirmed`. 
*   **Notification:** "Your booking is confirmed! You can head to the shop now. Mechanics available to assist you: [Mechanic Names]."
*   **Permissions:** Customer can no longer cancel. Only Staff can cancel.

### Step 3: Mechanic Takeover (`IN_PROGRESS`)
*   **Mechanic View:** The assigned mechanic sees the job in their "Assigned / Pending" workstation list.
*   **Action:** When the customer arrives, the mechanic clicks **[Start Service]**.
*   **System State:** Status updates to `in_progress`.
*   **Logic:** Mechanic cannot click "Complete" yet. They must "Start" first.

### Step 4: Resource Handling (On-Going)
*   **Mechanic Action:** If parts are needed, the mechanic clicks **[Request Items]**.
*   **Staff Action:** Receives an alert. Staff reviews and clicks **[Add/Confirm Item]**.
*   **Outcome:** The item is officially added to the job's bill and deducted from inventory.

### Step 5: Technical Completion (`WORK_DONE`)
*   **Action:** Mechanic finishes the physical repair and clicks **[Complete]**.
*   **System Prompt:** "Set Final Labor Cost". Mechanic enters the amount (e.g., ₱500) based on work difficulty.
*   **System State:** Status updates to `work_done`.
*   **Permissions:** Job is locked from further mechanic edits.

### Step 6: Billing & Notification
*   **Customer Experience:** Customer receives an automated notification: "Your service is done! Total Bill: ₱[Total]. Details: [Itemized List of Parts] + [Labor Cost]. Please proceed to the counter for payment."
*   **Staff View:** Job is highlighted as "Ready for Payment."

### Step 7: Final Completion (`COMPLETED`)
*   **Action:** Staff collects payment (Cash/GCash) and clicks **[Confirm Payment]**.
*   **System State:** Status updates to `completed` (Terminal state).

---

## 2. Status & Role Permissions Table

| Status | Code | Customer Action | Staff Action | Mechanic Action |
|--------|------|-----------------|--------------|-----------------|
| **Pending** | `pending` | Cancel | Confirm Booking | View Only |
| **Confirmed** | `booked_confirmed` | View Only | Start Service / Cancel | View / Start Service |
| **In Progress** | `in_progress` | View Only | Add Items / Cancel | Request Items / Complete |
| **Work Done** | `work_done` | View Only | Confirm Payment / Cancel | View Only |
| **Completed** | `completed` | View History | View History | View History |

---

## 3. UI/UX Requirements

### For Mechanics:
*   **Workstation Page:** A clean list of jobs. Each card has one primary action button:
    *   If Status = Confirmed → Button: `[Start Service]` (Primary Green).
    *   If Status = In Progress → Button: `[Mark as Complete]` (Primary Blue).
*   **Request Modal:** Searchable inventory list to request parts.

### For Staff:
*   **Services Dashboard:** Pulse indicators for "Pending Part Requests" and "Ready for Payment" jobs.
*   **Confirmation Dialog:** Multi-select mechanic picker that filters only for "Active" mechanics.

### For Customers:
*   **Live Tracker:** A progress stepper showing exactly where their bike is in the process.
*   **Final Invoice View:** A clear breakdown of costs shown immediately upon "Work Done" status.
