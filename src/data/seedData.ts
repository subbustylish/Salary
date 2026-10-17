import { AttendanceException, AttendanceRecord, AuditLog, Holiday, User } from '../types';

export const DEFAULT_ADMIN_USER: User = {
  id: 'user-admin-main',
  employee_id: 'ZT-ADM-01',
  name: 'Administrator',
  email: 'admin@zealluxe.com',
  username: 'admin',
  password: 'admin@123',
  role: 'admin',
  department: 'Management & Operations',
  joining_date: '2023-01-01',
  monthly_salary: 75000,
  status: 'active',
  created_at: '2023-01-01T09:00:00Z',
  casual_leave_quota: 10,
  sick_leave_quota: 10
};

export const INITIAL_USERS: User[] = [
  DEFAULT_ADMIN_USER,
  {
    id: 'user-emp-meena',
    employee_id: 'ZT-EMP-100',
    name: 'Meena',
    email: 'meena@zealluxe.com',
    username: 'meena',
    password: 'password123',
    role: 'employee',
    department: 'Customer Relations & Operations',
    joining_date: '2024-01-10',
    monthly_salary: 22000,
    status: 'active',
    created_at: '2024-01-10T09:00:00Z',
    casual_leave_quota: 10,
    sick_leave_quota: 10
  },
  {
    id: 'user-emp-101',
    employee_id: 'ZT-EMP-101',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@ztgroup.com',
    username: 'rajesh',
    password: 'password123',
    role: 'employee',
    department: 'Operations',
    joining_date: '2024-03-01',
    monthly_salary: 14000,
    status: 'active',
    created_at: '2024-03-01T09:00:00Z',
    casual_leave_quota: 10,
    sick_leave_quota: 10
  },
  {
    id: 'user-emp-102',
    employee_id: 'ZT-EMP-102',
    name: 'Anita Patel',
    email: 'anita.patel@ztgroup.com',
    username: 'anita',
    password: 'password123',
    role: 'employee',
    department: 'Engineering',
    joining_date: '2024-06-10',
    monthly_salary: 42000,
    status: 'active',
    created_at: '2024-06-10T09:00:00Z',
    casual_leave_quota: 10,
    sick_leave_quota: 10
  },
  {
    id: 'user-emp-103',
    employee_id: 'ZT-EMP-103',
    name: 'Vikram Singh',
    email: 'vikram.singh@ztgroup.com',
    username: 'vikram',
    password: 'password123',
    role: 'employee',
    department: 'Design & UI/UX',
    joining_date: '2024-08-01',
    monthly_salary: 28000,
    status: 'active',
    created_at: '2024-08-01T09:00:00Z',
    casual_leave_quota: 10,
    sick_leave_quota: 10
  },
  {
    id: 'user-emp-104',
    employee_id: 'ZT-EMP-104',
    name: 'Kavita Reddy',
    email: 'kavita.reddy@ztgroup.com',
    username: 'kavita',
    password: 'password123',
    role: 'employee',
    department: 'Accounts & Audit',
    joining_date: '2024-02-15',
    monthly_salary: 32000,
    status: 'active',
    created_at: '2024-02-15T09:00:00Z',
    casual_leave_quota: 10,
    sick_leave_quota: 10
  },
  {
    id: 'user-emp-105',
    employee_id: 'ZT-EMP-105',
    name: 'Suresh Nair',
    email: 'suresh.nair@ztgroup.com',
    username: 'suresh',
    password: 'password123',
    role: 'employee',
    department: 'Logistics',
    joining_date: '2023-11-01',
    monthly_salary: 18000,
    status: 'inactive',
    created_at: '2023-11-01T09:00:00Z',
    casual_leave_quota: 10,
    sick_leave_quota: 10
  }
];

export const INITIAL_NOTIFICATION_SETTINGS = {
  emails: [
    {
      id: 'contact-email-1',
      type: 'email' as const,
      name: 'Subburaj (Executive Management)',
      value: 'subburaj@zealluxe.com',
      department: 'Management',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'contact-email-2',
      type: 'email' as const,
      name: 'Karthik (Operations Management)',
      value: 'karthik@zealluxe.com',
      department: 'Operations',
      created_at: '2024-01-01T00:00:00Z'
    }
  ],
  mobiles: [
    {
      id: 'contact-mob-1',
      type: 'mobile' as const,
      name: 'Admin WhatsApp / Hotline',
      value: '+91 98400 12345',
      department: 'Admin Dispatch',
      created_at: '2024-01-01T00:00:00Z'
    }
  ],
  auto_notify_leave: true,
  auto_notify_permission: true,
  auto_notify_wfh: true
};

export const INITIAL_HOLIDAYS: Holiday[] = [
  {
    id: 'hol-1',
    date: '2026-01-15',
    name: 'Pongal / Makar Sankranti',
    description: 'Harvest festival celebrated across India and Tamil Nadu',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-2',
    date: '2026-01-26',
    name: 'Republic Day',
    description: 'National holiday commemorating the adoption of the Constitution',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-3',
    date: '2026-02-15',
    name: 'Maha Shivratri',
    description: 'Great night of Shiva celebration',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-4',
    date: '2026-03-04',
    name: 'Holi (Festival of Colours)',
    description: 'Spring festival of colours and joy',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-5',
    date: '2026-03-20',
    name: 'Eid-ul-Fitr (Ramzan Eid)',
    description: 'Islamic festival marking the conclusion of Ramadan fasting',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-6',
    date: '2026-04-03',
    name: 'Good Friday',
    description: 'Christian commemoration of the Passion of Jesus Christ',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-7',
    date: '2026-04-14',
    name: 'Tamil New Year / Dr. Ambedkar Jayanti',
    description: 'Traditional regional new year and birth anniversary of Dr. B.R. Ambedkar',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-8',
    date: '2026-05-01',
    name: 'May Day (International Workers Day)',
    description: 'Celebration of laborers and working class',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-9',
    date: '2026-05-27',
    name: 'Eid-ul-Adha (Bakrid)',
    description: 'Feast of the Sacrifice gazetted festival',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-10',
    date: '2026-08-15',
    name: 'Independence Day',
    description: 'National holiday commemorating 79 years of Indian Independence',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-11',
    date: '2026-09-04',
    name: 'Krishna Janmashtami',
    description: 'Celebration of the birth of Lord Krishna',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-12',
    date: '2026-10-02',
    name: 'Gandhi Jayanti',
    description: 'National holiday celebrating Mahatma Gandhi birth anniversary',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-13',
    date: '2026-10-20',
    name: 'Ayudha Pooja / Vijaya Dashami',
    description: 'Dussehra celebration of the victory of good over evil',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-14',
    date: '2026-11-08',
    name: 'Diwali (Deepavali)',
    description: 'Festival of Lights - Annual mandatory organization festival holiday',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-15',
    date: '2026-11-24',
    name: 'Guru Nanak Jayanti',
    description: 'Gazetted holiday for Guru Nanak Gurpurab',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol-16',
    date: '2026-12-25',
    name: 'Christmas Day',
    description: 'Christmas celebration holiday',
    created_at: '2026-01-01T00:00:00Z'
  }
];

export const INITIAL_EXCEPTIONS: AttendanceException[] = [
  // Rajesh Kumar's exceptions in October 2026 (matching prompt spec: 2 Absent, 1 Half Day, 1 Permission > 3 hrs)
  {
    id: 'exc-1',
    employee_id: 'user-emp-101',
    date: '2026-10-05',
    type: 'absent',
    reason: 'Severe seasonal viral fever and doctor consultation',
    approval_status: 'approved',
    created_at: '2026-10-05T08:00:00Z'
  },
  {
    id: 'exc-2',
    employee_id: 'user-emp-101',
    date: '2026-10-06',
    type: 'absent',
    reason: 'Doctor advised bed rest for viral recovery',
    approval_status: 'approved',
    created_at: '2026-10-06T08:00:00Z'
  },
  {
    id: 'exc-3',
    employee_id: 'user-emp-101',
    date: '2026-10-07',
    type: 'half_day',
    reason: 'Family emergency / bank registration in the afternoon',
    approval_status: 'approved',
    created_at: '2026-10-07T13:30:00Z'
  },
  {
    id: 'exc-4',
    employee_id: 'user-emp-101',
    date: '2026-10-03',
    type: 'permission',
    permission_minutes: 240, // 4 hours > 3 hours!
    reason: 'Passport biometric verification appointment at PSK centre',
    approval_status: 'approved',
    created_at: '2026-10-03T09:00:00Z'
  },
  // Anita Patel: 1 WFH day
  {
    id: 'exc-5',
    employee_id: 'user-emp-102',
    date: '2026-10-06',
    type: 'wfh',
    reason: 'Home fiber internet maintenance and remote sprint work',
    approval_status: 'approved',
    created_at: '2026-10-06T08:30:00Z'
  },
  // Vikram Singh: 1 Permission under 3h
  {
    id: 'exc-6',
    employee_id: 'user-emp-103',
    date: '2026-10-07',
    type: 'permission',
    permission_minutes: 120, // 2 hours <= 3 hours!
    reason: 'Dentist routine checkup',
    approval_status: 'approved',
    created_at: '2026-10-07T10:00:00Z'
  }
];

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  // Rajesh Kumar (user-emp-101)
  {
    id: 'att-101-1',
    employee_id: 'user-emp-101',
    date: '2026-10-01',
    login_time: '2026-10-01T09:02:14Z',
    logout_time: '2026-10-01T17:34:20Z',
    total_working_minutes: 512, // 8h 32m (Normal/Completed)
    status: 'present',
    created_at: '2026-10-01T09:02:14Z',
    updated_at: '2026-10-01T17:34:20Z'
  },
  {
    id: 'att-101-2',
    employee_id: 'user-emp-101',
    date: '2026-10-02',
    login_time: '2026-10-02T09:15:00Z',
    logout_time: '2026-10-02T16:50:00Z',
    total_working_minutes: 455, // 7h 35m (Green)
    status: 'present',
    created_at: '2026-10-02T09:15:00Z',
    updated_at: '2026-10-02T16:50:00Z'
  },
  {
    id: 'att-101-3',
    employee_id: 'user-emp-101',
    date: '2026-10-03',
    login_time: '2026-10-03T13:30:00Z',
    logout_time: '2026-10-03T17:30:00Z',
    total_working_minutes: 240, // Permission >3h day
    status: 'permission',
    created_at: '2026-10-03T13:30:00Z',
    updated_at: '2026-10-03T17:30:00Z'
  },
  // 2026-10-04 is Sunday
  {
    id: 'att-101-4',
    employee_id: 'user-emp-101',
    date: '2026-10-05',
    login_time: null,
    logout_time: null,
    total_working_minutes: 0,
    status: 'absent',
    created_at: '2026-10-05T08:00:00Z',
    updated_at: '2026-10-05T08:00:00Z'
  },
  {
    id: 'att-101-5',
    employee_id: 'user-emp-101',
    date: '2026-10-06',
    login_time: null,
    logout_time: null,
    total_working_minutes: 0,
    status: 'absent',
    created_at: '2026-10-06T08:00:00Z',
    updated_at: '2026-10-06T08:00:00Z'
  },
  {
    id: 'att-101-6',
    employee_id: 'user-emp-101',
    date: '2026-10-07',
    login_time: '2026-10-07T09:00:00Z',
    logout_time: '2026-10-07T13:00:00Z',
    total_working_minutes: 240, // 4 hours (Half Day)
    status: 'half_day',
    created_at: '2026-10-07T09:00:00Z',
    updated_at: '2026-10-07T13:00:00Z'
  },
  {
    id: 'att-101-7',
    employee_id: 'user-emp-101',
    date: '2026-10-08', // TODAY: Currently logged in!
    login_time: '2026-10-08T08:45:00Z',
    logout_time: null,
    total_working_minutes: 0,
    status: 'present',
    created_at: '2026-10-08T08:45:00Z',
    updated_at: '2026-10-08T08:45:00Z'
  },

  // Anita Patel (user-emp-102)
  {
    id: 'att-102-1',
    employee_id: 'user-emp-102',
    date: '2026-10-01',
    login_time: '2026-10-01T08:50:00Z',
    logout_time: '2026-10-01T17:20:00Z',
    total_working_minutes: 510,
    status: 'present',
    created_at: '2026-10-01T08:50:00Z',
    updated_at: '2026-10-01T17:20:00Z'
  },
  {
    id: 'att-102-2',
    employee_id: 'user-emp-102',
    date: '2026-10-02',
    login_time: '2026-10-02T09:00:00Z',
    logout_time: '2026-10-02T17:15:00Z',
    total_working_minutes: 495,
    status: 'present',
    created_at: '2026-10-02T09:00:00Z',
    updated_at: '2026-10-02T17:15:00Z'
  },
  {
    id: 'att-102-3',
    employee_id: 'user-emp-102',
    date: '2026-10-03',
    login_time: '2026-10-03T09:10:00Z',
    logout_time: '2026-10-03T17:00:00Z',
    total_working_minutes: 470,
    status: 'present',
    created_at: '2026-10-03T09:10:00Z',
    updated_at: '2026-10-03T17:00:00Z'
  },
  {
    id: 'att-102-5',
    employee_id: 'user-emp-102',
    date: '2026-10-05',
    login_time: '2026-10-05T09:00:00Z',
    logout_time: '2026-10-05T17:30:00Z',
    total_working_minutes: 510,
    status: 'present',
    created_at: '2026-10-05T09:00:00Z',
    updated_at: '2026-10-05T17:30:00Z'
  },
  {
    id: 'att-102-6',
    employee_id: 'user-emp-102',
    date: '2026-10-06',
    login_time: '2026-10-06T09:00:00Z',
    logout_time: '2026-10-06T17:00:00Z',
    total_working_minutes: 480,
    status: 'wfh', // Work From Home
    created_at: '2026-10-06T09:00:00Z',
    updated_at: '2026-10-06T17:00:00Z'
  },
  {
    id: 'att-102-7',
    employee_id: 'user-emp-102',
    date: '2026-10-07',
    login_time: '2026-10-07T09:05:00Z',
    logout_time: '2026-10-07T17:35:00Z',
    total_working_minutes: 510,
    status: 'present',
    created_at: '2026-10-07T09:05:00Z',
    updated_at: '2026-10-07T17:35:00Z'
  },
  {
    id: 'att-102-8',
    employee_id: 'user-emp-102',
    date: '2026-10-08',
    login_time: '2026-10-08T09:00:00Z',
    logout_time: '2026-10-08T15:00:00Z',
    total_working_minutes: 360, // 6h (Yellow)
    status: 'present',
    created_at: '2026-10-08T09:00:00Z',
    updated_at: '2026-10-08T15:00:00Z'
  },

  // Vikram Singh (user-emp-103)
  {
    id: 'att-103-1',
    employee_id: 'user-emp-103',
    date: '2026-10-01',
    login_time: '2026-10-01T09:30:00Z',
    logout_time: '2026-10-01T17:45:00Z',
    total_working_minutes: 495,
    status: 'present',
    created_at: '2026-10-01T09:30:00Z',
    updated_at: '2026-10-01T17:45:00Z'
  },
  {
    id: 'att-103-2',
    employee_id: 'user-emp-103',
    date: '2026-10-02',
    login_time: '2026-10-02T09:20:00Z',
    logout_time: '2026-10-02T17:30:00Z',
    total_working_minutes: 490,
    status: 'present',
    created_at: '2026-10-02T09:20:00Z',
    updated_at: '2026-10-02T17:30:00Z'
  },
  {
    id: 'att-103-7',
    employee_id: 'user-emp-103',
    date: '2026-10-07',
    login_time: '2026-10-07T11:00:00Z',
    logout_time: '2026-10-07T17:30:00Z',
    total_working_minutes: 390,
    status: 'permission',
    created_at: '2026-10-07T11:00:00Z',
    updated_at: '2026-10-07T17:30:00Z'
  },
  {
    id: 'att-103-8',
    employee_id: 'user-emp-103',
    date: '2026-10-08',
    login_time: '2026-10-08T09:15:00Z',
    logout_time: null,
    total_working_minutes: 0,
    status: 'present',
    created_at: '2026-10-08T09:15:00Z',
    updated_at: '2026-10-08T09:15:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    user_name: 'Priya Sharma',
    user_role: 'admin',
    action: 'SYSTEM_INITIALIZATION',
    entity: 'attendance',
    details: 'Initial corporate payroll configuration for October 2026 loaded with 6-day week policy.',
    timestamp: '2026-10-01T08:00:00Z'
  },
  {
    id: 'audit-2',
    user_name: 'Rajesh Kumar',
    user_role: 'employee',
    action: 'EMPLOYEE_LOGIN',
    entity: 'attendance',
    details: 'Automated biometric timestamp punch-in recorded.',
    new_value: '2026-10-01 09:02:14 AM',
    timestamp: '2026-10-01T09:02:14Z'
  },
  {
    id: 'audit-3',
    user_name: 'Rajesh Kumar',
    user_role: 'employee',
    action: 'EMPLOYEE_LOGOUT',
    entity: 'attendance',
    details: 'Shift ended. Total working time computed: 8h 32m.',
    new_value: '2026-10-01 05:34:20 PM',
    timestamp: '2026-10-01T17:34:20Z'
  },
  {
    id: 'audit-4',
    user_name: 'Priya Sharma',
    user_role: 'admin',
    action: 'HOLIDAY_CONFIGURED',
    entity: 'holiday',
    details: 'Added holiday "Diwali (Deepavali)" for 2026-10-20.',
    new_value: '2026-10-20',
    timestamp: '2026-10-02T10:00:00Z'
  },
  {
    id: 'audit-5',
    user_name: 'Rajesh Kumar',
    user_role: 'employee',
    action: 'EXCEPTION_SUBMITTED',
    entity: 'attendance',
    details: 'Submitted Absent exception for 2026-10-05 due to medical fever.',
    new_value: 'Status: absent',
    timestamp: '2026-10-05T08:00:00Z'
  },
  {
    id: 'audit-6',
    user_name: 'Priya Sharma',
    user_role: 'admin',
    action: 'SALARY_AUDIT_VERIFIED',
    entity: 'salary',
    details: 'Monthly salary policy formula verified: 26 working days in October 2026.',
    new_value: 'Daily Rate: ₹538.46 for Rajesh Kumar',
    timestamp: '2026-10-07T18:00:00Z'
  }
];
