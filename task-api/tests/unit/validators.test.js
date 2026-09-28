const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
} = require('../../src/utils/validators');

describe('Validators Unit Tests', () => {
  describe('validateCreateTask', () => {
    test('should pass validation with valid required fields', () => {
      const result = validateCreateTask({ title: 'Valid Task' });
      expect(result).toBeNull();
    });

    test('should pass validation with all valid optional fields', () => {
      const result = validateCreateTask({
        title: 'Complete Task Spec',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      });
      expect(result).toBeNull();
    });

    test('should fail if title is missing', () => {
      const result = validateCreateTask({});
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('should fail if title is not a string (e.g. number)', () => {
      const result = validateCreateTask({ title: 12345 });
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('should fail if title is only whitespace', () => {
      const result = validateCreateTask({ title: '    ' });
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('should fail if status is invalid', () => {
      const result = validateCreateTask({ title: 'Task', status: 'pending' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('should fail if priority is invalid', () => {
      const result = validateCreateTask({ title: 'Task', priority: 'urgent' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('should fail if dueDate is an invalid date string', () => {
      const result = validateCreateTask({ title: 'Task', dueDate: 'invalid-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask', () => {
    test('should pass with an empty object (no updates specified)', () => {
      const result = validateUpdateTask({});
      expect(result).toBeNull();
    });

    test('should pass with valid partial updates', () => {
      expect(validateUpdateTask({ title: 'New Title' })).toBeNull();
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
      expect(validateUpdateTask({ priority: 'low' })).toBeNull();
      expect(validateUpdateTask({ dueDate: '2026-10-15T12:00:00.000Z' })).toBeNull();
    });

    test('should fail if title is provided but is non-string or whitespace', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: 123 })).toBe('title must be a non-empty string');
    });

    test('should fail if status is invalid', () => {
      const result = validateUpdateTask({ status: 'unknown_status' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('should fail if priority is invalid', () => {
      const result = validateUpdateTask({ priority: 'extreme' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('should fail if dueDate is an invalid date string', () => {
      const result = validateUpdateTask({ dueDate: 'not-a-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask', () => {
    test('should pass with valid assignee string', () => {
      const result = validateAssignTask({ assignee: 'Alex Doe' });
      expect(result).toBeNull();
    });

    test('should fail if body is missing or assignee is not provided', () => {
      expect(validateAssignTask({})).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask(null)).toBe('assignee is required and must be a non-empty string');
    });

    test('should fail if assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 42 })).toBe(
        'assignee is required and must be a non-empty string'
      );
      expect(validateAssignTask({ assignee: true })).toBe(
        'assignee is required and must be a non-empty string'
      );
    });

    test('should fail if assignee is empty string or only whitespace', () => {
      expect(validateAssignTask({ assignee: '' })).toBe(
        'assignee is required and must be a non-empty string'
      );
      expect(validateAssignTask({ assignee: '    ' })).toBe(
        'assignee is required and must be a non-empty string'
      );
    });
  });
});
