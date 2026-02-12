import React, { useContext } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { AuthContext, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Users,
  CreditCard,
  CalendarCheck,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export const Layout = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const isHR = user?.role === "hr";

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/login");
    }
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/calendar", icon: CalendarDays, label: "Calendar" },
    { to: "/my-requests", icon: FileText, label: "My Requests" },
  ];

  const hrNavItems = [
    { to: "/hr/dashboard", icon: Users, label: "All Requests" },
    { to: "/hr/credits", icon: CreditCard, label: "Manage Credits" },
    { to: "/hr/public-holidays", icon: CalendarCheck, label: "Public Holidays" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? "active" : ""}`
      }
      data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-slate-900 text-white rounded-lg"
        data-testid="mobile-menu-btn"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Holiday Manager
            </h1>
            <p className="text-xs text-slate-500 mt-1">Leave Management System</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="mb-4">
              <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Employee
              </p>
              {navItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>

            {isHR && (
              <div className="pt-4 border-t border-slate-800">
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  HR Management
                </p>
                {hrNavItems.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </div>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-800">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors"
                  data-testid="user-menu-btn"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.picture} alt={user?.name} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {user?.role === "hr" ? "HR Manager" : "Employee"}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled className="font-medium">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 cursor-pointer"
                  data-testid="logout-btn"
                >
                  <LogOut size={16} className="mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
