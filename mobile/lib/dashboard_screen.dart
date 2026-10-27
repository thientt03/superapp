import 'dart:async';

import 'package:flutter/material.dart';

import 'ai_chat_sheet.dart';
import 'api.dart';
import 'app_meta.dart';
import 'greeting.dart';
import 'models.dart';

const _primary = Color(0xFFBE094E);
const _slate800 = Color(0xFF1E293B);
const _slate400 = Color(0xFF94A3B8);
const _slate700 = Color(0xFF334155);
const _slate600 = Color(0xFF475569);

class DashboardScreen extends StatefulWidget {
  final ApiClient api;
  final VoidCallback onLogout;
  const DashboardScreen({super.key, required this.api, required this.onLogout});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Dashboard? _data;
  bool _loading = true;
  bool _error = false;
  bool _checkingIn = false;
  DateTime _now = DateTime.now();
  Timer? _clock;
  final _chatTick = _Tick();
  final List<ChatMessage> _chat = [
    ChatMessage('Xin chào! Tôi có thể giúp gì cho bạn?', fromUser: false),
  ];

  @override
  void initState() {
    super.initState();
    _clock = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
    _load();
  }

  @override
  void dispose() {
    _clock?.cancel();
    _chatTick.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = false;
      });
    }
    try {
      final d = await widget.api.fetchDashboard();
      if (!mounted) return;
      setState(() {
        _data = d;
        _loading = false;
        _error = false;
      });
    } catch (e) {
      if (!mounted || (e is ApiException && e.status == 401)) return;
      if (!silent) {
        setState(() {
          _loading = false;
          _error = true;
        });
      }
    }
  }

  void _toast(String msg) {
    final m = ScaffoldMessenger.of(context);
    m.hideCurrentSnackBar();
    m.showSnackBar(
      SnackBar(
        content: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, color: Color(0xFF4ADE80), size: 16),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                msg,
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ],
        ),
        backgroundColor: _slate800,
        behavior: SnackBarBehavior.floating,
        shape: const StadiumBorder(),
        duration: const Duration(milliseconds: 2500),
        // đẩy toast lên phía trên màn hình
        margin: EdgeInsets.only(
          bottom:
              MediaQuery.of(context).size.height -
              MediaQuery.of(context).padding.top -
              90,
          left: 40,
          right: 40,
        ),
      ),
    );
  }

  Future<void> _checkIn() async {
    if (_checkingIn || _data == null || _data!.attendance.checkedInAt != null) {
      return;
    }
    setState(() => _checkingIn = true);
    try {
      final a = await widget.api.checkIn();
      if (!mounted) return;
      setState(() {
        _checkingIn = false;
        _data = Dashboard(
          user: _data!.user,
          attendance: a,
          eventsToday: _data!.eventsToday,
          pinnedApps: _data!.pinnedApps,
          unreadCount: _data!.unreadCount,
        );
      });
      _toast('Chấm công thành công lúc ${a.checkedInAt}');
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.status == 401) return;
      setState(() => _checkingIn = false);
      if (e.status == 409) {
        _toast(e.detail);
        _load(silent: true);
      } else {
        _toast('Không thể kết nối máy chủ');
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _checkingIn = false);
      _toast('Không thể kết nối máy chủ');
    }
  }

  void _sendChat(String text) {
    _chat.add(ChatMessage(text, fromUser: true));
    _chatTick.tick();
    // Timer không bị huỷ khi sheet đóng nên tin bot vẫn vào lịch sử
    Timer(const Duration(milliseconds: 600), () {
      if (!mounted) return;
      _chat.add(
        ChatMessage(
          'Trợ lý AI đang được phát triển, vui lòng quay lại sau.',
          fromUser: false,
        ),
      );
      _chatTick.tick();
    });
  }

  void _openChat() => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) =>
        AiChatSheet(messages: _chat, onSend: _sendChat, refresh: _chatTick),
  );

  void _showBell() {
    final n = _data?.unreadCount ?? 0;
    _toast(n > 0 ? 'Bạn có $n thông báo mới' : 'Không có thông báo mới');
  }

  String _hhmm(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          _header(),
          Expanded(
            child: Transform.translate(
              offset: const Offset(0, -40),
              child: _body(),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _bottomNav(),
    );
  }

  Widget _header() {
    final user = _data?.user;
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFC0064F), Color(0xFF9E0540), Color(0xFF7D002F)],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
        boxShadow: [
          BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 4)),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 32, 20, 64),
          child: Row(
            children: [
              _avatar(user),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      greeting(_now.hour),
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFFFECDD3),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      user?.fullName ?? '',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 16,
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
              _logoutButton(),
              const SizedBox(width: 8),
              _bellButton(),
              const SizedBox(width: 8),
              _aiButton(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _avatar(User? user) {
    final name = user?.fullName.trim() ?? '';
    final initial = name.isEmpty
        ? ''
        : name.split(RegExp(r'\s+')).last[0].toUpperCase();
    final fallback = Container(
      color: const Color(0xFFFB7185),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          fontSize: 16,
        ),
      ),
    );
    final url = user?.avatarUrl;
    return SizedBox(
      width: 44,
      height: 44,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.8),
                width: 2,
              ),
              boxShadow: const [
                BoxShadow(color: Colors.black26, blurRadius: 4),
              ],
            ),
            child: ClipOval(
              child: url == null
                  ? fallback
                  : Image.network(
                      url,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => fallback,
                    ),
            ),
          ),
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: const Color(0xFF34D399),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF9E0540), width: 2),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _logoutButton() => Semantics(
    label: 'Đăng xuất',
    button: true,
    child: GestureDetector(
      onTap: () async {
        await widget.api.logout();
        widget.onLogout();
      },
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
        ),
        child: const Icon(Icons.logout, size: 20, color: Color(0xFFFFE4E6)),
      ),
    ),
  );

  Widget _bellButton() => GestureDetector(
    onTap: _showBell,
    child: Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          const Icon(
            Icons.notifications_none,
            size: 20,
            color: Color(0xFFFFE4E6),
          ),
          if ((_data?.unreadCount ?? 0) > 0)
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                key: const Key('bell-dot'),
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: const Color(0xFFFB7185),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: const Color(0xFF9E0540),
                    width: 1.5,
                  ),
                ),
              ),
            ),
        ],
      ),
    ),
  );

  Widget _aiButton() => GestureDetector(
    onTap: _openChat,
    child: Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.bottomLeft,
          end: Alignment.topRight,
          colors: [Color(0xFFFBBF24), Color(0xFFFB7185)],
        ),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white.withValues(alpha: 0.4)),
        boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          const Icon(Icons.smart_toy_outlined, size: 20, color: Colors.white),
          Positioned(
            top: -2,
            right: -2,
            child: Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: const Color(0xFF34D399),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF9E0540), width: 2),
              ),
            ),
          ),
        ],
      ),
    ),
  );

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error || _data == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Không tải được dữ liệu',
              style: TextStyle(color: _slate600, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: _primary),
              onPressed: _load,
              child: const Text('Thử lại'),
            ),
          ],
        ),
      );
    }
    final d = _data!;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: _attendanceCard(d.attendance)),
                const SizedBox(width: 12),
                Expanded(child: _eventCard(d.eventsToday)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Ứng dụng đã ghim',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: _slate800,
                  ),
                ),
                GestureDetector(
                  onTap: () => _toast('Tính năng đang phát triển'),
                  child: const Text(
                    'Sắp xếp',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 4,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 20,
            crossAxisSpacing: 12,
            mainAxisExtent: 86,
            children: [for (final a in d.pinnedApps) _appTile(a), _addTile()],
          ),
        ],
      ),
    );
  }

  Widget _card({required Widget child}) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: const Color(0xFFF1F5F9)),
      boxShadow: const [
        BoxShadow(
          color: Color(0x0D000000),
          blurRadius: 2,
          offset: Offset(0, 1),
        ),
      ],
    ),
    child: child,
  );

  Widget _cardTitle(IconData icon, Color bg, Color fg, String text) => Row(
    children: [
      Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
        child: Icon(icon, size: 14, color: fg),
      ),
      const SizedBox(width: 8),
      Expanded(
        child: Text(
          text,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: _slate600,
          ),
        ),
      ),
    ],
  );

  Widget _attendanceCard(Attendance a) {
    final done = a.checkedInAt != null;
    final sub = done
        ? 'Ca ${a.shiftStart} · vào lúc ${a.checkedInAt}'
        : 'Ca ${a.shiftStart} · chưa vào';
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _cardTitle(
            Icons.access_time,
            const Color(0xFFF0FDFA),
            const Color(0xFF0D9488),
            'Chấm công',
          ),
          const SizedBox(height: 12),
          Text(
            _hhmm(_now),
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: _slate800,
            ),
          ),
          Text(
            sub,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: _slate400,
            ),
          ),
          const Spacer(),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: (done || _checkingIn) ? null : _checkIn,
              style: ElevatedButton.styleFrom(
                backgroundColor: _primary,
                foregroundColor: Colors.white,
                disabledBackgroundColor: _primary.withValues(alpha: 0.5),
                disabledForegroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  vertical: 10,
                  horizontal: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                textStyle: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              icon: _checkingIn
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.login, size: 14),
              label: Text(done ? 'Đã chấm vào' : 'Chấm vào'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _eventCard(List<Event> events) {
    final e = events.isEmpty ? null : events.first;
    final sub = e == null
        ? ''
        : (e.location == null ? e.startTime : '${e.startTime} - ${e.location}');
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _cardTitle(
            Icons.event_available,
            const Color(0xFFFFF1F2),
            const Color(0xFFE11D48),
            'Sự kiện hôm nay',
          ),
          const SizedBox(height: 12),
          Text(
            e?.title ?? 'Không có sự kiện',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: _slate800,
            ),
          ),
          Text(
            sub,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: _slate400,
            ),
          ),
          const Spacer(),
          if (e != null) ...[
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () => _toast(
                '${e.title} · ${e.startTime}${e.endTime != null ? ' - ${e.endTime}' : ''}',
              ),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  vertical: 10,
                  horizontal: 12,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF5FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Chi tiết',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF7E22CE),
                      ),
                    ),
                    Icon(
                      Icons.chevron_right,
                      size: 14,
                      color: Color(0xFF7E22CE),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _tile(
    Widget icon,
    String label,
    Color labelColor,
    VoidCallback onTap,
  ) => GestureDetector(
    behavior: HitTestBehavior.opaque,
    onTap: onTap,
    child: Column(
      children: [
        SizedBox(width: 56, height: 56, child: icon),
        const SizedBox(height: 8),
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: labelColor,
          ),
        ),
      ],
    ),
  );

  Widget _appTile(PinnedApp a) {
    final m = appMeta[a.id] ?? fallbackMeta;
    return _tile(
      Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.bottomLeft,
            end: Alignment.topRight,
            colors: [m.from, m.to],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 4,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Icon(m.icon, color: Colors.white, size: 24),
      ),
      a.name,
      _slate700,
      () => _toast('Mở ứng dụng: ${a.name}'),
    );
  }

  Widget _addTile() => _tile(
    CustomPaint(
      painter: _DashedBorderPainter(),
      child: const Center(
        child: Icon(Icons.add, color: Color(0xFFF43F5E), size: 24),
      ),
    ),
    'Thêm mới',
    _slate400,
    () => _toast('Mở ứng dụng: Thêm ứng dụng'),
  );

  Widget _bottomNav() {
    Widget tab(IconData icon, String label, bool active) => GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: active ? null : () => _toast('Tính năng đang phát triển'),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: active ? const Color(0xFFFFF1F2) : null,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(icon, size: 22, color: active ? _primary : _slate400),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: active ? FontWeight.w600 : FontWeight.w500,
              color: active ? _primary : _slate400,
            ),
          ),
        ],
      ),
    );
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8)],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              tab(Icons.home, 'Trang chủ', true),
              tab(Icons.badge_outlined, 'Hồ sơ', false),
              tab(Icons.check_box_outlined, 'Công việc', false),
            ],
          ),
        ),
      ),
    );
  }
}

// notifyListeners của ChangeNotifier là protected; lớp con mở ra để gọi từ ngoài.
class _Tick extends ChangeNotifier {
  void tick() => notifyListeners();
}

// Viền đứt bo góc 16, dày 2, #FDA4AF (Border.all của Flutter không hỗ trợ nét đứt).
class _DashedBorderPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFFDA4AF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Offset.zero & size,
          const Radius.circular(16),
        ).deflate(1),
      );
    for (final m in path.computeMetrics()) {
      for (double d = 0; d < m.length; d += 8) {
        canvas.drawPath(m.extractPath(d, d + 4), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedBorderPainter old) => false;
}
