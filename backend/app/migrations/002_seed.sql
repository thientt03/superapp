INSERT INTO employees (id, full_name, avatar_url) VALUES
  ('u1', 'Nguyễn Văn A', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'),
  ('u2', 'Trần Thị B', NULL),
  ('u3', 'Lê Văn C', NULL),
  ('u4', 'Phạm Thị D', NULL);
INSERT INTO tasks (title, description, status, priority, due_date, assigner_id, assignee_id) VALUES
  ('Chuẩn bị báo cáo tuần', 'Tổng hợp số liệu tuần này', 'in_progress', 'high', CURRENT_DATE - 2, 'u2', 'u1'),
  ('Duyệt hợp đồng nhà cung cấp', NULL, 'todo', 'high', CURRENT_DATE + 1, 'u3', 'u1'),
  ('Cập nhật tài liệu quy trình', 'Bổ sung mục chấm công', 'todo', 'medium', CURRENT_DATE + 5, 'u2', 'u1'),
  ('Sắp xếp lại kho lưu trữ', NULL, 'todo', 'low', NULL, 'u3', 'u1'),
  ('Gửi biên bản họp giao ban', NULL, 'done', 'medium', CURRENT_DATE - 1, 'u2', 'u1'),
  ('Thu thập phản hồi khách hàng', 'Gửi biểu mẫu khảo sát', 'todo', 'medium', CURRENT_DATE + 3, 'u1', 'u2');
