const service = require("../services/projects.service");
const { createProjectSchema, updateProjectSchema } = require("../utils/validators/projects.validators");

async function list(req, res, next) {
  try {
    res.json(await service.list(req.org.id, req.query));
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
    const data = createProjectSchema.parse(req.body);
    res.status(201).json(await service.create(req.org.id, req.user.id, data));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = updateProjectSchema.parse(req.body);
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

async function dashboard(req, res, next) {
  try {
    res.json(await service.dashboard(req.org.id, req.params.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, dashboard };
