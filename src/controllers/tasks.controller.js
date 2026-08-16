const service = require("../services/tasks.service");
const {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  assignSchema,
} = require("../utils/validators/tasks.validators");

async function list(req, res, next) {
  try {
    const q = listTasksQuerySchema.parse(req.query);
    res.json(await service.list(req.org.id, q));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await service.getById(req.org.id, req.params.id));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = createTaskSchema.parse(req.body);
    res.status(201).json(await service.create(req.org.id, req.user.id, data));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = updateTaskSchema.parse(req.body);
    res.json(await service.update(req.org.id, req.params.id, data));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.org.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function assign(req, res, next) {
  try {
    const { userId } = assignSchema.parse(req.body);
    res.status(201).json(await service.assign(req.org.id, req.params.id, userId));
  } catch (err) {
    next(err);
  }
}

async function unassign(req, res, next) {
  try {
    await service.unassign(req.org.id, req.params.id, req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listAssignees(req, res, next) {
  try {
    res.json(await service.listAssignees(req.org.id, req.params.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, assign, unassign, listAssignees };
