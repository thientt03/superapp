CREATE TABLE employees (
  id text PRIMARY KEY,
  full_name text NOT NULL,
  avatar_url text
);
CREATE TABLE tasks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text CHECK (char_length(description) <= 5000),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date date,
  assigner_id text NOT NULL REFERENCES employees(id),
  assignee_id text NOT NULL REFERENCES employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_assignee_idx ON tasks (assignee_id, due_date, id);
CREATE INDEX tasks_assigner_idx ON tasks (assigner_id, due_date, id);
