export type UserRole = 'admin' | 'employee';

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'permission' | 'wfh';

export type ExceptionType = 'absent' | 'half_day' | 'permission' | 'wfh';

export type ExceptionApprovalStatus = 'approved' | 'pending' | 'rejected';

export type LeaveType = 'casual' | 'sick' | 'other';

export interface LeaveBalance {
  casual_leave_total: number;
  casual_leave_used: number;
  sick_leave_total: number;
  sick_leave_used: number;
}

export interface User {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  role: UserRole;
  department: string;
  joining_date: string; // YYYY-MM-DD
  monthly_salary: number;
  status: 'active' | 'inactive';
  avatar?: string;
  created_at: string;
  // Item 1: Casual & Sick leave quotas
  casual_leave_quota?: number;
  sick_leave_quota?: number;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  login_time: string | null; // ISO string or HH:mm:ss
  logout_time: string | null; // ISO string or HH:mm:ss
  total_working_minutes: number;
  status: AttendanceStatus;
  missed_logout?: boolean; // Flag when employee missed logout and was auto-logged off at 6:30 PM
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface AttendanceException {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  type: ExceptionType;
  leave_type?: LeaveType; // 'casual' | 'sick' | 'other' when type === 'absent'
  permission_minutes?: number; // e.g. 60, 180, 240
  reason: string;
  approval_status: ExceptionApprovalStatus;
  created_at: string;
}

export interface NotificationContact {
  id: string;
  type: 'email' | 'mobile';
  name: string;
  value: string; // e.g. subburaj@zealluxe.com or +919876543210
  department?: string;
  created_at: string;
}

export interface NotificationSettings {
  emails: NotificationContact[];
  mobiles: NotificationContact[];
  auto_notify_leave: boolean;
  auto_notify_permission: boolean;
  auto_notify_wfh: boolean;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  description: string;
  created_at: string;
}

export interface SalaryBreakdown {
  employee_id: string;
  employee_name: string;
  month: number; // 1-12
  year: number;
  monthly_salary: number;
  calendar_days: number;
  sundays_count: number;
  holidays_count: number;
  working_days: number; // calendar_days - sundays - holidays
  daily_salary: number; // monthly_salary / working_days
  
  // Attendance counts in working days
  present_days: number;
  absent_days: number;
  half_days: number;
  permission_days_over_1h: number;
  permission_days_under_or_equal_1h: number;
  // Aliases for backwards compatibility
  permission_days_over_3h: number;
  permission_days_under_or_equal_3h: number;
  wfh_days: number;
  unmarked_days: number;
  
  // Deductions
  absent_deduction: number; // absent_days * daily_salary
  half_day_deduction: number; // half_days * 0.5 * daily_salary
  permission_deduction: number; // permission_days_over_1h * 0.5 * daily_salary
  total_deduction: number;
  
  // Final
  net_payable_salary: number; // monthly_salary - total_deduction
  status: 'draft' | 'computed' | 'approved' | 'paid';
  calculated_at: string;
}

export interface AuditLog {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  entity: 'attendance' | 'employee' | 'salary' | 'holiday' | 'auth';
  details: string;
  previous_value?: string;
  new_value?: string;
  timestamp: string;
}

export type WorkingHoursTier = 'completed' | 'green' | 'yellow' | 'red';
