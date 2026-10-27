import 'package:flutter/material.dart';

import 'api.dart';
import 'app_meta.dart';
import 'models.dart';
import 'toast.dart';

const _slate400 = Color(0xFF94A3B8);
const _slate600 = Color(0xFF475569);

class ApprovalConfigScreen extends StatefulWidget {
  final ApiClient api;
  const ApprovalConfigScreen({super.key, required this.api});

  @override
  State<ApprovalConfigScreen> createState() => _ApprovalConfigScreenState();
}

class _ApprovalConfigScreenState extends State<ApprovalConfigScreen> {
  ApprovalTypes? _data;
  bool _loading = true;
  bool _error = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = false;
    });
    try {
      final d = await widget.api.fetchApprovalTypes();
      if (!mounted) return;
      setState(() {
        _data = d;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || (e is ApiException && e.status == 401)) return;
      setState(() {
        _loading = false;
        _error = true;
      });
    }
  }

  Future<void> _edit(ApprovalType t) async {
    final ok = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ApprovalFlowEditScreen(api: widget.api, type: t),
      ),
    );
    if (ok == true && mounted) _load();
  }

  Widget _body() {
    final d = _data;
    if (d == null) {
      if (_loading) return const Center(child: CircularProgressIndicator());
      return Center(
        child: _error
            ? Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Không tải được dữ liệu',
                    style: TextStyle(color: _slate600),
                  ),
                  const SizedBox(height: 8),
                  FilledButton(onPressed: _load, child: const Text('Thử lại')),
                ],
              )
            : null,
      );
    }
    return ListView(
      children: [
        for (final t in d.items)
          ListTile(
            title: Text(t.name),
            subtitle: Text(
              t.steps.isEmpty
                  ? 'Chưa cấu hình'
                  : t.steps.map((s) => s.approver.fullName).join(' → '),
              style: const TextStyle(color: _slate400),
            ),
            trailing: d.canEdit ? const Icon(Icons.chevron_right) : null,
            onTap: d.canEdit ? () => _edit(t) : null,
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Cấu hình phê duyệt')),
    body: _body(),
  );
}

class ApprovalFlowEditScreen extends StatefulWidget {
  final ApiClient api;
  final ApprovalType type;
  const ApprovalFlowEditScreen({
    super.key,
    required this.api,
    required this.type,
  });

  @override
  State<ApprovalFlowEditScreen> createState() => _ApprovalFlowEditScreenState();
}

class _ApprovalFlowEditScreenState extends State<ApprovalFlowEditScreen> {
  late final List<String?> _ids = [
    for (final s in widget.type.steps) s.approver.id,
  ];
  List<Employee>? _employees;
  bool _empError = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadEmployees();
  }

  Future<void> _loadEmployees() async {
    setState(() => _empError = false);
    try {
      final e = await widget.api.fetchEmployees();
      if (mounted) setState(() => _employees = e);
    } catch (e) {
      if (!mounted) return;
      setState(() => _empError = true);
      toastError(context, e);
    }
  }

  Future<void> _save() async {
    if (_saving) return;
    if (_ids.contains(null)) {
      return showToast(context, 'Vui lòng chọn người duyệt cho mọi cấp');
    }
    setState(() => _saving = true);
    try {
      await widget.api.updateApprovalFlow(widget.type.code, [
        for (final i in _ids) i!,
      ]);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      toastError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final emps = _employees;
    return Scaffold(
      appBar: AppBar(title: Text(widget.type.name)),
      body: emps == null
          ? Center(
              child: _empError
                  ? FilledButton(
                      onPressed: _loadEmployees,
                      child: const Text('Thử lại'),
                    )
                  : const CircularProgressIndicator(),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                for (var i = 0; i < _ids.length; i++)
                  Row(
                    spacing: 8,
                    children: [
                      Text('Cấp ${i + 1}'),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          // key theo vị trí + giá trị để xoá một cấp không làm lệch dropdown còn lại
                          key: ValueKey('$i-${_ids[i]}'),
                          initialValue: _ids[i],
                          isExpanded: true,
                          items: [
                            for (final e in emps)
                              DropdownMenuItem(
                                value: e.id,
                                child: Text(e.fullName),
                              ),
                          ],
                          onChanged: (v) => setState(() => _ids[i] = v),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Xoá cấp ${i + 1}',
                        onPressed: () => setState(() => _ids.removeAt(i)),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                if (_ids.length < 5)
                  TextButton(
                    onPressed: () => setState(() => _ids.add(null)),
                    child: const Text('Thêm cấp'),
                  ),
                const SizedBox(height: 24),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: appMeta['phe-duyet']!.from,
                  ),
                  onPressed: _saving ? null : _save,
                  child: const Text('Lưu'),
                ),
              ],
            ),
    );
  }
}
