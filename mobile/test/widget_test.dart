import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:superapp/api.dart';
import 'package:superapp/dashboard_screen.dart';

const _ids = {
  'cong-viec': 'Công việc',
  'de-xuat': 'Đề xuất',
  'phe-duyet': 'Phê duyệt',
  'tuyen-dung': 'Tuyển dụng',
  'hanh-chinh': 'Hành chính',
  'cham-cong': 'Chấm công',
  'ho-so': 'Hồ sơ',
  'tinh-luong': 'Tính lương & phúc lợi',
  'bao-cao': 'Báo cáo',
  'kho': 'Kho',
  'cai-dat': 'Cài đặt',
};

http.Response _json(Object body, [int status = 200]) => http.Response.bytes(
  utf8.encode(jsonEncode(body)),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

Map<String, dynamic> _task(int id, {bool canEdit = false}) => {
  'id': id,
  'title': 'Việc $id',
  'description': null,
  'status': 'todo',
  'priority': 'medium',
  'due_date': '2026-10-30',
  'is_overdue': false,
  'can_edit': canEdit,
  'assigner': {'id': 'u2', 'full_name': 'Trần Thị B', 'avatar_url': null},
  'assignee': {'id': 'u1', 'full_name': 'Nguyễn Văn A', 'avatar_url': null},
  'created_at': '2026-10-27T08:00:00+07:00',
  'updated_at': '2026-10-27T08:00:00+07:00',
};

Map<String, dynamic> _dash({
  bool events = true,
  bool myTask = false,
  int pending = 0,
}) => {
  'user': {'id': 'u1', 'full_name': 'Nguyễn Văn A', 'avatar_url': null},
  'attendance': {'shift_start': '08:30', 'checked_in_at': null},
  'events_today': events
      ? [
          {
            'id': 'e2',
            'title': 'Họp giao ban tuần',
            'start_time': '15:30',
            'end_time': '16:30',
            'location': 'Phòng A1',
          },
        ]
      : [],
  'pinned_apps': [
    for (final e in _ids.entries) {'id': e.key, 'name': e.value},
  ],
  'notifications': {'unread_count': 3},
  'my_task': myTask ? _task(7) : null,
  'pending_approval_count': pending,
};

Future<ApiClient> _pump(
  WidgetTester t,
  MockClientHandler h, {
  VoidCallback? onLogout,
  VoidCallback? onUnauthorized,
}) async {
  await t.binding.setSurfaceSize(const Size(400, 900));
  addTearDown(() => t.binding.setSurfaceSize(null));
  final api = ApiClient(client: MockClient(h), baseUrl: 'http://x')
    ..token = 't'
    ..onUnauthorized = onUnauthorized;
  await t.pumpWidget(
    MaterialApp(
      home: DashboardScreen(api: api, onLogout: onLogout ?? () {}),
    ),
  );
  await t.pump();
  await t.pump();
  return api;
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('render tên và 12 ô', (t) async {
    await _pump(t, (_) async => _json(_dash()));
    expect(find.text('Nguyễn Văn A'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(GridView),
        matching: find.byType(GestureDetector),
      ),
      findsNWidgets(12),
    );
    expect(find.text('Thêm mới'), findsOneWidget);
  });

  testWidgets('badge Phê duyệt hiện số khi count = 3', (t) async {
    await _pump(t, (_) async => _json(_dash(pending: 3)));
    expect(
      find.descendant(
        of: find.byKey(const Key('approval-badge')),
        matching: find.text('3'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('count = 0 không có badge', (t) async {
    await _pump(t, (_) async => _json(_dash()));
    expect(find.byKey(const Key('approval-badge')), findsNothing);
  });

  testWidgets('bấm Phê duyệt gọi GET /api/approvals', (t) async {
    final paths = <String>[];
    await _pump(t, (r) async {
      paths.add(r.url.path);
      return r.url.path == '/api/approvals'
          ? _json({'items': [], 'next_cursor': null})
          : _json(_dash());
    });
    await t.tap(find.text('Phê duyệt'));
    await t.pump();
    await t.pump();
    expect(paths, contains('/api/approvals'));
    expect(find.text('Chưa có yêu cầu'), findsOneWidget);
  });

  testWidgets('bấm Cài đặt mở màn có Cấu hình phê duyệt', (t) async {
    await _pump(t, (_) async => _json(_dash()));
    await t.tap(find.text('Cài đặt'));
    await t.pumpAndSettle();
    expect(find.text('Cấu hình phê duyệt'), findsOneWidget);
  });

  testWidgets('bấm Chấm vào chuyển thành Đã chấm vào', (t) async {
    await _pump(
      t,
      (r) async => r.method == 'POST'
          ? _json({'shift_start': '08:30', 'checked_in_at': '14:47'})
          : _json(_dash()),
    );
    await t.tap(find.text('Chấm vào'));
    await t.pump();
    await t.pump();
    expect(find.text('Đã chấm vào'), findsOneWidget);
    expect(find.text('Chấm công thành công lúc 14:47'), findsOneWidget);
    await t.pump(const Duration(seconds: 3));
  });

  testWidgets('409 hiện SnackBar detail', (t) async {
    await _pump(
      t,
      (r) async => r.method == 'POST'
          ? _json({'detail': 'Bạn đã chấm vào hôm nay'}, 409)
          : _json(_dash()),
    );
    await t.tap(find.text('Chấm vào'));
    await t.pump();
    await t.pump();
    expect(find.text('Bạn đã chấm vào hôm nay'), findsOneWidget);
    await t.pump(const Duration(seconds: 3));
  });

  testWidgets('my_task null', (t) async {
    await _pump(t, (_) async => _json(_dash()));
    expect(find.text('Không có công việc'), findsOneWidget);
    expect(find.text('Chi tiết'), findsNothing);
  });

  testWidgets('my_task có giá trị, bấm Chi tiết gọi GET /api/tasks/7', (
    t,
  ) async {
    final paths = <String>[];
    await _pump(t, (r) async {
      paths.add(r.url.path);
      return r.url.path == '/api/tasks/7'
          ? _json(_task(7))
          : _json(_dash(myTask: true));
    });
    expect(find.text('Việc 7'), findsOneWidget);
    expect(find.text('Hạn 30/10/2026'), findsOneWidget);
    await t.tap(find.text('Chi tiết'));
    await t.pump();
    await t.pump();
    expect(paths, contains('/api/tasks/7'));
  });

  testWidgets('GET lỗi hiện Thử lại', (t) async {
    await _pump(t, (_) async => _json({'detail': 'x'}, 500));
    expect(find.text('Không tải được dữ liệu'), findsOneWidget);
    expect(find.text('Thử lại'), findsOneWidget);
  });

  testWidgets('gửi header Bearer', (t) async {
    String? auth;
    await _pump(t, (r) async {
      auth = r.headers['Authorization'];
      return _json(_dash());
    });
    expect(auth, 'Bearer t');
  });

  testWidgets('GET 401 xoá token, gọi onUnauthorized, không hiện Thử lại', (
    t,
  ) async {
    var called = 0;
    final api = await _pump(
      t,
      (_) async => _json({'detail': 'x'}, 401),
      onUnauthorized: () => called++,
    );
    expect(api.token, isNull);
    expect(called, 1);
    expect(find.text('Thử lại'), findsNothing);
  });

  for (final fail in [false, true]) {
    testWidgets('Đăng xuất (logout lỗi: $fail)', (t) async {
      var posted = false;
      var out = 0;
      final api = await _pump(t, (r) async {
        if (r.url.path == '/api/auth/logout') {
          posted = true;
          if (fail) throw Exception('net');
          return http.Response('', 204);
        }
        return _json(_dash());
      }, onLogout: () => out++);
      await t.tap(find.bySemanticsLabel('Đăng xuất'));
      await t.pump();
      await t.pump();
      expect(posted, isTrue);
      expect(api.token, isNull);
      expect(out, 1);
    });
  }
}
