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
  final int pendingApprovalCount;
  Dashboard({
    required this.user,
    required this.attendance,
    required this.eventsToday,
    required this.pinnedApps,
    required this.unreadCount,
    this.myTask,
    required this.pendingApprovalCount,
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
    pendingApprovalCount: j['pending_approval_count'] as int,
  );
}

const approvalStatusLabels = {
  'pending': 'Chờ duyệt',
  'approved': 'Đã duyệt',
  'rejected': 'Từ chối',
  'cancelled': 'Đã huỷ',
};

class FlowStep {
  final int level;
  final Employee approver;
  FlowStep({required this.level, required this.approver});
  factory FlowStep.fromJson(Map<String, dynamic> j) => FlowStep(
    level: j['level'] as int,
    approver: Employee.fromJson(j['approver'] as Map<String, dynamic>),
  );
}

class ApprovalType {
  final String code;
  final String name;
  final bool hasAmount;
  final bool hasDateRange;
  final List<FlowStep> steps;
  ApprovalType({
    required this.code,
    required this.name,
    required this.hasAmount,
    required this.hasDateRange,
    required this.steps,
  });
  factory ApprovalType.fromJson(Map<String, dynamic> j) => ApprovalType(
    code: j['code'] as String,
    name: j['name'] as String,
    hasAmount: j['has_amount'] as bool,
    hasDateRange: j['has_date_range'] as bool,
    steps: (j['steps'] as List)
        .map((e) => FlowStep.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
}

class ApprovalTypes {
  final bool canEdit;
  final List<ApprovalType> items;
  ApprovalTypes({required this.canEdit, required this.items});
  factory ApprovalTypes.fromJson(Map<String, dynamic> j) => ApprovalTypes(
    canEdit: j['can_edit'] as bool,
    items: (j['items'] as List)
        .map((e) => ApprovalType.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
}

class ApprovalStep {
  final int level;
  final Employee approver;
  final String? decision;
  final String? comment;
  final String? decidedAt;
  ApprovalStep({
    required this.level,
    required this.approver,
    this.decision,
    this.comment,
    this.decidedAt,
  });
  factory ApprovalStep.fromJson(Map<String, dynamic> j) => ApprovalStep(
    level: j['level'] as int,
    approver: Employee.fromJson(j['approver'] as Map<String, dynamic>),
    decision: j['decision'] as String?,
    comment: j['comment'] as String?,
    decidedAt: j['decided_at'] as String?,
  );
}

class ApprovalRequest {
  final int id;
  final String docType;
  final String docTypeName;
  final String title;
  final String? description;
  final String? refNo;
  final int? amount;
  final String? startDate;
  final String? endDate;
  final String status;
  final int? currentLevel;
  final Employee requester;
  final List<ApprovalStep> steps;
  final bool canApprove;
  final bool canCancel;
  final String createdAt;
  final String updatedAt;
  ApprovalRequest({
    required this.id,
    required this.docType,
    required this.docTypeName,
    required this.title,
    this.description,
    this.refNo,
    this.amount,
    this.startDate,
    this.endDate,
    required this.status,
    this.currentLevel,
    required this.requester,
    required this.steps,
    required this.canApprove,
    required this.canCancel,
    required this.createdAt,
    required this.updatedAt,
  });
  factory ApprovalRequest.fromJson(Map<String, dynamic> j) => ApprovalRequest(
    id: j['id'] as int,
    docType: j['doc_type'] as String,
    docTypeName: j['doc_type_name'] as String,
    title: j['title'] as String,
    description: j['description'] as String?,
    refNo: j['ref_no'] as String?,
    amount: j['amount'] as int?,
    startDate: j['start_date'] as String?,
    endDate: j['end_date'] as String?,
    status: j['status'] as String,
    currentLevel: j['current_level'] as int?,
    requester: Employee.fromJson(j['requester'] as Map<String, dynamic>),
    steps: (j['steps'] as List)
        .map((e) => ApprovalStep.fromJson(e as Map<String, dynamic>))
        .toList(),
    canApprove: j['can_approve'] as bool,
    canCancel: j['can_cancel'] as bool,
    createdAt: j['created_at'] as String,
    updatedAt: j['updated_at'] as String,
  );
}

class ApprovalPage {
  final List<ApprovalRequest> items;
  final String? nextCursor;
  ApprovalPage({required this.items, this.nextCursor});
  factory ApprovalPage.fromJson(Map<String, dynamic> j) => ApprovalPage(
    items: (j['items'] as List)
        .map((e) => ApprovalRequest.fromJson(e as Map<String, dynamic>))
        .toList(),
    nextCursor: j['next_cursor'] as String?,
  );
}
