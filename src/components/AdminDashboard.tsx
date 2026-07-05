import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LogIn, ArrowLeft, Search, Filter, Calendar, Download, Printer, Edit2, Trash2, Mail, Users, TrendingUp, BarChart2, Check, X, Shield, RefreshCw, Eye, Award } from 'lucide-react';
import { Registration, DashboardStats } from '../types';

interface AdminDashboardProps {
  csrfToken: string;
  onBackToForm: () => void;
}

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
}

export default function AdminDashboard({ csrfToken, onBackToForm }: AdminDashboardProps) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard Data
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [activeTab, setActiveTab] = useState<'records' | 'emails'>('records');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit State
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [editForm, setEditForm] = useState<Partial<Registration>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // View Details Modal
  const [viewingReg, setViewingReg] = useState<Registration | null>(null);

  // Load Data if authorized
  const loadDashboardData = async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      // 1. Fetch Registrations
      const regRes = await fetch(`/api/admin/registrations?search=${encodeURIComponent(searchQuery)}&date=${dateFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (regRes.status === 401) {
        handleLogout();
        return;
      }
      const regData = await regRes.json();
      setRegistrations(regData);

      // 2. Fetch Stats
      const statsRes = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const statsData = await statsRes.json();
      setStats(statsData);

      // 3. Fetch Email Logs
      const emailRes = await fetch('/api/admin/email-logs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const emailData = await emailRes.json();
      setEmailLogs(emailData);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token, searchQuery, dateFilter]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
    } catch (err: any) {
      setLoginError(err.message || 'Server connection failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setRegistrations([]);
    setStats(null);
  };

  // Handle Delete Record
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this candidate record? This is irreversible.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Refresh data
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record.');
    }
  };

  // Start Editing
  const startEdit = (reg: Registration) => {
    setEditingReg(reg);
    setEditForm({ ...reg });
    setEditError(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg) return;
    setEditError(null);
    setIsSavingEdit(true);

    try {
      const res = await fetch(`/api/admin/registrations/${editingReg.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEditingReg(null);
      loadDashboardData();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update record.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    if (registrations.length === 0) return;
    
    const headers = ['ID', 'Full Name', 'Email', 'Phone Number', 'Gender', 'DOB', 'Residential Address', 'State of Origin', 'Occupation', 'Education', 'Skills', 'Registered At'];
    
    const rows = registrations.map(r => [
      r.id,
      `"${r.fullName.replace(/"/g, '""')}"`,
      r.email,
      r.phoneNumber,
      r.gender,
      r.dob,
      `"${r.address.replace(/"/g, '""')}"`,
      r.stateOfOrigin,
      `"${r.occupation.replace(/"/g, '""')}"`,
      r.education || '',
      `"${(r.skills || '').replace(/"/g, '""')}"`,
      r.createdAt
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `registrations_export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print Friendly stylesheet view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="admin_dashboard_wrapper" className="w-full max-w-6xl mx-auto print:max-w-full">
      
      {/* 1. AUTHENTICATION VIEW */}
      {!token ? (
        <div className="w-full max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200/85 p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-3 border border-emerald-100">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-sans font-bold text-slate-900">Administrative Login</h2>
            <p className="text-xs text-slate-400 mt-1">Authorized database administration access only</p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs font-semibold mb-4 text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin_user" className="block text-xs font-medium text-slate-700 mb-1.5">Username</label>
              <input
                type="text"
                id="admin_user"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div>
              <label htmlFor="admin_pass" className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                id="admin_pass"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Access Dashboard</span>
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={onBackToForm}
            className="w-full mt-4 flex items-center justify-center space-x-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Registration Desk</span>
          </button>
        </div>
      ) : (
        
        /* 2. ADMIN DASHBOARD FULL VIEW */
        <div className="space-y-6">
          
          {/* Top Panel Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 print:hidden pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <h1 className="text-2xl font-sans font-bold text-slate-900 tracking-tight">Admin Control Panel</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Database integrity monitor and statistics log</p>
            </div>

            <div className="flex items-center space-x-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onBackToForm}
                className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-3.5 py-2 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Form Desk</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center space-x-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-100 px-3.5 py-2 rounded-lg hover:bg-red-100/50 transition-all cursor-pointer"
              >
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* KPI Statistics Section */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
              {/* Total Registrations */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium block">Total Registrations</span>
                  <span className="text-xl sm:text-2xl font-sans font-bold text-slate-900">{stats.total}</span>
                </div>
              </div>

              {/* Registrations Today */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium block">Registered Today</span>
                  <span className="text-xl sm:text-2xl font-sans font-bold text-slate-900">{stats.today}</span>
                </div>
              </div>

              {/* This Week */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium block">Registered This Week</span>
                  <span className="text-xl sm:text-2xl font-sans font-bold text-slate-900">{stats.thisWeek}</span>
                </div>
              </div>

              {/* This Month */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium block">Registered This Month</span>
                  <span className="text-xl sm:text-2xl font-sans font-bold text-slate-900">{stats.thisMonth}</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Workspace Navigation (Tabs) */}
          <div className="flex border-b border-slate-200 print:hidden">
            <button
              onClick={() => setActiveTab('records')}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'records'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Candidate Records ({registrations.length})
            </button>
            <button
              onClick={() => setActiveTab('emails')}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'emails'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Email Outbox Logs ({emailLogs.length})
            </button>
          </div>

          {/* TAB 1: REGISTRATION RECORDS */}
          {activeTab === 'records' && (
            <div className="space-y-4">
              
              {/* Table search, filter and action tools */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white border border-slate-200/80 p-4 rounded-xl print:hidden">
                <div className="flex flex-col sm:flex-row gap-3 flex-1 items-stretch">
                  {/* Search bar */}
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search name, email, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  {/* Date Filter */}
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400">
                      <Filter className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-800 bg-white focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                    />
                    {dateFilter && (
                      <button
                        onClick={() => setDateFilter('')}
                        className="absolute right-3.5 text-xs text-slate-400 hover:text-slate-700 font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Print/Export buttons */}
                <div className="flex gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={loadDashboardData}
                    disabled={isRefreshing}
                    className="flex items-center space-x-1 border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={registrations.length === 0}
                    className="flex items-center space-x-1 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={registrations.length === 0}
                    className="flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Records</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider print:bg-white print:text-black">
                        <th className="px-5 py-3.5 print:px-2">Candidate</th>
                        <th className="px-5 py-3.5 hidden sm:table-cell print:table-cell print:px-2">Contact Details</th>
                        <th className="px-5 py-3.5 hidden md:table-cell print:table-cell print:px-2">Profile Details</th>
                        <th className="px-5 py-3.5 hidden lg:table-cell print:table-cell print:px-2">Qualifications</th>
                        <th className="px-5 py-3.5 text-right print:hidden">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {registrations.length > 0 ? (
                        registrations.map((reg) => (
                          <tr key={reg.id} className="hover:bg-slate-50/40 transition-all print:hover:bg-white">
                            {/* Candidate Bio */}
                            <td className="px-5 py-3.5 print:px-2">
                              <div className="flex items-center space-x-3">
                                {reg.passportPhoto ? (
                                  <img
                                    src={reg.passportPhoto}
                                    alt="Passport"
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-2xs print:w-8 print:h-8"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold print:hidden">
                                    N/A
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-slate-900 print:text-black">{reg.fullName}</p>
                                  <p className="text-xs text-slate-400 font-mono mt-0.5">{reg.id}</p>
                                </div>
                              </div>
                            </td>

                            {/* Contact Details */}
                            <td className="px-5 py-3.5 hidden sm:table-cell print:table-cell print:px-2">
                              <div className="space-y-1 text-xs">
                                <p className="font-mono text-slate-800 print:text-black">{reg.email}</p>
                                <p className="text-slate-500 font-medium">{reg.phoneNumber}</p>
                              </div>
                            </td>

                            {/* Profile details */}
                            <td className="px-5 py-3.5 hidden md:table-cell print:table-cell print:px-2">
                              <div className="space-y-1 text-xs">
                                <p className="font-medium text-slate-800 print:text-black capitalize">Gender: {reg.gender}</p>
                                <p className="text-slate-500">Origin: {reg.stateOfOrigin}</p>
                              </div>
                            </td>

                            {/* Qualifications */}
                            <td className="px-5 py-3.5 hidden lg:table-cell print:table-cell print:px-2">
                              <div className="space-y-1 text-xs max-w-xs truncate">
                                <p className="font-medium text-slate-800 print:text-black">{reg.occupation}</p>
                                <p className="text-slate-500 truncate">{reg.education || 'No tertiary education'}</p>
                              </div>
                            </td>

                            {/* Actions column */}
                            <td className="px-5 py-3.5 text-right print:hidden">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingReg(reg)}
                                  className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startEdit(reg)}
                                  className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                                  title="Edit Entry"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(reg.id)}
                                  className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                            No candidate registration entries found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL LOGS */}
          {activeTab === 'emails' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200/80 p-4 rounded-xl print:hidden text-xs text-slate-400 leading-relaxed">
                ℹ️ The mail logs below track visual confirmation emails generated in real-time by our registration routing triggers. Outbound emails are printed here for visual candidate slip checks.
              </div>

              <div className="space-y-4 print:hidden">
                {emailLogs.length > 0 ? (
                  emailLogs.map((log) => (
                    <div key={log.id} className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3.5 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs pb-2 border-b border-slate-100">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">TO: {log.recipient}</p>
                          <p className="text-slate-400 font-medium">Log ID: {log.id}</p>
                        </div>
                        <span className="text-slate-400 mt-1.5 sm:mt-0 font-mono">{new Date(log.sentAt).toLocaleString()}</span>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold text-slate-800">Subject: {log.subject}</p>
                        <pre className="p-3.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {log.body}
                        </pre>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
                    No emails have been sent yet. Fill out the registration form to trigger logs.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EDIT RECORD MODAL DIALOG */}
          {editingReg && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-semibold text-slate-950 text-base">Edit Candidate Entry</h3>
                  <button onClick={() => setEditingReg(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-4 flex-1">
                  {editError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs font-medium">
                      {editError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        required
                        value={editForm.fullName || ''}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={editForm.email || ''}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                      <input
                        type="text"
                        name="phoneNumber"
                        required
                        value={editForm.phoneNumber || ''}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                      <select
                        name="gender"
                        required
                        value={editForm.gender || ''}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
                      <input
                        type="date"
                        name="dob"
                        required
                        value={editForm.dob || ''}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">State of Origin *</label>
                      <input
                        type="text"
                        name="stateOfOrigin"
                        required
                        value={editForm.stateOfOrigin || ''}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Occupation *</label>
                      <input
                        type="text"
                        name="occupation"
                        required
                        value={editForm.occupation || ''}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address *</label>
                      <textarea
                        name="address"
                        required
                        rows={2}
                        value={editForm.address || ''}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Skills</label>
                      <input
                        type="text"
                        name="skills"
                        value={editForm.skills || ''}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-400 leading-relaxed font-mono">
                    ⚠️ Safe edits check unique constraint structures automatically before writing back to db index memory.
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingReg(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold"
                    >
                      {isSavingEdit ? 'Saving Changes...' : 'Save Database Record'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VIEW CANDIDATE PROFILE MODAL */}
          {viewingReg && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-semibold text-slate-950 text-base">Candidate Details Slip</h3>
                  <button onClick={() => setViewingReg(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 text-sm text-slate-700">
                  <div className="flex items-center space-x-4">
                    {viewingReg.passportPhoto ? (
                      <img
                        src={viewingReg.passportPhoto}
                        alt="Passport"
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center text-xs">
                        No Photo
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{viewingReg.fullName}</h4>
                      <p className="font-mono text-xs text-slate-400">Reg ID: {viewingReg.id}</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 border-t border-b border-slate-100 py-4 text-xs">
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400">Email Address:</span>
                      <span className="col-span-2 font-mono text-slate-950 font-medium break-all">{viewingReg.email}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400">Phone Number:</span>
                      <span className="col-span-2 font-medium text-slate-900">{viewingReg.phoneNumber}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400">Date of Birth:</span>
                      <span className="col-span-2 font-medium text-slate-900">{viewingReg.dob}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400">Gender:</span>
                      <span className="col-span-2 font-medium text-slate-900 capitalize">{viewingReg.gender}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400">State of Origin:</span>
                      <span className="col-span-2 font-medium text-slate-900">{viewingReg.stateOfOrigin}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400">Occupation:</span>
                      <span className="col-span-2 font-medium text-slate-900">{viewingReg.occupation}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400">Highest Degree:</span>
                      <span className="col-span-2 font-medium text-slate-900">{viewingReg.education || 'N/A'}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400">Skills Certs:</span>
                      <span className="col-span-2 font-medium text-slate-900">{viewingReg.skills || 'N/A'}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400">Home Address:</span>
                      <span className="col-span-2 font-medium text-slate-900 leading-relaxed">{viewingReg.address}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>Registered on:</span>
                    <span>{new Date(viewingReg.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setViewingReg(null)}
                      className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all"
                    >
                      Close Slip
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
