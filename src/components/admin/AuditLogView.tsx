import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, Search, Filter, Clock, Calendar } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useApp();

  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('all');

  const filteredLogs = auditLogs.filter(log => {
    const matchSearch =
      log.user_name.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    const matchEntity = filterEntity === 'all' || log.entity === filterEntity;
    return matchSearch && matchEntity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-slate-700" />
            Corporate Audit Trail &amp; System Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of attendance events, salary adjustments, employee modifications, and holidays
          </p>
        </div>

        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          {auditLogs.length} Logged Events
        </span>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by action, user, or details..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500 font-medium">Filter Entity:</span>
          <select
            value={filterEntity}
            onChange={e => setFilterEntity(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white"
          >
            <option value="all">All Entities</option>
            <option value="attendance">Attendance &amp; Punches</option>
            <option value="salary">Salary &amp; Payroll</option>
            <option value="employee">Employees</option>
            <option value="holiday">Holidays</option>
            <option value="auth">Authentication</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator / User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-4">Previous Value</th>
                <th className="py-3 px-4">New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    <span className="font-bold block">{log.user_name}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{log.user_role}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 capitalize font-semibold text-slate-600">
                    {log.entity}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 max-w-sm">
                    {log.details}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] max-w-xs truncate">
                    {log.previous_value || '--'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-800 text-[11px] max-w-xs truncate font-medium">
                    {log.new_value || '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
