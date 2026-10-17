import { AttendanceException, AttendanceRecord, Holiday, SalaryBreakdown, User } from '../types';
import { calculateWorkingDaysDetails, padZero } from './dateUtils';

export function calculateEmployeeSalaryForMonth(
  employee: User,
  month: number,
  year: number,
  attendanceRecords: AttendanceRecord[],
  exceptions: AttendanceException[],
  holidays: Holiday[]
): SalaryBreakdown {
  const workingDaysInfo = calculateWorkingDaysDetails(year, month, holidays);
  const calendarDays = workingDaysInfo.totalCalendarDays;
  const sundaysCount = workingDaysInfo.sundaysCount;
  const holidaysCount = workingDaysInfo.holidaysOnWorkingDaysCount;
  const workingDays = workingDaysInfo.netWorkingDays;

  const monthlySalary = employee.monthly_salary || 0;
  const dailySalary = workingDays > 0 ? monthlySalary / workingDays : 0;

  // Find all attendance records and exceptions for this employee in this month
  const monthPrefix = `${year}-${padZero(month)}`;

  const employeeRecords = attendanceRecords.filter(
    r => r.employee_id === employee.id && r.date.startsWith(monthPrefix)
  );

  const employeeExceptions = exceptions.filter(
    e => e.employee_id === employee.id && e.date.startsWith(monthPrefix)
  );

  // Build a day-by-day map of working days
  const recordMap = new Map<string, AttendanceRecord>();
  for (const r of employeeRecords) {
    recordMap.set(r.date, r);
  }

  const exceptionMap = new Map<string, AttendanceException>();
  for (const e of employeeExceptions) {
    exceptionMap.set(e.date, e);
  }

  const holidayDateSet = new Set(workingDaysInfo.holidaysList.map(h => h.date));
  const sundaySet = new Set(workingDaysInfo.sundaysList);

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let permissionDaysOver1h = 0;
  let permissionDaysUnderOrEqual1h = 0;
  let wfhDays = 0;
  let unmarkedDays = 0;

  // Evaluate each calendar day in the month
  for (let day = 1; day <= calendarDays; day++) {
    const dateStr = `${year}-${padZero(month)}-${padZero(day)}`;

    // Exclude Sundays and Holidays from work-day attendance evaluations
    if (sundaySet.has(dateStr) || holidayDateSet.has(dateStr)) {
      continue;
    }

    const record = recordMap.get(dateStr);
    const exception = exceptionMap.get(dateStr);

    // If an exception exists for this day, it determines or refines status
    if (exception) {
      if (exception.type === 'absent') {
        absentDays++;
      } else if (exception.type === 'half_day') {
        halfDays++;
      } else if (exception.type === 'permission') {
        const mins = exception.permission_minutes || 0;
        // Item 1: Permission policy is 1 hour (60 minutes)
        if (mins > 60) {
          permissionDaysOver1h++;
        } else {
          permissionDaysUnderOrEqual1h++;
        }
      } else if (exception.type === 'wfh') {
        wfhDays++;
      }
      continue;
    }

    // Otherwise check regular attendance record
    if (record) {
      if (record.status === 'present') {
        presentDays++;
      } else if (record.status === 'absent') {
        absentDays++;
      } else if (record.status === 'half_day') {
        halfDays++;
      } else if (record.status === 'permission') {
        // If logged as permission directly without exception record
        permissionDaysUnderOrEqual1h++;
      } else if (record.status === 'wfh') {
        wfhDays++;
      }
    } else {
      // If no record on a working day (unmarked)
      unmarkedDays++;
    }
  }

  // Deductions calculation
  const absentDeduction = absentDays * dailySalary;
  const halfDayDeduction = halfDays * 0.5 * dailySalary;
  const permissionDeduction = permissionDaysOver1h * 0.5 * dailySalary;
  const totalDeduction = absentDeduction + halfDayDeduction + permissionDeduction;

  const netPayableSalary = Math.max(0, monthlySalary - totalDeduction);

  return {
    employee_id: employee.id,
    employee_name: employee.name,
    month,
    year,
    monthly_salary: monthlySalary,
    calendar_days: calendarDays,
    sundays_count: sundaysCount,
    holidays_count: holidaysCount,
    working_days: workingDays,
    daily_salary: Math.round(dailySalary * 100) / 100,

    present_days: presentDays,
    absent_days: absentDays,
    half_days: halfDays,
    permission_days_over_1h: permissionDaysOver1h,
    permission_days_under_or_equal_1h: permissionDaysUnderOrEqual1h,
    permission_days_over_3h: permissionDaysOver1h,
    permission_days_under_or_equal_3h: permissionDaysUnderOrEqual1h,
    wfh_days: wfhDays,
    unmarked_days: unmarkedDays,

    absent_deduction: Math.round(absentDeduction * 100) / 100,
    half_day_deduction: Math.round(halfDayDeduction * 100) / 100,
    permission_deduction: Math.round(permissionDeduction * 100) / 100,
    total_deduction: Math.round(totalDeduction * 100) / 100,
    net_payable_salary: Math.round(netPayableSalary * 100) / 100,

    status: 'computed',
    calculated_at: new Date().toISOString()
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(amount);
}
