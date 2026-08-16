-- uuid_generate_v4() for PKs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE org_role AS ENUM ('org_admin', 'member');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
