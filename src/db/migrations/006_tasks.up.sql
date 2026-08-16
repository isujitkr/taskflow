CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- denormalized for cheap tenant scoping
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  deleted_at TIMESTAMPTZ, -- soft delete (bonus)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- project_id: delete project removes its tasks (CASCADE).
-- org_id: delete org removes tasks directly too (CASCADE) - keeps every query org_id-filterable
--         without an extra join to projects, which is critical for tenant isolation checks.
-- created_by: RESTRICT - preserve audit trail.

CREATE INDEX idx_tasks_org_id ON tasks(org_id);          -- tenant scoping on every request
CREATE INDEX idx_tasks_project_id ON tasks(project_id);  -- "tasks in this project"
CREATE INDEX idx_tasks_status ON tasks(status);           -- filter by status
CREATE INDEX idx_tasks_priority ON tasks(priority);       -- filter by priority
CREATE INDEX idx_tasks_due_date ON tasks(due_date);        -- due-date range filter
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NULL;
