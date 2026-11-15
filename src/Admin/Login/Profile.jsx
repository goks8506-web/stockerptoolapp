import React, { useState, useEffect } from 'react';
import { AdminOnlyRoute } from '../../ProtectedRoute';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

function ProfileContent() {
  const username = localStorage.getItem('username');
  const userType = localStorage.getItem('userType') || 'Unknown';

  // ── Create User State ──
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newType, setNewType] = useState('worker');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // ── Change Password State ──
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(username); // default to self
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  // Show/hide password toggles
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Fetch all users if admin
  useEffect(() => {
    if (userType === 'admin') {
      const fetchUsers = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/users`);
          if (!res.ok) throw new Error('Failed to fetch users');
          const data = await res.json();
          setAllUsers(data);
        } catch (err) {
          console.error('Error fetching users:', err);
        }
      };
      fetchUsers();
    }
  }, [userType]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreateLoading(true);

    if (!newUsername.trim() || !newPassword.trim()) {
      setCreateError('Username and password are required');
      setCreateLoading(false);
      return;
    }
    if (newPassword.length < 6) {
      setCreateError('Password must be at least 6 characters');
      setCreateLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          type: newType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setCreateSuccess(`User "${newUsername}" created as ${newType.toUpperCase()}!`);
      setNewUsername('');
      setNewPassword('');
      setNewType('worker');

      // Refresh user list if admin
      if (userType === 'admin') {
        const resUsers = await fetch(`${API_BASE_URL}/api/users`);
        if (resUsers.ok) {
          const updatedUsers = await resUsers.json();
          setAllUsers(updatedUsers);
        }
      }
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangeError('');
    setChangeSuccess('');
    setChangeLoading(true);

    if (!selectedUser || !newPass || !confirmNewPass) {
      setChangeError('All fields are required');
      setChangeLoading(false);
      return;
    }

    if (newPass.length < 6) {
      setChangeError('New password must be at least 6 characters');
      setChangeLoading(false);
      return;
    }

    if (newPass !== confirmNewPass) {
      setChangeError('New passwords do not match');
      setChangeLoading(false);
      return;
    }

    try {
      const payload = {
        username: selectedUser,
        newPassword: newPass,
      };

      const res = await fetch(`${API_BASE_URL}/api/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setChangeSuccess('Password changed successfully!');
      setNewPass('');
      setConfirmNewPass('');
      setTimeout(() => setShowChangePasswordModal(false), 1800);
    } catch (err) {
      setChangeError(err.message);
    } finally {
      setChangeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8">
      <Sidebar />
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="pl-12 hundred:pl-0">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              User Profile & Accounts
            </h1>
            <p className="text-xs text-slate-400 mt-1">Manage user access credentials and security settings</p>
          </div>
          <Logout />
        </div>

        {/* Profile Card */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-500/20">
            {(username || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="text-2xl font-extrabold text-white">{username}</h2>
              <span className="self-center sm:self-auto px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {userType}
              </span>
            </div>
            <p className="text-xs text-slate-400">Authenticated System User • Access Tier: Full System Privileges</p>
          </div>
          <div>
            <button
              onClick={() => {
                setShowChangePasswordModal(true);
                setChangeError('');
                setChangeSuccess('');
                setNewPass('');
                setConfirmNewPass('');
                setSelectedUser(username);
                setShowNewPass(false);
                setShowConfirmPass(false);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Create New User – Admin Only */}
        {userType === 'admin' && (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl space-y-5">
            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Create New System User
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Provision logins for Workers, Agents, or Administrators</p>
            </div>

            {createError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-semibold">
                {createError}
              </div>
            )}
            {createSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-semibold">
                {createSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Username *
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Password *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Role
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="worker">Worker</option>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="md:col-span-3 pt-2">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl disabled:opacity-40 shadow-lg shadow-emerald-600/20 transition"
                >
                  {createLoading ? 'Creating User...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 max-w-md w-full shadow-2xl text-slate-100">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800">
              <h3 className="text-xl font-extrabold text-white">
                Change Password
              </h3>
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            {changeError && (
              <div className="mb-4 p-3.5 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-semibold border border-rose-500/20">
                {changeError}
              </div>
            )}
            {changeSuccess && (
              <div className="mb-4 p-3.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-semibold border border-emerald-500/20">
                {changeSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* User selection – only for admin */}
              {userType === 'admin' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Select User
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {allUsers.map(u => (
                      <option key={u.username} value={u.username}>
                        {u.username} ({u.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* New Password with eye icon */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  New Password
                </label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 pr-10"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-8 text-slate-500 hover:text-slate-300"
                >
                  {showNewPass ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>

              {/* Confirm Password with eye icon */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmNewPass}
                  onChange={(e) => setConfirmNewPass(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-8 text-slate-500 hover:text-slate-300"
                >
                  {showConfirmPass ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changeLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 text-white rounded-xl disabled:opacity-40 transition text-xs font-bold shadow-lg shadow-indigo-600/20"
                >
                  {changeLoading ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Keep AdminOnlyRoute protection
export default function Profile() {
  return <ProfileContent />;
}