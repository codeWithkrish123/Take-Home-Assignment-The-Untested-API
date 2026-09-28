'# Assignment Submission Notes

**Candidate:** Full Stack Developer Intern Applicant  
**Position:** Full Stack Developer Intern (Taroo)  
**Project:** The Untested API  
**Submission Date:** September 2026  

---

## 1. Summary of Completed Work

1. **Test Suite:** Built full unit and integration test coverage across `src/` with **73 passing tests** and **98.7% code coverage**.
   - Unit tests for validation helpers (`tests/unit/validators.test.js`)
   - Unit tests for service methods and data store operations (`tests/unit/taskService.test.js`)
   - Integration tests covering all HTTP endpoints, query filters, pagination, and error handlers (`tests/integration/tasks.test.js`)
2. **Bug Hunting & Documentation:** Documented five bugs in `BUG_REPORT.md`, noting root causes, reproduction steps, and fixes.
3. **Bug Fixes:**
   - Fixed the 1-based pagination off-by-one error in `taskService.getPaginated`.
   - Fixed priority reset bug in `completeTask` so task priority is preserved on completion.
   - Switched status filtering in `getByStatus` from substring matching to exact matching.
   - Fixed route logic to allow combining `?status=` with `?page=` and `?limit=`.
   - Protected immutable system fields (`id`, `createdAt`) from client overwrite in `update`.
4. **New Feature (`PATCH /tasks/:id/assign`):**
   - Added validation in `src/utils/validators.js` (`validateAssignTask`).
   - Added `assignTask` service function in `src/services/taskService.js`.
   - Exposed endpoint in `src/routes/tasks.js` returning 200 with updated task, 400 for bad input, and 404 if not found.
   - Added unit and integration tests covering valid assignment, whitespace trimming, reassignment, and edge cases.
5. **Deployment Ready:** Added root health-check endpoint (`GET /`) for live monitoring and clear API discoverability.

---

## 2. Feature Design Decisions: `PATCH /tasks/:id/assign`

When designing the `PATCH /tasks/:id/assign` endpoint, I made the following decisions:

- **Validation:** `assignee` is required, must be of type string, and cannot be empty or purely whitespace. Whitespace is trimmed before persisting. Any invalid payload returns `400 Bad Request` with a descriptive message.
- **Reassignment:** The endpoint supports reassigning a task to another individual.
- **Not Found Handling:** If the target task does not exist, the API returns `404 Not Found` (`{ "error": "Task not found" }`).
- **Initial Task State:** When a task is initially created, its `assignee` defaults to `null`.

---

## 3. Reflection Questions

### What I'd test next with more time
- **Concurrent requests / race conditions:** The in-memory array works synchronously, but in a real-world multi-user app with a real database (PostgreSQL/MongoDB), concurrent updates to the same task could cause lost updates. I'd add tests for concurrency and optimistic locking (`version` field or `updatedAt` checks).
- **Date boundary cases:** Additional edge cases around timezone handling (UTC vs local time) in `dueDate` and `overdue` calculations.
- **Payload size and SQL/NoSQL injection:** Fuzzing the input with large string payloads and unexpected nested JSON objects.

### What surprised me in the codebase
- The hardcoded `priority: 'medium'` inside `completeTask`. It looks like an accidental copy-paste from default task creation that silently overwrote user data.
- The pagination calculation `const offset = page * limit`. It's a classic 0-indexed vs 1-indexed oversight where page 1 skipped the entire first page of tasks.
- `getByStatus` using `.includes(status)` instead of strict equality, which meant substring queries like `status=in` would match `in_progress`.

### Questions I'd ask before shipping this to production
1. **Database & Persistence:** What persistent store should we use (e.g., PostgreSQL, Redis, MongoDB)? The current store is purely in-memory, so any container restart or scale-out across multiple instances will lose or desynchronize data.
2. **Authentication & Authorization:** Who is allowed to create, complete, or reassign tasks? Should assignees only be valid users from a `users` table?
3. **Pagination Standards:** Should we standardize on cursor-based pagination or return pagination metadata (e.g. `{ data: [...], page: 1, limit: 10, totalCount: 45, totalPages: 5 }`) rather than a plain array?
4. **Rate Limiting & Security:** Do we need `helmet`, CORS configuration, and request rate limiting (`express-rate-limit`) before opening this endpoint to the public?

---

## 4. Test Coverage Summary

```text
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   98.78 |    93.75 |   96.77 |   98.66 |                   
 src             |   86.66 |       75 |   66.66 |   86.66 |                   
  app.js         |   86.66 |       75 |   66.66 |   86.66 | 27-28 (server run)
 src/routes      |     100 |    87.87 |     100 |     100 |                   
  tasks.js       |     100 |    87.87 |     100 |     100 |                   
 src/services    |     100 |    94.73 |     100 |     100 |                   
  taskService.js |     100 |    94.73 |     100 |     100 |                   
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------
Test Suites: 3 passed, 3 total
Tests:       73 passed, 73 total
```

---

## 5. Live Demo & Links

- **Git Repository:** https://github.com/codeWithkrish123/Take-Home-Assignment-The-Untested-API
- **Live Deployment:** [Your Deployed API URL]
- **Sample Live Endpoints:**
  - Health check: `GET /`
  - List all tasks: `GET /tasks`
  - Statistics: `GET /tasks/stats`
  - Assign task: `PATCH /tasks/:id/assign`

