import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:superapp/api.dart';
import 'package:superapp/models.dart';
import 'package:superapp/task_detail_screen.dart';
import 'package:superapp/task_form_screen.dart';
import 'package:superapp/tasks_screen.dart';

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
  'due_date': null,
  'is_overdue': false,
  'can_edit': canEdit,
  'assigner': {'id': 'u2', 'full_name': 'Trần Thị B', 'avatar_url': null},
  'assignee': {'id': 'u1', 'full_name': 'Nguyễn Văn A', 'avatar_url': null},
  'created_at': '2026-10-27T08:00:00+07:00',
  'updated_at': '2026-10-27T08:00:00+07:00',
};

Map<String, dynamic> _page(Iterable<int> ids, [String? next]) => {
  'items': [for (final i in ids) _task(i)],
  'next_cursor': next,
};

Future<ApiClient> _pump(
  WidgetTester t,
  MockClientHandler h,
  Widget Function(ApiClient) screen, {
  VoidCallback? onUnauthorized,
}) async {
  await t.binding.setSurfaceSize(const Size(400, 600));
  addTearDown(() => t.binding.setSurfaceSize(null));
  final api = ApiClient(client: MockClient(h), baseUrl: 'http://x')
    ..token = 't'
    ..onUnauthorized = onUnauthorized;
  await t.pumpWidget(MaterialApp(home: screen(api)));
  await t.pump();
  await t.pump();
  return api;
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('cuộn xuống gửi cursor và nối trang', (t) async {
    final queries = <Map<String, String>>[];
    await _pump(t, (r) async {
      queries.add(r.url.queryParameters);
      return r.url.queryParameters['cursor'] == 'c1'
          ? _json(_page([9, 10]))
          : _json(_page(List.generate(8, (i) => i + 1), 'c1'));
    }, (api) => TasksScreen(api: api));
    await t.drag(find.byType(ListView).last, const Offset(0, -2000));
    await t.pump();
    await t.pump();
    expect(queries.last['cursor'], 'c1');
    expect(find.text('Việc 10', skipOffstage: false), findsOneWidget);
  });

  testWidgets('đổi chip gửi status và reset danh sách', (t) async {
    final queries = <Map<String, String>>[];
    await _pump(t, (r) async {
      queries.add(r.url.queryParameters);
      return r.url.queryParameters['status'] == 'done'
          ? _json(_page([5]))
          : _json(_page([1, 2]));
    }, (api) => TasksScreen(api: api));
    expect(find.text('Việc 1'), findsOneWidget);
    await t.ensureVisible(find.text('Hoàn thành').first);
    await t.tap(find.text('Hoàn thành').first);
    await t.pump();
    await t.pump();
    expect(queries.last['status'], 'done');
    expect(find.text('Việc 1'), findsNothing);
    expect(find.text('Việc 5'), findsOneWidget);
  });

  testWidgets('danh sách rỗng', (t) async {
    await _pump(
      t,
      (_) async => _json(_page([])),
      (api) => TasksScreen(api: api),
    );
    expect(find.text('Chưa có công việc'), findsOneWidget);
  });

  testWidgets('detail: can_edit false ẩn Sửa/Xoá, đổi trạng thái gửi PATCH', (
    t,
  ) async {
    Object? sent;
    await _pump(t, (r) async {
      if (r.method == 'PATCH') {
        sent = jsonDecode(r.body);
        return _json({..._task(3), 'status': 'done'});
      }
      return _json(_task(3));
    }, (api) => TaskDetailScreen(api: api, taskId: 3));
    expect(find.byTooltip('Sửa'), findsNothing);
    expect(find.byTooltip('Xoá'), findsNothing);
    await t.tap(find.text('Hoàn thành'));
    await t.pump();
    await t.pump();
    expect(sent, {'status': 'done'});
  });

  testWidgets('detail: canEdit true hiện Sửa/Xoá', (t) async {
    await _pump(
      t,
      (_) async => _json(_task(3, canEdit: true)),
      (api) => TaskDetailScreen(api: api, taskId: 3),
    );
    expect(find.byTooltip('Sửa'), findsOneWidget);
    expect(find.byTooltip('Xoá'), findsOneWidget);
  });

  testWidgets('detail: 404 hiện thông báo', (t) async {
    await _pump(
      t,
      (_) async => _json({'detail': 'Không tìm thấy công việc'}, 404),
      (api) => TaskDetailScreen(api: api, taskId: 4),
    );
    expect(find.text('Không tìm thấy công việc'), findsOneWidget);
  });

  testWidgets('form: title rỗng không gửi POST', (t) async {
    var posted = false;
    await _pump(t, (r) async {
      if (r.method == 'POST') posted = true;
      return _json([
        {'id': 'u1', 'full_name': 'Nguyễn Văn A', 'avatar_url': null},
      ]);
    }, (api) => TaskFormScreen(api: api));
    await t.tap(find.text('Lưu'));
    await t.pump();
    expect(posted, isFalse);
    expect(find.text('Vui lòng nhập tiêu đề'), findsOneWidget);
  });

  testWidgets('form: sửa việc có hạn 1999 vẫn mở được bộ chọn ngày', (t) async {
    await _pump(
      t,
      (_) async => _json([]),
      (api) => TaskFormScreen(
        api: api,
        task: Task.fromJson({
          ..._task(3, canEdit: true),
          'due_date': '1999-01-01',
        }),
      ),
    );
    await t.tap(find.textContaining('Hạn'));
    await t.pumpAndSettle();
    expect(t.takeException(), isNull);
    expect(find.byType(DatePickerDialog), findsOneWidget);
  });

  testWidgets('form: 150 emoji (300 UTF-16) không bị báo quá 200 ký tự', (
    t,
  ) async {
    await _pump(
      t,
      (_) async => _json([]),
      (api) => TaskFormScreen(
        api: api,
        task: Task.fromJson({..._task(3, canEdit: true), 'title': '😀' * 150}),
      ),
    );
    await t.tap(find.text('Lưu'));
    await t.pump();
    expect(find.text('Tối đa 200 ký tự'), findsNothing);
  });

  for (final n in [200, 201]) {
    testWidgets('form: $n emoji ${n > 200 ? "bị chặn" : "được chấp nhận"}', (
      t,
    ) async {
      await _pump(
        t,
        (_) async => _json([]),
        (api) => TaskFormScreen(
          api: api,
          task: Task.fromJson({
            ..._task(3, canEdit: true),
            'title': '😀' * n,
          }),
        ),
      );
      await t.tap(find.text('Lưu'));
      await t.pump();
      expect(
        find.text('Tối đa 200 ký tự'),
        n > 200 ? findsOneWidget : findsNothing,
      );
    });
  }

  testWidgets('401 gọi onUnauthorized', (t) async {
    var called = 0;
    await _pump(
      t,
      (_) async => _json({'detail': 'x'}, 401),
      (api) => TasksScreen(api: api),
      onUnauthorized: () => called++,
    );
    expect(called, 1);
    expect(find.text('Thử lại'), findsNothing);
  });
}
