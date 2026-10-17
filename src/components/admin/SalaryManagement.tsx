import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  calculateEmployeeSalaryForMonth,
  formatCurrency
} from '../../utils/salaryCalculator';
import { MONTH_NAMES, padZero, formatReadableDate } from '../../utils/dateUtils';
import {
  Wallet,
  Calculator,
  Download,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Trash2,
  Calendar,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

export const SalaryManagement: React.FC = () => {
  const {
    users,
    attendanceRecords,
    exceptions,
    holidays,
    updateEmployee,
    deleteAttendanceException
  } = useApp();

  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    const defaultEmp = users.find(u => u.role === 'employee') || users[0];
    return defaultEmp ? defaultEmp.id : '';
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [salaryViewTab, setSalaryViewTab] = useState<'payroll-register' | 'individual-breakdown'>('payroll-register');

  // Deletion state & feedback
  const [deletingExceptionId, setDeletingExceptionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Editable monthly salary override
  const selectedUser = users.find(u => u.id === selectedUserId) || users.find(u => u.role === 'employee') || users[0];
  const [salaryInput, setSalaryInput] = useState<string>(() => selectedUser?.monthly_salary?.toString() || '0');
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    if (!selectedUserId || !users.some(u => u.id === selectedUserId)) {
      const defaultEmp = users.find(u => u.role === 'employee') || users[0];
      if (defaultEmp) {
        setSelectedUserId(defaultEmp.id);
        setSalaryInput(defaultEmp.monthly_salary.toString());
      }
    }
  }, [users, selectedUserId]);

  // When user changes in dropdown or table, update salary input
  const handleUserChange = (newId: string, switchTab: boolean = false) => {
    setSelectedUserId(newId);
    const u = users.find(user => user.id === newId);
    if (u) {
      setSalaryInput(u.monthly_salary.toString());
    }
    if (switchTab) {
      setSalaryViewTab('individual-breakdown');
    }
  };

  const handleUpdateSalary = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(salaryInput);
    if (isNaN(parsed) || parsed < 0) return;
    updateEmployee(selectedUser.id, { monthly_salary: parsed });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleDeleteRequest = (excId: string) => {
    const res = deleteAttendanceException(excId);
    setDeletingExceptionId(null);
    if (res.success) {
      setActionFeedback({ type: 'success', message: res.message });
      setTimeout(() => setActionFeedback(null), 4500);
    } else {
      setActionFeedback({ type: 'error', message: res.message });
      setTimeout(() => setActionFeedback(null), 4500);
    }
  };

  // Dynamic salary calculation for selected employee
  const salary = calculateEmployeeSalaryForMonth(
    selectedUser,
    selectedMonth,
    selectedYear,
    attendanceRecords,
    exceptions,
    holidays
  );

  // Exceptions for this employee in selected month
  const monthPrefix = `${selectedYear}-${padZero(selectedMonth)}`;
  const selectedUserExceptions = exceptions
    .filter(e => e.employee_id === selectedUser.id && e.date.startsWith(monthPrefix))
    .sort((a, b) => b.date.localeCompare(a.date));

  // All exceptions across all employees in selected month
  const allMonthExceptions = exceptions
    .filter(e => e.date.startsWith(monthPrefix))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Batch organization payroll register for all active employees
  const batchPayroll = users
    .filter(u => u.status === 'active')
    .map(u =>
      calculateEmployeeSalaryForMonth(
        u,
        selectedMonth,
        selectedYear,
        attendanceRecords,
        exceptions,
        holidays
      )
    );

  const totalPayrollOutflow = batchPayroll.reduce((acc, p) => acc + p.net_payable_salary, 0);
  const totalDeductionsAll = batchPayroll.reduce((acc, p) => acc + p.total_deduction, 0);

  const exportCSV = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Month-Year',
      'Base Monthly Salary',
      'Working Days',
      'Daily Salary',
      'Present Days',
      'Absent Days',
      'Half Days',
      'Permission >1h',
      'WFH Days',
      'Absent Deduction',
      'Half Day Deduction',
      'Permission Deduction',
      'Total Deduction',
      'Net Payable Salary'
    ];

    const rows = batchPayroll.map(p => {
      const u = users.find(user => user.id === p.employee_id);
      return [
        u?.employee_id || '',
        `"${p.employee_name}"`,
        `"${u?.department || ''}"`,
        `${MONTH_NAMES[p.month - 1]} ${p.year}`,
        p.monthly_salary,
        p.working_days,
        p.daily_salary,
        p.present_days,
        p.absent_days,
        p.half_days,
        p.permission_days_over_1h,
        p.wfh_days,
        p.absent_deduction,
        p.half_day_deduction,
        p.permission_deduction,
        p.total_deduction,
        p.net_payable_salary
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ZT_Payroll_Register_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-slate-700" />
            Salary Management &amp; Payroll Register
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated salary calculations, 6-day policy audit, &amp; wrong request deletion with working day restoration
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Employee Selector (when in individual mode) */}
          {salaryViewTab === 'individual-breakdown' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
              <span className="text-xs text-slate-500 font-medium">Employee:</span>
              <select
                value={selectedUserId}
                onChange={e => handleUserChange(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-hidden"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.employee_id}) · ₹{u.monthly_salary.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month / Year */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* Global Feedback Alert Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-fadeIn ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border border-rose-300 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-view Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSalaryViewTab('payroll-register')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            salaryViewTab === 'payroll-register'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Company Payroll Register</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              salaryViewTab === 'payroll-register'
                ? 'bg-slate-700 text-slate-100'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {batchPayroll.length} Active Staff
          </span>
        </button>

        <button
          onClick={() => setSalaryViewTab('individual-breakdown')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            salaryViewTab === 'individual-breakdown'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Individual Salary &amp; Request Deletion ({selectedUser.name})</span>
          {selectedUserExceptions.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
              {selectedUserExceptions.length} Requests
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: Company Payroll Register Tab */}
      {salaryViewTab === 'payroll-register' && (
        <div className="space-y-6">
          {/* Summary Metric Cards for Company Payroll */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Total Net Payroll Outflow</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                {formatCurrency(totalPayrollOutflow)}
              </span>
              <span className="text-[11px] text-slate-400">Total disbursable this month</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-rose-600 font-medium block">Total Attendance Deductions</span>
              <span className="text-xl font-black text-rose-700 font-mono mt-1 block">
                - {formatCurrency(totalDeductionsAll)}
              </span>
              <span className="text-[11px] text-rose-500">Absents, half days &amp; &gt;1h permission</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Active Eligible Employees</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                {batchPayroll.length} staff
              </span>
              <span className="text-[11px] text-slate-400">Excludes deactivated accounts</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Average Net Salary</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                {formatCurrency(batchPayroll.length > 0 ? Math.round(totalPayrollOutflow / batchPayroll.length) : 0)}
              </span>
              <span className="text-[11px] text-slate-400">Per employee average</span>
            </div>
          </div>

          {/* Company Payroll Register Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-slate-700" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Company Payroll Register ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  6-day work week calculation engine with instant request deletion &amp; working day restoration
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Register CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Monthly Salary</th>
                    <th className="py-3 px-4 text-center">Working Days</th>
                    <th className="py-3 px-4">Daily Rate</th>
                    <th className="py-3 px-4 text-center">Absent</th>
                    <th className="py-3 px-4 text-center">Half Day</th>
                    <th className="py-3 px-4 text-center">Perm &gt;1h</th>
                    <th className="py-3 px-4 text-right">Total Deduction</th>
                    <th className="py-3 px-4 text-right">Net Payable Salary</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batchPayroll.map(p => {
                    const isSelected = p.employee_id === selectedUser.id;
                    const empUser = users.find(u => u.id === p.employee_id);
                    const empExceptionsCount = exceptions.filter(
                      e => e.employee_id === p.employee_id && e.date.startsWith(monthPrefix)
                    ).length;

                    return (
                      <tr
                        key={p.employee_id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-blue-50/60 font-medium' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{p.employee_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {empUser?.employee_id}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {empUser?.department}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                          {formatCurrency(p.monthly_salary)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                          {p.working_days}d
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {formatCurrency(p.daily_salary)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-rose-600 font-bold">
                          {p.absent_days}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-amber-600 font-bold">
                          {p.half_days}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-purple-700 font-bold">
                          {p.permission_days_over_1h}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                          {p.total_deduction > 0 ? `- ${formatCurrency(p.total_deduction)}` : '₹0.00'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                          {formatCurrency(p.net_payable_salary)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleUserChange(p.employee_id, true)}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer"
                            title="Inspect calculation & manage/delete requests"
                          >
                            <span>Inspect</span>
                            {empExceptionsCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-700">
                                {empExceptionsCount} req
                              </span>
                            )}
                            <ArrowRight className="w-3 h-3 ml-0.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Overview: All Submitted Requests Across Company for Selected Month */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-700" />
                  All Employee Leave &amp; Exception Requests ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  If an employee submitted wrongly, delete it here to instantly restore that day as a working day with ₹0 deduction.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
                {allMonthExceptions.length} Total Requests This Month
              </span>
            </div>

            {allMonthExceptions.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No leave or exception requests submitted across the organization for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Request Type</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allMonthExceptions.map(exc => {
                      const emp = users.find(u => u.id === exc.employee_id);
                      const isConfirming = deletingExceptionId === exc.id;

                      return (
                        <tr key={exc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {formatReadableDate(exc.date)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900">{emp?.name || exc.employee_id}</span>
                            <span className="text-[11px] text-slate-400 block font-mono">{emp?.department}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            {exc.type === 'absent' ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  exc.leave_type === 'sick'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {exc.leave_type === 'sick' ? 'Sick Leave (SL)' : 'Casual Leave (CL)'}
                              </span>
                            ) : exc.type === 'half_day' ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                Half Day (4h)
                              </span>
                            ) : exc.type === 'permission' ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                                Permission ({(exc.permission_minutes || 60) / 60}h)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800">
                                WFH (Remote)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={exc.reason}>
                            {exc.reason}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isConfirming ? (
                              <div className="inline-flex items-center gap-1.5 bg-rose-50 p-1 rounded-lg border border-rose-200">
                                <span className="text-[11px] text-rose-800 font-semibold pl-1">
                                  Restore as working day?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRequest(exc.id)}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingExceptionId(null)}
                                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingExceptionId(exc.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                title="Delete wrongly submitted request and restore as working day"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Request</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Individual Employee Salary Breakdown Tab */}
      {salaryViewTab === 'individual-breakdown' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-100 gap-4">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Salary Configuration &amp; Request Audit
              </span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                {selectedUser.name}
                <span className="text-xs font-mono font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedUser.employee_id}
                </span>
              </h3>
              <p className="text-xs text-slate-500">{selectedUser.department} Department</p>
            </div>

            <form onSubmit={handleUpdateSalary} className="flex items-center gap-2">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                  Configure Monthly Salary (₹)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={salaryInput}
                    onChange={e => setSalaryInput(e.target.value)}
                    className="w-36 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900"
                    required
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Update Base
                  </button>
                </div>
              </div>
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-bold self-end mb-1">
                  ✓ Saved
                </span>
              )}
            </form>
          </div>

          {/* Working Day Calculation Verification Box */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-blue-700" />
                1. Working Day Calculation Formula (6-Day Work Week Organization)
              </span>
              <span className="text-xs font-bold font-mono text-blue-950 bg-blue-100/70 px-2.5 py-1 rounded">
                Working Days = {salary.working_days} Days
              </span>
            </div>

            <div className="p-3 bg-white/90 rounded-lg border border-blue-100 text-xs font-mono text-blue-950 flex flex-wrap items-center gap-2">
              <span>Total Calendar Days ({salary.calendar_days})</span>
              <span>-</span>
              <span>Sundays ({salary.sundays_count})</span>
              <span>-</span>
              <span>Official Holidays ({salary.holidays_count})</span>
              <span>=</span>
              <span className="font-extrabold text-blue-900 underline decoration-blue-500">
                {salary.working_days} Working Days
              </span>
            </div>

            <div className="text-[11px] text-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>
                <strong>Daily Salary Formula:</strong> Daily Salary = Monthly Salary &divide; Working Days
              </span>
              <span className="font-mono font-bold text-blue-950">
                {formatCurrency(salary.monthly_salary)} &divide; {salary.working_days} = {formatCurrency(salary.daily_salary)} / day
              </span>
            </div>
          </div>

          {/* Section 2: Step-by-Step Transparent Salary Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-slate-600" />
                2. Dynamic Attendance Deduction Breakdown ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
              </h4>
              <span className="text-[11px] text-slate-400">
                Computed dynamically from attendance logs &amp; exceptions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Attendance Event</th>
                    <th className="py-3 px-4 text-center">Occurrences</th>
                    <th className="py-3 px-4">Policy Rule</th>
                    <th className="py-3 px-4 text-right">Calculation Breakdown</th>
                    <th className="py-3 px-4 text-right">Deduction Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Full-Day Absent */}
                  <tr className={salary.absent_days > 0 ? 'bg-rose-50/40' : ''}>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Full-Day Absent / Leaves
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono">
                      {salary.absent_days} {salary.absent_days === 1 ? 'day' : 'days'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      Deduction = Daily Salary &times; 1
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {salary.absent_days} &times; {formatCurrency(salary.daily_salary)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      {salary.absent_deduction > 0 ? `- ${formatCurrency(salary.absent_deduction)}` : '₹0.00'}
                    </td>
                  </tr>

                  {/* Half Day */}
                  <tr className={salary.half_days > 0 ? 'bg-amber-50/40' : ''}>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Half Day Shift
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono">
                      {salary.half_days} {salary.half_days === 1 ? 'day' : 'days'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      Deduction = Daily Salary &times; 0.5
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {salary.half_days} &times; 0.5 &times; {formatCurrency(salary.daily_salary)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                      {salary.half_day_deduction > 0 ? `- ${formatCurrency(salary.half_day_deduction)}` : '₹0.00'}
                    </td>
                  </tr>

                  {/* Permission > 1 Hour */}
                  <tr className={salary.permission_days_over_1h > 0 ? 'bg-purple-50/40' : ''}>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Permission &gt; 1 Hour
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono">
                      {salary.permission_days_over_1h} {salary.permission_days_over_1h === 1 ? 'time' : 'times'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      Deduction = Daily Salary &times; 0.5 (Half-day deduction)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {salary.permission_days_over_1h} &times; 0.5 &times; {formatCurrency(salary.daily_salary)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                      {salary.permission_deduction > 0 ? `- ${formatCurrency(salary.permission_deduction)}` : '₹0.00'}
                    </td>
                  </tr>

                  {/* Permission <= 1 Hour */}
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Permission &le; 1 Hour
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono">
                      {salary.permission_days_under_or_equal_1h}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      No deduction (&le; 1h policy allowed)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      --
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                      ₹0.00
                    </td>
                  </tr>

                  {/* WFH (Remote) */}
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Work From Home (WFH)
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono">
                      {salary.wfh_days}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      Counted as working day. Do not deduct salary.
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      --
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                      ₹0.00
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Manage & Delete Submitted Requests (Requirement: Delete wrong request & calculate as working day) */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  3. Delete Wrongly Submitted Requests &amp; Restore Working Day ({selectedUser.name})
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  If {selectedUser.name} submitted a leave/half-day/permission/WFH request by mistake, click <strong>Delete Request</strong>. That day will immediately be calculated as a <strong>regular working day (Present) with ₹0 deduction</strong>.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 shrink-0">
                {selectedUserExceptions.length} Requests Found
              </span>
            </div>

            {selectedUserExceptions.length === 0 ? (
              <div className="p-4 bg-white rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                No leave or exception requests found for <strong>{selectedUser.name}</strong> in {MONTH_NAMES[selectedMonth - 1]} {selectedYear}. All eligible working days are counted as regular working days.
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Request Type</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-4">Salary Impact</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedUserExceptions.map(exc => {
                      const isConfirming = deletingExceptionId === exc.id;

                      let impactLabel = '₹0.00';
                      let impactColor = 'text-slate-600';

                      if (exc.type === 'absent') {
                        impactLabel = `- ${formatCurrency(salary.daily_salary)} (1 Day Salary)`;
                        impactColor = 'text-rose-600 font-bold';
                      } else if (exc.type === 'half_day') {
                        impactLabel = `- ${formatCurrency(0.5 * salary.daily_salary)} (0.5 Day Salary)`;
                        impactColor = 'text-amber-600 font-bold';
                      } else if (exc.type === 'permission') {
                        const mins = exc.permission_minutes || 60;
                        if (mins > 60) {
                          impactLabel = `- ${formatCurrency(0.5 * salary.daily_salary)} (0.5 Day Salary)`;
                          impactColor = 'text-purple-700 font-bold';
                        } else {
                          impactLabel = '₹0.00 (≤ 1h Allowed)';
                          impactColor = 'text-emerald-600 font-semibold';
                        }
                      } else if (exc.type === 'wfh') {
                        impactLabel = '₹0.00 (Full Day Counted)';
                        impactColor = 'text-emerald-600 font-semibold';
                      }

                      return (
                        <tr key={exc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatReadableDate(exc.date)}
                          </td>
                          <td className="py-3.5 px-4">
                            {exc.type === 'absent' ? (
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  exc.leave_type === 'sick'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {exc.leave_type === 'sick' ? 'Sick Leave (SL)' : 'Casual Leave (CL)'}
                              </span>
                            ) : exc.type === 'half_day' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                Half Day (4h)
                              </span>
                            ) : exc.type === 'permission' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                Permission ({(exc.permission_minutes || 60) / 60}h)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                                WFH (Remote)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 max-w-sm">
                            <span className="italic font-medium">"{exc.reason}"</span>
                          </td>
                          <td className={`py-3.5 px-4 font-mono ${impactColor}`}>
                            {impactLabel}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isConfirming ? (
                              <div className="inline-flex items-center gap-1.5 bg-rose-50 p-1 rounded-lg border border-rose-200">
                                <span className="text-[11px] text-rose-800 font-semibold pl-1">
                                  Restore as working day?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRequest(exc.id)}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-xs"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingExceptionId(null)}
                                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingExceptionId(exc.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                title="Delete this request so this day is calculated as a regular working day"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Request</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Result Card: Net Payable Salary */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Net Payable Salary Calculation ({selectedUser.name})
              </span>
              <div className="text-xs text-slate-300 font-mono flex flex-wrap items-center gap-2">
                <span>Monthly ({formatCurrency(salary.monthly_salary)})</span>
                <span>-</span>
                <span className="text-rose-400">Total Deductions ({formatCurrency(salary.total_deduction)})</span>
                <span>=</span>
                <span className="text-emerald-400 font-bold">Net Salary</span>
              </div>
            </div>

            <div className="text-left md:text-right">
              <span className="text-xs text-slate-400 block font-medium">Final Disbursable Amount:</span>
              <span className="text-2xl font-black text-white font-mono block">
                {formatCurrency(salary.net_payable_salary)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
