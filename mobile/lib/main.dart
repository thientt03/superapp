import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'api.dart';
import 'dashboard_screen.dart';
import 'login_screen.dart';

void main() => runApp(const SuperApp());

class SuperApp extends StatelessWidget {
  const SuperApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'SuperApp',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFBE094E)),
      scaffoldBackgroundColor: const Color(0xFFF8F9FA),
      textTheme: GoogleFonts.beVietnamProTextTheme(),
    ),
    home: const AuthGate(),
  );
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final _api = ApiClient();
  String? _notice;

  @override
  void initState() {
    super.initState();
    _api.onUnauthorized = () {
      if (mounted) {
        Navigator.of(context).popUntil((r) => r.isFirst);
        setState(
          () => _notice = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
        );
      }
    };
  }

  @override
  Widget build(BuildContext context) => _api.token == null
      ? LoginScreen(
          api: _api,
          onLoggedIn: () => setState(() => _notice = null),
          notice: _notice,
        )
      : DashboardScreen(
          api: _api,
          onLogout: () => setState(() => _notice = null),
        );
}
