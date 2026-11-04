import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'api.dart';
import 'app_meta.dart';
import 'models.dart';
import 'tasks_screen.dart';
import 'toast.dart';

class ApprovalFormScreen extends StatefulWidget {
  final ApiClient api;
  const ApprovalFormScreen({super.key, required this.api});

  @override
  State<ApprovalFormScreen> createState() => _ApprovalFormScreenState();
}

class _ApprovalFormScreenState extends State<ApprovalFormScreen> {
  final _title = TextEditingController();
  final _refNo = TextEditingController();
  final _desc = TextEditingController();
  final _amount = TextEditingController();
  List<ApprovalType>? _types;
  bool _loadError = false;
  bool _saving = false;
  ApprovalType? _type;
  String? _start;
  String? _end;
  String? _titleError;
  String? _amountError;

  @override
  void initState() {
    super.initState();
    _loadTypes();
  }

  @override
  void dispose() {
    _title.dispose();
    _refNo.dispose();
    _desc.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _loadTypes() async {
    setState(() => _loadError = false);
    try {
      final t = await widget.api.fetchApprovalTypes();
      if (mounted) setState(() => _types = t.items);
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadError = true);
      toastError(context, e);
    }
  }

  Future<void> _pickDate(bool start) async {
    final cur = start ? _start : _end;
    final init = cur == null ? DateTime.now() : DateTime.parse(cur);
    final lo = DateTime(2000), hi = DateTime(2100);
    final d = await showDatePicker(
      context: context,
      initialDate: init,
      firstDate: init.isBefore(lo) ? init : lo,
      lastDate: init.isAfter(hi) ? init : hi,
    );
    if (d == null || !mounted) return;
    String p(int n, int w) => n.toString().padLeft(w, '0');
    final s = '${p(d.year, 4)}-${p(d.month, 2)}-${p(d.day, 2)}';
    setState(() => start ? _start = s : _end = s);
  }

  Future<void> _save() async {
    if (_saving) return;
    final type = _type;
    if (type == null) return showToast(context, 'Vui lòng chọn loại chứng từ');
    final title = _title.text.trim();
    final ref = _refNo.text.trim();
    final desc = _desc.text.trim();
    if (title.isEmpty || title.runes.length > 200) {
      setState(
        () => _titleError = title.isEmpty
            ? 'Vui lòng nhập tiêu đề'
            : 'Tối đa 200 ký tự',
      );
      return;
    }
    if (ref.runes.length > 50) {
      return showToast(context, 'Số chứng từ tối đa 50 ký tự');
    }
    int? amount;
    if (type.hasAmount) {
      amount = int.tryParse(_amount.text);
      if (amount == null || amount < 1 || amount > 999999999999) {
        setState(() {
          _titleError = null;
          _amountError = 'Số tiền phải từ 1 đến 999.999.999.999';
        });
        return;
      }
    }
    if (type.hasDateRange) {
      if (_start == null || _end == null) {
        return showToast(context, 'Vui lòng chọn ngày bắt đầu và kết thúc');
      }
      if (_end!.compareTo(_start!) < 0) {
        return showToast(
          context,
          'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
        );
      }
    }
    final body = <String, dynamic>{
      'doc_type': type.code,
      'title': title,
      if (desc.isNotEmpty) 'description': desc,
      if (ref.isNotEmpty) 'ref_no': ref,
      if (type.hasAmount) 'amount': amount,
      if (type.hasDateRange) ...{'start_date': _start, 'end_date': _end},
    };
    setState(() {
      _titleError = null;
      _amountError = null;
      _saving = true;
    });
    try {
      await widget.api.createApproval(body);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      toastError(context, e);
    }
  }

  Widget _dateButton(String label, String? v, bool start) => Expanded(
    child: OutlinedButton(
      onPressed: () => _pickDate(start),
      child: Text(v == null ? label : '$label ${fmtDate(v)}'),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final types = _types;
    final type = _type;
    return Scaffold(
      appBar: AppBar(title: const Text('Tạo yêu cầu')),
      body: types == null
          ? Center(
              child: _loadError
                  ? FilledButton(
                      onPressed: _loadTypes,
                      child: const Text('Thử lại'),
                    )
                  : const CircularProgressIndicator(),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                DropdownButtonFormField<ApprovalType>(
                  initialValue: type,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Loại chứng từ'),
                  items: [
                    for (final t in types)
                      DropdownMenuItem(
                        value: t,
                        enabled: t.steps.isNotEmpty,
                        child: Text(
                          t.steps.isEmpty
                              ? '${t.name} (chưa cấu hình)'
                              : t.name,
                        ),
                      ),
                  ],
                  onChanged: (v) => setState(() {
                    _type = v;
                    _amount.clear();
                    _start = null;
                    _end = null;
                    _amountError = null;
                  }),
                ),
                if (type != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      [
                        for (final s in type.steps)
                          'Cấp ${s.level}: ${s.approver.fullName}',
                      ].join(' → '),
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF475569),
                      ),
                    ),
                  ),
                TextField(
                  controller: _title,
                  maxLength: 200,
                  decoration: InputDecoration(
                    labelText: 'Tiêu đề',
                    errorText: _titleError,
                  ),
                ),
                TextField(
                  controller: _refNo,
                  maxLength: 50,
                  decoration: const InputDecoration(labelText: 'Số chứng từ'),
                ),
                if (type != null && type.hasAmount)
                  TextField(
                    controller: _amount,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    maxLength: 12,
                    decoration: InputDecoration(
                      labelText: 'Số tiền (VND)',
                      errorText: _amountError,
                    ),
                  ),
                if (type != null && type.hasDateRange)
                  Row(
                    spacing: 8,
                    children: [
                      _dateButton('Từ', _start, true),
                      _dateButton('Đến', _end, false),
                    ],
                  ),
                TextField(
                  controller: _desc,
                  maxLength: 5000,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'Mô tả'),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: appMeta['phe-duyet']!.from,
                  ),
                  onPressed: _saving ? null : _save,
                  child: const Text('Gửi yêu cầu'),
                ),
              ],
            ),
    );
  }
}
