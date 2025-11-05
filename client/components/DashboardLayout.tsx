import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Settings,
  Store,
  LogOut,
  User,
  Users,
  Package,
  CreditCard,
  MoreHorizontal,
  Clock,
  X,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import BottomTabNavigation from "./BottomTabNavigation";

// Base navigation items
const baseNavigationItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Billing", href: "/billing", icon: Receipt },
  { name: "History", href: "/billing-history", icon: BarChart3 },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

// Product navigation item
const productNavItem = { name: "Products", href: "/products", icon: Package };

// Mobile navigation (only 4 main tabs)
const mobileNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Billing", href: "/billing", icon: Receipt },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "More", href: "#", icon: MoreHorizontal, isDropdown: true },
];

// Items that go in the "More" dropdown
const moreItems = [
  { name: "History", href: "/billing-history", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];


interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { companyInfo } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Compute display avatar (use direct URL with fallback)
  const displayAvatar = useMemo(() => {
    const fallback = "/placeholder.svg";
    const raw = (user?.avatar || "").trim();
    if (!raw) return fallback;
    return raw;
  }, [user?.avatar]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);


  const formatTime = (date: Date | string) => {
    const now = new Date();
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const diffInMinutes = Math.floor(
      (now.getTime() - dateObj.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return dateObj.toLocaleDateString();
    }
  };


  const handleLogout = () => logout();

  // Conditionally include Products tab based on product search setting
  const desktopNavigation = useMemo(() => {
    console.log('🔍 DashboardLayout - companyInfo:', companyInfo);
    console.log('🔍 DashboardLayout - isProductSearch:', companyInfo?.isProductSearch);
    const nav = [
      ...baseNavigationItems.slice(0, 4), // Dashboard, Billing, History, Customers
      ...(companyInfo?.isProductSearch ? [productNavItem] : []), // Products (conditional)
      ...baseNavigationItems.slice(4), // Settings
    ];
    console.log('🔍 DashboardLayout - final navigation:', nav);
    return nav;
  }, [companyInfo?.isProductSearch]);

  // Conditionally include Products in mobile "More" dropdown
  const mobileMoreItems = useMemo(() => [
    ...(companyInfo?.isProductSearch ? [productNavItem] : []), // Products (conditional)
    ...moreItems, // History, Settings
  ], [companyInfo?.isProductSearch]);

  const getUserInitials = (name: string) =>
    name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for large screens */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-center gap-2 h-16 px-6 border-b border-gray-200">
            {companyInfo?.logo ? (
              <img src={companyInfo.logo} alt="Company Logo" className="h-8 w-8 rounded object-cover " />
            ) : (
              <div className="bg-green-600 text-white p-2 rounded-lg">
                {/* <Store className="h-5 w-5" /> */}
                
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg text-gray-900">
                {companyInfo?.name || "ElectroMart"}
              </h1>
              <p className="text-xs text-gray-500">Business Management</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scroll-smooth">
            {desktopNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-green-100 text-green-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isActive ? "text-green-600" : "text-gray-400"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
              <Avatar className="h-8 w-8">
                <AvatarImage src={displayAvatar} alt={user?.name} crossOrigin="anonymous" />
                <AvatarFallback className="bg-green-600 text-white text-xs">
                  {user ? getUserInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:pl-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-2 fixed top-0 right-0 left-0 lg:left-64 z-40">
          <div className="flex items-center justify-between">
            <h1 className="text-lg lg:text-xl font-semibold text-gray-900">
              {desktopNavigation.find((item) => item.href === location.pathname)?.name ||
                "Dashboard"}
            </h1>

            {/* Time display, Notifications, and Profile dropdown */}
            <div className="flex items-center gap-4">
              {/* Current Time */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>


              {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={displayAvatar} alt={user?.name} crossOrigin="anonymous" />
                    <AvatarFallback className="bg-green-600 text-white text-xs">
                      {user ? getUserInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main area with smooth scroll */}
        <main className="flex-1 overflow-y-auto scroll-smooth mt-16 px-4 lg:px-6 py-4 pb-20 lg:pb-4">
          {children}
        </main>

        {/* Bottom tab navigation for mobile */}
        <BottomTabNavigation />

        {/* Mobile bottom padding */}
        <div className="h-16 lg:hidden" />
      </div>
    </div>
  );
}
