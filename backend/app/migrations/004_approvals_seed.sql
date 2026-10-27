UPDATE employees SET is_admin = true WHERE id = 'u1';
INSERT INTO approval_flow_steps (doc_type, level, approver_id) VALUES
  ('bao_gia', 1, 'u1'), ('bao_gia', 2, 'u4'),
  ('hoa_don', 1, 'u3'), ('hoa_don', 2, 'u1'),
  ('de_nghi_mua', 1, 'u2'), ('de_nghi_mua', 2, 'u1'), ('de_nghi_mua', 3, 'u4'),
  ('tam_ung', 1, 'u2'), ('tam_ung', 2, 'u4'),
  ('nghi_phep', 1, 'u2'),
  ('khac', 1, 'u3');

WITH
a AS (
  INSERT INTO approval_requests (doc_type, title, ref_no, amount, requester_id, current_level)
  VALUES ('bao_gia', 'Báo giá thiết bị văn phòng', 'BG-2026-001', 45000000, 'u2', 1) RETURNING id),
b AS (
  INSERT INTO approval_requests (doc_type, title, amount, requester_id, current_level)
  VALUES ('de_nghi_mua', 'Đề nghị mua laptop cho nhân viên mới', 60000000, 'u3', 2) RETURNING id),
c AS (
  INSERT INTO approval_requests (doc_type, title, ref_no, amount, requester_id, current_level)
  VALUES ('hoa_don', 'Hoá đơn tiền điện tháng 10', 'HD-0001234', 3250000, 'u2', 2) RETURNING id),
d AS (
  INSERT INTO approval_requests (doc_type, title, amount, requester_id, current_level)
  VALUES ('tam_ung', 'Tạm ứng công tác Đà Nẵng', 8000000, 'u1', 2) RETURNING id),
e AS (
  INSERT INTO approval_requests (doc_type, title, start_date, end_date, requester_id, status, current_level)
  VALUES ('nghi_phep', 'Nghỉ phép 2 ngày', CURRENT_DATE + 7, CURRENT_DATE + 8, 'u1', 'approved', NULL) RETURNING id),
f AS (
  INSERT INTO approval_requests (doc_type, title, requester_id, status, current_level)
  VALUES ('khac', 'Đăng ký dùng phòng họp lớn', 'u1', 'rejected', NULL) RETURNING id)
INSERT INTO approval_steps (request_id, level, approver_id, decision, comment, decided_at)
SELECT id, 1, 'u1', NULL::text, NULL::text, NULL::timestamptz FROM a
UNION ALL SELECT id, 2, 'u4', NULL, NULL, NULL FROM a
UNION ALL SELECT id, 1, 'u2', 'approved', 'Đồng ý', now() FROM b
UNION ALL SELECT id, 2, 'u1', NULL, NULL, NULL FROM b
UNION ALL SELECT id, 3, 'u4', NULL, NULL, NULL FROM b
UNION ALL SELECT id, 1, 'u3', 'approved', NULL, now() FROM c
UNION ALL SELECT id, 2, 'u1', NULL, NULL, NULL FROM c
UNION ALL SELECT id, 1, 'u2', 'approved', NULL, now() FROM d
UNION ALL SELECT id, 2, 'u4', NULL, NULL, NULL FROM d
UNION ALL SELECT id, 1, 'u2', 'approved', NULL, now() FROM e
UNION ALL SELECT id, 1, 'u3', 'rejected', 'Phòng đã có lịch', now() FROM f;
