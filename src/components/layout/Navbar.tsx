import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, Mail, ScrollText, LogOut, ChevronDown, KeyRound, Users, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useRef, useEffect } from "react";

const allNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, pageKey: "overview", adminOnly: false },
  { href: "/dashboard/ekv", label: "EKV", icon: FileText, pageKey: "ekv", adminOnly: false },
  { href: "/dashboard/letter", label: "Letter", icon: Mail, pageKey: "letter_all", adminOnly: false },
  { href: "/dashboard/logs", label: "Logs", icon: ScrollText, pageKey: "logs", adminOnly: false },
  { href: "/dashboard/admin/users", label: "Users", icon: Users, pageKey: null, adminOnly: true },
];

export default function Navbar() {
  const { user, role, allowedPages, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = allNavItems.filter((item) => {
    if (item.adminOnly) return role === "admin";
    return allowedPages.includes(item.pageKey ?? "");
  });

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  return (
    <header className="h-14 bg-brand-navy-800 border-b border-brand-navy-900 flex items-center px-4 md:px-6 gap-3 md:gap-8 shrink-0 shadow-lg">
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-brand-red-800 flex items-center justify-center shadow-sm">
          <span className="text-primary-foreground text-xs font-bold tracking-tight">AZ</span>
        </div>
        <div className="leading-none hidden sm:block">
          <p className="text-sm font-semibold text-primary-foreground tracking-tight">Application Status Audits</p>
          <p className="text-[10px] text-brand-navy-300">Carebox Dashboard</p>
        </div>
        <div className="leading-none sm:hidden">
          <p className="text-sm font-semibold text-primary-foreground tracking-tight">AZH</p>
        </div>
      </div>

      <div className="w-px h-5 bg-brand-navy-600 hidden md:block" />

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? location.pathname === href : location.pathname.startsWith(href);
          return (
            <Link
              key={href}
              to={href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-brand-red-800 text-primary-foreground shadow-sm shadow-brand-red-950"
                  : "text-brand-navy-200 hover:bg-brand-navy-700 hover:text-primary-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* User menu — desktop */}
      <div className="relative hidden md:block" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm hover:bg-brand-navy-700 transition-all duration-150"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-gold-500 to-brand-gold-700 flex items-center justify-center text-primary-foreground text-xs font-semibold shadow-sm">
            {initials}
          </div>
          <span className="max-w-[140px] truncate text-sm font-medium text-brand-navy-100">{user?.email}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-brand-navy-300 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-background border border-border rounded-xl shadow-2xl py-1 z-50">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Signed in as</p>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">{user?.email}</p>
            </div>
            <button
              onClick={() => { setDropdownOpen(false); handleLogout(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors duration-100 group"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Mobile menu toggle */}
      <button
        onClick={() => setMobileMenuOpen((o) => !o)}
        className="md:hidden p-1.5 rounded-lg text-brand-navy-200 hover:bg-brand-navy-700 transition-colors"
      >
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-brand-navy-800 border-b border-brand-navy-900 shadow-xl z-50 md:hidden">
          <nav className="p-3 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = href === "/dashboard" ? location.pathname === href : location.pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-brand-red-800 text-primary-foreground"
                      : "text-brand-navy-200 hover:bg-brand-navy-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
            <div className="border-t border-brand-navy-700 pt-2 mt-2">
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-brand-red-400 hover:bg-brand-navy-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
