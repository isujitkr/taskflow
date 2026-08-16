CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- org_id: delete org wipes memberships (CASCADE).
-- user_id: delete user wipes their memberships (CASCADE) - no orphan rows.

-- Every auth-scoped query filters "am I a member of org X" -> index org_id.
CREATE INDEX idx_org_members_org_id ON org_members(org_id);
-- "which orgs does this user belong to" on login -> index user_id.
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
