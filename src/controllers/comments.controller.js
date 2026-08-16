const service = require("../services/comments.service");
const { commentSchema } = require("../utils/validators/tasks.validators");

async function list(req, res, next) {
  try {
    res.json(await service.list(req.org.id, req.params.id));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { body } = commentSchema.parse(req.body);
    res.status(201).json(await service.create(req.org.id, req.params.id, req.user.id, body));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create };
