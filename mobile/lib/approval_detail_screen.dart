import 'package:flutter/material.dart';

import 'api.dart';
import 'approvals_screen.dart';
import 'models.dart';
import 'tasks_screen.dart';
import 'toast.dart';

const _slate800 = Color(0xFF1E293B);
const _slate400 = Color(0xFF94A3B8);
const _slate600 = Color(0xFF475569);

// "2026-10-27T08:00:00+07:00" -> "27/10/2026 08:00" (giữ nguyên giờ địa phương của chuỗi)
String _fmtTime(String iso) =>
    '${fmtDate(iso.substring(0, 10))} ${iso.substring(11, 16)}';

class ApprovalDetailScreen extends StatefulWidget {
  final ApiClient api;
  final int approvalId;
  const ApprovalDetailScreen({
    super.key,
    required this.api,
    required this.approvalId,
  });

  @override
  State<ApprovalDetailScreen> createState() => _ApprovalDetailScreenState();
}

class _ApprovalDetailScreenState extends State<ApprovalDetailScreen> {
  ApprovalRequest? _req;
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
      final r = await widget.api.fetchApproval(widget.approvalId);
      if (!mounted) return;
      setState(() {
        _req = r;
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

  Future<void> _act(Future<ApprovalRequest> Function() call) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final r = await call();
      if (!mounted) return;
      setState(() {
        _req = r;
        _busy = false;
        _changed = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      if (e is ApiException && e.status == 404) {
        setState(() => _notFound = true);
        return;
      }
      toastError(context, e);
      if (e is ApiException && e.status == 409) {
        _changed = true;
        _load();
      }
    }
  }

  Future<void> _approve() async {
    final c = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (d) => AlertDialog(
        title: const Text('Duyệt yêu cầu'),
        content: TextField(
          controller: c,
          maxLength: 1000,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Ghi chú (tuỳ chọn)'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(d, false),
            child: const Text('Huỷ'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(d, true),
            child: const Text('Duyệt'),
          ),
        ],
      ),
    );
    final text = c.text.trim();
    c.dispose();
    if (ok != true || !mounted) return;
    _act(
      () => widget.api.approveApproval(
        widget.approvalId,
        comment: text.isEmpty ? null : text,
      ),
    );
  }

  Future<void> _reject() async {
    final c = TextEditingController();
    String? err;
    final ok = await showDialog<bool>(
      context: context,
      builder: (d) => StatefulBuilder(
        builder: (d, setD) => AlertDialog(
          title: const Text('Từ chối yêu cầu'),
          content: TextField(
            controller: c,
            maxLength: 1000,
            maxLines: 3,
            decoration: InputDecoration(labelText: 'Lý do', errorText: err),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(d, false),
              child: const Text('Huỷ'),
            ),
            TextButton(
              onPressed: () {
                if (c.text.trim().isEmpty) {
                  return setD(() => err = 'Vui lòng nhập lý do');
                }
                Navigator.pop(d, true);
              },
              child: const Text('Từ chối'),
            ),
          ],
        ),
      ),
    );
    final text = c.text.trim();
    c.dispose();
    if (ok != true || !mounted) return;
    _act(() => widget.api.rejectApproval(widget.approvalId, text));
  }

  Future<void> _cancel() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Huỷ yêu cầu?'),
        content: const Text('Yêu cầu sẽ không còn được xử lý.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Không'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Huỷ yêu cầu'),
          ),
        ],
      ),
    );
    if (yes != true || !mounted) return;
    _act(() => widget.api.cancelApproval(widget.approvalId));
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

  Widget _text(String s) =>
      Text(s, style: const TextStyle(fontSize: 14, color: _slate800));

  Widget _step(ApprovalStep s) {
    final d = s.decision;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: _text('Cấp ${s.level}: ${s.approver.fullName}')),
              taskBadge(
                d == null ? 'Chưa xử lý' : approvalStatusLabels[d]!,
                d == null ? _slate600 : approvalStatusColor(d),
              ),
            ],
          ),
          if (s.comment != null)
            Text(
              s.comment!,
              style: const TextStyle(fontSize: 12, color: _slate600),
            ),
          if (s.decidedAt != null)
            Text(
              _fmtTime(s.decidedAt!),
              style: const TextStyle(fontSize: 12, color: _slate400),
            ),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_notFound) {
      return const Center(child: Text('Không tìm thấy yêu cầu phê duyệt'));
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
    final r = _req!;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          r.title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: _slate800,
          ),
        ),
        const SizedBox(height: 16),
        _field(
          'Trạng thái',
          Align(
            alignment: Alignment.centerLeft,
            child: taskBadge(
              approvalStatusLabels[r.status]!,
              approvalStatusColor(r.status),
            ),
          ),
        ),
        _field('Loại chứng từ', _text(r.docTypeName)),
        if (r.refNo != null) _field('Số chứng từ', _text(r.refNo!)),
        if (r.amount != null) _field('Số tiền', _text(fmtMoney(r.amount!))),
        if (r.startDate != null && r.endDate != null)
          _field(
            'Thời gian',
            _text('${fmtDate(r.startDate!)} - ${fmtDate(r.endDate!)}'),
          ),
        _field('Mô tả', _text(r.description ?? 'Không có mô tả')),
        _field('Người gửi', _text(r.requester.fullName)),
        _field(
          'Quy trình duyệt',
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [for (final s in r.steps) _step(s)],
          ),
        ),
        if (r.canApprove)
          Row(
            spacing: 12,
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _busy ? null : _reject,
                  child: const Text('Từ chối'),
                ),
              ),
              Expanded(
                child: FilledButton(
                  onPressed: _busy ? null : _approve,
                  child: const Text('Duyệt'),
                ),
              ),
            ],
          ),
        if (r.canCancel)
          OutlinedButton(
            onPressed: _busy ? null : _cancel,
            child: const Text('Huỷ yêu cầu'),
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
      appBar: AppBar(title: const Text('Chi tiết yêu cầu')),
      body: _body(),
    ),
  );
}
