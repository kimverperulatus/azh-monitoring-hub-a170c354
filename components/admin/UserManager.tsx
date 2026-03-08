"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

type User = { id: string; email: string; created_at: string; role: string };

const ROLES = ["admin", "support", "scanner", "custom"];

const ROLE_STYLES: Record<string, string> = {
  admin:   "bg-brand-red-100 text-brand-red-800",
  support: "bg-blue-100 text-blue-700",
  scanner: "bg-purple-100 text-purple-700",
  custom:  "bg-amber-100 text-amber-700",
};

export default function UserManager({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Create user form state
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("support");
  const [showPw, setShowPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  async function handleRoleChange(userId: string, role: string) {
    setUpdatingId(userId);
    setError("");
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setUpdatingId(null);
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
    } else {
      const json = await res.json();
      setError(json.error ?? "Failed to update role.");
    }
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    setDeletingId(userId);
    setError("");
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } else {
      const json = await res.json();
      setError(json.error ?? "Failed to delete user.");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    setCreateSuccess("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      setCreateError(json.error ?? "Failed to create user.");
    } else {
      setCreateSuccess(`User ${newEmail} created.`);
      setUsers((prev) => [...prev, json.user]);
      setNewEmail("");
      setNewPassword("");
      setNewRole("support");
    }
  }

  return (
    <div className="space-y-4">
      {/* Create User Button */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm((v) => !v); setCreateError(""); setCreateSuccess(""); }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-brand-red-800 hover:bg-brand-red-700 rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {showForm ? "Cancel" : "Create User"}
        </button>
      </div>

      {/* Create User Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">New User</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-navy-800 hover:bg-brand-navy-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {creating ? "Creating…" : "Create"}
            </button>
          </form>
          {createError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg mt-2">{createError}</p>}
          {createSuccess && <p className="text-xs text-green-600 bg-green-50 border border-green-100 px-3 py-2 rounded-lg mt-2">{createSuccess}</p>}
        </div>
      )}

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Created</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800">{user.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={updatingId === user.id}
                    className={`border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${ROLE_STYLES[user.role] ?? ""}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                  {updatingId === user.id && <RefreshCw className="inline ml-2 w-3 h-3 animate-spin text-gray-400" />}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                  {user.created_at ? format(new Date(user.created_at), "dd MMM yyyy") : "-"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(user.id, user.email)}
                    disabled={deletingId === user.id}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === user.id
                      ? <RefreshCw className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />}
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
