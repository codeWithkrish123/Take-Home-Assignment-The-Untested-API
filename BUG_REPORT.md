# Bug Report

I found a few bugs while reviewing the codebase and writing the unit and integration tests. Here is a breakdown of what broke, why it broke, and the fixes applied.

---

### 1. Pagination skips the first page (Off-by-one error)
- **Location:** `src/services/taskService.js` (`getPaginated`)
- **Expected:** In standard 1-based pagination, requesting `page=1` with `limit=10` should return the first 10 items (offset 0).
- **Actual:** The code calculates `const offset = page * limit`. When `page = 1` and `limit = 10`, `offset` equals `10`. This skips tasks 0–9 entirely and serves page 2 instead.
- **How I found it:** Added a unit test with 15 tasks and asserted that `getPaginated(1, 5)` returns tasks 1 through 5. The test failed because it returned tasks 6 through 10.
- **Fix:** Calculate the offset as `(page - 1) * limit`:
  ```js
  const offset = Math.max(0, (page - 1) * limit);
  ```

---

### 2. Priority gets reset to 'medium' when completing a task
- **Location:** `src/services/taskService.js` (`completeTask`)
- **Expected:** Marking a task as complete should only change `status` to `'done'` and set `completedAt`. The task's original priority should not change.
- **Actual:** `completeTask` explicitly hardcodes `priority: 'medium'` into the updated object:
  ```js
  const updated = {
    ...task,
    priority: 'medium', // Overwrites whatever priority the user set
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
- **How I found it:** Created a task with `priority: 'high'`, called `PATCH /tasks/:id/complete`, and checked the response. Priority came back as `'medium'`.
- **Fix:** Remove the hardcoded `priority: 'medium'` line so the existing priority from `...task` is preserved.

---

### 3. Loose substring matching in status filter
- **Location:** `src/services/taskService.js` (`getByStatus`)
- **Expected:** Filtering by status should only match exact statuses (`todo`, `in_progress`, `done`).
- **Actual:** The code uses `tasks.filter((t) => t.status.includes(status))`. Passing partial strings like `progress` or `in` accidentally matches `in_progress`.
- **How I found it:** Code review of `taskService.js`.
- **Fix:** Use strict equality (`t.status === status`).

---

### 4. Status filter ignores pagination parameters
- **Location:** `src/routes/tasks.js` (`GET /tasks`)
- **Expected:** A query like `GET /tasks?status=todo&page=1&limit=5` should return the first 5 tasks that have status `todo`.
- **Actual:** The route checks `if (status)` and immediately returns `res.json(tasks)`, so `page` and `limit` are never processed if `status` is present.
- **How I found it:** Tested the curl example from the README (`curl "http://localhost:3000/tasks?status=pending&page=1&limit=10"`).
- **Fix:** Support combining `status` filtering with pagination before returning the response.

---

### 5. Client can overwrite `id` and `createdAt` via PUT
- **Location:** `src/services/taskService.js` (`update`)
- **Expected:** System-managed metadata like `id` and `createdAt` should be immutable.
- **Actual:** `tasks[index] = { ...tasks[index], ...fields }` directly spreads `req.body`, letting clients rewrite the task ID and creation timestamp.
- **How I found it:** Edge case testing on `PUT /tasks/:id`.
- **Fix:** Strip `id` and `createdAt` from the update payload before merging.
