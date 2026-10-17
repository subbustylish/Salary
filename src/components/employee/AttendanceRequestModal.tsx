import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ExceptionType, LeaveType } from '../../types';
import { X, AlertCircle, Calendar, CheckCircle, MessageSquare, Mail, Send } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export const AttendanceRequestModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialDate
}) => {
  const {
    currentUser,
    submitAttendanceException,
    todayDateStr,
    holidays,
    getEmployeeLeaveBalance,
    notificationSettings
  } = useApp();

  const [date, setDate] = useState(initialDate || todayDateStr);
  const [type, setType] = useState<ExceptionType>('absent');
  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [permissionHours, setPermissionHours] = useState('1');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dispatchedData, setDispatchedData] = useState<{
    type: ExceptionType;
    leaveType?: string;
    date: string;
    reason: string;
    permissionMinutes?: number;
  } | null>(null);

  // Calculate live balances
  const currentLeaveBalance = currentUser ? getEmployeeLeaveBalance(currentUser.id) : {
    casual_leave_total: 10,
    casual_leave_used: 0,
    sick_leave_total: 10,
    sick_leave_used: 0
  };

  const casualRemaining = Math.max(0, currentLeaveBalance.casual_leave_total - currentLeaveBalance.casual_leave_used);
  const sickRemaining = Math.max(0, currentLeaveBalance.sick_leave_total - currentLeaveBalance.sick_leave_used);

  const isCasualDisabled = casualRemaining <= 0;
  const isSickDisabled = sickRemaining <= 0;
  const areAllLeavesExhausted = isCasualDisabled && isSickDisabled;

  // Auto-switch leaveType if current selected option is disabled
  useEffect(() => {
    if (isCasualDisabled && !isSickDisabled && leaveType === 'casual') {
      setLeaveType('sick');
    } else if (isSickDisabled && !isCasualDisabled && leaveType === 'sick') {
      setLeaveType('casual');
    }
  }, [isCasualDisabled, isSickDisabled, leaveType]);

  // Handle ESC key to close modal safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleCloseModal = () => {
    onClose();
    setDispatchedData(null);
    setSuccess(null);
    setError(null);
    setReason('');
  };

  const isCurrentSelectionExhausted =
    type === 'absent' &&
    ((leaveType === 'casual' && isCasualDisabled) ||
     (leaveType === 'sick' && isSickDisabled) ||
     areAllLeavesExhausted);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentUser) return;

    if (!reason.trim()) {
      setError('Please provide a descriptive reason for this attendance record.');
      return;
    }

    if (type === 'absent') {
      if (areAllLeavesExhausted) {
        setError('Both Casual and Sick leaves are exhausted. You cannot submit an absent leave request.');
        return;
      }
      if (leaveType === 'casual' && isCasualDisabled) {
        setError('Casual Leave limit has been reached (0 days remaining). Please select Sick Leave.');
        return;
      }
      if (leaveType === 'sick' && isSickDisabled) {
        setError('Sick Leave limit has been reached (0 days remaining). Please select Casual Leave.');
        return;
      }
    }

    let permissionMinutes: number | undefined;
    if (type === 'permission') {
      const parsedHours = parseFloat(permissionHours);
      if (isNaN(parsedHours) || parsedHours <= 0) {
        setError('Please enter a valid permission duration (e.g. 0.5, 1, 1.5, 2 hours).');
        return;
      }
      permissionMinutes = Math.round(parsedHours * 60);
    }

    const res = submitAttendanceException({
      employee_id: currentUser.id,
      date,
      type,
      leave_type: type === 'absent' ? leaveType : undefined,
      reason,
      permission_minutes: permissionMinutes
    });

    if (!res.success) {
      setError(res.message);
    } else {
      setSuccess(res.message);
      setDispatchedData({
        type,
        leaveType: type === 'absent' ? (leaveType === 'sick' ? 'Sick Leave (SL)' : 'Casual Leave (CL)') : undefined,
        date,
        reason,
        permissionMinutes
      });
    }
  };

  const isPermOver1Hour = type === 'permission' && parseFloat(permissionHours || '0') > 1;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex min-h-screen items-center justify-center p-3 sm:p-4"
      onClick={handleCloseModal}
    >
      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] sm:max-h-[86vh] overflow-hidden my-auto animate-fadeIn text-left"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Rigid Fixed Header - Close button is pinned & NEVER goes outside view */}
        <div className="shrink-0 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white z-20">
          <div>
            <h3 id="modal-title" className="text-base font-bold text-slate-900">
              Mark Attendance / Exception
            </h3>
            <p className="text-xs text-slate-500">
              Submit an attendance request or exception record
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            title="Close window (Esc)"
            aria-label="Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4 overscroll-contain">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-start gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          {/* Post-Submission Instant Zero-Cost Alerts Panel */}
          {dispatchedData ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Request Saved! Dispatch Instant Notifications:</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Notify higher management and admin instantly via 1-click WhatsApp or Email (zero cost, real-time):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* 1-Click WhatsApp Direct Alert */}
                  {(() => {
                    const targetAdminMob = notificationSettings.mobiles[0]?.value || '';
                    const cleanPhone = targetAdminMob.replace(/[^0-9]/g, '');
                    const reqName = dispatchedData.leaveType || dispatchedData.type.toUpperCase();
                    const msgText = `🔔 *Z&T HR Alert*: Employee *${currentUser.name}* (${currentUser.email}) has submitted a *${reqName}* request for *${dispatchedData.date}*.\nReason: "${dispatchedData.reason}".\nPlease review in admin dashboard.`;
                    const waUrl = cleanPhone
                      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgText)}`
                      : `https://wa.me/?text=${encodeURIComponent(msgText)}`;

                    return (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Send WhatsApp Alert
                      </a>
                    );
                  })()}

                  {/* 1-Click Email to Higher Management */}
                  {(() => {
                    const toEmails = notificationSettings.emails.map(e => e.value).join(',');
                    const reqName = dispatchedData.leaveType || dispatchedData.type.toUpperCase();
                    const subject = `[Z&T Portal] Attendance Request: ${reqName} - ${currentUser.name}`;
                    const body = `Dear Management,\n\nEmployee ${currentUser.name} (${currentUser.employee_id}, ${currentUser.email}) has submitted an attendance request for approval:\n\nType: ${reqName}\nDate: ${dispatchedData.date}\nReason: ${dispatchedData.reason}\n\nPlease review in the Z&T admin dashboard.\n\nRegards,\n${currentUser.name}`;
                    const mailtoUrl = `mailto:${toEmails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

                    return (
                      <a
                        href={mailtoUrl}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email Management
                      </a>
                    );
                  })()}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Done & Close Window</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form id="attendance-exception-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Date Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-transparent font-medium"
                    required
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Sundays and official organization holidays cannot be marked with exceptions.
                </span>
              </div>

              {/* Status / Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attendance Status Type *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'absent' as const, label: 'Leave (Absent)', extra: areAllLeavesExhausted ? 'Exhausted' : undefined },
                      { id: 'half_day' as const, label: 'Half Day', extra: undefined },
                      { id: 'permission' as const, label: 'Permission (1h)', extra: undefined },
                      { id: 'wfh' as const, label: 'WFH', extra: undefined }
                    ]
                  ).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setType(opt.id)}
                      className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                        type === opt.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {opt.extra && (
                        <span className="block text-[9px] font-bold text-rose-500 uppercase">
                          ({opt.extra})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leave Type Selector (Casual vs Sick Leave) with Strict Disabling on Limit Exceed */}
              {type === 'absent' && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-indigo-950">
                      Select Leave Category *
                    </label>
                    <span className="text-[11px] font-semibold text-indigo-700">
                      Quotas deduct upon applying
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Casual Leave Button */}
                    <button
                      type="button"
                      disabled={isCasualDisabled}
                      aria-disabled={isCasualDisabled}
                      onClick={() => !isCasualDisabled && setLeaveType('casual')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isCasualDisabled
                          ? 'bg-slate-100/90 border-slate-200 opacity-60 cursor-not-allowed text-slate-400 select-none'
                          : leaveType === 'casual'
                          ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/30 shadow-xs cursor-pointer'
                          : 'bg-white/70 border-indigo-100 hover:bg-white hover:border-indigo-300 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isCasualDisabled ? 'text-slate-500' : 'text-slate-900'}`}>
                          Casual Leave (CL)
                        </span>
                        {isCasualDisabled ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                            Limit Exceeded
                          </span>
                        ) : (
                          <span
                            className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                              leaveType === 'casual' ? 'border-indigo-600' : 'border-slate-300'
                            }`}
                          >
                            {leaveType === 'casual' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-baseline justify-between text-[11px]">
                        <span className="text-slate-500">Remaining Balance:</span>
                        <span className={`font-mono font-bold ${isCasualDisabled ? 'text-rose-600' : 'text-indigo-700'}`}>
                          {casualRemaining} / {currentLeaveBalance.casual_leave_total} days
                        </span>
                      </div>
                      {isCasualDisabled && (
                        <p className="mt-1 text-[10px] text-rose-600 font-medium">
                          CL quota is 0. Cannot select.
                        </p>
                      )}
                    </button>

                    {/* Sick Leave Button */}
                    <button
                      type="button"
                      disabled={isSickDisabled}
                      aria-disabled={isSickDisabled}
                      onClick={() => !isSickDisabled && setLeaveType('sick')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSickDisabled
                          ? 'bg-slate-100/90 border-slate-200 opacity-60 cursor-not-allowed text-slate-400 select-none'
                          : leaveType === 'sick'
                          ? 'bg-white border-emerald-600 ring-2 ring-emerald-600/30 shadow-xs cursor-pointer'
                          : 'bg-white/70 border-emerald-100 hover:bg-white hover:border-emerald-300 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSickDisabled ? 'text-slate-500' : 'text-slate-900'}`}>
                          Sick Leave (SL)
                        </span>
                        {isSickDisabled ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                            Limit Exceeded
                          </span>
                        ) : (
                          <span
                            className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                              leaveType === 'sick' ? 'border-emerald-600' : 'border-slate-300'
                            }`}
                          >
                            {leaveType === 'sick' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-baseline justify-between text-[11px]">
                        <span className="text-slate-500">Remaining Balance:</span>
                        <span className={`font-mono font-bold ${isSickDisabled ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {sickRemaining} / {currentLeaveBalance.sick_leave_total} days
                        </span>
                      </div>
                      {isSickDisabled && (
                        <p className="mt-1 text-[10px] text-rose-600 font-medium">
                          SL quota is 0. Cannot select.
                        </p>
                      )}
                    </button>
                  </div>

                  {areAllLeavesExhausted ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>Both Casual and Sick leaves are exhausted. You cannot submit an absent leave request.</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 leading-tight">
                      Applying will deduct 1 day from your selected <strong>{leaveType === 'casual' ? 'Casual' : 'Sick'} Leave</strong> balance upon submission.
                    </div>
                  )}
                </div>
              )}

              {/* Permission Duration Picker */}
              {type === 'permission' && (
                <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-purple-900">
                    Permission Duration (Hours) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.5"
                      max="8"
                      step="0.5"
                      value={permissionHours}
                      onChange={e => setPermissionHours(e.target.value)}
                      className="w-32 px-3 py-1.5 border border-purple-200 bg-white rounded-lg text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                      required
                    />
                    <span className="text-xs text-purple-700 font-medium">
                      hours ({Math.round(parseFloat(permissionHours || '0') * 60)} minutes)
                    </span>
                  </div>

                  {/* Policy note regarding 1 hour rule */}
                  <div className="text-[11px] leading-relaxed pt-1 border-t border-purple-100">
                    {isPermOver1Hour ? (
                      <span className="text-amber-800 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <strong>Salary Policy Note:</strong> Permission &gt; 1 hour attracts a <strong>0.5 day salary deduction</strong>.
                      </span>
                    ) : (
                      <span className="text-purple-800 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <strong>Salary Policy:</strong> Permission &le; 1 hour incurs <strong>₹0 salary deduction</strong>.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* WFH Distinct explanation */}
              {type === 'wfh' && (
                <div className="p-3 bg-sky-50/60 border border-sky-100 rounded-xl text-[11px] text-sky-800 leading-relaxed">
                  <strong>Work From Home (WFH):</strong> Counts as a full working day with zero salary deductions.
                </div>
              )}

              {/* Half Day explanation */}
              {type === 'half_day' && (
                <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                  <strong>Half Day Shift:</strong> Working 4 hours. Deducts 0.5 × daily salary from the monthly payroll.
                </div>
              )}

              {/* Reason Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Justification *
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Doctor appointment, family emergency, personal work..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder:text-slate-400"
                  required
                />
              </div>
            </form>
          )}
        </div>

        {/* Rigid Fixed Footer - Always accessible & pinned */}
        <div className="shrink-0 px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 z-20">
          <button
            type="button"
            onClick={handleCloseModal}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
          >
            {dispatchedData ? 'Close Window' : 'Cancel'}
          </button>
          {!dispatchedData && (
            <button
              type="submit"
              form="attendance-exception-form"
              disabled={isCurrentSelectionExhausted}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-colors shadow-xs ${
                isCurrentSelectionExhausted
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
              }`}
              title={isCurrentSelectionExhausted ? 'Cannot submit because leave limit is exceeded' : 'Submit request'}
            >
              Submit Attendance Record
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
