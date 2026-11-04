import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:superapp/api.dart';
import 'package:superapp/login_screen.dart';

http.Response _json(Object body, [int status = 200]) => http.Response.bytes(
  utf8.encode(jsonEncode(body)),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

Future<
  ({
    ApiClient api,
    int Function() calls,
    int Function() loggedIn,
    int Function() unauth,
  })
>
_pump(WidgetTester t, MockClientHandler h, {String? notice}) async {
  var calls = 0, loggedIn = 0, unauth = 0;
  final api = ApiClient(
    client: MockClient((r) {
      calls++;
      return h(r);
    }),
    baseUrl: 'http://x',
  )..onUnauthorized = () => unauth++;
  await t.pumpWidget(
    MaterialApp(
      home: LoginScreen(api: api, onLoggedIn: () => loggedIn++, notice: notice),
    ),
  );
  return (
    api: api,
    calls: () => calls,
    loggedIn: () => loggedIn,
    unauth: () => unauth,
  );
}

Future<void> _submit(WidgetTester t, String u, String p) async {
  await t.enterText(find.byType(TextField).at(0), u);
  await t.enterText(find.byType(TextField).at(1), p);
  await t.tap(find.text('Đăng nhập'));
  await t.pump();
  await t.pump();
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('ô rỗng không gửi request', (t) async {
    final r = await _pump(t, (_) async => _json({}));
    await _submit(t, '  ', '');
    expect(r.calls(), 0);
    expect(
      find.text('Vui lòng nhập tên đăng nhập và mật khẩu'),
      findsOneWidget,
    );
  });

  testWidgets('200 lưu token và gọi onLoggedIn', (t) async {
    String? body;
    final r = await _pump(t, (q) async {
      body = q.body;
      return _json({'access_token': 'abc', 'token_type': 'bearer'});
    });
    await _submit(t, ' demo ', 'demo123');
    expect(r.api.token, 'abc');
    expect(r.loggedIn(), 1);
    expect(jsonDecode(body!), {'username': 'demo', 'password': 'demo123'});
  });

  testWidgets('401 hiện detail, xoá mật khẩu, không gọi onUnauthorized', (
    t,
  ) async {
    final r = await _pump(
      t,
      (_) async => _json({'detail': 'Sai tên đăng nhập hoặc mật khẩu'}, 401),
    );
    await _submit(t, 'demo', 'bad');
    expect(find.text('Sai tên đăng nhập hoặc mật khẩu'), findsOneWidget);
    expect(
      t.widget<TextField>(find.byType(TextField).at(1)).controller!.text,
      '',
    );
    expect(
      t.widget<TextField>(find.byType(TextField).at(0)).controller!.text,
      'demo',
    );
    expect(r.unauth(), 0);
  });

  testWidgets('429 hiện detail, giữ username và mật khẩu', (t) async {
    const msg = 'Thử đăng nhập quá nhiều lần, vui lòng thử lại sau';
    final r = await _pump(t, (_) async => _json({'detail': msg}, 429));
    await _submit(t, 'demo', 'bad');
    expect(find.text(msg), findsOneWidget);
    expect(
      t.widget<TextField>(find.byType(TextField).at(0)).controller!.text,
      'demo',
    );
    expect(
      t.widget<TextField>(find.byType(TextField).at(1)).controller!.text,
      'bad',
    );
    expect(r.api.token, isNull);
    expect(r.loggedIn(), 0);
    expect(r.unauth(), 0);
    expect(
      t.widget<ElevatedButton>(find.byType(ElevatedButton)).onPressed,
      isNotNull,
    );
  });

  testWidgets('lỗi mạng', (t) async {
    await _pump(t, (_) async => throw Exception('net'));
    await _submit(t, 'demo', 'x');
    expect(find.text('Không thể kết nối máy chủ'), findsOneWidget);
  });

  testWidgets('hiện notice', (t) async {
    await _pump(t, (_) async => _json({}), notice: 'Phiên hết hạn');
    expect(find.text('Phiên hết hạn'), findsOneWidget);
  });
}
