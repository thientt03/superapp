class User {
  final String id;
  final String fullName;
  final String? avatarUrl;
  User({required this.id, required this.fullName, this.avatarUrl});
  factory User.fromJson(Map<String, dynamic> j) => User(
    id: j['id'] as String,
    fullName: j['full_name'] as String,
    avatarUrl: j['avatar_url'] as String?,
  );
}

class Attendance {
  final String shiftStart;
  final String? checkedInAt;
  Attendance({required this.shiftStart, this.checkedInAt});
  factory Attendance.fromJson(Map<String, dynamic> j) => Attendance(
    shiftStart: j['shift_start'] as String,
    checkedInAt: j['checked_in_at'] as String?,
  );
}

class Event {
  final String id;
  final String title;
  final String startTime;
  final String? endTime;
  final String? location;
  Event({
    required this.id,
    required this.title,
    required this.startTime,
    this.endTime,
    this.location,
  });
  factory Event.fromJson(Map<String, dynamic> j) => Event(
    id: j['id'] as String,
    title: j['title'] as String,
    startTime: j['start_time'] as String,
    endTime: j['end_time'] as String?,
    location: j['location'] as String?,
  );
}

class PinnedApp {
  final String id;
  final String name;
  PinnedApp({required this.id, required this.name});
  factory PinnedApp.fromJson(Map<String, dynamic> j) =>
      PinnedApp(id: j['id'] as String, name: j['name'] as String);
}

class Dashboard {
  final User user;
  final Attendance attendance;
  final List<Event> eventsToday;
  final List<PinnedApp> pinnedApps;
  final int unreadCount;
  Dashboard({
    required this.user,
    required this.attendance,
    required this.eventsToday,
    required this.pinnedApps,
    required this.unreadCount,
  });
  factory Dashboard.fromJson(Map<String, dynamic> j) => Dashboard(
    user: User.fromJson(j['user'] as Map<String, dynamic>),
    attendance: Attendance.fromJson(j['attendance'] as Map<String, dynamic>),
    eventsToday: (j['events_today'] as List)
        .map((e) => Event.fromJson(e as Map<String, dynamic>))
        .toList(),
    pinnedApps: (j['pinned_apps'] as List)
        .map((e) => PinnedApp.fromJson(e as Map<String, dynamic>))
        .toList(),
    unreadCount:
        (j['notifications'] as Map<String, dynamic>)['unread_count'] as int,
  );
}
