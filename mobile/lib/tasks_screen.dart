import 'package:flutter/material.dart';

import 'api.dart';
import 'app_meta.dart';
import 'models.dart';
import 'task_detail_screen.dart';
import 'task_form_screen.dart';

const _slate800 = Color(0xFF1E293B);
const _slate400 = Color(0xFF94A3B8);
const _slate600 = Color(0xFF475569);
const _red = Color(0xFFE11D48);

// "YYYY-MM-DD" -> "dd/MM/yyyy"
String fmtDate(String ymd) => ymd.split('-').reversed.join('/');

Widget taskBadge(String text, Color color) => Container(
  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
  decoration: BoxDecoration(
    color: color.withValues(alpha: 0.12),
    borderRadius: BorderRadius.circular(10),
  ),
  child: Text(
    text,
    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
  ),
);

Color priorityColor(String p) => p == 'high'
    ? _red
    : p == 'medium'
    ? const Color(0xFFD97706)
    : _slate600;

class TasksScreen extends StatefulWidget {
  final ApiClient api;
  const TasksScreen({super.key, required this.api});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  final _scroll = ScrollController();
  List<Task> _items = [];
  String? _next;
  String _scope = 'assigned_to_me';
  String? _status;
  bool _loading = true;
  bool _error = false;
  bool _loadingMore = false;
  bool _moreError = false;
  int _gen = 0; // tăng mỗi lần tải lại từ đầu để bỏ kết quả của request cũ

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.hasClients && _scroll.position.extentAfter < 200) {
        _loadMore();
      }
    });
    _load();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  // clear = true khi đổi bộ lọc: xoá danh sách cũ; kéo làm mới thì giữ lại tới khi có dữ liệu
  Future<void> _load({bool clear = true}) async {
    final gen = ++_gen;
    setState(() {
      if (clear) _items = [];
      _next = null;
      _loading = clear;
      _loadingMore = false;
      _moreError = false;
      _error = false;
    });
    try {
      final p = await widget.api.fetchTasks(scope: _scope, status: _status);
      if (!mounted || gen != _gen) return;
      setState(() {
        _items = p.items;
        _next = p.nextCursor;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || gen != _gen || (e is ApiException && e.status == 401)) {
        return;
      }
      setState(() {
        _loading = false;
        _error = true;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loading || _loadingMore || _next == null) return;
    final gen = _gen;
    setState(() {
      _loadingMore = true;
      _moreError = false;
    });
    try {
      final p = await widget.api.fetchTasks(
        scope: _scope,
        status: _status,
        cursor: _next,
      );
      if (!mounted || gen != _gen) return;
      final seen = _items.map((t) => t.id).toSet();
      setState(() {
        _items = [..._items, ...p.items.where((t) => !seen.contains(t.id))];
        _next = p.nextCursor;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted || gen != _gen || (e is ApiException && e.status == 401)) {
        return;
      }
      setState(() {
        _loadingMore = false;
        _moreError = true;
      });
    }
  }

  Future<void> _open(Widget screen) async {
    final changed = await Navigator.of(context)
        .push<bool>(MaterialPageRoute(builder: (_) => screen));
    if (changed == true && mounted) _load(clear: false);
  }

  Widget _chip(String label, String? value) => ChoiceChip(
    label: Text(label),
    selected: _status == value,
    selectedColor: appMeta['cong-viec']!.from.withValues(alpha: 0.2),
    onSelected: (_) {
      if (_status == value) return;
      _status = value;
      _load();
    },
  );

  Widget _row(Task t) {
    final who = _scope == 'assigned_to_me' ? t.assigner : t.assignee;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _open(TaskDetailScreen(api: widget.api, taskId: t.id)),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              t.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: _slate800,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              who.fullName,
              style: const TextStyle(fontSize: 12, color: _slate600),
            ),
            Text(
              t.dueDate == null ? 'Không có hạn' : fmtDate(t.dueDate!),
              style: TextStyle(
                fontSize: 12,
                color: t.isOverdue ? _red : _slate400,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                taskBadge(
                  priorityLabels[t.priority]!,
                  priorityColor(t.priority),
                ),
                taskBadge(statusLabels[t.status]!, appMeta['cong-viec']!.from),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _center(List<Widget> children) => ListView(
    physics: const AlwaysScrollableScrollPhysics(),
    children: [
      SizedBox(
        height: 300,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: children,
        ),
      ),
    ],
  );

  Widget _list() {
    if (_loading) {
      return _center([const CircularProgressIndicator()]);
    }
    if (_error) {
      return _center([
        const Text(
          'Không tải được dữ liệu',
          style: TextStyle(color: _slate600),
        ),
        const SizedBox(height: 8),
        FilledButton(onPressed: _load, child: const Text('Thử lại')),
      ]);
    }
    if (_items.isEmpty) {
      return _center([
        const Text('Chưa có công việc', style: TextStyle(color: _slate400)),
      ]);
    }
    return ListView(
      controller: _scroll,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 88),
      children: [
        for (final t in _items) _row(t),
        if (_loadingMore)
          const Padding(
            padding: EdgeInsets.all(8),
            child: Center(child: CircularProgressIndicator()),
          ),
        if (_moreError)
          Center(
            child: TextButton(
              onPressed: _loadMore,
              child: const Text('Thử lại'),
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Công việc')),
    floatingActionButton: FloatingActionButton(
      backgroundColor: appMeta['cong-viec']!.from,
      foregroundColor: Colors.white,
      onPressed: () => _open(TaskFormScreen(api: widget.api)),
      child: const Icon(Icons.add),
    ),
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: SegmentedButton<String>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(
                value: 'assigned_to_me',
                label: Text('Được giao cho tôi'),
              ),
              ButtonSegment(value: 'assigned_by_me', label: Text('Tôi giao')),
            ],
            selected: {_scope},
            onSelectionChanged: (s) {
              _scope = s.first;
              _load();
            },
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            spacing: 8,
            children: [
              _chip('Tất cả', null),
              for (final e in statusLabels.entries) _chip(e.value, e.key),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => _load(clear: false),
            child: _list(),
          ),
        ),
      ],
    ),
  );
}
