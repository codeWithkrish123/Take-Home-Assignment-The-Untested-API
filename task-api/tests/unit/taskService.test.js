const taskService = require('../../src/services/taskService');

describe('taskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('should create a task with default values', () => {
      const task = taskService.create({ title: 'Default Task' });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.title).toBe('Default Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.assignee).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(new Date(task.createdAt).toString()).not.toBe('Invalid Date');
    });

    test('should create a task with custom fields', () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });

      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Detailed description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
      expect(task.assignee).toBeNull();
    });
  });

  describe('getAll', () => {
    test('should return an empty array initially', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test('should return all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const all = taskService.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
    });
  });

  describe('findById', () => {
    test('should find a task by id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    test('should return undefined if task does not exist', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('should return tasks matching the exact status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const todos = taskService.getByStatus('todo');
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe('Task 1');
    });

    test('should not match partial status substrings', () => {
      taskService.create({ title: 'Task 1', status: 'in_progress' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const matches = taskService.getByStatus('progress');
      expect(matches).toHaveLength(0);
    });
  });

  describe('getPaginated', () => {
    test('page 1 should return first batch starting from index 0', () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page1 = taskService.getPaginated(1, 5);
      expect(page1).toHaveLength(5);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[4].title).toBe('Task 5');
    });

    test('page 2 should return the second batch correctly', () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page2 = taskService.getPaginated(2, 5);
      expect(page2).toHaveLength(5);
      expect(page2[0].title).toBe('Task 6');
      expect(page2[4].title).toBe('Task 10');
    });

    test('should handle page number 0 safely as first page', () => {
      taskService.create({ title: 'Task 1' });
      const page0 = taskService.getPaginated(0, 10);
      expect(page0).toHaveLength(1);
      expect(page0[0].title).toBe('Task 1');
    });
  });

  describe('getStats', () => {
    test('should return 0 counts when no tasks exist', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('should return accurate counts for each status', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });
      taskService.create({ title: 'T4', status: 'done' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(0);
    });

    test('should correctly count overdue tasks that are not done', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      taskService.create({ title: 'Overdue Todo', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Overdue In Progress', status: 'in_progress', dueDate: pastDate });
      taskService.create({ title: 'Done in past', status: 'done', dueDate: pastDate });
      taskService.create({ title: 'Future Task', status: 'todo', dueDate: futureDate });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(2);
    });
  });

  describe('update', () => {
    test('should update specified fields on an existing task', () => {
      const task = taskService.create({ title: 'Original Title', description: 'Original Desc' });
      const updated = taskService.update(task.id, {
        title: 'Updated Title',
        priority: 'high',
      });

      expect(updated).toBeDefined();
      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('high');
      expect(updated.description).toBe('Original Desc');
    });

    test('should protect id and createdAt from being overwritten', () => {
      const task = taskService.create({ title: 'Immutable Test' });
      const originalCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, {
        id: 'new-malicious-id',
        createdAt: '1999-01-01T00:00:00.000Z',
        title: 'Safe Update',
      });

      expect(updated.id).toBe(task.id);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.title).toBe('Safe Update');
    });

    test('should return null when updating non-existent task', () => {
      const result = taskService.update('non-existent-id', { title: 'Update' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    test('should remove task and return true', () => {
      const task = taskService.create({ title: 'To Delete' });
      const deleted = taskService.remove(task.id);

      expect(deleted).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('should return false when trying to remove non-existent task', () => {
      const deleted = taskService.remove('fake-id');
      expect(deleted).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('should mark task as done and keep existing priority', () => {
      const task = taskService.create({ title: 'High Priority Task', priority: 'high', status: 'todo' });
      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('high'); // Priority should be preserved
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).toString()).not.toBe('Invalid Date');
    });

    test('should return null if task does not exist', () => {
      const result = taskService.completeTask('unknown-id');
      expect(result).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('should assign task to specified assignee', () => {
      const task = taskService.create({ title: 'Unassigned Task' });
      const assigned = taskService.assignTask(task.id, 'John Doe');

      expect(assigned).toBeDefined();
      expect(assigned.assignee).toBe('John Doe');
      expect(taskService.findById(task.id).assignee).toBe('John Doe');
    });

    test('should return null when assigning a non-existent task', () => {
      const result = taskService.assignTask('non-existent-id', 'John Doe');
      expect(result).toBeNull();
    });

    test('should allow reassigning a task to another assignee', () => {
      const task = taskService.create({ title: 'Reassign Task' });
      taskService.assignTask(task.id, 'Alice');
      const reassigned = taskService.assignTask(task.id, 'Bob');

      expect(reassigned.assignee).toBe('Bob');
    });
  });

  describe('_reset', () => {
    test('should clear all tasks in store', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      expect(taskService.getAll()).toHaveLength(2);

      taskService._reset();
      expect(taskService.getAll()).toHaveLength(0);
    });
  });
});
