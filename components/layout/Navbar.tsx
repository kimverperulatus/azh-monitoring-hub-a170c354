"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Mail, ScrollText, LogOut, ChevronDown, KeyRound, UserPlus, Settings, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth/role";
import { useState, useRef, useEffect } from "react";

const allNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, adminOnly: false },
  { href: "/dashboard/ekv", label: "EKV", icon: FileText, adminOnly: false },
  { href: "/dashboard/letter", label: "Letter", icon: Mail, adminOnly: false },
  { href: "/dashboard/logs", label: "Logs", icon: ScrollText, adminOnly: true },
  { href: "/dashboard/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export default function Navbar({ user, role }: { user: User; role: UserRole }) {
  const navItems = allNavItems.filter((item) => !item.adminOnly || role === "admin");
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
  const [newUserRole, setNewUserRole] = useState<"admin" | "support">("support");
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
      body: JSON.stringify({ email: newUserEmail, password: newUserPassword, role: newUserRole }),
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
    setNewUserRole("support");
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const initials = user.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <>
    <header className="h-14 bg-brand-navy-800 border-b border-brand-navy-900 flex items-center px-4 md:px-6 gap-3 md:gap-8 shrink-0 shadow-lg">
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-brand-red-800 flex items-center justify-center shadow-sm">
          <span className="text-white text-xs font-bold tracking-tight">AZ</span>
        </div>
        <div className="leading-none hidden sm:block">
          <p className="text-sm font-semibold text-white tracking-tight">Application Status Audits</p>
          <p className="text-[10px] text-brand-navy-300">Carebox Dashboard</p>
        </div>
        <div className="leading-none sm:hidden">
          <p className="text-sm font-semibold text-white tracking-tight">AZH</p>
        </div>
      </div>

      {/* Divider — desktop only */}
      <div className="w-px h-5 bg-brand-navy-600 hidden md:block" />

      {/* Nav Links — desktop */}
      <nav className="hidden md:flex items-center gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-brand-red-800 text-white shadow-sm shadow-brand-red-950"
                  : "text-brand-navy-200 hover:bg-brand-navy-700 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Menu — desktop */}
      <div className="relative hidden md:block" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm hover:bg-brand-navy-700 transition-all duration-150"
          suppressHydrationWarning
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-gold-500 to-brand-gold-700 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
            {initials}
          </div>
          <span className="max-w-[140px] truncate text-sm font-medium text-brand-navy-100">{user.email}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-brand-navy-300 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Signed in as</p>
              <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{user.email}</p>
            </div>
            {role === "admin" && (
              <button
                onClick={() => { setDropdownOpen(false); setShowCreateUserModal(true); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-100 group"
                suppressHydrationWarning
              >
                <UserPlus className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                Create User
              </button>
            )}
            <button
              onClick={() => { setDropdownOpen(false); setShowPasswordModal(true); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-100 group"
              suppressHydrationWarning
            >
              <KeyRound className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              Change Password
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-brand-red-700 hover:bg-brand-red-50 hover:text-brand-red-800 transition-colors duration-100"
              suppressHydrationWarning
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Hamburger — mobile */}
      <button
        onClick={() => setMobileMenuOpen((o) => !o)}
        className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-brand-navy-200 hover:bg-brand-navy-700 transition-colors"
        suppressHydrationWarning
      >
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </header>

    {/* Mobile Menu */}
    {mobileMenuOpen && (
      <div className="md:hidden bg-brand-navy-900 border-b border-brand-navy-800 px-4 py-3 space-y-1 z-40 shadow-lg">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-red-800 text-white"
                  : "text-brand-navy-200 hover:bg-brand-navy-700 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
        <div className="border-t border-brand-navy-700 pt-2 mt-2 space-y-1">
          <div className="px-3 py-1.5">
            <p className="text-[10px] text-brand-navy-300 uppercase tracking-wider">Signed in as</p>
            <p className="text-xs font-medium text-white truncate mt-0.5">{user.email}</p>
          </div>
          {role === "admin" && (
            <button
              onClick={() => { setMobileMenuOpen(false); setShowCreateUserModal(true); }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-brand-navy-200 hover:bg-brand-navy-700 transition-colors"
              suppressHydrationWarning
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </button>
          )}
          <button
            onClick={() => { setMobileMenuOpen(false); setShowPasswordModal(true); }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-brand-navy-200 hover:bg-brand-navy-700 transition-colors"
            suppressHydrationWarning
          >
            <KeyRound className="w-4 h-4" />
            Change Password
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-brand-red-500 hover:bg-brand-navy-700 transition-colors"
            suppressHydrationWarning
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    )}

    {showPasswordModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in slide-in-from-bottom-4 duration-200">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="••••••••"
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="••••••••"
                suppressHydrationWarning
              />
            </div>
            {pwError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-green-600 bg-green-50 border border-green-100 px-3 py-2 rounded-lg">{pwSuccess}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={pwLoading}
                className="flex-1 bg-brand-red-800 hover:bg-brand-red-700 active:scale-95 text-white font-medium py-2 rounded-lg text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-brand-red-200"
              >
                {pwLoading ? "Saving..." : "Save Password"}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 border border-gray-200 text-gray-600 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 active:scale-95 transition-all duration-150"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {showCreateUserModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in slide-in-from-bottom-4 duration-200">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Create New User</h2>
          <form onSubmit={handleCreateUser} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="user@example.com"
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="••••••••"
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as "admin" | "support")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                suppressHydrationWarning
              >
                <option value="support">Support</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {cuError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{cuError}</p>}
            {cuSuccess && <p className="text-xs text-green-600 bg-green-50 border border-green-100 px-3 py-2 rounded-lg">{cuSuccess}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={cuLoading}
                className="flex-1 bg-brand-red-800 hover:bg-brand-red-700 active:scale-95 text-white font-medium py-2 rounded-lg text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-brand-red-200"
              >
                {cuLoading ? "Creating..." : "Create User"}
              </button>
              <button
                type="button"
                onClick={closeCreateUserModal}
                className="flex-1 border border-gray-200 text-gray-600 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 active:scale-95 transition-all duration-150"
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
