import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FileText, Plus, CheckCircle, Clock } from 'lucide-react';
import { AttendanceRequestModal } from './AttendanceRequestModal';
import { formatMinutesToDuration } from '../../utils/dateUtils';
import { AttendanceStatusBadge } from '../common/AttendanceStatusBadge';

export const EmployeeRequestsView: React.FC = () => {
  const { currentUser, exceptions, getEmployeeLeaveBalance } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  if (!currentUser) return null;

  const myExceptions = exceptions
    .filter(e => e.employee_id === currentUser.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const leaveBalance = getEmployeeLeaveBalance(currentUser.id);
  const casualRemaining = Math.max(0, leaveBalance.casual_leave_total - leaveBalance.casual_leave_used);
  const sickRemaining = Math.max(0, leaveBalance.sick_leave_total - leaveBalance.sick_leave_used);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-700" />
            Leave, Permission &amp; WFH Records
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage attendance adjustments, casual &amp; sick leaves, permissions, and remote work (WFH)
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Apply Leave / Exception
        </button>
      </div>

      {/* Item 1: Leave Balance Tracker Cards for Employee */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Casual Leave Balance Card */}
        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900">Casual Leave (CL)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Quotas
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-indigo-950">{casualRemaining}</span>
            <span className="text-xs text-slate-500 font-medium">/ {leaveBalance.casual_leave_total} days left</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.round((casualRemaining / (leaveBalance.casual_leave_total || 1)) * 100))}%`
              }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Used: {leaveBalance.casual_leave_used} days</span>
            <span>Total: {leaveBalance.casual_leave_total} days</span>
          </div>
        </div>

        {/* Sick Leave Balance Card */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Sick Leave (SL)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Medical
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-950">{sickRemaining}</span>
            <span className="text-xs text-slate-500 font-medium">/ {leaveBalance.sick_leave_total} days left</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.round((sickRemaining / (leaveBalance.sick_leave_total || 1)) * 100))}%`
              }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Used: {leaveBalance.sick_leave_used} days</span>
            <span>Total: {leaveBalance.sick_leave_total} days</span>
          </div>
        </div>

        {/* Permission Rules Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
          <span className="text-xs font-bold text-slate-900 block">Permission Policy (1 Hour)</span>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Duration &le; 1h = <strong>No deduction</strong>.<br />
            Duration &gt; 1h = <strong>0.5 day salary deduction</strong>.
          </p>
        </div>

        {/* WFH & Half Day Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
          <span className="text-xs font-bold text-slate-900 block">WFH &amp; Half-Day</span>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            WFH = Verified full working day.<br />
            Half Day = <strong>0.5 day salary deduction</strong>.
          </p>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Request Type</th>
                <th className="py-3 px-4">Leave / Category</th>
                <th className="py-3 px-4">Permission Duration</th>
                <th className="py-3 px-4">Reason / Justification</th>
                <th className="py-3 px-4">Approval Status</th>
                <th className="py-3 px-4">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myExceptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No exception requests submitted yet.
                  </td>
                </tr>
              ) : (
                myExceptions.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {e.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <AttendanceStatusBadge status={e.type} />
                    </td>
                    <td className="py-3.5 px-4">
                      {e.type === 'absent' ? (
                        e.leave_type === 'sick' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Sick Leave (SL)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Casual Leave (CL)
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 font-mono">--</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {e.permission_minutes ? (
                        <span className="font-semibold text-purple-700">
                          {formatMinutesToDuration(e.permission_minutes)}
                          {e.permission_minutes > 60 && (
                            <span className="text-[10px] text-amber-600 ml-1 block">(&gt;1h deduct)</span>
                          )}
                        </span>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                      {e.reason}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Approved
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(e.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AttendanceRequestModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};
