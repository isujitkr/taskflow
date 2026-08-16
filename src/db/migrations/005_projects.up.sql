CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  deleted_at TIMESTAMPTZ, -- soft delete (bonus)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- org_id: delete org removes its projects (CASCADE) - org is the tenant boundary.
-- created_by: RESTRICT - keep audit trail, block deleting a user who owns projects.

-- Every project list/dashboard query is scoped "WHERE org_id = $1" -> index.
CREATE INDEX idx_projects_org_id ON projects(org_id);
-- Soft-delete filter ("WHERE deleted_at IS NULL") run on almost every read.
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;
