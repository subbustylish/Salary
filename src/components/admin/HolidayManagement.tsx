import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Holiday } from '../../types';
import { Palmtree, Plus, Edit, Trash2, Calendar, X, AlertCircle, CheckCircle } from 'lucide-react';
import { formatReadableDate } from '../../utils/dateUtils';

export const HolidayManagement: React.FC = () => {
  const { holidays, addHoliday, updateHoliday, deleteHoliday } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const [formDate, setFormDate] = useState('2026-10-20');
  const [formName, setFormName] = useState('Diwali (Deepavali)');
  const [formDescription, setFormDescription] = useState('Festival of Lights');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const openAdd = () => {
    setEditingHoliday(null);
    setFormDate('2026-11-01');
    setFormName('');
    setFormDescription('');
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const openEdit = (h: Holiday) => {
    setEditingHoliday(h);
    setFormDate(h.date);
    setFormName(h.name);
    setFormDescription(h.description);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formName.trim() || !formDate) {
      setError('Please provide holiday name and date.');
      return;
    }

    if (editingHoliday) {
      const res = updateHoliday(editingHoliday.id, {
        date: formDate,
        name: formName.trim(),
        description: formDescription.trim()
      });
      if (res.success) {
        setSuccess('Holiday updated successfully.');
        setTimeout(() => setIsModalOpen(false), 900);
      } else {
        setError(res.message);
      }
    } else {
      const res = addHoliday({
        date: formDate,
        name: formName.trim(),
        description: formDescription.trim()
      });
      if (res.success) {
        setSuccess('Holiday created and working days updated.');
        setTimeout(() => setIsModalOpen(false), 900);
      } else {
        setError(res.message);
      }
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove the holiday "${name}"? This will recalculate working days.`)) {
      deleteHoliday(id);
    }
  };

  const sortedHolidays = [...holidays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Palmtree className="w-5 h-5 text-slate-700" />
            Holiday &amp; Festival Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure gazetted organization holidays · Automatically deducted from monthly working day count
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Add Holiday
        </button>
      </div>

      {/* 6-day week policy alert */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
        <div>
          <span className="font-bold text-blue-900 block">Working Day Deduction Policy</span>
          <span className="text-blue-800">
            Organization adheres strictly to a <strong>6-day working week (Monday–Saturday)</strong>. Sundays and official holidays are excluded from working day divisor calculation.
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold bg-white text-blue-900 border border-blue-200 px-3 py-1 rounded-lg shrink-0">
          Working Days = Calendar Days - Sundays - Holidays
        </span>
      </div>

      {/* Holidays Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Holiday Name</th>
                <th className="py-3 px-4">Day of Week</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Working Day Impact</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedHolidays.map(h => {
                const [year, month, day] = h.date.split('-').map(Number);
                const d = new Date(year, month - 1, day);
                const isSunday = d.getDay() === 0;
                const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

                return (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {h.date}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {h.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className={isSunday ? 'text-rose-600 font-bold' : 'font-medium'}>
                        {dayName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-sm">
                      {h.description}
                    </td>
                    <td className="py-3.5 px-4">
                      {isSunday ? (
                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                          Sunday Overlap (No double deduct)
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                          -1 Working Day (Paid Holiday)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => openEdit(h)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                        title="Edit Holiday"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(h.id, h.name)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Holiday"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Holiday Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {editingHoliday ? 'Edit Holiday' : 'Configure New Holiday'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Holiday Date (YYYY-MM-DD) *
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Holiday / Festival Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diwali, Independence Day, Christmas"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description *
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Festival of Lights - Mandatory company closure"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800"
                >
                  {editingHoliday ? 'Update Holiday' : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
