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

class Employee {
  final String id;
  final String fullName;
  final String? avatarUrl;
  Employee({required this.id, required this.fullName, this.avatarUrl});
  factory Employee.fromJson(Map<String, dynamic> j) => Employee(
    id: j['id'] as String,
    fullName: j['full_name'] as String,
    avatarUrl: j['avatar_url'] as String?,
  );
}

const statusLabels = {
  'todo': 'Cần làm',
  'in_progress': 'Đang làm',
  'done': 'Hoàn thành',
};
const priorityLabels = {'low': 'Thấp', 'medium': 'Trung bình', 'high': 'Cao'};

class Task {
  final int id;
  final String title;
  final String? description;
  final String status;
  final String priority;
  final String? dueDate;
  final bool isOverdue;
  final bool canEdit;
  final Employee assigner;
  final Employee assignee;
  Task({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    required this.priority,
    this.dueDate,
    required this.isOverdue,
    required this.canEdit,
    required this.assigner,
    required this.assignee,
  });
  factory Task.fromJson(Map<String, dynamic> j) => Task(
    id: j['id'] as int,
    title: j['title'] as String,
    description: j['description'] as String?,
    status: j['status'] as String,
    priority: j['priority'] as String,
    dueDate: j['due_date'] as String?,
    isOverdue: j['is_overdue'] as bool,
    canEdit: j['can_edit'] as bool,
    assigner: Employee.fromJson(j['assigner'] as Map<String, dynamic>),
    assignee: Employee.fromJson(j['assignee'] as Map<String, dynamic>),
  );
}

class TaskPage {
  final List<Task> items;
  final String? nextCursor;
  TaskPage({required this.items, this.nextCursor});
  factory TaskPage.fromJson(Map<String, dynamic> j) => TaskPage(
    items: (j['items'] as List)
        .map((e) => Task.fromJson(e as Map<String, dynamic>))
        .toList(),
    nextCursor: j['next_cursor'] as String?,
  );
}

class Dashboard {
  final User user;
  final Attendance attendance;
  final List<Event> eventsToday;
  final List<PinnedApp> pinnedApps;
  final int unreadCount;
  final Task? myTask;
  Dashboard({
    required this.user,
    required this.attendance,
    required this.eventsToday,
    required this.pinnedApps,
    required this.unreadCount,
    this.myTask,
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
    myTask: j['my_task'] == null
        ? null
        : Task.fromJson(j['my_task'] as Map<String, dynamic>),
  );
}
