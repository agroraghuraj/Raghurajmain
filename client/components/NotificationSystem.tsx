import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  X,
  Mail,
  Smartphone,
  Trash2,
  User,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "security" | "deletion" | "system" | "login" | "approval";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  severity: "high" | "medium" | "low";
  actionRequired?: boolean;
  data?: any;
}

// Mock notification service - in real app this would be from API/WebSocket
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "security",
    title: "Multiple Login Alert",
    message: "Admin account 'admin@electromart.com' logged in from new device (iPhone - Mumbai, India)",
    timestamp: new Date(Date.now() - 3 * 60 * 1000),
    read: false,
    severity: "high",
    data: {
      device: "iPhone 15 Pro",
      location: "Mumbai, Maharashtra, India",
      ipAddress: "203.192.233.xxx",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
    }
  },
  {
    id: "2",
    type: "deletion",
    title: "Bill Deletion Request",
    message: "Cashier 'Sarah Wilson' requested deletion of invoice INV-2024-001234 (₹15,420)",
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
    read: false,
    severity: "medium",
    actionRequired: true,
    data: {
      requestedBy: "Sarah Wilson",
      invoice: "INV-2024-001234",
      amount: 15420,
      reason: "Customer requested cancellation",
      customer: "John Doe"
    }
  },
  {
    id: "3",
    type: "approval",
    title: "Discount Approval Required",
    message: "Cashier requested 15% discount approval for bulk order (₹45,000)",
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
    read: false,
    severity: "medium",
    actionRequired: true,
    data: {
      discountPercent: 15,
      orderValue: 45000,
      customer: "TechCorp Solutions",
      requestedBy: "Mike Johnson"
    }
  },
  {
    id: "4",
    type: "security",
    title: "Login Success",
    message: "Main admin logged in successfully from Desktop (Delhi, India)",
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    read: true,
    severity: "low",
    data: {
      device: "Windows Desktop",
      location: "New Delhi, India",
      ipAddress: "203.192.234.xxx"
    }
  },
  {
    id: "5",
    type: "system",
    title: "Auto-Email Sent",
    message: "Security alert email sent to admin@electromart.com regarding multiple login",
    timestamp: new Date(Date.now() - 50 * 60 * 1000),
    read: true,
    severity: "low",
  }
];

export function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [showAll, setShowAll] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayNotifications = showAll ? notifications : notifications.slice(0, 5);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "security":
        return <ShieldAlert className="h-4 w-4" />;
      case "deletion":
        return <Trash2 className="h-4 w-4" />;
      case "approval":
        return <AlertCircle className="h-4 w-4" />;
      case "login":
        return <User className="h-4 w-4" />;
      case "system":
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
      case "medium":
        return "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20";
      case "low":
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20";
      default:
        return "border-l-gray-500 bg-gray-50 dark:bg-gray-950/20";
    }
  };

  const getSeverityIconStyle = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-orange-600 bg-orange-100";
      case "low":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const handleApprove = (notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
    // In real app: API call to approve the action
    console.log(`Approved action for notification ${notificationId}`);
  };

  const handleDeny = (notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
    // In real app: API call to deny the action
    console.log(`Denied action for notification ${notificationId}`);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show less" : "Show all"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {displayNotifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "p-4 rounded-lg border-l-4 transition-all hover:shadow-md",
              getSeverityStyle(notification.severity),
              !notification.read && "ring-2 ring-primary/20"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-full flex-shrink-0",
                getSeverityIconStyle(notification.severity)
              )}>
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className={cn(
                    "font-medium text-sm",
                    !notification.read && "font-semibold"
                  )}>
                    {notification.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(notification.timestamp)}
                    </span>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {notification.message}
                </p>

                {/* Additional Data Display */}
                {notification.data && (
                  <div className="text-xs bg-white/50 p-2 rounded border mb-3">
                    {notification.type === "security" && (
                      <div className="grid grid-cols-1 gap-1">
                        <span><strong>Device:</strong> {notification.data.device}</span>
                        <span><strong>Location:</strong> {notification.data.location}</span>
                        <span><strong>IP:</strong> {notification.data.ipAddress}</span>
                      </div>
                    )}
                    {notification.type === "deletion" && (
                      <div className="grid grid-cols-1 gap-1">
                        <span><strong>Invoice:</strong> {notification.data.invoice}</span>
                        <span><strong>Amount:</strong> ₹{notification.data.amount?.toLocaleString()}</span>
                        <span><strong>Customer:</strong> {notification.data.customer}</span>
                        <span><strong>Reason:</strong> {notification.data.reason}</span>
                      </div>
                    )}
                    {notification.type === "approval" && (
                      <div className="grid grid-cols-1 gap-1">
                        <span><strong>Discount:</strong> {notification.data.discountPercent}%</span>
                        <span><strong>Order Value:</strong> ₹{notification.data.orderValue?.toLocaleString()}</span>
                        <span><strong>Customer:</strong> {notification.data.customer}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {notification.actionRequired && !notification.read && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => handleApprove(notification.id)}
                        className="text-xs bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDeny(notification.id)}
                        className="text-xs border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Deny
                      </Button>
                    </>
                  )}
                  
                  {notification.type === "security" && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Send Alert Email
                    </Button>
                  )}
                  
                  {!notification.read && !notification.actionRequired && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => markAsRead(notification.id)}
                      className="text-xs"
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {notifications.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
