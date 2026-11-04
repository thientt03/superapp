import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:superapp/api.dart';
import 'package:superapp/approval_config_screen.dart';
import 'package:superapp/approval_detail_screen.dart';
import 'package:superapp/approval_form_screen.dart';
import 'package:superapp/approvals_screen.dart';
import 'package:superapp/models.dart';

http.Response _json(Object body, [int status = 200]) => http.Response.bytes(
  utf8.encode(jsonEncode(body)),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

Map<String, dynamic> _emp(String id, String name) => {
  'id': id,
  'full_name': name,
  'avatar_url': null,
};

Map<String, dynamic> _req(int id, {bool canApprove = false, String? status}) =>
    {
      'id': id,
      'doc_type': 'bao_gia',
      'doc_type_name': 'Báo giá',
      'title': 'Yêu cầu $id',
      'description': null,
      'ref_no': null,
      'amount': 45000000,
      'start_date': null,
      'end_date': null,
      'status': status ?? 'pending',
      'current_level': 1,
      'requester': _emp('u2', 'Trần Thị B'),
      'steps': [
        {
          'level': 1,
          'approver': _emp('u1', 'Nguyễn Văn A'),
          'decision': null,
          'comment': null,
          'decided_at': null,
        },
      ],
      'can_approve': canApprove,
      'can_cancel': false,
      'created_at': '2026-10-27T08:00:00+07:00',
      'updated_at': '2026-10-27T08:00:00+07:00',
    };

Map<String, dynamic> _page(Iterable<int> ids, [String? next]) => {
  'items': [for (final i in ids) _req(i)],
  'next_cursor': next,
};

Map<String, dynamic> _type(
  String code,
  String name, {
  bool amount = false,
  bool range = false,
  bool configured = true,
}) => {
  'code': code,
  'name': name,
  'has_amount': amount,
  'has_date_range': range,
  'steps': configured
      ? [
          {'level': 1, 'approver': _emp('u2', 'Trần Thị B')},
        ]
      : [],
};

Map<String, dynamic> _types({bool canEdit = true}) => {
  'can_edit': canEdit,
  'items': [
    _type('bao_gia', 'Báo giá', amount: true),
    _type('nghi_phep', 'Nghỉ phép', range: true),
    _type('khac', 'Khác', configured: false),
  ],
};

Future<ApiClient> _pump(
  WidgetTester t,
  MockClientHandler h,
  Widget Function(ApiClient) screen, {
  VoidCallback? onUnauthorized,
}) async {
  await t.binding.setSurfaceSize(const Size(400, 800));
  addTearDown(() => t.binding.setSurfaceSize(null));
  final api = ApiClient(client: MockClient(h), baseUrl: 'http://x')
    ..token = 't'
    ..onUnauthorized = onUnauthorized;
  await t.pumpWidget(MaterialApp(home: screen(api)));
  await t.pump();
  await t.pump();
  return api;
}

Future<void> _settle(WidgetTester t) async {
  await t.pump();
  await t.pump();
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('tab mặc định to_approve, không chip; sang Tôi đã gửi có chip', (
    t,
  ) async {
    final queries = <Map<String, String>>[];
    await _pump(t, (r) async {
      queries.add(r.url.queryParameters);
      return _json(_page([1]));
    }, (api) => ApprovalsScreen(api: api));
    expect(queries.last['scope'], 'to_approve');
    expect(find.byType(ChoiceChip), findsNothing);
    await t.tap(find.text('Tôi đã gửi'));
    await _settle(t);
    expect(queries.last['scope'], 'submitted');
    expect(find.byType(ChoiceChip), findsNWidgets(5));
    await t.ensureVisible(find.text('Từ chối'));
    await t.tap(find.text('Từ chối'));
    await _settle(t);
    expect(queries.last['status'], 'rejected');
    await t.tap(find.text('Chờ tôi duyệt'));
    await _settle(t);
    expect(queries.last.containsKey('status'), isFalse);
  });

  testWidgets('cuộn xuống gửi cursor và nối trang', (t) async {
    final queries = <Map<String, String>>[];
    await _pump(t, (r) async {
      queries.add(r.url.queryParameters);
      return r.url.queryParameters['cursor'] == 'c1'
          ? _json(_page([9, 10]))
          : _json(_page(List.generate(8, (i) => i + 1), 'c1'));
    }, (api) => ApprovalsScreen(api: api));
    await t.drag(find.byType(ListView).last, const Offset(0, -2000));
    await _settle(t);
    expect(queries.last['cursor'], 'c1');
    expect(find.text('Yêu cầu 10', skipOffstage: false), findsOneWidget);
  });

  testWidgets('detail: can_approve hiện Duyệt/Từ chối; lý do rỗng không POST', (
    t,
  ) async {
    var posted = false;
    await _pump(t, (r) async {
      if (r.method == 'POST') posted = true;
      return _json(_req(3, canApprove: true));
    }, (api) => ApprovalDetailScreen(api: api, approvalId: 3));
    expect(find.text('Duyệt'), findsOneWidget);
    await t.tap(find.text('Từ chối'));
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(TextButton, 'Từ chối'));
    await t.pump();
    expect(posted, isFalse);
    expect(find.text('Vui lòng nhập lý do'), findsOneWidget);
  });

  testWidgets('detail: không can_approve ẩn nút', (t) async {
    await _pump(
      t,
      (_) async => _json(_req(3)),
      (api) => ApprovalDetailScreen(api: api, approvalId: 3),
    );
    expect(find.text('Duyệt'), findsNothing);
    expect(find.text('Từ chối'), findsNothing);
  });

  testWidgets('detail: Duyệt gửi POST approve với body {}', (t) async {
    String? path;
    Object? sent;
    await _pump(t, (r) async {
      if (r.method == 'POST') {
        path = r.url.path;
        sent = jsonDecode(r.body);
        return _json(_req(3, status: 'approved'));
      }
      return _json(_req(3, canApprove: true));
    }, (api) => ApprovalDetailScreen(api: api, approvalId: 3));
    await t.tap(find.text('Duyệt'));
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(TextButton, 'Duyệt'));
    await _settle(t);
    expect(path, '/api/approvals/3/approve');
    expect(sent, <String, dynamic>{});
    expect(find.text('Đã duyệt'), findsWidgets);
  });

  testWidgets('detail: 409 hiện toast detail', (t) async {
    await _pump(t, (r) async {
      if (r.method == 'POST') {
        return _json({'detail': 'Yêu cầu đã được xử lý'}, 409);
      }
      return _json(_req(3, canApprove: true));
    }, (api) => ApprovalDetailScreen(api: api, approvalId: 3));
    await t.tap(find.text('Duyệt'));
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(TextButton, 'Duyệt'));
    await _settle(t);
    expect(find.text('Yêu cầu đã được xử lý'), findsOneWidget);
    await t.pump(const Duration(seconds: 3));
  });

  testWidgets('detail: 404 hiện thông báo', (t) async {
    await _pump(
      t,
      (_) async => _json({'detail': 'Không tìm thấy yêu cầu phê duyệt'}, 404),
      (api) => ApprovalDetailScreen(api: api, approvalId: 4),
    );
    expect(find.text('Không tìm thấy yêu cầu phê duyệt'), findsOneWidget);
  });

  testWidgets(
    'form: nghi_phep ẩn số tiền, hiện ngày; loại chưa cấu hình disable',
    (t) async {
      await _pump(
        t,
        (_) async => _json(_types()),
        (api) => ApprovalFormScreen(api: api),
      );
      await t.tap(find.byType(DropdownButtonFormField<ApprovalType>));
      await t.pumpAndSettle();
      expect(find.text('Khác (chưa cấu hình)'), findsOneWidget);
      await t.tap(find.text('Nghỉ phép').last);
      await t.pumpAndSettle();
      expect(find.text('Cấp 1: Trần Thị B'), findsOneWidget);
      expect(find.text('Số tiền (VND)'), findsNothing);
      expect(find.text('Từ'), findsOneWidget);
      expect(find.text('Đến'), findsOneWidget);
    },
  );

  testWidgets('form: tiêu đề rỗng không gửi POST', (t) async {
    var posted = false;
    await _pump(t, (r) async {
      if (r.method == 'POST') posted = true;
      return _json(_types());
    }, (api) => ApprovalFormScreen(api: api));
    await t.tap(find.byType(DropdownButtonFormField<ApprovalType>));
    await t.pumpAndSettle();
    await t.tap(find.text('Báo giá').last);
    await t.pumpAndSettle();
    await t.tap(find.text('Gửi yêu cầu'));
    await t.pump();
    expect(posted, isFalse);
    expect(find.text('Vui lòng nhập tiêu đề'), findsOneWidget);
  });

  testWidgets('config: sửa chuỗi gửi PUT đúng approver_ids', (t) async {
    Object? sent;
    String? path;
    await _pump(t, (r) async {
      if (r.method == 'PUT') {
        path = r.url.path;
        sent = jsonDecode(r.body);
        return _json(_type('bao_gia', 'Báo giá', amount: true));
      }
      if (r.url.path == '/api/employees') {
        return _json([_emp('u1', 'Nguyễn Văn A'), _emp('u2', 'Trần Thị B')]);
      }
      return _json(_types());
    }, (api) => ApprovalConfigScreen(api: api));
    expect(find.text('Chưa cấu hình'), findsOneWidget);
    await t.tap(find.text('Báo giá'));
    await t.pumpAndSettle();
    await t.tap(find.text('Thêm cấp'));
    await t.pump();
    await t.tap(find.text('Lưu'));
    await t.pump();
    expect(sent, isNull); // cấp mới chưa chọn người
    // toast chỉ đếm giờ sau khi hiện xong nên cần hai lần pump để tắt khỏi nút Lưu
    await t.pump(const Duration(seconds: 3));
    await t.pump(const Duration(seconds: 3));
    await t.pumpAndSettle();
    await t.tap(find.byType(DropdownButtonFormField<String>).last);
    await t.pumpAndSettle();
    await t.tap(find.text('Nguyễn Văn A').last);
    await t.pumpAndSettle();
    await t.tap(find.text('Lưu'));
    await t.pumpAndSettle();
    expect(path, '/api/approval-types/bao_gia/steps');
    expect(sent, {
      'approver_ids': ['u2', 'u1'],
    });
  });

  testWidgets('401 gọi onUnauthorized', (t) async {
    var called = 0;
    await _pump(
      t,
      (_) async => _json({'detail': 'x'}, 401),
      (api) => ApprovalsScreen(api: api),
      onUnauthorized: () => called++,
    );
    expect(called, 1);
    expect(find.text('Thử lại'), findsNothing);
  });
}
