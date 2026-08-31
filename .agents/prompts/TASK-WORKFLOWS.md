# CTC Task — Workflow theo từng loại công việc

## A. Feature frontend

/ctc-plan
→ inspect page/component/hook/service
→ identify API/query/cache
→ implement
→ frontend build
→ /ctc-review
→ /ctc-verify

Checklist:
- loading
- empty
- error
- permission
- responsive
- i18n if applicable
- React Query cache
- realtime if applicable

## B. Backend API

/ctc-plan
→ route
→ auth
→ validation
→ service/db
→ tests
→ frontend consumer
→ /ctc-review
→ /ctc-verify

Checklist:
- authentication
- RBAC
- validation
- ownership
- status codes
- response shape
- error handling
- tests

## C. Bug

/ctc-debug
→ reproduce
→ root cause
→ regression test
→ fix
→ test
→ /ctc-review
→ /ctc-verify

## D. Database migration

/ctc-db
→ inspect SQLite/PostgreSQL
→ migration plan
→ data preservation
→ implement
→ migration tests
→ API tests
→ review
→ verify

## E. RBAC

/ctc-rbac
→ identify permission
→ identify resource scope
→ server enforcement
→ frontend UX
→ allowed/denied tests
→ security review

## F. Realtime

/ctc-realtime
→ event producer
→ event payload
→ client listener
→ cleanup
→ cache/state update
→ integration verification

## G. Mail

/ctc-mail
→ route
→ mailer/IMAP
→ authorization
→ attachment/content security
→ provider failure tests
→ review

## H. AI

/ctc-ai
→ provider boundary
→ server-side credential
→ input validation
→ untrusted output
→ provider error handling
→ mocked tests
→ security review

## I. Refactor

/ctc-context
→ define current behavior
→ isolate one responsibility
→ refactor
→ tests
→ diff review
→ verify

Never combine a large refactor with unrelated feature work.

## J. Security audit

/ctc-security
→ evidence
→ severity
→ remediation
→ fix only after review
→ verify

## K. Release

/ctc-release
→ status
→ diff
→ secret scan
→ tests/build
→ DB/config review
→ final risk report
→ commit only when approved
