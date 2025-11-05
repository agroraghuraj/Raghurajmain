import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBilling } from "@/contexts/BillingContext";
import { useCompany } from "@/contexts/CompanyContext";
import { customerService, Customer } from "@/services/customerService";
import CustomerDetailsModal from "@/components/CustomerDetailsModal";
import { calculateBillTotal as calculateBillTotalGST } from "@/utils/gstCalculator";
import {
  Bell,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Clock,
  AlertCircle,
  Calendar,
  Eye,
  CheckCircle,
  X,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Star,
  ShieldAlert,
  Receipt,
  RefreshCw,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
];

export default function Dashboard() {
  const { bills, isLoading, error, refreshBills } = useBilling();
  const { companyInfo } = useCompany();
  const navigate = useNavigate();
  
  // Listen for bill updates from other pages
  useEffect(() => {
    const handleBillUpdate = (event: CustomEvent) => {
      console.log('🔄 Dashboard: Bill updated event received', event.detail);
      refreshBills(); // Refresh bills when any bill is updated
    };

    window.addEventListener('billUpdated', handleBillUpdate as EventListener);
    
    return () => {
      window.removeEventListener('billUpdated', handleBillUpdate as EventListener);
    };
  }, [refreshBills]);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
    address?: string;
  } | null>(null);

  // Fetch customers data
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setCustomersLoading(true);
        setCustomersError(null);
        const result = await customerService.getAllCustomers();
        setCustomers(result.customers);
      } catch (error) {
        console.error('Error fetching customers:', error);
        setCustomersError(error instanceof Error ? error.message : 'Failed to fetch customers');
      } finally {
        setCustomersLoading(false);
      }
    };

    fetchCustomers();
  }, []);

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

  // Helper function to calculate bill total with dynamic GST using centralized calculator
  const calculateBillTotal = (bill: any) => {
    return calculateBillTotalGST(bill, companyInfo);
  };

  // Calculate real statistics from bill data and customer data
  const calculateStats = () => {
    // Get total customers from API data
    const totalCustomersFromAPI = customers.length;
    
    if (!bills || bills.length === 0) {
      return {
        todayStats: {
          sales: { amount: 0, transactions: 0, change: 0 },
          customers: { total: 0, unique: 0, change: 0 },
          returnSales: { amount: 0, count: 0, change: 0 },
        },
        overallStats: {
          totalRevenue: 0,
          totalCustomers: totalCustomersFromAPI, // Use API customer count
          totalTransactions: 0,
          paidRevenue: 0,
          pendingRevenue: 0,
        },
        recentBills: [],
        chartData: {
          gstSales: 0,
          nonGstSales: 0,
          quotationSales: 0,
          totalSales: 0,
        },
      };
    }

    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    // Filter today's bills
    const todayBills = bills.filter((bill) => {
      const billDate = new Date(bill.updatedAt || bill.billDate || bill.createdAt);
      return billDate >= todayStart;
    });

    // Calculate today's stats
    const todayRevenue = todayBills.reduce(
      (sum, bill) => sum + calculateBillTotal(bill),
      0,
    );
    const todayCustomers = new Set(todayBills.map((bill) => bill.customerPhone))
      .size;
    const todayTransactions = todayBills.length;

    // Calculate overall stats
    const totalRevenue = bills.reduce(
      (sum, bill) => sum + calculateBillTotal(bill),
      0,
    );
    // Use backend status and remainingAmount for accurate calculations
    const paidRevenue = bills
      .filter((bill) => bill.status === 'completed' || (bill.remainingAmount !== undefined && bill.remainingAmount <= 0))
      .reduce((sum, bill) => sum + (bill.totalAmount || calculateBillTotal(bill)), 0);
    const pendingRevenue = bills.reduce(
      (sum, bill) => sum + (bill.remainingAmount || Math.max(0, (bill.totalAmount || calculateBillTotal(bill)) - (bill.paidAmount || 0))),
      0,
    );
    // Use API customer count instead of deriving from bills
    const uniqueCustomers = totalCustomersFromAPI;

    // Calculate sales by type
    const gstSales = bills
      .filter((bill) => bill.billType === "GST")
      .reduce((sum, bill) => sum + calculateBillTotal(bill), 0);
    const nonGstSales = bills
      .filter((bill) => bill.billType === "NON_GST")
      .reduce((sum, bill) => sum + calculateBillTotal(bill), 0);
    const quotationSales = bills
      .filter((bill) => bill.billType === "QUOTATION")
      .reduce((sum, bill) => sum + calculateBillTotal(bill), 0);

    // Get recent bills (last 5) with Non-GST hidden when setting is off
    const recentSource = companyInfo?.showNonGstBills
      ? bills
      : bills.filter(b => b.billType !== 'NON_GST');
    const recentBills = recentSource
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    const finalStats = {
      todayStats: {
        sales: {
          amount: todayRevenue,
          transactions: todayTransactions,
          change: 0,
        },
        customers: { total: todayCustomers, unique: todayCustomers, change: 0 },
        returnSales: { amount: 0, count: 0, change: 0 }, // Will need to track return sales separately
      },
      overallStats: {
        totalRevenue,
        totalCustomers: uniqueCustomers,
        totalTransactions: bills.length,
        paidRevenue,
        pendingRevenue,
      },
      recentBills,
      chartData: {
        gstSales,
        nonGstSales,
        quotationSales,
        totalSales: totalRevenue,
      },
    };

    return finalStats;
  };

  const stats = calculateStats();

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

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

  const handleCustomerClick = (bill: any) => {
    // Extract customer info from bill
    const customerInfo = {
      id: bill.customerId || bill.customerName || "unknown", // Use customerId, fallback to customerName, then "unknown"
      name: bill.customerName || "Unknown Customer",
      phone: bill.customerPhone || "No phone",
      address: bill.customerAddress || ""
    };
    
    setSelectedCustomer(customerInfo);
    setShowCustomerModal(true);
  };

  return (
    <div className="px-4 pb-4 pt-0 space-y-4">
      {/* Error Messages */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          Error loading bills: {error}
        </div>
      )}
      {customersError && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          Error loading customers: {customersError}
        </div>
      )}

      {/* Today's Statistics */}
      <div>
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-foreground">
          Today's Performance
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {/* <DollarSign className="h-4 w-4 text-green-600" /> */}
                <IndianRupee className="h-3 w-3  text-green-600 " />
                Today's Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.todayStats.sales.amount)}
              </div>
              <div className="flex items-center gap-1 text-sm mt-2">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">Real-time data</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.todayStats.sales.transactions} transactions today
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Today's Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.todayStats.customers.total}
              </div>
              <div className="flex items-center gap-1 text-sm mt-2">
                <Users className="h-3 w-3 text-blue-500" />
                <span className="text-blue-500">Unique customers</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.todayStats.customers.total} served today
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <IndianRupee className="h-3 w-3  text-orange-600 " />
                {/* <Receipt className="h-4 w-4 text-orange-600" /> */}
                Pending Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.overallStats.pendingRevenue)}
              </div>
              <div className="flex items-center gap-1 text-sm mt-2">
                <TrendingDown className="h-3 w-3 text-orange-500" />
                <span className="text-orange-500">Outstanding</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                From partial payments
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                Collection Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.overallStats.totalRevenue > 0
                  ? (
                      (stats.overallStats.paidRevenue /
                        stats.overallStats.totalRevenue) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </div>
              <div className="flex items-center gap-1 text-sm mt-2">
                <span className="text-muted-foreground">
                  Payment success rate
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.overallStats.totalRevenue > 0
                        ? (stats.overallStats.paidRevenue /
                            stats.overallStats.totalRevenue) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Overall Statistics */}
      <div>
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-foreground">
          Overall Performance
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {/* <DollarSign className="h-4 w-4" />  */}
                <IndianRupee className="h-3 w-3  text-green-600 " />

                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.overallStats.totalRevenue)}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">All time revenue</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.overallStats.totalCustomers}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Users className="h-3 w-3 text-blue-500" />
                <span className="text-blue-500">Unique customers</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Total Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.overallStats.totalTransactions}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Receipt className="h-3 w-3 text-purple-500" />
                <span className="text-purple-500">All transactions</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4" />
                Paid Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.overallStats.paidRevenue)}
              </div>
              <div className="text-sm text-muted-foreground">
                Collected payments
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Bill Type Breakdown */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Bill Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
                <span className="text-sm font-medium w-16 sm:w-16">GST</span>
                <div className="flex-1 sm:mx-4">
                  <div className="bg-gray-200 rounded-full h-3 relative">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full"
                      style={{
                        width: `${stats.chartData.totalSales > 0 ? (stats.chartData.gstSales / stats.chartData.totalSales) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground sm:w-20 text-left sm:text-right">
                  {formatCurrency(stats.chartData.gstSales)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
                <span className="text-sm font-medium w-16 sm:w-16">Non-GST</span>
                <div className="flex-1 sm:mx-4">
                  <div className="bg-gray-200 rounded-full h-3 relative">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full"
                      style={{
                        width: `${stats.chartData.totalSales > 0 ? (stats.chartData.nonGstSales / stats.chartData.totalSales) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground sm:w-20 text-left sm:text-right">
                  {formatCurrency(stats.chartData.nonGstSales)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
                <span className="text-sm font-medium w-16 sm:w-16">Quote</span>
                <div className="flex-1 sm:mx-4">
                  <div className="bg-gray-200 rounded-full h-3 relative">
                    <div
                      className="bg-gradient-to-r from-purple-400 to-purple-600 h-3 rounded-full"
                      style={{
                        width: `${stats.chartData.totalSales > 0 ? (stats.chartData.quotationSales / stats.chartData.totalSales) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground sm:w-20 text-left sm:text-right">
                  {formatCurrency(stats.chartData.quotationSales)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Distribution */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Revenue Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                <div className="w-32 h-32 rounded-full border-8 border-green-500 border-t-blue-500 border-r-purple-500 border-b-orange-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {stats.chartData.totalSales > 1000000
                        ? `₹${(stats.chartData.totalSales / 100000).toFixed(1)}L`
                        : formatCurrency(stats.chartData.totalSales)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Sales
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>GST Bills</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Non-GST</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>Quotations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Pending</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bills */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Recent Bills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading recent bills...</p>
            </div>
          ) : stats.recentBills.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No bills found</p>
              <p className="text-sm text-muted-foreground">
                Create your first bill to see it here
              </p>
            </div>
          ) : (
            stats.recentBills.map((bill) => {
              const timeAgo = formatTime(new Date(bill.createdAt));
              return (
                <div
                  key={bill.id}
                  className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-white rounded-lg border border-green-100 hover:shadow-md transition-shadow"
                >
                  {/* Professional compact layout */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Left side - Customer info */}
                    <div className="flex-1 min-w-0">
                      {/* Customer name and amount in same row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <button
                          onClick={() => handleCustomerClick(bill)}
                          className="font-medium text-sm sm:text-base text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors hover:bg-blue-50 px-2 py-1 rounded truncate text-left"
                          title="Click to view customer details"
                        >
                          {bill.customerName || "Unknown Customer"}
                        </button>
                        
                        {/* Amount - positioned prominently */}
                        <div className="flex flex-col items-end min-w-0">
                          <div className="font-bold text-green-600 text-base sm:text-lg">
                            {formatCurrency(calculateBillTotal(bill))}
                          </div>
                          {(calculateBillTotal(bill) - (bill.paidAmount || 0)) > 0 && (
                            <div className="text-xs text-orange-600 font-medium">
                              Pending: {formatCurrency(calculateBillTotal(bill) - (bill.paidAmount || 0))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Badges and bill details in compact row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge
                          variant={
                            bill.billType === "GST" ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {bill.billType}
                        </Badge>
                        <Badge
                          variant={
                            (calculateBillTotal(bill) - (bill.paidAmount || 0)) <= 0 ? "default" : "secondary"
                          }
                          className={cn(
                            "text-xs",
                            (calculateBillTotal(bill) - (bill.paidAmount || 0)) <= 0
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800",
                          )}
                        >
                          {(calculateBillTotal(bill) - (bill.paidAmount || 0)) <= 0 ? "Paid" : "Pending"}
                        </Badge>
                      </div>
                      
                      {/* Bill details - compact horizontal layout */}
                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                        <button
                          onClick={() => {
                            console.log('🔍 Dashboard - Bill clicked:', bill);
                            console.log('🆔 Bill ID:', bill.id);
                            console.log('📄 Bill Number:', bill.billNumber);
                            navigate(`/bill-preview/${bill.id}`);
                          }}
                          className="font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                          title="Click to view bill details"
                        >
                          {bill.billNumber || `BILL-${bill.id.slice(-4)}`}
                        </button>
                        <span>•</span>
                        <span>{bill.items?.length || 0} items</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          isOpen={showCustomerModal}
          onClose={() => {
            setShowCustomerModal(false);
            setSelectedCustomer(null);
          }}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          customerPhone={selectedCustomer.phone}
          customerAddress={selectedCustomer.address}
        />
      )}
    </div>
  );
}
