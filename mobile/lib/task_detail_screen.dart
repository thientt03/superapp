import 'package:flutter/material.dart';

import 'api.dart';
import 'models.dart';
import 'task_form_screen.dart';
import 'tasks_screen.dart';
import 'toast.dart';

const _slate800 = Color(0xFF1E293B);
const _slate400 = Color(0xFF94A3B8);
const _slate600 = Color(0xFF475569);

class TaskDetailScreen extends StatefulWidget {
  final ApiClient api;
  final int taskId;
  const TaskDetailScreen({super.key, required this.api, required this.taskId});

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  Task? _task;
  bool _loading = true;
  bool _error = false;
  bool _notFound = false;
  bool _busy = false;
  bool _changed = false;

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
      final t = await widget.api.fetchTask(widget.taskId);
      if (!mounted) return;
      setState(() {
        _task = t;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || (e is ApiException && e.status == 401)) return;
      setState(() {
        _loading = false;
        _notFound = e is ApiException && e.status == 404;
        _error = !_notFound;
      });
    }
  }

  Future<void> _setStatus(String status) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final t = await widget.api.updateTask(widget.taskId, {'status': status});
      if (!mounted) return;
      setState(() {
        _task = t;
        _busy = false;
        _changed = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      toastError(context, e);
    }
  }

  Future<void> _edit() async {
    final ok = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TaskFormScreen(api: widget.api, task: _task),
      ),
    );
    if (ok == true && mounted) {
      _changed = true;
      _load();
    }
  }

  Future<void> _delete() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Xoá công việc?'),
        content: const Text('Công việc sẽ bị xoá vĩnh viễn.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Huỷ'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Xoá'),
          ),
        ],
      ),
    );
    if (yes != true || _busy || !mounted) return;
    setState(() => _busy = true);
    try {
      await widget.api.deleteTask(widget.taskId);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _notFound = e is ApiException && e.status == 404;
      });
      if (!_notFound) toastError(context, e);
    }
  }

  Widget _field(String label, Widget value) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: _slate400)),
        const SizedBox(height: 4),
        value,
      ],
    ),
  );

  Widget _text(String s, {Color color = _slate800}) =>
      Text(s, style: TextStyle(fontSize: 14, color: color));

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_notFound) {
      return const Center(child: Text('Không tìm thấy công việc'));
    }
    if (_error) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Không tải được dữ liệu',
              style: TextStyle(color: _slate600),
            ),
            const SizedBox(height: 8),
            FilledButton(onPressed: _load, child: const Text('Thử lại')),
          ],
        ),
      );
    }
    final t = _task!;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          t.title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: _slate800,
          ),
        ),
        const SizedBox(height: 16),
        _field('Mô tả', _text(t.description ?? 'Không có mô tả')),
        _field('Người giao', _text(t.assigner.fullName)),
        _field('Người được giao', _text(t.assignee.fullName)),
        _field(
          'Hạn',
          _text(
            t.dueDate == null ? 'Không có hạn' : fmtDate(t.dueDate!),
            color: t.isOverdue ? const Color(0xFFE11D48) : _slate800,
          ),
        ),
        _field(
          'Ưu tiên',
          taskBadge(priorityLabels[t.priority]!, priorityColor(t.priority)),
        ),
        _field(
          'Trạng thái',
          SegmentedButton<String>(
            showSelectedIcon: false,
            segments: [
              for (final e in statusLabels.entries)
                ButtonSegment(value: e.key, label: Text(e.value)),
            ],
            selected: {t.status},
            onSelectionChanged: _busy ? null : (s) => _setStatus(s.first),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: false,
    onPopInvokedWithResult: (didPop, _) {
      if (!didPop) Navigator.of(context).pop(_changed);
    },
    child: Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết công việc'),
        actions: [
          if (_task?.canEdit == true) ...[
            IconButton(
              tooltip: 'Sửa',
              onPressed: _busy ? null : _edit,
              icon: const Icon(Icons.edit_outlined),
            ),
            IconButton(
              tooltip: 'Xoá',
              onPressed: _busy ? null : _delete,
              icon: const Icon(Icons.delete_outline),
            ),
          ],
        ],
      ),
      body: _body(),
    ),
  );
}
