import 'package:flutter/material.dart';

import 'api.dart';
import 'approval_config_screen.dart';

class SettingsScreen extends StatelessWidget {
  final ApiClient api;
  const SettingsScreen({super.key, required this.api});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Cài đặt')),
    body: ListView(
      children: [
        ListTile(
          title: const Text('Cấu hình phê duyệt'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ApprovalConfigScreen(api: api)),
          ),
        ),
      ],
    ),
  );
}
