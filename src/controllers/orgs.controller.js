const { z } = require("zod");
const orgsService = require("../services/orgs.service");

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["org_admin", "member"]).optional(),
});

async function listMembers(req, res, next) {
  try {
    const members = await orgsService.listMembers(req.org.id);
    res.json({ data: members, total: members.length, page: 1, limit: members.length });
  } catch (err) {
    next(err);
  }
}

async function addMember(req, res, next) {
  try {
    const { email, role } = addMemberSchema.parse(req.body);
    const member = await orgsService.addMember(req.org.id, email, role);
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    await orgsService.removeMember(req.org.id, req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listMembers, addMember, removeMember };
