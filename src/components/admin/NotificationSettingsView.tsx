import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NotificationContact } from '../../types';
import {
  Bell,
  Mail,
  Phone,
  Plus,
  Trash2,
  Edit2,
  X,
  CheckCircle,
  AlertCircle,
  Shield,
  Send,
  MessageSquare,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export const NotificationSettingsView: React.FC = () => {
  const {
    notificationSettings,
    updateNotificationSettings,
    updateNotificationContact,
    addNotificationContact,
    deleteNotificationContact,
    currentUser,
    users
  } = useApp();

  const [contactType, setContactType] = useState<'email' | 'mobile'>('email');
  const [contactName, setContactName] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [contactDept, setContactDept] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit contact state
  const [editingContact, setEditingContact] = useState<NotificationContact | null>(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editDept, setEditDept] = useState('');

  // Test notification modal/trigger
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmployee, setTestEmployee] = useState('');
  const [testRequestType, setTestRequestType] = useState<'leave' | 'permission' | 'wfh' | 'half_day'>('leave');

  const handleStartEdit = (contact: NotificationContact) => {
    setEditingContact(contact);
    setEditName(contact.name);
    setEditValue(contact.value);
    setEditDept(contact.department || '');
  };

  const handleSaveContactEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;

    if (!editName.trim() || !editValue.trim()) {
      setFeedback({ type: 'error', message: 'Please provide both contact name and value.' });
      return;
    }

    if (editingContact.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editValue.trim())) {
        setFeedback({ type: 'error', message: 'Please enter a valid email address.' });
        return;
      }
    } else {
      const cleanMob = editValue.replace(/[\s-]/g, '');
      if (cleanMob.length < 7) {
        setFeedback({ type: 'error', message: 'Please enter a valid phone/mobile number.' });
        return;
      }
    }

    const res = updateNotificationContact(editingContact.id, {
      name: editName.trim(),
      value: editValue.trim(),
      department: editDept.trim() || undefined
    });

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setEditingContact(null);
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!contactName.trim() || !contactValue.trim()) {
      setFeedback({ type: 'error', message: 'Please provide both contact name and email / mobile number.' });
      return;
    }

    if (contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactValue.trim())) {
        setFeedback({ type: 'error', message: 'Please enter a valid email address (e.g. subburaj@zealluxe.com).' });
        return;
      }
    } else {
      const cleanMob = contactValue.replace(/[\s-]/g, '');
      if (cleanMob.length < 7) {
        setFeedback({ type: 'error', message: 'Please enter a valid phone/mobile number (e.g. +91 98400 12345).' });
        return;
      }
    }

    const res = addNotificationContact({
      type: contactType,
      name: contactName.trim(),
      value: contactValue.trim(),
      department: contactDept.trim() || undefined
    });

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setContactName('');
      setContactValue('');
      setContactDept('');
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleDelete = (id: string, name: string) => {
    const res = deleteNotificationContact(id);
    if (res.success) {
      setFeedback({ type: 'success', message: `Removed ${name} from notification dispatch list.` });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleTogglePreference = (key: keyof typeof notificationSettings) => {
    const updated = {
      ...notificationSettings,
      [key]: !notificationSettings[key]
    };
    updateNotificationSettings(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
            Executive Dispatch System
          </span>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-0.5">
            <Bell className="w-5 h-5 text-indigo-600" />
            Notification &amp; Alert Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage higher management recipient email addresses and WhatsApp hotline mobile numbers
          </p>
        </div>

        <button
          onClick={() => setTestModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors shadow-xs"
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          Preview Live Dispatch Alert
        </button>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add New Recipient Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Plus className="w-4 h-4 text-slate-600" />
          Add Higher Management Recipient (Email / WhatsApp Mobile)
        </h3>

        <form onSubmit={handleAddContact} className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Contact Channel *
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setContactType('email')}
                className={`py-1 text-center font-bold rounded-md transition-colors ${
                  contactType === 'email'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setContactType('mobile')}
                className={`py-1 text-center font-bold rounded-md transition-colors ${
                  contactType === 'mobile'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                WhatsApp Mobile
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Recipient Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Subburaj, Karthik..."
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {contactType === 'email' ? 'Email Address *' : 'WhatsApp Phone Number *'}
            </label>
            <input
              type={contactType === 'email' ? 'email' : 'tel'}
              placeholder={contactType === 'email' ? 'e.g. subburaj@zealluxe.com' : '+91 98400 12345'}
              value={contactValue}
              onChange={e => setContactValue(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Role / Department (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Management, HR, Ops"
              value={contactDept}
              onChange={e => setContactDept(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Save Recipient
            </button>
          </div>
        </form>
      </div>

      {/* Two Column Layout: Management Emails and WhatsApp Mobile Numbers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Recipients Box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Management Email Recipients ({notificationSettings.emails.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Leave &amp; exception alerts sent from employee's email to this list
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Active List
            </span>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[380px]">
            {notificationSettings.emails.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No higher management email recipients configured yet.
              </div>
            ) : (
              notificationSettings.emails.map(contact => (
                <div
                  key={contact.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{contact.name}</span>
                      {contact.department && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {contact.department}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-indigo-700 flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{contact.value}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEdit(contact)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Recipient Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id, contact.name)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove Recipient Email"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* WhatsApp Mobile Recipients Box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  WhatsApp Admin Numbers ({notificationSettings.mobiles.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Instant WhatsApp notifications received when employee submits request
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active List
            </span>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[380px]">
            {notificationSettings.mobiles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No admin WhatsApp mobile numbers configured yet.
              </div>
            ) : (
              notificationSettings.mobiles.map(contact => (
                <div
                  key={contact.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{contact.name}</span>
                      {contact.department && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {contact.department}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-emerald-700 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{contact.value}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEdit(contact)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Recipient Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id, contact.name)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove Mobile Number"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Automated Dispatch Trigger Rules (Item 2, 3, 4, 5 settings) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Automatic Dispatch Rules &amp; Reminders
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Enable or adjust automated email dispatches, WhatsApp alerts, and shift logoff reminders
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Rule 1: Auto Email on Leave Submission */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 block">
                Item 2: Automatic Leave Notification Email
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                When an employee (e.g. Meena) submits a leave, an official email notification is automatically triggered to all higher management addresses (e.g. Subburaj, Karthik).
              </p>
            </div>
            <button
              onClick={() => handleTogglePreference('auto_notify_leave')}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                notificationSettings.auto_notify_leave ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white block transition-transform absolute top-1 ${
                  notificationSettings.auto_notify_leave ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Rule 2: WhatsApp on Permission / WFH / Halfday */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 block">
                Item 3: WhatsApp Alert to Admin Mobile (Zero-Cost)
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Receive instant 1-click WhatsApp alerts on the admin mobile number whenever an employee submits a Leave, WFH, Permission, or Half-day in the portal at zero subscription cost.
              </p>
            </div>
            <button
              onClick={() => handleTogglePreference('auto_notify_permission')}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                notificationSettings.auto_notify_permission ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white block transition-transform absolute top-1 ${
                  notificationSettings.auto_notify_permission ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Live Alert Preview Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Live Notification Dispatch Simulation
              </h3>
              <button
                onClick={() => setTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Simulate Employee:</label>
                <select
                  value={testEmployee || (users.filter(u => u.role === 'employee')[0] ? `${users.filter(u => u.role === 'employee')[0].name} (${users.filter(u => u.role === 'employee')[0].email})` : 'Meena (meena@zealluxe.com)')}
                  onChange={e => setTestEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {users.filter(u => u.role === 'employee').length > 0 ? (
                    users.filter(u => u.role === 'employee').map(emp => (
                      <option key={emp.id} value={`${emp.name} (${emp.email})`}>
                        {emp.name} ({emp.email}) &bull; {emp.department}
                      </option>
                    ))
                  ) : (
                    <option value="Meena (meena@zealluxe.com)">Meena (meena@zealluxe.com)</option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Submitted Request Type:</label>
                <select
                  value={testRequestType}
                  onChange={e => setTestRequestType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="leave">Casual / Sick Leave</option>
                  <option value="permission">Permission (2 hours)</option>
                  <option value="wfh">Work From Home (WFH)</option>
                  <option value="half_day">Half Day Shift</option>
                </select>
              </div>

              {/* Email preview */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-indigo-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Automated Email Packet (Item #2)
                  </span>
                  <span className="text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded">
                    To {notificationSettings.emails.length} higher management IDs
                  </span>
                </div>
                <div className="text-[11px] text-slate-700 font-mono bg-white p-2.5 rounded-lg border border-indigo-100 space-y-1">
                  <div><strong>From:</strong> {testEmployee.split('(')[1].replace(')', '')}</div>
                  <div><strong>To:</strong> {notificationSettings.emails.map(e => e.value).join(', ') || 'No emails configured'}</div>
                  <div><strong>Subject:</strong> [Z&amp;T Portal] Attendance Request: {testRequestType.toUpperCase()} - {testEmployee.split('(')[0].trim()}</div>
                  <div className="pt-1 text-slate-600 text-[10px]">
                    "Employee {testEmployee.split('(')[0].trim()} has submitted a {testRequestType} request for approval. Please review in the admin dashboard."
                  </div>
                </div>
              </div>

              {/* WhatsApp preview */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-emerald-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Quick WhatsApp Alert (Item #3)
                  </span>
                  <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded">
                    To {notificationSettings.mobiles.length} admin numbers
                  </span>
                </div>
                <div className="text-[11px] text-slate-700 font-mono bg-white p-2.5 rounded-lg border border-emerald-100 space-y-1">
                  <div><strong>Recipient Number:</strong> {notificationSettings.mobiles.map(m => m.value).join(', ') || 'No numbers configured'}</div>
                  <div className="pt-1 text-slate-600 text-[10px]">
                    🔔 *Z&amp;T HR Alert*: Employee *{testEmployee.split('(')[0].trim()}* has submitted a *{testRequestType.toUpperCase()}* request in the portal. View details: https://ais-dev-5thr2fbeig3tqmqckz7hh4-141476588003.asia-southeast1.run.app
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Recipient Modal */}
      {editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                {editingContact.type === 'email' ? (
                  <Mail className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Phone className="w-4 h-4 text-emerald-600" />
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Edit {editingContact.type === 'email' ? 'Email Recipient' : 'WhatsApp Admin Number'}
                  </h3>
                  <span className="text-[10px] text-slate-500">Live sync to Cloud Firestore database</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContactEdit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. Subburaj, Admin Hotline"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {editingContact.type === 'email' ? 'Email Address *' : 'WhatsApp Phone Number *'}
                </label>
                <input
                  type={editingContact.type === 'email' ? 'email' : 'tel'}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder={editingContact.type === 'email' ? 'e.g. subburaj@zealluxe.com' : '+91 98400 12345'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Role / Department (Optional)
                </label>
                <input
                  type="text"
                  value={editDept}
                  onChange={e => setEditDept(e.target.value)}
                  placeholder="e.g. Executive Management, HR, Operations"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs"
                >
                  Save &amp; Update Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
