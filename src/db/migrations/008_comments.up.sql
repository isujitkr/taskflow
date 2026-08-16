CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- task_id: CASCADE - comments die with the task.
-- user_id: RESTRICT - preserve who said what, block deleting users with comment history.

CREATE INDEX idx_comments_task_id ON comments(task_id); -- "comments on this task", most common read
