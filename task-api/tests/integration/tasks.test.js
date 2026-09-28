const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET / (Root health check)', () => {
    test('should return 200 with service info and healthy status', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.message).toBe('Task Manager API is running');
    });
  });

  describe('GET /tasks/stats', () => {
    test('should return 200 and initial stats when store is empty', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('should return accurate counts and overdue statistics', async () => {
      const past = new Date(Date.now() - 7200000).toISOString();
      taskService.create({ title: 'T1', status: 'todo', dueDate: past });
      taskService.create({ title: 'T2', status: 'in_progress' });
      taskService.create({ title: 'T3', status: 'done', dueDate: past });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(1);
      expect(res.body.overdue).toBe(1);
    });
  });

  describe('GET /tasks', () => {
    test('should return 200 and an empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    test('should return 200 and all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('should filter tasks by status using query param ?status=in_progress', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const res = await request(app).get('/tasks?status=in_progress');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Task 2');
    });

    test('should return empty list when filtering with a status that has no tasks', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });

      const res = await request(app).get('/tasks?status=done');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('should paginate tasks with ?page= and ?limit= correctly starting at page 1', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('should handle combined ?status= and pagination query params', async () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'Todo 3', status: 'todo' });
      taskService.create({ title: 'Other 1', status: 'in_progress' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Todo 1');
      expect(res.body[1].title).toBe('Todo 2');
    });
  });

  describe('POST /tasks', () => {
    test('should create a new task with 201 status code (happy path)', async () => {
      const newTask = {
        title: 'New API Task',
        description: 'Testing task creation',
        priority: 'high',
        status: 'todo',
      };

      const res = await request(app).post('/tasks').send(newTask);
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe(newTask.title);
      expect(res.body.description).toBe(newTask.description);
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
      expect(res.body.assignee).toBeNull();
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.completedAt).toBeNull();
    });

    test('should return 400 Bad Request when title is missing', async () => {
      const res = await request(app).post('/tasks').send({ description: 'No title' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('should return 400 Bad Request when title is empty whitespace', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('should return 400 Bad Request when status is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', status: 'invalid_status' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    test('should return 400 Bad Request when priority is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', priority: 'super_high' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });

    test('should return 400 Bad Request when dueDate is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', dueDate: 'not-a-valid-date' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    test('should update task and return 200 with updated task (happy path)', async () => {
      const task = taskService.create({ title: 'Initial Title', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Title', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.priority).toBe('high');
    });

    test('should return 404 Not Found if task ID does not exist', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Does not matter' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('should return 400 Bad Request if update payload fails validation', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'invalid_priority' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('should delete task and return 204 No Content (happy path)', async () => {
      const task = taskService.create({ title: 'Delete me' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('should return 404 Not Found if task ID does not exist', async () => {
      const res = await request(app).delete('/tasks/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('should mark task complete and preserve priority', async () => {
      const task = taskService.create({ title: 'High Task', status: 'todo', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).toBeDefined();
    });

    test('should return 404 Not Found if task ID does not exist', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('should assign task to user and return 200 with updated task', async () => {
      const task = taskService.create({ title: 'Unassigned Dev Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alex Morgan' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.assignee).toBe('Alex Morgan');
    });

    test('should trim whitespace from assignee name', async () => {
      const task = taskService.create({ title: 'Task With Spaces' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   Taylor Swift   ' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Taylor Swift');
    });

    test('should allow reassigning a task to a different user', async () => {
      const task = taskService.create({ title: 'Reassign Task' });
      await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
    });

    test('should return 404 Not Found if task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Alex Morgan' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('should return 400 Bad Request if assignee field is missing', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('should return 400 Bad Request if assignee is empty string or only whitespace', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('should return 400 Bad Request if assignee is not a string', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });
  });

  describe('Global Error Handler', () => {
    test('should return 500 when an unexpected exception occurs', async () => {
      const spy = jest.spyOn(taskService, 'getAll').mockImplementation(() => {
        throw new Error('Simulated failure');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });

      spy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});

