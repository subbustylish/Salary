import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import { formatCurrency } from '../../utils/salaryCalculator';
import {
  Users,
  Plus,
  Search,
  Edit,
  Power,
  Trash2,
  Shield,
  X,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';

export const EmployeeManagement: React.FC = () => {
  const {
    users,
    addEmployee,
    updateEmployee,
    toggleEmployeeStatus,
    deleteEmployee,
    getEmployeeLeaveBalance,
    updateEmployeeLeaveQuotas
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formEmpId, setFormEmpId] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('password123');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formDept, setFormDept] = useState('Operations');
  const [formRole, setFormRole] = useState<UserRole>('employee');
  const [formJoiningDate, setFormJoiningDate] = useState('2024-01-15');
  const [formSalary, setFormSalary] = useState('14000');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formCasualQuota, setFormCasualQuota] = useState('10');
  const [formSickQuota, setFormSickQuota] = useState('10');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const departments = Array.from(new Set(users.map(u => u.department)));

  const handleDeleteConfirm = () => {
    if (!userToDelete) return;
    const res = deleteEmployee(userToDelete.id);
    if (res.success) {
      setDeleteFeedback({ type: 'success', message: res.message });
      setUserToDelete(null);
      setTimeout(() => setDeleteFeedback(null), 4000);
    } else {
      setDeleteFeedback({ type: 'error', message: res.message });
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || u.department === filterDept;
    return matchSearch && matchDept;
  });

  const openAddModal = () => {
    setEditingUser(null);
    setFormEmpId(`ZT-EMP-${100 + users.length + 1}`);
    setFormName('');
    setFormEmail('');
    setFormUsername('');
    setFormPassword('');
    setShowFormPassword(false);
    setFormDept('Operations');
    setFormRole('employee');
    setFormJoiningDate(new Date().toISOString().split('T')[0]);
    setFormSalary('14000');
    setFormStatus('active');
    setFormCasualQuota('10');
    setFormSickQuota('10');
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormEmpId(user.employee_id);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormUsername(user.username);
    setFormPassword(user.password || 'password123');
    setShowFormPassword(false);
    setFormDept(user.department);
    setFormRole(user.role);
    setFormJoiningDate(user.joining_date);
    setFormSalary(user.monthly_salary.toString());
    setFormStatus(user.status);
    setFormCasualQuota((user.casual_leave_quota !== undefined ? user.casual_leave_quota : 10).toString());
    setFormSickQuota((user.sick_leave_quota !== undefined ? user.sick_leave_quota : 10).toString());
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const salaryVal = parseFloat(formSalary);
    if (isNaN(salaryVal) || salaryVal < 0) {
      setFormError('Monthly salary must be a positive number.');
      return;
    }

    const cQuotaVal = parseInt(formCasualQuota, 10);
    const sQuotaVal = parseInt(formSickQuota, 10);
    if (isNaN(cQuotaVal) || cQuotaVal < 0 || isNaN(sQuotaVal) || sQuotaVal < 0) {
      setFormError('Leave quotas must be valid non-negative numbers.');
      return;
    }

    if (!formEmpId.trim()) {
      setFormError('Please enter an Employee ID.');
      return;
    }

    if (!formUsername.trim()) {
      setFormError('Please enter a username.');
      return;
    }

    if (!formPassword.trim() && !editingUser?.password) {
      setFormError('Please enter a login password.');
      return;
    }

    if (editingUser) {
      const res = updateEmployee(editingUser.id, {
        employee_id: formEmpId.trim(),
        username: formUsername.trim().toLowerCase(),
        name: formName.trim(),
        email: formEmail.trim(),
        department: formDept.trim(),
        role: formRole,
        joining_date: formJoiningDate,
        monthly_salary: salaryVal,
        status: formStatus,
        casual_leave_quota: cQuotaVal,
        sick_leave_quota: sQuotaVal,
        password: formPassword.trim() || editingUser.password || 'password123'
      });
      if (res.success) {
        setFormSuccess(`${formRole === 'admin' ? 'Administrator' : 'Employee'} updated successfully.`);
        setTimeout(() => setIsModalOpen(false), 900);
      } else {
        setFormError(res.message);
      }
    } else {
      const res = addEmployee({
        employee_id: formEmpId.trim(),
        name: formName.trim(),
        email: formEmail.trim(),
        username: formUsername.trim().toLowerCase(),
        password: formPassword.trim() || 'password123',
        department: formDept.trim(),
        role: formRole,
        joining_date: formJoiningDate,
        monthly_salary: salaryVal,
        status: formStatus,
        casual_leave_quota: cQuotaVal,
        sick_leave_quota: sQuotaVal
      });
      if (res.success) {
        setFormSuccess(`${formRole === 'admin' ? 'Administrator' : 'Employee'} added successfully with leave quotas configured.`);
        setTimeout(() => setIsModalOpen(false), 900);
      } else {
        setFormError(res.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            Employee Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure employee profiles, monthly base salary rates, and security roles
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, email, username..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Department:</span>
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback banner for delete */}
      {deleteFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            deleteFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {deleteFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{deleteFeedback.message}</span>
          </div>
          <button
            onClick={() => setDeleteFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Employee Details</th>
                <th className="py-3 px-4">ID &amp; Username</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4">Configured Salary</th>
                <th className="py-3 px-4">Leave Balances (CL / SL)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => {
                const bal = getEmployeeLeaveBalance(u.id);
                const clRemaining = Math.max(0, bal.casual_leave_total - bal.casual_leave_used);
                const slRemaining = Math.max(0, bal.sick_leave_total - bal.sick_leave_used);

                return (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-[11px] text-slate-400">{u.email}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="font-bold text-slate-800 block">{u.employee_id}</span>
                    <span className="text-[11px] text-slate-400">@{u.username}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5" title="Login password configured">
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{u.password ? '••••••••' : 'Default password'}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {u.department}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {u.joining_date}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {formatCurrency(u.monthly_salary)}
                    <span className="text-[10px] text-slate-400 font-normal block">/month</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="flex flex-col gap-1 text-[11px]">
                      <span className="text-indigo-800 font-medium">
                        CL: <strong className="text-indigo-950 font-bold">{clRemaining}</strong>/{bal.casual_leave_total} left
                      </span>
                      <span className="text-emerald-800 font-medium">
                        SL: <strong className="text-emerald-950 font-bold">{slRemaining}</strong>/{bal.sick_leave_total} left
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                      title="Edit Employee"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleEmployeeStatus(u.id)}
                      className={`p-1.5 rounded transition-colors ${
                        u.status === 'active'
                          ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                          : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                      }`}
                      title={u.status === 'active' ? 'Deactivate Access' : 'Activate Access'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setUserToDelete(u)}
                      className="p-1.5 rounded transition-colors text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      title="Delete Employee"
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

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900 text-base">
                {editingUser
                  ? `Edit ${editingUser.role === 'admin' ? 'Administrator' : 'Employee'}: ${editingUser.name}`
                  : `Add New ${formRole === 'admin' ? 'Administrator' : 'Employee'}`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    value={formEmpId}
                    onChange={e => setFormEmpId(e.target.value)}
                    placeholder="e.g. ZT-EMP-001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Editable unique company ID</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="e.g. meena"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Editable login handle</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Meena Sundaram"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      Login Password *
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {editingUser ? 'Click eye to view' : 'Admin sets for user'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      placeholder="e.g. Meena@123 or password123"
                      className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(prev => !prev)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title={showFormPassword ? 'Hide password' : 'Show password'}
                      aria-label={showFormPassword ? 'Hide password' : 'Show password'}
                    >
                      {showFormPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={e => setFormDept(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Monthly Salary (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formSalary}
                    onChange={e => setFormSalary(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    value={formJoiningDate}
                    onChange={e => setFormJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              {/* Item 1: Editable Casual & Sick Leave Quotas */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 block">Annual Leave Quotas (Editable)</span>
                  <span className="text-[10px] text-slate-500 font-medium">Default: 10 CL &amp; 10 SL</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-900 mb-1">
                      Casual Leave (CL) Quota *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formCasualQuota}
                      onChange={e => setFormCasualQuota(e.target.value)}
                      className="w-full px-3 py-1.5 border border-indigo-200 bg-white rounded-lg font-mono font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Allocated casual leave days</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                      Sick Leave (SL) Quota *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formSickQuota}
                      onChange={e => setFormSickQuota(e.target.value)}
                      className="w-full px-3 py-1.5 border border-emerald-200 bg-white rounded-lg font-mono font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Allocated sick leave days</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
                  {editingUser ? 'Save Changes' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-slate-900 text-center">
                Delete Employee Account?
              </h3>

              <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900">{userToDelete.name}</strong> (
                <span className="font-mono font-semibold">{userToDelete.employee_id}</span>)?
              </p>

              <div className="my-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
                <span className="font-bold block">Important Notice:</span>
                <span>
                  This action will permanently delete the employee from active department rosters and organization payroll records.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="w-full py-2.5 px-4 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
