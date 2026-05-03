# Amazon Q Local Access Policy

## Purpose
This document defines the permission scope for Amazon Q (or any AI assistant) running locally on the developer's machine.

## Security Principle
- Follow **least privilege access**
- Avoid unrestricted system control
- Log all actions for traceability

---

## Allowed Permissions

### 1. File System Access
- Read access:
  - /project-directory/**
  - /workspace/**
- Write access:
  - /project-directory/**
- Restricted:
  - No access to system directories (e.g., /Windows, /System32, /etc)

### 2. Command Execution
- թույլ Allowed:
  - git commands (clone, commit, push, pull)
  - npm / pip / docker commands
  - build tools (make, gradle, etc.)
- Restricted:
  - No sudo/root-level commands
  - No system configuration changes

### 3. Network Access
- Allowed:
  - API calls for development purposes
  - Package registries (npm, pip, docker hub)
- Restricted:
  - No access to sensitive internal services
  - No automatic data exfiltration

### 4. Code Modification
- Allowed:
  - Create, edit, delete files within project scope
- Must:
  - Follow version control (Git)
  - Provide change summaries

---

## Denied Permissions

- Full disk access
- Silent background execution without logs
- Access to:
  - Passwords
  - SSH keys
  - Environment secrets (.env)
- Remote command execution without user awareness

---

## Logging & Auditing

- All actions must be logged:
  - File changes
  - Commands executed
  - Network requests

---

## Safe Automation Mode

To reduce prompts while staying secure:

- Enable:
  - Auto-approve **low-risk actions**
- Require confirmation for:
  - Deleting files
  - Installing new dependencies
  - Running scripts from unknown sources

---

## Developer Override

The developer may manually:
- Approve elevated actions
- Adjust permission scope
- Disable the assistant at any time

---

## Warning

Granting unrestricted, silent access to any AI tool can:
- Compromise your system
- Leak sensitive data
- Cause irreversible damage

Use controlled automation instead.