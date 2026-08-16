CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

-- task_id/user_id: CASCADE both ways - assignment rows have no meaning once
-- either side is gone.

CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id); -- "who is on this task"
CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id); -- filter tasks by assignee
