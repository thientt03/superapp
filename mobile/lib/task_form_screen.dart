import 'package:flutter/material.dart';

import 'api.dart';
import 'app_meta.dart';
import 'models.dart';
import 'tasks_screen.dart';
import 'toast.dart';

class TaskFormScreen extends StatefulWidget {
  final ApiClient api;
  final Task? task;
  const TaskFormScreen({super.key, required this.api, this.task});

  @override
  State<TaskFormScreen> createState() => _TaskFormScreenState();
}

class _TaskFormScreenState extends State<TaskFormScreen> {
  late final _title = TextEditingController(text: widget.task?.title);
  late final _desc = TextEditingController(text: widget.task?.description);
  late String? _assignee = widget.task?.assignee.id;
  late String? _due = widget.task?.dueDate;
  late String _priority = widget.task?.priority ?? 'medium';
  List<Employee>? _employees;
  bool _empError = false;
  bool _saving = false;
  String? _titleError;

  @override
  void initState() {
    super.initState();
    _loadEmployees();
  }

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    super.dispose();
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

  Future<void> _pickDate() async {
    final init = _due == null ? DateTime.now() : DateTime.parse(_due!);
    final lo = DateTime(2000), hi = DateTime(2100);
    final d = await showDatePicker(
      context: context,
      initialDate: init,
      firstDate: init.isBefore(lo) ? init : lo,
      lastDate: init.isAfter(hi) ? init : hi,
    );
    if (d == null || !mounted) return;
    String p(int n, int w) => n.toString().padLeft(w, '0');
    setState(() => _due = '${p(d.year, 4)}-${p(d.month, 2)}-${p(d.day, 2)}');
  }

  Future<void> _save() async {
    if (_saving) return;
    final title = _title.text.trim();
    if (title.isEmpty || title.runes.length > 200) {
      setState(
        () => _titleError = title.isEmpty
            ? 'Vui lòng nhập tiêu đề'
            : 'Tối đa 200 ký tự',
      );
      return;
    }
    if (_assignee == null) {
      return showToast(context, 'Vui lòng chọn người được giao');
    }
    final desc = _desc.text.trim();
    final t = widget.task;
    final Map<String, dynamic> body;
    if (t == null) {
      body = {
        'title': title,
        if (desc.isNotEmpty) 'description': desc,
        'assignee_id': _assignee,
        if (_due != null) 'due_date': _due,
        'priority': _priority,
      };
    } else {
      body = {
        if (title != t.title) 'title': title,
        if (desc != (t.description ?? ''))
          'description': desc.isEmpty ? null : desc,
        if (_assignee != t.assignee.id) 'assignee_id': _assignee,
        if (_due != t.dueDate) 'due_date': _due,
        if (_priority != t.priority) 'priority': _priority,
      };
      if (body.isEmpty) return Navigator.of(context).pop();
    }
    setState(() {
      _titleError = null;
      _saving = true;
    });
    try {
      if (t == null) {
        await widget.api.createTask(body);
      } else {
        await widget.api.updateTask(t.id, body);
      }
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
      appBar: AppBar(
        title: Text(widget.task == null ? 'Thêm công việc' : 'Sửa công việc'),
      ),
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
                TextField(
                  controller: _title,
                  maxLength: 200,
                  decoration: InputDecoration(
                    labelText: 'Tiêu đề',
                    errorText: _titleError,
                  ),
                ),
                TextField(
                  controller: _desc,
                  maxLength: 5000,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'Mô tả'),
                ),
                DropdownButtonFormField<String>(
                  initialValue: _assignee,
                  decoration: const InputDecoration(
                    labelText: 'Người được giao',
                  ),
                  items: [
                    for (final e in emps)
                      DropdownMenuItem(value: e.id, child: Text(e.fullName)),
                  ],
                  onChanged: (v) => setState(() => _assignee = v),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _pickDate,
                        child: Text(
                          _due == null ? 'Chọn hạn' : 'Hạn ${fmtDate(_due!)}',
                        ),
                      ),
                    ),
                    if (_due != null)
                      IconButton(
                        tooltip: 'Xoá hạn',
                        onPressed: () => setState(() => _due = null),
                        icon: const Icon(Icons.close),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: _priority,
                  decoration: const InputDecoration(labelText: 'Ưu tiên'),
                  items: [
                    for (final e in priorityLabels.entries)
                      DropdownMenuItem(value: e.key, child: Text(e.value)),
                  ],
                  onChanged: (v) => setState(() => _priority = v!),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: appMeta['cong-viec']!.from,
                  ),
                  onPressed: _saving ? null : _save,
                  child: const Text('Lưu'),
                ),
              ],
            ),
    );
  }
}
