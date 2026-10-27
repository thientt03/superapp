import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

class ApiException implements Exception {
  final int status;
  final String detail;
  ApiException(this.status, this.detail);
  @override
  String toString() => 'ApiException($status): $detail';
}

class ApiClient {
  // Android emulator cần: --dart-define=API_BASE_URL=http://10.0.2.2:8000
  static const String _defaultBase = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8000',
  );

  final http.Client _client;
  final String baseUrl;

  ApiClient({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      baseUrl = baseUrl ?? _defaultBase;

  // shortcut: token chỉ trong bộ nhớ, mở lại app phải đăng nhập lại; dùng flutter_secure_storage nếu cần nhớ phiên
  String? token;
  void Function()? onUnauthorized;

  Future<Map<String, dynamic>?> _send(
    Future<http.Response> Function(Map<String, String> headers) call, {
    bool notify = true,
  }) async {
    final sent = token;
    final res = await call({if (sent != null) 'Authorization': 'Bearer $sent'})
        .timeout(const Duration(seconds: 10));
    dynamic body;
    try {
      body = jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      body = null;
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      // 401 của request không kèm token (login) không đụng tới phiên
      if (res.statusCode == 401 && sent != null) {
        token = null;
        if (notify) onUnauthorized?.call();
      }
      final d = body is Map ? body['detail'] : null;
      throw ApiException(res.statusCode, d is String ? d : '');
    }
    return body is Map<String, dynamic> ? body : null;
  }

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  Future<Dashboard> fetchDashboard() async => Dashboard.fromJson(
    (await _send((h) => _client.get(_u('/api/dashboard'), headers: h)))!,
  );

  Future<Attendance> checkIn() async => Attendance.fromJson(
    (await _send(
      (h) => _client.post(_u('/api/attendance/check-in'), headers: h),
    ))!,
  );

  Future<void> login(String username, String password) async {
    final b = await _send(
      (h) => _client.post(
        _u('/api/auth/login'),
        headers: {...h, 'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      ),
    );
    token = b!['access_token'] as String;
  }

  Future<void> logout() async {
    try {
      await _send(
        (h) => _client.post(_u('/api/auth/logout'), headers: h),
        notify: false,
      );
    } catch (_) {}
    token = null;
  }
}
