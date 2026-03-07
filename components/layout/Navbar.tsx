"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Mail, ScrollText, LogOut, ChevronDown, KeyRound, UserPlus, Settings, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useState, useRef, useEffect } from "react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/ekv", label: "EKV", icon: FileText },
  { href: "/dashboard/ekv/audit", label: "Audit", icon: AlertTriangle },
  { href: "/dashboard/letter", label: "Letter", icon: Mail },
  { href: "/dashboard/logs", label: "Logs", icon: ScrollText },
  { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
];

export default function Navbar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [cuError, setCuError] = useState("");
  const [cuSuccess, setCuSuccess] = useState("");
  const [cuLoading, setCuLoading] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    setPwLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      setPwError(error.message);
    } else {
      setPwSuccess("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  function closeModal() {
    setShowPasswordModal(false);
    setPwError("");
    setPwSuccess("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCuError("");
    setCuSuccess("");
    setCuLoading(true);
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newUserEmail, password: newUserPassword }),
    });
    const json = await res.json();
    setCuLoading(false);
    if (!res.ok) {
      setCuError(json.error ?? "Failed to create user.");
    } else {
      setCuSuccess(`User ${newUserEmail} created successfully.`);
      setNewUserEmail("");
      setNewUserPassword("");
    }
  }

  function closeCreateUserModal() {
    setShowCreateUserModal(false);
    setCuError("");
    setCuSuccess("");
    setNewUserEmail("");
    setNewUserPassword("");
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <>
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-8 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 mr-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">AZ</span>
        </div>
        <div className="leading-none">
          <p className="text-sm font-semibold text-gray-900">Application Status Audits</p>
          <p className="text-[10px] text-gray-400">Carebox Dashboard</p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200" />

      {/* Nav Links */}
      <nav className="flex items-center gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          suppressHydrationWarning
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
            {initials}
          </div>
          <span className="max-w-[160px] truncate text-sm font-medium">{user.email}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-400">Signed in as</p>
              <p className="text-sm font-medium text-gray-800 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { setDropdownOpen(false); setShowCreateUserModal(true); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              suppressHydrationWarning
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </button>
            <button
              onClick={() => { setDropdownOpen(false); setShowPasswordModal(true); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              suppressHydrationWarning
            >
              <KeyRound className="w-4 h-4" />
              Change Password
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              suppressHydrationWarning
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>

    {showPasswordModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                suppressHydrationWarning
              />
            </div>
            {pwError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{pwError}</p>}
            {pwSuccess && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{pwSuccess}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={pwLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {pwLoading ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {showCreateUserModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h2>
          <form onSubmit={handleCreateUser} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                suppressHydrationWarning
              />
            </div>
            {cuError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{cuError}</p>}
            {cuSuccess && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{cuSuccess}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={cuLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {cuLoading ? "Creating..." : "Create User"}
              </button>
              <button
                type="button"
                onClick={closeCreateUserModal}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
