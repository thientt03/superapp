ALTER TABLE employees ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
CREATE TABLE approval_doc_types (
  code text PRIMARY KEY,
  name text NOT NULL,
  has_amount boolean NOT NULL,
  has_date_range boolean NOT NULL,
  sort_order int NOT NULL
);
INSERT INTO approval_doc_types (code, name, has_amount, has_date_range, sort_order) VALUES
  ('bao_gia', 'Báo giá', true, false, 1),
  ('hoa_don', 'Hoá đơn', true, false, 2),
  ('de_nghi_mua', 'Đề nghị mua hàng', true, false, 3),
  ('tam_ung', 'Tạm ứng / Thanh toán', true, false, 4),
  ('nghi_phep', 'Nghỉ phép', false, true, 5),
  ('khac', 'Khác', false, false, 6);
CREATE TABLE approval_flow_steps (
  doc_type text NOT NULL REFERENCES approval_doc_types(code),
  level int NOT NULL CHECK (level BETWEEN 1 AND 5),
  approver_id text NOT NULL REFERENCES employees(id),
  PRIMARY KEY (doc_type, level),
  UNIQUE (doc_type, approver_id)
);
CREATE TABLE approval_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doc_type text NOT NULL REFERENCES approval_doc_types(code),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text CHECK (char_length(description) <= 5000),
  ref_no text CHECK (char_length(ref_no) <= 50),
  amount bigint CHECK (amount > 0),
  start_date date,
  end_date date,
  requester_id text NOT NULL REFERENCES employees(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  current_level int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK ((status = 'pending') = (current_level IS NOT NULL))
);
CREATE TABLE approval_steps (
  request_id bigint NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  level int NOT NULL CHECK (level BETWEEN 1 AND 5),
  approver_id text NOT NULL REFERENCES employees(id),
  decision text CHECK (decision IN ('approved','rejected')),
  comment text CHECK (char_length(comment) <= 1000),
  decided_at timestamptz,
  PRIMARY KEY (request_id, level)
);
CREATE INDEX approval_requests_requester_idx ON approval_requests (requester_id, id);
CREATE INDEX approval_steps_approver_idx ON approval_steps (approver_id, request_id);

-- rollback (thủ công): DROP TABLE approval_steps, approval_requests, approval_flow_steps, approval_doc_types;
--   ALTER TABLE employees DROP COLUMN is_admin; DELETE FROM schema_migrations WHERE version IN ('003_approvals.sql','004_approvals_seed.sql');
