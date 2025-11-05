import { Link, useLocation } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Users,
  Store,
  ShoppingBag,
  BarChart3,
  Settings,
  Bell,
  X,
  CheckCircle,
  AlertCircle,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Billing",
    href: "/billing",
    icon: Receipt,
  },
  {
    name: "History",
    href: "/billing-history",
    icon: BarChart3,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

// Mock notifications (can be replaced with real notification system later)
const notifications = [
  {
    id: "1",
    type: "system",
    title: "System Status",
    message: "All systems are running normally",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
    severity: "low",
    actionRequired: false,
  },
  {
    id: "2",
    type: "security",
    title: "Security Alert",
    message: "New login detected from unknown device",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    read: false,
    severity: "high",
    actionRequired: true,
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { companyInfo } = useCompany();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      // Add class to prevent horizontal scrolling
      document.body.classList.add('notification-open');
    } else {
      // Remove class when dropdown is closed
      document.body.classList.remove('notification-open');
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.classList.remove('notification-open');
    };
  }, [showNotifications]);

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "security":
        return <ShieldAlert className="h-4 w-4" />;
      case "deletion":
        return <AlertCircle className="h-4 w-4" />;
      case "system":
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "low":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">
              {companyInfo?.name || "ElectroMart"}
            </h1>
            <p className="text-xs text-muted-foreground">Shop Management</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative" ref={notificationRef}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-30 bg-black/20 sm:hidden"
                  onClick={() => setShowNotifications(false)}
                />
                {/* Dropdown */}
                <div className="notification-dropdown absolute left-2 right-2 top-12 w-auto max-w-none bg-white border rounded-lg shadow-xl z-40 max-h-96 overflow-y-auto overflow-x-hidden sm:left-auto sm:right-0 sm:w-80 sm:max-w-none">
                  <div className="p-3 sm:p-4 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm sm:text-base">Notifications</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNotifications(false)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-0">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "notification-item p-3 sm:p-4 border-b hover:bg-muted/50 transition-colors",
                          !notification.read && "bg-primary/5",
                        )}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div
                            className={cn(
                              "p-1.5 sm:p-2 rounded-full flex-shrink-0",
                              getSeverityColor(notification.severity),
                            )}
                          >
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                              <h4 className="font-medium text-xs sm:text-sm leading-tight break-words">
                                {notification.title}
                              </h4>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {formatTime(notification.timestamp)}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed break-words">
                              {notification.message}
                            </p>
                            {notification.actionRequired && (
                              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs flex-1 sm:flex-none"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs flex-1 sm:flex-none"
                                >
                                  <X className="h-3 w-3" />
                                  Deny
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-2 z-50">
        <div className="flex justify-around">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
