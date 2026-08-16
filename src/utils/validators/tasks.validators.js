const { z } = require("zod");

const statusEnum = z.enum(["todo", "in_progress", "review", "done"]);
const priorityEnum = z.enum(["low", "medium", "high", "urgent"]);

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  dueDate: z.string().date().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  dueDate: z.string().date().optional(),
});

const listTasksQuerySchema = z.object({
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  assignee: z.string().uuid().optional(),
  dueFrom: z.string().date().optional(),
  dueTo: z.string().date().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const assignSchema = z.object({
  userId: z.string().uuid(),
});

const commentSchema = z.object({
  body: z.string().min(1),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  assignSchema,
  commentSchema,
};
