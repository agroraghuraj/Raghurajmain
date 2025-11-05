import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PasswordProtection from "@/components/PasswordProtection";
import {
  Receipt,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Package,
  RefreshCw,
  MoreVertical,
  User,
  Phone,
  MapPin,
  Edit,
  Share,
  History,
  ChevronDown,
  FileText,
  CreditCard,
  ShoppingCart
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBilling } from "@/contexts/BillingContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { calculateBillTotal as calculateBillTotalGST } from "@/utils/gstCalculator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// BillPreviewDialog component removed - using placeholder
import { pdfGenerator, InvoiceData } from "@/utils/pdfGenerator";
import { generateBillTemplatePDF } from "@/utils/billTemplatePDF";
import CustomerDetailsModal from "@/components/CustomerDetailsModal";
import { billingService } from "@/services/billingService";

export default function BillingHistoryPage() {
  const { bills, deleteBill, updateBill, isLoading, fetchBills, isRateLimited, lastFetchTime, refreshBills } = useBilling();
  const { companyInfo } = useCompany();
  const { toast } = useToast();
  
  // Listen for bill updates from other pages
  useEffect(() => {
    const handleBillUpdate = (event: CustomEvent) => {
      console.log('🔄 BillingHistory: Bill updated event received', event.detail);
      const { billId, updatedBill, changes } = event.detail;
      
      // Store changes for the specific bill
      if (changes && changes.length > 0) {
        setBillUpdateHistory(prev => ({
          ...prev,
          [billId]: generateUpdateHistory(updatedBill, changes)
        }));
      }
      
      refreshBills(); // Refresh bills when any bill is updated
    };

    window.addEventListener('billUpdated', handleBillUpdate as EventListener);
    
    return () => {
      window.removeEventListener('billUpdated', handleBillUpdate as EventListener);
    };
  }, [refreshBills]);

  // Update history state
  const [updateHistoryOpen, setUpdateHistoryOpen] = useState<string | null>(null);
  const [billUpdateHistory, setBillUpdateHistory] = useState<{[key: string]: any[]}>({});
  
  // State for global update history modal
  const [showGlobalUpdateHistory, setShowGlobalUpdateHistory] = useState(false);
  const [globalUpdateHistory, setGlobalUpdateHistory] = useState<any[]>([]);

  // Debug bills data to check date fields
  useEffect(() => {
    if (bills && bills.length > 0) {
      console.log('📋 Bills data received:', bills.length, 'bills');
      bills.forEach((bill, index) => {
        if (index < 3) { // Log first 3 bills for debugging
          console.log(`📅 Bill ${index + 1} (${bill.billNumber}) date fields:`, {
            updatedAt: bill.updatedAt,
            billDate: bill.billDate,
            createdAt: bill.createdAt
          });
        }
      });
    }
  }, [bills]);


  // Helper function to calculate subtotal
  const calculateSubtotal = (bill: any) => {
    if (!bill || !bill.items || !Array.isArray(bill.items)) {
      return bill?.subtotal || 0;
    }

    // Calculate total amount from items (entered prices are total including GST)
    const totalAmount = bill.items.reduce((sum: number, item: any) => {
      const quantity = item.itemQuantity || item.quantity || 1;
      const price = item.itemPrice || item.price || 0;
      return sum + (quantity * price);
    }, 0);

    // For NON_GST bills, return total amount as subtotal
    if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
      return Math.round(totalAmount * 100) / 100;
    }

    // For GST bills, reverse calculate subtotal
    const gstPercent = getGSTPercentageForDisplay(bill);
    const subtotal = totalAmount / (1 + gstPercent / 100);
    
    return Math.round(subtotal * 100) / 100;
  };

  // Helper function to calculate GST amount
  const calculateGSTAmount = (bill: any) => {
    // For NON_GST bills, return 0
    if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
      return 0;
    }

    // Calculate total amount from items (entered prices are total including GST)
    const totalAmount = bill.items.reduce((sum: number, item: any) => {
      const quantity = item.itemQuantity || item.quantity || 1;
      const price = item.itemPrice || item.price || 0;
      return sum + (quantity * price);
    }, 0);

    // For GST bills, reverse calculate GST amount
    const gstPercent = getGSTPercentageForDisplay(bill);
    const subtotal = totalAmount / (1 + gstPercent / 100);
    const gstAmount = totalAmount - subtotal;
    
    return Math.round(gstAmount * 100) / 100;
  };
  const navigate = useNavigate();

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewingBill, setPreviewingBill] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<any>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [updatePasswordDialogOpen, setUpdatePasswordDialogOpen] = useState(false);
  const [billToUpdate, setBillToUpdate] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [dropdownStates, setDropdownStates] = useState<{ [key: string]: boolean }>({});
  const [editingBill, setEditingBill] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchBills();
  }, []); // Empty dependency array to run only once

  // Refresh bills when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Refreshing bills due to refreshTrigger:', refreshTrigger);
      fetchBills(true);
    }
  }, [refreshTrigger]);

  // Add a periodic refresh to ensure real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Periodic bills refresh');
      fetchBills(true);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchBills]);

  // Refresh when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing bills');
        fetchBills(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchBills]);

  // Debounced search to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  // Helper function to calculate bill total with dynamic GST using centralized calculator
  const calculateBillTotal = (bill: any) => {
    const result = calculateBillTotalGST(bill, companyInfo);
    console.log('🔍 BillingHistory - calculateBillTotal for bill:', bill.billNumber, {
      result,
      billItems: bill.items,
      customerState: bill.customerState || bill.state
    });
    return result;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN");
  };

  // Enhanced change detection function - uses backend change data
  const detectActualChanges = (bill: any, backendChanges: any[] = []) => {
    // If we have backend changes, use them directly
    if (backendChanges && backendChanges.length > 0) {
      return formatBackendChanges(backendChanges);
    }
    
    // Fallback to frontend detection (for backward compatibility)
    const changes = [];
    
    // Only detect meaningful changes that are likely user edits
    if (bill.paidAmount && bill.paidAmount > 0) {
      changes.push('payment updated');
    }
    
    if (bill.status === 'completed' || bill.status === 'pending') {
      changes.push('status changed');
    }
    
    if (bill.items && bill.items.length > 0) {
      changes.push('item updated');
    }
    
    if (bill.customerName && bill.customerName !== 'Unknown Customer' && bill.customerName.length > 2) {
      changes.push('customer updated');
    }
    
    if (changes.length === 0) {
      changes.push('bill updated');
    }
    
    return formatChangeMessage(changes);
  };

  // Format backend changes into readable messages
  const formatBackendChanges = (backendChanges: any[]) => {
    // Collect flags for what changed
    let changed = {
      payment: false,
      pending: false,
      itemAdded: false,
      itemRemoved: false,
      itemUpdated: false,
      status: false,
      customerName: false,
      customerPhone: false,
      customerAddress: false,
      otherField: '' as string | ''
    };

    backendChanges.forEach(change => {
      if (!change) return;
      if (change.type === 'field_updated') {
        if (change.field === 'paidAmount') changed.payment = true;
        else if (change.field === 'remainingAmount') changed.pending = true;
        else if (change.field === 'status') changed.status = true;
        else if (change.field === 'customerName') changed.customerName = true;
        else if (change.field === 'customerPhone') changed.customerPhone = true;
        else if (change.field === 'customerAddress') changed.customerAddress = true;
        else if (!changed.otherField) changed.otherField = change.field;
      } else if (change.type === 'item_added') {
        changed.itemAdded = true;
      } else if (change.type === 'item_removed') {
        changed.itemRemoved = true;
      } else if (change.type === 'item_updated') {
        changed.itemUpdated = true;
      }
    });

    // Priority: payment, pending, item add/remove/update, status, customer fields, others
    if (changed.payment) return formatChangeMessage(['payment updated'], '💰');
    if (changed.pending) return formatChangeMessage(['pending amount changed'], '💳');
    if (changed.itemAdded) return formatChangeMessage(['new item added'], '🧾');
    if (changed.itemRemoved) return formatChangeMessage(['item removed'], '🧾');
    if (changed.itemUpdated) return formatChangeMessage(['item updated'], '🧾');
    if (changed.status) return formatChangeMessage(['status changed'], '📝');
    if (changed.customerName) return formatChangeMessage(['customer name changed'], '👤');
    if (changed.customerPhone) return formatChangeMessage(['customer phone changed'], '👤');
    if (changed.customerAddress) return formatChangeMessage(['customer address changed'], '👤');
    if (changed.otherField) return formatChangeMessage([`${changed.otherField} updated`], '📝');

    // Fallback if none recognized
    return formatChangeMessage(['bill updated'], '📝');
  };

  // Format change messages into combined message
  const formatChangeMessage = (changes: string[], icon: string = '📝') => {
    if (changes.length === 0) {
      return {
        message: 'bill updated',
        icon: '📝',
        allChanges: ['bill updated']
      };
    }
    
    // Always show only the first, most relevant change
    let combinedMessage = changes[0];
    let primaryIcon = icon;

    return {
      message: combinedMessage,
      icon: primaryIcon,
      allChanges: [changes[0]]
    };
  };

  // Generate simplified update history for a bill with accurate change detection
  const generateUpdateHistory = (bill: any, backendChanges: any[] = []) => {
    const history = [];
    
    // Only show update entry if bill was actually updated (not just created)
    if (bill.updatedAt && bill.updatedAt !== bill.createdAt) {
      const actualChanges = detectActualChanges(bill, backendChanges);
      
      console.log('🔍 Generating update history for bill:', bill.billNumber, {
        actualMessage: actualChanges.message,
        icon: actualChanges.icon,
        detectedChanges: actualChanges.allChanges,
        backendChanges: backendChanges,
        billData: {
          paidAmount: bill.paidAmount,
          status: bill.status,
          itemsCount: bill.items?.length,
          totalAmount: bill.totalAmount,
          customerName: bill.customerName,
          remainingAmount: bill.remainingAmount,
          updatedAt: bill.updatedAt,
          createdAt: bill.createdAt
        }
      });
      
      // Create single combined entry
      history.push({
        id: 'updated',
        type: 'updated',
        billNumber: bill.billNumber,
        changeType: actualChanges.message,
        changeIcon: actualChanges.icon,
        allChanges: actualChanges.allChanges,
        date: bill.updatedAt,
        customerName: bill.customerName || 'Unknown Customer',
        billData: {
          paidAmount: bill.paidAmount,
          status: bill.status,
          itemsCount: bill.items?.length || 0,
          totalAmount: bill.totalAmount,
          customerName: bill.customerName,
          remainingAmount: bill.remainingAmount
        }
      });
    }

    return history;
  };

  // Toggle update history dropdown
  const toggleUpdateHistory = (billId: string) => {
    if (updateHistoryOpen === billId) {
      setUpdateHistoryOpen(null);
    } else {
      setUpdateHistoryOpen(billId);
      // Generate history for this bill if not already generated
      if (!billUpdateHistory[billId]) {
        const bill = bills.find(b => b.id === billId);
        if (bill) {
          console.log('🔍 Generating update history for bill:', bill.billNumber, {
            createdAt: bill.createdAt,
            updatedAt: bill.updatedAt,
            status: bill.status,
            paidAmount: bill.paidAmount,
            remainingAmount: bill.remainingAmount,
            totalAmount: bill.totalAmount,
            items: bill.items?.length,
            customerName: bill.customerName
          });
          const history = generateUpdateHistory(bill);
          console.log('📋 Generated history:', history);
          setBillUpdateHistory(prev => ({
            ...prev,
            [billId]: history
          }));
        }
      }
    }
  };

  // Generate global update history for all bills
  const generateGlobalUpdateHistory = () => {
    const allUpdates: any[] = [];
    
    console.log('🔍 Generating global update history for', bills.length, 'bills');
    
    bills.forEach(bill => {
      const billHistory = generateUpdateHistory(bill);
      console.log('📋 Bill', bill.billNumber, 'generated', billHistory.length, 'history entries');
      billHistory.forEach(entry => {
        console.log('📝 Adding entry:', {
          billNumber: entry.billNumber,
          changeType: entry.changeType,
          changeIcon: entry.changeIcon,
          date: entry.date
        });
        allUpdates.push({
          ...entry,
          billId: bill.id,
          billNumber: bill.billNumber,
          customerName: bill.customerName || 'Unknown Customer'
        });
      });
    });

    // Sort by date (latest first)
    allUpdates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    console.log('📊 Final global update history:', allUpdates);
    setGlobalUpdateHistory(allUpdates);
    setShowGlobalUpdateHistory(true);
  };

  // Helper function to get correct GST percentage for display
  const getGSTPercentageForDisplay = (bill: any) => {
    if (!bill) return 18;
    
    const customerState = bill.customerState || bill.state || 'N/A';
    
    console.log('🔍 BillingHistory - GST percentage calculation:', {
      customerState,
      companyStates: companyInfo?.states,
      companyDefaultRate: companyInfo?.defaultGstRate
    });
    
    // First check if company has custom state rates
    if (companyInfo?.states && companyInfo.states.length > 0) {
      const normalizedCustomerState = customerState.toLowerCase().trim();
      const matchingState = companyInfo.states.find((state: any) => 
        state.name.toLowerCase().trim() === normalizedCustomerState
      );
      
      if (matchingState) {
        console.log('🔍 BillingHistory - Using custom state GST rate:', matchingState.gstRate, 'for state:', customerState);
        return matchingState.gstRate;
      }
    }

    // Fallback to predefined state rates
    const stateGSTRates: { [key: string]: number } = {
      'maharashtra': 10, 'gujarat': 9, 'karnataka': 9, 'tamil nadu': 9, 'west bengal': 9,
      'uttar pradesh': 9, 'rajasthan': 9, 'madhya pradesh': 9, 'andhra pradesh': 9,
      'telangana': 9, 'kerala': 9, 'punjab': 9, 'haryana': 9, 'delhi': 9, 'default': companyInfo?.defaultGstRate || 18
    };
    
    const normalizedState = customerState.toLowerCase().trim();
    const gstRate = stateGSTRates[normalizedState] || stateGSTRates['default'];
    console.log('🔍 BillingHistory - Using predefined GST rate:', gstRate, 'for state:', customerState);
    return gstRate;
  };

  const getStatusBadge = (bill: any) => {
    // Always calculate status based on remaining amount - this is the source of truth
    const calculatedTotal = calculateBillTotal(bill);
    const calculatedRemainingAmount = calculatedTotal - (bill.paidAmount || 0);
    const isCompleted = calculatedRemainingAmount <= 0;
    const isPending = calculatedRemainingAmount > 0;
    
    console.log('🔍 BillingHistory - Status calculation for bill:', bill.billNumber, {
      calculatedTotal,
      paidAmount: bill.paidAmount,
      calculatedRemainingAmount,
      isCompleted,
      isPending,
      backendStatus: bill.status
    });

    // Handle draft status first
    if (bill.status === "draft") {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">Draft</Badge>;
    }

    // Force correct status based on remaining amount
    if (isCompleted) {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
    }

    return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Pending</Badge>;
  };

  const getStatusIcon = (bill: any) => {
    // Always calculate status based on remaining amount - this is the source of truth
    const calculatedTotal = calculateBillTotal(bill);
    const calculatedRemainingAmount = calculatedTotal - (bill.paidAmount || 0);
    const isCompleted = calculatedRemainingAmount <= 0;
    const isPending = calculatedRemainingAmount > 0;
    
    // Handle draft status first
    if (bill.status === "draft") {
      return <Clock className="h-4 w-4 text-orange-600" />;
    }
    
    // Force correct icon based on remaining amount
    if (isCompleted) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (isPending) {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    } else {
      return <Receipt className="h-4 w-4 text-gray-600" />;
    }
  };

  const handlePreviewBill = (bill: any) => {
    try {
      console.log("Opening bill preview for:", bill);
      console.log("🆔 Bill ID:", bill.id);
      console.log("🆔 Bill _ID:", bill._id);
      console.log("📄 Bill Number:", bill.billNumber);

      // Use id or _id, whichever is available
      const billId = bill.id || bill._id;

      if (!billId) {
        console.error("No bill ID found:", bill);
        toast({
          title: "Error",
          description: "Bill ID not found",
          variant: "destructive",
        });
        return;
      }

      navigate(`/bill-preview/${billId}`);
    } catch (error) {
      console.error("Error opening bill preview:", error);
      toast({
        title: "Error",
        description: "Failed to open bill preview",
        variant: "destructive",
      });
    }
  };

  const handleEditBill = (bill: any) => {
    if (bill.status === "draft") {
      // For drafts, navigate to billing page
      navigate("/billing", { state: { editBill: bill } });
    } else {
      // For completed bills, open edit modal
      setEditingBill(bill);
      setShowEditModal(true);
      setShowPreviewModal(false); // Close preview modal if open

      toast({
        title: "Edit Bill",
        description: `Editing bill ${bill.billNumber || bill.id}`,
        variant: "default",
      });
    }
  };

  const handleDeleteBill = async (bill: any) => {
    try {
      await deleteBill(bill.id);

      // Refresh the bills list to ensure UI updates
      await fetchBills(true);

      // Trigger a state refresh to ensure UI updates
      setRefreshTrigger(prev => prev + 1);

      toast({
        title: "Success",
        description: "Bill deleted successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
    setBillToDelete(null);
  };

  const handleDeleteWithPassword = (password: string) => {
    if (billToDelete) {
      handleDeleteBill(billToDelete);
    }
    setPasswordDialogOpen(false);
  };

  const handleUpdateWithPassword = (password: string) => {
    if (billToUpdate) {
      // Transform items to match backend schema
      const transformedItems = billToUpdate.items.map((item: any) => ({
        itemName: item.itemName || item.name,
        itemQuantity: item.itemQuantity || item.quantity || 1,
        itemPrice: item.itemPrice || item.price || 0,
        itemTotal: item.itemTotal || item.total || 0,
        gstPercent: item.gstPercent || 18,
        gstAmount: item.gstAmount || 0,
        // Include any other fields that might be needed
        ...item
      }));

      console.log('🔄 Original items:', billToUpdate.items);
      console.log('🔄 Transformed items:', transformedItems);

      // Prepare only the changed fields for update
      const updateData = {
        items: transformedItems,
        customerName: billToUpdate.customerName,
        customerPhone: billToUpdate.customerPhone,
        customerAddress: billToUpdate.customerAddress,
        paymentType: billToUpdate.paymentType,
        paymentMethod: billToUpdate.paymentMethod,
        paidAmount: billToUpdate.paidAmount,
        totalAmount: billToUpdate.totalAmount,
        subtotal: billToUpdate.subtotal,
        gstAmount: billToUpdate.gstAmount,
        remainingAmount: billToUpdate.remainingAmount,
        billType: billToUpdate.billType
      };
      handleUpdateBill(billToUpdate.id, updateData);
    }
    setUpdatePasswordDialogOpen(false);
    setBillToUpdate(null);
  };

  const handleUpdateBill = async (billId: string, updates: any) => {
    setIsUpdating(true);
    try {
      console.log('🔄 Updating bill with ID:', billId);
      console.log('📝 Update data:', updates);
      
      // Use the billingService to update the bill with full data
      const result = await billingService.updateBill(billId, updates);

      // Refresh the bills list
      await fetchBills(true);

      // Trigger a state refresh to ensure UI updates
      setRefreshTrigger(prev => prev + 1);

      toast({
        title: "Success",
        description: "Bill updated successfully",
        variant: "default",
      });
      setShowEditModal(false);
      setEditingBill(null);
    } catch (error) {
      console.error("Error updating bill:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        billId: billId,
        updates: updates
      });
      toast({
        title: "Error",
        description: `Failed to update bill: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCustomerNameClick = (bill: any) => {
    setSelectedCustomer({
      id: bill.customerId || bill.customerPhone,
      name: bill.customerName,
      phone: bill.customerPhone,
      address: bill.customerAddress
    });
    setShowCustomerDetailsModal(true);
  };

  const handleEditItem = (item: any, itemIndex: number) => {
    setEditingItem({ ...item, index: itemIndex });
    setShowEditItemModal(true);
  };

  const calculateTotals = (items: any[], billType?: string) => {
    const totalAmount = items.reduce((sum, item) => {
      const quantity = item.itemQuantity || item.quantity || 1;
      const price = item.itemPrice || item.price || 0;
      return sum + (quantity * price);
    }, 0);

    // For NON_GST bills, return only total without GST
    if (billType === 'NON_GST' || billType === 'non-gst') {
      return {
        subtotal: Math.round(totalAmount * 100) / 100,
        gstAmount: 0,
        totalAmount: Math.round(totalAmount * 100) / 100,
        gstPercent: 0
      };
    }

    // For GST bills, calculate GST rate based on state if available
    let gstPercent = 18; // Default GST rate
    if (previewingBill?.state && companyInfo) {
      const companyState = companyInfo.address?.state?.toLowerCase();
      const customerState = previewingBill.state?.toLowerCase();
      
      if (companyState && customerState) {
        if (companyState === customerState) {
          // Same state - use GST from company settings
          if (companyInfo.states && companyInfo.states.length > 0) {
            const stateInfo = companyInfo.states.find(state => 
              state.name.toLowerCase() === customerState
            );
            if (stateInfo && stateInfo.gstRate > 0) {
              gstPercent = stateInfo.gstRate;
            } else {
              gstPercent = companyInfo.defaultGstRate || 18;
            }
          } else {
            gstPercent = companyInfo.defaultGstRate || 18;
          }
        } else {
          // Different state - use IGST
          gstPercent = companyInfo.defaultGstRate || 18;
        }
      } else {
        gstPercent = companyInfo.defaultGstRate || 18;
      }
    }
    
    // Since the entered price is the total amount including GST,
    // we need to calculate the base amount and GST amount by reverse calculation
    const baseAmount = totalAmount / (1 + gstPercent / 100);
    const gstAmount = totalAmount - baseAmount;

    return {
      subtotal: Math.round(baseAmount * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      gstPercent
    };
  };

  const handleSaveItemEdit = () => {
    if (editingItem && editingItem.index !== undefined) {
      const updatedItems = [...editingBill.items];
      updatedItems[editingItem.index] = {
        ...editingItem,
        index: undefined // Remove the index from the item
      };

      // Calculate new totals
      const newTotals = calculateTotals(updatedItems, editingBill.billType);

      setEditingBill(prev => ({
        ...prev,
        items: updatedItems,
        subtotal: newTotals.subtotal,
        gstAmount: newTotals.gstAmount,
        totalAmount: newTotals.totalAmount,
        gstPercent: newTotals.gstPercent,
        // Update remaining amount if it's a partial payment
        remainingAmount: prev.paymentType === "Partial" ?
          newTotals.totalAmount - (prev.paidAmount || 0) :
          prev.remainingAmount
      }));

      setEditingItem(null);
      setShowEditItemModal(false);

      // Trigger a state refresh to ensure UI updates
      setRefreshTrigger(prev => prev + 1);

      toast({
        title: "Success",
        description: "Item updated successfully",
        variant: "default",
      });
    }
  };

  const handleCancelItemEdit = () => {
    setEditingItem(null);
    setShowEditItemModal(false);
  };

  const handleRemoveItem = (itemIndex: number) => {
    const updatedItems = editingBill.items.filter((_: any, index: number) => index !== itemIndex);

    // Calculate new totals
    const newTotals = calculateTotals(updatedItems);

    setEditingBill(prev => ({
      ...prev,
      items: updatedItems,
      subtotal: newTotals.subtotal,
      gstAmount: newTotals.gstAmount,
      totalAmount: newTotals.totalAmount,
      gstPercent: newTotals.gstPercent,
      // Update remaining amount if it's a partial payment
      remainingAmount: prev.paymentType === "Partial" ?
        newTotals.totalAmount - (prev.paidAmount || 0) :
        prev.remainingAmount
    }));

    // Trigger a state refresh to ensure UI updates
    setRefreshTrigger(prev => prev + 1);

    toast({
      title: "Success",
      description: "Item removed successfully",
      variant: "default",
    });
  };

  const handleAddItem = () => {
    setShowAddItemModal(true);
  };

  const handleSaveNewItem = (newItem: any) => {
    const updatedItems = [...editingBill.items, newItem];

    // Calculate new totals
    const newTotals = calculateTotals(updatedItems);

    setEditingBill(prev => ({
      ...prev,
      items: updatedItems,
      subtotal: newTotals.subtotal,
      gstAmount: newTotals.gstAmount,
      totalAmount: newTotals.totalAmount,
      gstPercent: newTotals.gstPercent,
      // Update remaining amount if it's a partial payment
      remainingAmount: prev.paymentType === "Partial" ?
        newTotals.totalAmount - (prev.paidAmount || 0) :
        prev.remainingAmount
    }));

    setShowAddItemModal(false);

    // Trigger a state refresh to ensure UI updates
    setRefreshTrigger(prev => prev + 1);

    toast({
      title: "Success",
      description: "Item added successfully",
      variant: "default",
    });
  };

  const handleDownloadPDF = async (bill: any) => {
    try {
      console.log('🖼️ Generating PDF for bill:', bill);
      console.log('🏢 Company info:', companyInfo);
      console.log('🏢 Company info name:', companyInfo?.name);
      console.log('🏢 Company info phone:', companyInfo?.phone);
      console.log('🏢 Company info address:', companyInfo?.address);
      console.log('🏢 Company info email:', companyInfo?.email);
      console.log('🏢 Company info gstNumber:', companyInfo?.gstNumber);
      console.log('🏢 Company info website:', companyInfo?.website);
      console.log('🏢 Company info street:', companyInfo?.address?.street);
      console.log('🏢 Company info city:', companyInfo?.address?.city);
      console.log('🏢 Company info state:', companyInfo?.address?.state);
      console.log('🏢 Company info pincode:', companyInfo?.address?.pincode);
      
      // Test if companyInfo is working
      if (!companyInfo) {
        console.error('❌ Company info is null or undefined!');
        alert('Company info is not loaded. Please check your company settings.');
        return;
      }
      
      // Test the actual values
      console.log('🧪 Testing company values:');
      console.log('Name:', companyInfo.name);
      console.log('Phone:', companyInfo.phone);
      console.log('Email:', companyInfo.email);
      
      // Create a simple test to see what values we get
      const testCompanyName = companyInfo.name || 'Default Company';
      const testPhone = companyInfo.phone || 'No Phone';
      const testEmail = companyInfo.email || 'No Email';
      const testAddress = companyInfo.address ? 
        `${companyInfo.address.street || ''} ${companyInfo.address.city || ''} ${companyInfo.address.state || ''} ${companyInfo.address.pincode || ''}`.trim() : 
        'No Address';
      
      console.log('🧪 Test values for PDF:');
      console.log('Test Company Name:', testCompanyName);
      console.log('Test Phone:', testPhone);
      console.log('Test Email:', testEmail);
      console.log('Test Address:', testAddress);

      // Transform bill data to match PDF generator interface
      const invoiceData: InvoiceData = {
        billNumber: bill.billNumber || bill.id,
        billDate: bill.updatedAt || bill.billDate || bill.createdAt || new Date().toISOString(),
        customer: {
          name: bill.customerName || "Unknown Customer",
          phone: bill.customerPhone || "No phone",
          address: bill.customerAddress || "",
          email: bill.customerEmail || "",
          gstNumber: bill.customerGstin || bill.customerGstNumber || "",
        },
        items: (bill.items || []).map((item: any) => ({
          itemName: item.itemName || item.productName || "Item",
          itemPrice: item.itemPrice || item.price || 0,
          itemQuantity: item.itemQuantity || item.quantity || 1,
          itemTotal: item.itemTotal || (item.itemPrice * item.itemQuantity) || 0,
          gstPercent: item.gstPercent || 18,
          gstAmount: item.gstAmount || 0,
        })),
        subtotal: bill.subtotal || bill.totalAmount || 0,
        discountPercent: bill.discount || bill.discountPercent || 0,
        discountAmount: bill.discountAmount || 0,
        gstTotal: bill.gstAmount || bill.gstTotal || 0,
        cgst: bill.cgst || 0,
        sgst: bill.sgst || 0,
        finalAmount: bill.totalAmount || bill.finalAmount || 0,
        billingMode: bill.billType || "GST",
        observation: bill.observation || "",
        termsAndConditions: bill.termsAndConditions || "Standard terms apply",
        paymentMode: bill.paymentType === "Full" ? "full" : "partial",
        paidAmount: bill.paidAmount || 0,
        pendingAmount: bill.remainingAmount || 0,
        paymentMethod: bill.paymentMethod || "cash",
        companyInfo: {
          name: companyInfo?.name || "Savera Electronic",
          address: companyInfo?.address ?
            `${companyInfo.address.street}, ${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.pincode}` :
            "Delhi, India",
          phone: companyInfo?.phone || "+91 98765 43210",
          email: companyInfo?.email || "info@saveraelectronic.com",
          gstNumber: companyInfo?.gstNumber || "07ABCDE1234F1Z5",
        },
      };

      // Transform bill data to match BillTemplate format
      const billData = {
        customerName: bill.customerName || "Unknown Customer",
        customerPhone: bill.customerPhone || "No phone",
        customerAddress: bill.customerAddress || "",
        billingType: bill.billType || "GST",
        items: (bill.items || []).map((item: any) => {
          const quantity = item.itemQuantity || item.quantity || 1;
          const enteredPrice = item.itemPrice || item.price || 0;
          const totalEnteredPrice = quantity * enteredPrice;
          
          // For NON_GST bills, show the entered price as total
          if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
            return {
          name: item.itemName || item.productName || "Item",
              price: enteredPrice,
              quantity: quantity,
              total: totalEnteredPrice,
              gstAmount: 0,
            };
          }
          
          // For GST bills, calculate base amount (after removing GST)
          const gstPercent = (() => {
            const getGSTPercentage = (state: string) => {
              const stateGSTRates: { [key: string]: number } = {
                'maharashtra': 10, 'gujarat': 9, 'karnataka': 9, 'tamil nadu': 9, 'west bengal': 9,
                'uttar pradesh': 9, 'rajasthan': 9, 'madhya pradesh': 9, 'andhra pradesh': 9,
                'telangana': 9, 'kerala': 9, 'punjab': 9, 'haryana': 9, 'delhi': 9, 'default': 18
              };
              const normalizedState = state.toLowerCase().trim();
              return stateGSTRates[normalizedState] || stateGSTRates['default'];
            };
            const customerState = bill.customerState || bill.state || 'N/A';
            return getGSTPercentage(customerState);
          })();
          
          const baseAmount = totalEnteredPrice / (1 + gstPercent / 100);
          const itemGstAmount = totalEnteredPrice - baseAmount;
          
          return {
            name: item.itemName || item.productName || "Item",
            price: enteredPrice, // Show entered price (total including GST)
            quantity: quantity,
            total: baseAmount, // Show base amount (after removing GST)
            gstAmount: itemGstAmount,
          };
        }),
        subtotal: (() => {
          // Calculate subtotal using the new logic
          const totalAmount = (bill.items || []).reduce((sum, item) => {
            const quantity = item.itemQuantity || item.quantity || 1;
            const price = item.itemPrice || item.price || 0;
            return sum + (quantity * price);
          }, 0);
          
          if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
            return totalAmount;
          }
          
          const gstPercent = (() => {
            const getGSTPercentage = (state: string) => {
              const stateGSTRates: { [key: string]: number } = {
                'maharashtra': 10, 'gujarat': 9, 'karnataka': 9, 'tamil nadu': 9, 'west bengal': 9,
                'uttar pradesh': 9, 'rajasthan': 9, 'madhya pradesh': 9, 'andhra pradesh': 9,
                'telangana': 9, 'kerala': 9, 'punjab': 9, 'haryana': 9, 'delhi': 9, 'default': 18
              };
              const normalizedState = state.toLowerCase().trim();
              return stateGSTRates[normalizedState] || stateGSTRates['default'];
            };
            const customerState = bill.customerState || bill.state || 'N/A';
            return getGSTPercentage(customerState);
          })();
          
          return totalAmount / (1 + gstPercent / 100);
        })(),
        gstTotal: (() => {
          // Calculate GST total using the new logic
          const totalAmount = (bill.items || []).reduce((sum, item) => {
            const quantity = item.itemQuantity || item.quantity || 1;
            const price = item.itemPrice || item.price || 0;
            return sum + (quantity * price);
          }, 0);
          
          if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
            return 0;
          }
          
          const gstPercent = (() => {
            const getGSTPercentage = (state: string) => {
              const stateGSTRates: { [key: string]: number } = {
                'maharashtra': 10, 'gujarat': 9, 'karnataka': 9, 'tamil nadu': 9, 'west bengal': 9,
                'uttar pradesh': 9, 'rajasthan': 9, 'madhya pradesh': 9, 'andhra pradesh': 9,
                'telangana': 9, 'kerala': 9, 'punjab': 9, 'haryana': 9, 'delhi': 9, 'default': 18
              };
              const normalizedState = state.toLowerCase().trim();
              return stateGSTRates[normalizedState] || stateGSTRates['default'];
            };
            const customerState = bill.customerState || bill.state || 'N/A';
            return getGSTPercentage(customerState);
          })();
          
          const baseAmount = totalAmount / (1 + gstPercent / 100);
          return totalAmount - baseAmount;
        })(),
        totalAmount: calculateBillTotal(bill),
        paidAmount: bill.paidAmount || 0,
        remainingAmount: calculateBillTotal(bill) - (bill.paidAmount || 0),
        paymentMethod: bill.paymentMethod || "cash",
        paymentType: bill.paymentType || "Full",
        billNumber: bill.billNumber || bill.id,
        gstPercent: (() => {
          const getGSTPercentage = (state: string) => {
            const stateGSTRates: { [key: string]: number } = {
              'maharashtra': 10, 'gujarat': 9, 'karnataka': 9, 'tamil nadu': 9, 'west bengal': 9,
              'uttar pradesh': 9, 'rajasthan': 9, 'madhya pradesh': 9, 'andhra pradesh': 9,
              'telangana': 9, 'kerala': 9, 'punjab': 9, 'haryana': 9, 'delhi': 9, 'default': 18
            };
            const normalizedState = state.toLowerCase().trim();
            return stateGSTRates[normalizedState] || stateGSTRates['default'];
          };
          const customerState = bill.customerState || bill.state || 'N/A';
          return getGSTPercentage(customerState);
        })(),
      };

      console.log('📄 Calling BillTemplate PDF generator...');
      await generateBillTemplatePDF(billData, companyInfo);
      console.log('✅ PDF generation completed');

      toast({
        title: "PDF Generated Successfully",
        description: "Invoice PDF has been downloaded",
        variant: "default",
      });
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        bill: bill,
        companyInfo: companyInfo
      });
      toast({
        title: "PDF Generation Failed",
        description: "Error generating PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShareBill = async (bill: any) => {
    try {
      console.log('📤 Sharing bill as PDF (same format as download):', bill);
      
      // Use the EXACT same data transformation as handleDownloadPDF with new GST logic
      const billData = {
        customerName: bill.customerName || "Unknown Customer",
        customerPhone: bill.customerPhone || "No phone",
        customerAddress: bill.customerAddress || "",
        customerGstin: bill.customerGstin || "",
        billingType: bill.billType || "GST",
        items: (bill.items || []).map((item: any) => {
          const quantity = item.itemQuantity || item.quantity || 1;
          const enteredPrice = item.itemPrice || item.price || 0;
          const totalEnteredPrice = quantity * enteredPrice;
          
          // For NON_GST bills, show the entered price as total
          if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
            return {
          name: item.itemName || item.productName || "Item",
              price: enteredPrice,
              quantity: quantity,
              total: totalEnteredPrice,
              gstAmount: 0,
            };
          }
          
          // For GST bills, calculate base amount (after removing GST)
          const gstPercent = (() => {
            const getGSTPercentage = (state: string) => {
              const stateGSTRates: { [key: string]: number } = {
                'maharashtra': 10, 'gujarat': 9, 'karnataka': 9, 'tamil nadu': 9, 'west bengal': 9,
                'uttar pradesh': 9, 'rajasthan': 9, 'madhya pradesh': 9, 'andhra pradesh': 9,
                'telangana': 9, 'kerala': 9, 'punjab': 9, 'haryana': 9, 'delhi': 9, 'default': 18
              };
              const normalizedState = state.toLowerCase().trim();
              return stateGSTRates[normalizedState] || stateGSTRates['default'];
            };
            const customerState = bill.customerState || bill.state || 'N/A';
            return getGSTPercentage(customerState);
          })();
          
          const baseAmount = totalEnteredPrice / (1 + gstPercent / 100);
          const itemGstAmount = totalEnteredPrice - baseAmount;
          
          return {
            name: item.itemName || item.productName || "Item",
            price: enteredPrice, // Show entered price (total including GST)
            quantity: quantity,
            total: baseAmount, // Show base amount (after removing GST)
            gstAmount: itemGstAmount,
          };
        }),
        subtotal: (() => {
          // Calculate subtotal using the new logic
          const totalAmount = (bill.items || []).reduce((sum, item) => {
            const quantity = item.itemQuantity || item.quantity || 1;
            const price = item.itemPrice || item.price || 0;
            return sum + (quantity * price);
          }, 0);
          
          if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
            return totalAmount;
          }
          
          const gstPercent = (() => {
            const getGSTPercentage = (state: string) => {
              const stateGSTRates: { [key: string]: number } = {
                'maharashtra': 10, 'gujarat': 9, 'karnataka': 9, 'tamil nadu': 9, 'west bengal': 9,
                'uttar pradesh': 9, 'rajasthan': 9, 'madhya pradesh': 9, 'andhra pradesh': 9,
                'telangana': 9, 'kerala': 9, 'punjab': 9, 'haryana': 9, 'delhi': 9, 'default': 18
              };
              const normalizedState = state.toLowerCase().trim();
              return stateGSTRates[normalizedState] || stateGSTRates['default'];
            };
            const customerState = bill.customerState || bill.state || 'N/A';
            return getGSTPercentage(customerState);
          })();
          
          return totalAmount / (1 + gstPercent / 100);
        })(),
        gstTotal: (() => {
          // Calculate GST total using the new logic
          const totalAmount = (bill.items || []).reduce((sum, item) => {
            const quantity = item.itemQuantity || item.quantity || 1;
            const price = item.itemPrice || item.price || 0;
            return sum + (quantity * price);
          }, 0);
          
          if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
            return 0;
          }
          
          const gstPercent = (() => {
            const getGSTPercentage = (state: string) => {
              const stateGSTRates: { [key: string]: number } = {
                'maharashtra': 10, 'gujarat': 9, 'karnataka': 9, 'tamil nadu': 9, 'west bengal': 9,
                'uttar pradesh': 9, 'rajasthan': 9, 'madhya pradesh': 9, 'andhra pradesh': 9,
                'telangana': 9, 'kerala': 9, 'punjab': 9, 'haryana': 9, 'delhi': 9, 'default': 18
              };
              const normalizedState = state.toLowerCase().trim();
              return stateGSTRates[normalizedState] || stateGSTRates['default'];
            };
            const customerState = bill.customerState || bill.state || 'N/A';
            return getGSTPercentage(customerState);
          })();
          
          const baseAmount = totalAmount / (1 + gstPercent / 100);
          return totalAmount - baseAmount;
        })(),
        totalAmount: calculateBillTotal(bill),
        paidAmount: bill.paidAmount || 0,
        remainingAmount: calculateBillTotal(bill) - (bill.paidAmount || 0),
        paymentMethod: bill.paymentMethod || "cash",
        paymentType: bill.paymentType || "Full",
        billNumber: bill.billNumber || bill.id,
        gstPercent: (() => {
          const getGSTPercentage = (state: string) => {
            const stateGSTRates: { [key: string]: number } = {
              'maharashtra': 10, 'gujarat': 9, 'karnataka': 9, 'tamil nadu': 9, 'west bengal': 9,
              'uttar pradesh': 9, 'rajasthan': 9, 'madhya pradesh': 9, 'andhra pradesh': 9,
              'telangana': 9, 'kerala': 9, 'punjab': 9, 'haryana': 9, 'delhi': 9, 'default': 18
            };
            const normalizedState = state.toLowerCase().trim();
            return stateGSTRates[normalizedState] || stateGSTRates['default'];
          };
          const customerState = bill.customerState || bill.state || 'N/A';
          return getGSTPercentage(customerState);
        })(),
      };

      // Create SAVERA ELECTRICALS format PDF directly using the same HTML template
      const { generateBillTemplatePDF } = await import("@/utils/billTemplatePDF");
      
      // Create a temporary container with the SAVERA ELECTRICALS format
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '800px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '20px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(tempContainer);
      
      // Generate the SAVERA ELECTRICALS format HTML content directly
      const billContent = `
        <div style="max-width: 800px; margin: 0 auto; padding: 20px; background: white; font-family: Arial, sans-serif; border: 2px solid #1e40af;">
          <!-- Header Section - SAVERA ELECTRICALS -->
          <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #1e40af; padding-bottom: 8px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #1e40af; margin: 0 0 4px 0; letter-spacing: 1px;">${companyInfo?.name || 'Company Name'}</h1>
            <p style="font-size: 14px; color: #1e40af; margin: 0 0 8px 0; font-weight: 500;">Business</p>
            
            <!-- Phone Numbers -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: #1e40af; font-weight: 500;">
              <div style="text-align: left;">
                <p style="margin: 0;">${companyInfo?.phone || 'Phone Number'}</p>
                <p style="margin: 0;">${companyInfo?.email || ''}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0;">${companyInfo?.gstNumber || ''}</p>
                <p style="margin: 0;">${companyInfo?.website || ''}</p>
              </div>
            </div>
            
            <!-- Address -->
            <p style="font-size: 12px; color: #1e40af; margin: 0 0 8px 0; font-weight: 500;">${companyInfo?.address?.street || ''} ${companyInfo?.address?.city || ''} ${companyInfo?.address?.state || ''} ${companyInfo?.address?.pincode || ''}</p>
            
            <!-- Memo Details -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
              <div style="text-align: left;">
                <p style="font-size: 14px; color: #1e40af; margin: 0; font-weight: 600;">CASH/CREDIT MEMO</p>
              </div>
              <div style="text-align: right;">
                <p style="font-size: 12px; color: #1e40af; margin: 0;">No.: ${billData.billNumber || 'BILL-XXXXX'}</p>
                <p style="font-size: 12px; color: #1e40af; margin: 2px 0 0 0;">Date: ${new Date().toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          </div>

          <!-- Customer Information Section -->
          <div style="margin-bottom: 15px; border: 1px solid #1e40af; padding: 5px; background: #f8fafc;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <p style="font-size: 12px; color: #1e40af; margin: 0; font-weight: 600;">Name:</p>
                <p style="font-size: 14px; color: #111827; margin: 0; font-weight: 500; border-bottom: 1px solid #1e40af; padding-bottom: 2px;">${billData.customerName}</p>
              </div>
              <div>
                <p style="font-size: 12px; color: #1e40af; margin: 0; font-weight: 600;">Phone Number:</p>
                <p style="font-size: 14px; color: #111827; margin: 0; font-weight: 500; border-bottom: 1px solid #1e40af; padding-bottom: 2px;">${billData.customerPhone || 'N/A'}</p>
              </div>
            </div>
            <div style="margin-top: 5px;">
              <p style="font-size: 12px; color: #1e40af; margin: 0; font-weight: 600;">Address:</p>
              <p style="font-size: 14px; color: #111827; margin: 0; font-weight: 500; border-bottom: 1px solid #1e40af; padding-bottom: 2px;">${billData.customerAddress || 'N/A'}</p>
            </div>
          </div>

          <!-- Items Table -->
          <div style="margin-bottom: 15px;">
            <table style="width: 100%; border-collapse: collapse; border: 2px solid #1e40af; font-size: 12px;">
              <thead>
                <tr style="background-color: #1e40af; color: white;">
                  <th style="border: 1px solid #1e40af; padding: 8px 6px; text-align: center; font-weight: 600; width: 8%;">Sr.No.</th>
                  <th style="border: 1px solid #1e40af; padding: 8px 6px; text-align: left; font-weight: 600; width: 50%;">Particulars</th>
                  <th style="border: 1px solid #1e40af; padding: 8px 6px; text-align: center; font-weight: 600; width: 12%;">Qty.</th>
                  <th style="border: 1px solid #1e40af; padding: 8px 6px; text-align: right; font-weight: 600; width: 15%;">Rate</th>
                  <th style="border: 1px solid #1e40af; padding: 8px 6px; text-align: right; font-weight: 600; width: 15%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${billData.items.map((item, index) => `
                  <tr style="${index % 2 === 0 ? 'background-color: #f8fafc;' : 'background-color: white;'}">
                    <td style="border: 1px solid #1e40af; padding: 6px 6px; text-align: center; color: #111827; font-weight: 500;">${index + 1}</td>
                    <td style="border: 1px solid #1e40af; padding: 6px 6px; color: #111827; font-weight: 500;">${item.name || item.itemName || 'Item'}</td>
                    <td style="border: 1px solid #1e40af; padding: 6px 6px; text-align: center; color: #111827; font-weight: 500;">${item.quantity || item.itemQuantity || 1}</td>
                    <td style="border: 1px solid #1e40af; padding: 6px 6px; text-align: right; color: #111827; font-weight: 500;">₹${(item.price || item.itemPrice || 0).toFixed(2)}</td>
                    <td style="border: 1px solid #1e40af; padding: 6px 6px; text-align: right; color: #111827; font-weight: 600;">₹${(item.total || item.itemTotal || 0).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Bill Summary -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
            <div style="width: 280px; border: 2px solid #1e40af; padding: 10px; background: #f8fafc;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                <span style="color: #1e40af; font-weight: 600;">Total</span>
                <span style="color: #111827; font-weight: 600;">₹${(billData.subtotal || billData.items?.reduce((sum, item) => sum + (item.total || item.itemTotal || 0), 0) || 0).toFixed(2)}</span>
              </div>
              ${(billData.billingType || '').toLowerCase() === "gst" ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                  <span style="color: #1e40af; font-weight: 600;">GST (${billData.gstPercent || 18}%)</span>
                  <span style="color: #111827; font-weight: 600;">₹${(billData.gstTotal || 0).toFixed(2)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; border-top: 2px solid #1e40af; padding-top: 5px; margin-top: 5px; color: #1e40af;">
                <span>Net Total</span>
                <span>₹${(billData.totalAmount || 0).toFixed(2)}</span>
              </div>
              ${billData.paidAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 12px;">
                  <span style="color: #16a34a; font-weight: 600;">Paid Amount</span>
                  <span style="color: #16a34a; font-weight: 600;">₹${(billData.paidAmount || 0).toFixed(2)}</span>
                </div>
              ` : ''}
              ${billData.remainingAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 12px;">
                  <span style="color: #dc2626; font-weight: 600;">Pending Amount</span>
                  <span style="color: #dc2626; font-weight: 600;">₹${(billData.remainingAmount || 0).toFixed(2)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Footer Section -->
          <div style="border-top: 2px solid #1e40af; padding-top: 10px; margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px;">
              <div style="text-align: left;">
                <p style="font-size: 10px; color: #1e40af; margin: 0; font-weight: 600;">Subject to ${companyInfo?.address?.city || 'Local'} Jurisdiction</p>
              </div>
              <div style="text-align: right;">
                <p style="font-size: 12px; color: #1e40af; margin: 0; font-weight: 600;">Signature</p>
                <div style="border-bottom: 1px solid #1e40af; width: 120px; height: 20px; margin-top: 3px;"></div>
              </div>
            </div>
            
            <!-- Terms & Conditions -->
            <div style="background: #f8fafc; border: 1px solid #1e40af; padding: 8px; margin-top: 10px;">
              <h4 style="font-size: 12px; color: #1e40af; margin: 0 0 5px 0; font-weight: 600;">Terms & Condition</h4>
              <ul style="font-size: 10px; color: #111827; margin: 0; padding-left: 15px; line-height: 1.2;">
                <li style="margin-bottom: 2px;">Goods once sold will not be taken back or replaced.</li>
                <li style="margin-bottom: 2px;">Pre-Printed stationery order will be accepted on 50% advance payment of total amount.</li>
                <li style="margin-bottom: 2px;">Pre-Printed stationery order will be supplied after 15 days from order accepted by us.</li>
                <li style="margin-bottom: 2px;">Payment will be accepted by cheque/DD/ in favour of ${companyInfo?.name || 'Company Name'}.</li>
                <li style="margin-bottom: 0;">Payment will be made within 8 days from the date of delivery.</li>
              </ul>
            </div>
          </div>
        </div>
      `;
      
      tempContainer.innerHTML = billContent;
      
      // Convert to PDF using html2canvas and jsPDF
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      // Convert to canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: tempContainer.scrollHeight
      });
      
      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Convert to blob
      const pdfBlob = pdf.output('blob');
      
      // Clean up
      document.body.removeChild(tempContainer);
      
      // Create a file object for sharing
      const fileName = `Invoice_${bill.billNumber || bill.id}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      
      // Try Web Share API with file (for mobile devices)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Invoice ${bill.billNumber}`,
            text: `Please find the invoice PDF for ${bill.customerName}`,
            files: [file],
          });
          toast({
            title: "Success",
            description: "Invoice PDF shared successfully",
            variant: "default",
          });
          return;
        } catch (shareError) {
          console.log("Web Share API with file failed, falling back to download:", shareError);
        }
      }

      // Fallback: Download the PDF (user can then manually share)
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Downloaded",
        description: "Invoice PDF has been downloaded. You can now share it manually.",
        variant: "default",
      });
      
    } catch (error) {
      console.error("Error sharing bill as PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF for sharing",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePaymentStatus = async (bill: any, newStatus: "Full" | "Partial") => {
    try {
      const updates = {
        paymentType: newStatus,
        remainingAmount: newStatus === "Full" ? 0 : bill.remainingAmount,
        paidAmount: newStatus === "Full" ? bill.totalAmount : bill.paidAmount,
      };

      await updateBill(bill.id, updates);
      toast({
        title: "Success",
        description: "Payment status updated successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  // Filter bills based on settings, search, status, and date
  const filteredBills = bills.filter(bill => {
    // Hide NON_GST bills when setting is off
    if (!companyInfo?.showNonGstBills && (String(bill.billType).toUpperCase() === 'NON_GST')) {
      return false;
    }
    const matchesSearch =
      bill.billNumber?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      bill.customerName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      bill.customerPhone?.includes(debouncedSearchTerm);

    // Use backend status as primary source for filtering
    const backendStatus = bill.status;
    const remainingAmount = bill.remainingAmount || 0;
    
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "pending" && (backendStatus === "pending" || remainingAmount > 0)) ||
      (statusFilter === "completed" && (backendStatus === "completed" || remainingAmount <= 0)) ||
      (statusFilter === "draft" && backendStatus === "draft");

    const matchesDate = dateFilter === "all" ||
      (dateFilter === "today" && new Date(bill.createdAt).toDateString() === new Date().toDateString()) ||
      (dateFilter === "week" && (new Date().getTime() - new Date(bill.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000) ||
      (dateFilter === "month" && (new Date().getTime() - new Date(bill.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000);

    return matchesSearch && matchesStatus && matchesDate;
  });


  const pendingBills = filteredBills.filter(bill => {
    // Use direct calculation - same logic as individual bill status
    const calculatedTotal = calculateBillTotal(bill);
    const calculatedRemainingAmount = calculatedTotal - (bill.paidAmount || 0);
    return calculatedRemainingAmount > 0;
  });

  const completedBills = filteredBills.filter(bill => {
    // Use direct calculation - same logic as individual bill status
    const calculatedTotal = calculateBillTotal(bill);
    const calculatedRemainingAmount = calculatedTotal - (bill.paidAmount || 0);
    return calculatedRemainingAmount <= 0;
  });
  const draftBills = filteredBills.filter(bill => (bill as any).status === "draft");

  const totalRevenue = completedBills.reduce((sum, bill) => sum + calculateBillTotal(bill), 0);
  const pendingAmount = pendingBills.reduce((sum, bill) => {
    // Use direct calculation for pending amount
    const calculatedTotal = calculateBillTotal(bill);
    const calculatedRemainingAmount = calculatedTotal - (bill.paidAmount || 0);
    return sum + calculatedRemainingAmount;
  }, 0);

  const handleNewInvoice = () => {
    navigate("/billing");
  };


  const handleExportAllBills = async () => {
    try {
      // Import pdfGenerator dynamically
      const { pdfGenerator } = await import("@/utils/pdfGenerator");

      // Create bill list data for PDF
      const billListData = bills.map((bill, index) => ({
        id: index + 1,
        billNumber: bill.billNumber || `BILL-${bill.id?.slice(-4)}`,
        date: formatDate(bill.updatedAt || bill.billDate || bill.createdAt || new Date().toISOString()),
        customerName: bill.customerName || "Unknown Customer",
        customerPhone: bill.customerPhone || "N/A",
        billType: bill.billType || "GST",
        totalAmount: bill.totalAmount || 0,
        paidAmount: bill.paidAmount || bill.totalAmount || 0,
        remainingAmount: bill.remainingAmount || 0,
        paymentType: bill.paymentType || "Full",
        paymentMethod: bill.paymentMethod || "Cash",
        itemCount: bill.items?.length || 0,
        status: bill.paymentType === "Full" ? "Completed" :
          bill.remainingAmount > 0 ? "Pending" : "Completed"
      }));

      // Generate PDF for bill list with company information
      await pdfGenerator.generateBillListPDF(billListData, companyInfo);

      toast({
        title: "Success",
        description: "All bills exported successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Error exporting bills:", error);
      toast({
        title: "Error",
        description: "Failed to export bills",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-3 sm:space-y-4">
        {/* Heading Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={() => {
                fetchBills(true);
                setRefreshTrigger(prev => prev + 1);
              }}
              disabled={isLoading || isRateLimited}
              className="flex items-center gap-2 px-3 py-2 text-sm sm:text-base"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleExportAllBills}
              disabled={isLoading || bills.length === 0}
              className="flex items-center gap-2 px-3 py-2 text-sm sm:text-base"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export All Bills</span>
            </Button>
          </div>
        </div>

        {/* Rate Limit Indicator */}
        {isRateLimited && (
          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                Rate Limited: Please wait {Math.ceil((30000 - (Date.now() - lastFetchTime)) / 1000)} seconds before refreshing
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Bills</p>
                <p className="text-3xl font-bold text-blue-800">{filteredBills.length}</p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <Receipt className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Pending Bills</p>
                <p className="text-3xl font-bold text-orange-800">{pendingBills.length}</p>
                <p className="text-sm text-orange-600">{formatCurrency(pendingAmount)} pending</p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Completed</p>
                <p className="text-3xl font-bold text-green-800">{completedBills.length}</p>
                <p className="text-sm text-green-600">{formatCurrency(totalRevenue)} revenue</p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search bills by number, customer name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm sm:text-base"
              />
              {searchTerm !== debouncedSearchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              {/* Update History Button */}
              <Button
                onClick={generateGlobalUpdateHistory}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <History className="h-4 w-4 mr-2" />
                Update History
              </Button>


             
             

              {/* View Mode Toggle */}
              <div className="flex border rounded-lg p-1 ml-auto">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                  title="Table View"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                  title="Card View"
                >
                  <Package className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills Display */}
      {filteredBills.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2 text-lg">No bills found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first invoice"}
              </p>
              {!searchTerm && statusFilter === "all" && dateFilter === "all" && (
                <Button onClick={handleNewInvoice} className="flex items-center gap-2 mx-auto">
                  <Plus className="h-4 w-4" />
                  Create First Invoice
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === "table" ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px] sm:min-w-[800px]" key={`table-${refreshTrigger}`}>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px] text-xs sm:text-sm">Status</TableHead>
                        <TableHead className="min-w-[120px] text-xs sm:text-sm">Bill Number</TableHead>
                        <TableHead className="min-w-[100px] text-xs sm:text-sm hidden sm:table-cell">Date</TableHead>
                        <TableHead className="min-w-[150px] text-xs sm:text-sm">Customer</TableHead>
                        <TableHead className="min-w-[80px] text-xs sm:text-sm hidden md:table-cell">Type</TableHead>
                        <TableHead className="min-w-[120px] text-xs sm:text-sm">Amount</TableHead>
                        <TableHead className="min-w-[120px] text-xs sm:text-sm hidden lg:table-cell">Payment</TableHead>
                        <TableHead className="min-w-[120px] text-xs sm:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBills.map((bill) => (
                        <TableRow key={bill.id} className="hover:bg-gray-50">
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex items-center gap-1 sm:gap-2">
                              {getStatusIcon(bill)}
                              <span className="hidden sm:inline">{getStatusBadge(bill)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-xs sm:text-sm">
                            <button
                              onClick={() => handlePreviewBill(bill)}
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              {bill.billNumber}
                            </button>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                            {(() => {
                              const displayDate = bill.updatedAt || bill.billDate || bill.createdAt || new Date().toISOString();
                              console.log('📅 Date display for bill:', bill.billNumber, {
                                updatedAt: bill.updatedAt,
                                billDate: bill.billDate,
                                createdAt: bill.createdAt,
                                displayDate: displayDate
                              });
                              return formatDate(displayDate);
                            })()}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="min-w-0">
                              <button
                                onClick={() => handleCustomerNameClick(bill)}
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate block"
                              >
                                {bill.customerName}
                              </button>
                              <p className="text-xs text-gray-500 truncate">{bill.customerPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className="text-xs">{bill.billType}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-xs sm:text-sm whitespace-nowrap">{formatCurrency(calculateBillTotal(bill))}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="text-xs sm:text-sm">
                              <p className="font-medium whitespace-nowrap">{formatCurrency(calculateBillTotal(bill))}</p>
                              {(() => {
                                const calculatedTotal = calculateBillTotal(bill);
                                const calculatedRemainingAmount = calculatedTotal - (bill.paidAmount || 0);
                                return calculatedRemainingAmount > 0 && (
                                  <p className="text-red-600 text-xs whitespace-nowrap">{formatCurrency(calculatedRemainingAmount)} pending</p>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {/* Desktop Actions */}
                            <div className="hidden sm:flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreviewBill(bill)}
                                title="Preview Bill"
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditBill(bill)}
                                title="Edit Bill"
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPDF(bill)}
                                title="Download PDF"
                                className="h-8 w-8 p-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShareBill(bill)}
                                title="Share Bill"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              >
                                <Share className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setBillToDelete(bill);
                                  setPasswordDialogOpen(true);
                                }}
                                title="Delete Bill"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              
                            </div>

                            {/* Mobile Actions - Three Dots Dropdown */}
                            <div className="sm:hidden">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={() => handlePreviewBill(bill)}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Preview Bill
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEditBill(bill)}
                                    className="cursor-pointer"
                                  >
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit Bill
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDownloadPDF(bill)}
                                    className="cursor-pointer"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleShareBill(bill)}
                                    className="cursor-pointer text-green-600 focus:text-green-600"
                                  >
                                    <Share className="h-4 w-4 mr-2" />
                                    Share Bill
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => toggleUpdateHistory(bill.id)}
                                    className="cursor-pointer text-purple-600 focus:text-purple-600"
                                  >
                                    <History className="h-4 w-4 mr-2" />
                                    Update History
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setBillToDelete(bill);
                                      setPasswordDialogOpen(true);
                                    }}
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Bill
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" key={`cards-${refreshTrigger}`}>
              {filteredBills.map((bill) => (
                <Card key={bill.id} className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <button
                          onClick={() => handleCustomerNameClick(bill)}
                          className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                        >
                          {bill.billNumber}
                        </button>
                        <button
                          onClick={() => handleCustomerNameClick(bill)}
                          className="text-sm text-gray-600 hover:text-blue-800 hover:underline cursor-pointer text-left block"
                        >
                          {bill.customerName}
                        </button>
                      </div>
                      {getStatusBadge(bill)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Date:</span>
                        <p className="font-medium">
                          {(() => {
                            const displayDate = bill.updatedAt || bill.billDate || bill.createdAt || new Date().toISOString();
                            console.log('📅 Mobile date display for bill:', bill.billNumber, {
                              updatedAt: bill.updatedAt,
                              billDate: bill.billDate,
                              createdAt: bill.createdAt,
                              displayDate: displayDate
                            });
                            return formatDate(displayDate);
                          })()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <p className="font-medium">{bill.billType}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <p className="font-semibold text-lg">{formatCurrency(calculateBillTotal(bill))}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Payment:</span>
                        <p className="font-medium">
                          {bill.paymentType === "Full" ? (
                            <span className="text-green-600">Paid {formatCurrency(calculateBillTotal(bill))}</span>
                          ) : (bill.remainingAmount || 0) > 0 ? (
                            <span className="text-orange-600">
                              {formatCurrency(bill.paidAmount || 0)} / {formatCurrency(calculateBillTotal(bill))}
                              <br />
                              <span className="text-xs">Remaining: {formatCurrency(bill.remainingAmount || 0)}</span>
                            </span>
                          ) : (
                            <span className="text-green-600">Paid {formatCurrency(calculateBillTotal(bill))}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewBill(bill)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBill(bill)}
                        className="flex-1"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(bill)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBillToDelete(bill);
                          setPasswordDialogOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete bill {billToDelete?.billNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => billToDelete && handleDeleteBill(billToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Protection Dialog */}
      <PasswordProtection
        isOpen={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        onConfirm={handleDeleteWithPassword}
        title="Delete Bill - Password Required"
        description={`Please enter your password to delete bill ${billToDelete?.billNumber || billToDelete?.id}. This action cannot be undone.`}
        actionName="Delete Bill"
      />

      {/* Update Password Protection Dialog */}
      <PasswordProtection
        isOpen={updatePasswordDialogOpen}
        onClose={() => {
          setUpdatePasswordDialogOpen(false);
          setBillToUpdate(null);
        }}
        onConfirm={handleUpdateWithPassword}
        title="Update Bill - Password Required"
        description={`Please enter your password to update bill ${billToUpdate?.billNumber || billToUpdate?.id}.`}
        actionName="Update Bill"
      />

      {/* Bill View Modal */}
      {showPreviewModal && previewingBill && (
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Bill Details - {previewingBill?.billNumber || `BILL-${previewingBill?.id?.slice(-4) || 'Unknown'}`}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  {previewingBill ? getStatusBadge(previewingBill) : <Badge variant="outline">Unknown</Badge>}
                  <Button
                    size="sm"
                    onClick={() => previewingBill && handleEditBill(previewingBill)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {previewingBill?.status === "draft" ? "Continue" : "Edit"}
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              {/* Bill Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Bill Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bill Number:</span>
                        <span className="font-medium">{previewingBill?.billNumber || `bill-${previewingBill?.id?.slice(-4) || 'Unknown'}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bill Type:</span>
                        <Badge variant={previewingBill?.billType === "GST" ? "default" : "secondary"}>
                          {previewingBill?.billType || "GST"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">
                          {previewingBill?.createdAt ? formatDate(previewingBill.createdAt) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        {previewingBill ? getStatusBadge(previewingBill) : <Badge variant="outline">Unknown</Badge>}
                      </div>
                    </div>

                    {/* Quick Edit Actions */}
                    <div className="pt-3 border-t">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => previewingBill && handleEditBill(previewingBill)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          {previewingBill?.status === "draft" ? "Continue Editing" : "Edit Bill"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => previewingBill && handleDownloadPDF(previewingBill)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{previewingBill?.customerName || "Unknown Customer"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{previewingBill?.customerPhone || "N/A"}</span>
                      </div>
                      {previewingBill?.customerAddress && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="text-sm">
                            <p>{previewingBill.customerAddress}</p>
                            {(previewingBill.state || previewingBill.pincode) && (
                              <p className="text-gray-600 text-xs">
                                {previewingBill.state && previewingBill.pincode ? 
                                  `${previewingBill.state} - ${previewingBill.pincode}` : 
                                  previewingBill.state || previewingBill.pincode}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Items ({previewingBill?.items?.length || 0})
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[400px]">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 sm:p-3 font-medium text-xs sm:text-sm">Item</th>
                          <th className="text-center p-2 sm:p-3 font-medium text-xs sm:text-sm w-16">Qty</th>
                          <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm w-20 sm:w-24">Price</th>
                          <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm w-20 sm:w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewingBill?.items?.map((item: any, index: number) => (
                          <tr key={index} className="border-t">
                            <td className="p-2 sm:p-3">
                              <div className="min-w-0">
                                <div className="font-medium text-xs sm:text-sm truncate">{item?.itemName || item?.name || "Unknown Item"}</div>
                                {item?.description && (
                                  <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                                )}
                              </div>
                            </td>
                            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm">{item?.itemQuantity || item?.quantity || 0}</td>
                            <td className="p-2 sm:p-3 text-right text-xs sm:text-sm whitespace-nowrap">{formatCurrency(item?.itemPrice || item?.price || 0)}</td>
                            <td className="p-2 sm:p-3 text-right text-xs sm:text-sm font-medium whitespace-nowrap">{formatCurrency(item?.itemTotal || item?.total || 0)}</td>
                          </tr>
                        )) || (
                            <tr>
                              <td colSpan={4} className="p-3 text-center text-muted-foreground">
                                No items found
                              </td>
                            </tr>
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bill Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(previewingBill?.subtotal || 0)}</span>
                  </div>
                  {(previewingBill?.discountAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span className="text-green-600">-{formatCurrency(previewingBill?.discountAmount || 0)}</span>
                    </div>
                  )}
                  {(previewingBill?.gstAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>GST ({getGSTPercentageForDisplay(previewingBill)}%):</span>
                      <span>{formatCurrency(previewingBill?.gstAmount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(previewingBill?.totalAmount || 0)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Payment Type:</span>
                    <Badge variant={previewingBill?.paymentType === "Full" ? "default" : "destructive"}>
                      {previewingBill?.paymentType || "Full"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid Amount:</span>
                    <span>{formatCurrency(previewingBill?.paidAmount || previewingBill?.totalAmount || 0)}</span>
                  </div>
                  {(previewingBill?.remainingAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Remaining:</span>
                      <span className="text-red-600 font-medium">{formatCurrency(previewingBill?.remainingAmount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="capitalize">{previewingBill?.paymentMethod || "Cash"}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Primary Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => previewingBill && handleEditBill(previewingBill)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {previewingBill?.status === "draft" ? "Continue Editing" : "Edit Bill"}
                    </Button>
                    <Button
                      onClick={() => previewingBill && handleDownloadPDF(previewingBill)}
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>

                  {/* Secondary Actions */}
                  <div className="flex flex-wrap gap-2 ml-auto">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBillToDelete(previewingBill);
                        setPasswordDialogOpen(true);
                        setShowPreviewModal(false);
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Bill
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowPreviewModal(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                {/* Edit Status Info */}
                {previewingBill?.status === "draft" && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Draft Bill</span>
                    </div>
                    <p className="text-sm text-orange-700 mt-1">
                      This is a draft bill. Click "Continue Editing" to complete the invoice.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bill Edit Modal */}
      {showEditModal && editingBill && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-[98vw] sm:max-w-2xl max-h-[98vh] overflow-y-auto w-full mx-1 sm:mx-auto" style={{ maxWidth: 'calc(100vw - 8px)', margin: '4px' }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">Edit Bill - {editingBill.billNumber || `BILL-${editingBill.id?.slice(-4)}`}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              {/* Customer Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Customer Name</label>
                  <input
                    type="text"
                    defaultValue={editingBill.customerName}
                    className="w-full mt-1 px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      setEditingBill(prev => ({ ...prev, customerName: e.target.value }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Customer Phone</label>
                  <input
                    type="text"
                    defaultValue={editingBill.customerPhone}
                    className="w-full mt-1 px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      setEditingBill(prev => ({ ...prev, customerPhone: e.target.value }));
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700">Customer Address</label>
                <textarea
                  defaultValue={`${editingBill.customerAddress || ''}${editingBill.state ? `, ${editingBill.state}` : ''}${editingBill.pincode ? ` ${editingBill.pincode}` : ''}`}
                  className="w-full mt-1 px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  onChange={(e) => {
                    setEditingBill(prev => ({ ...prev, customerAddress: e.target.value }));
                  }}
                />
              </div>

              {/* Payment Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Payment Type</label>
                  <select
                    defaultValue={editingBill.paymentType}
                    className="w-full mt-1 px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      setEditingBill(prev => ({ ...prev, paymentType: e.target.value }));
                    }}
                  >
                    <option value="Full">Full Payment</option>
                    <option value="Partial">Partial Payment</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Payment Method</label>
                  <select
                    defaultValue={editingBill.paymentMethod}
                    className="w-full mt-1 px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      setEditingBill(prev => ({ ...prev, paymentMethod: e.target.value }));
                    }}
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                    <option value="mixed">Cheque</option>
                  </select>
                </div>
              </div>

              {editingBill.paymentType === "Partial" && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Paid Amount</label>
                  <input
                    type="number"
                    defaultValue={editingBill.paidAmount || 0}
                    className="w-full mt-1 px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      const paidAmount = parseFloat(e.target.value) || 0;
                      setEditingBill(prev => ({
                        ...prev,
                        paidAmount: paidAmount,
                        remainingAmount: prev.totalAmount - paidAmount
                      }));
                    }}
                  />
                </div>
              )}

              {/* Bill Items Section */}
              <div className="border-t pt-3 sm:pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Bill Items</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddItem}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {/* Items Table - Mobile Optimized */}
                <div className="overflow-x-auto -mx-2 sm:mx-0 mobile-table-container">
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden border border-gray-300 rounded-lg">
                      <table className="w-full divide-y divide-gray-300" style={{ minWidth: '100%', tableLayout: 'fixed' }}>
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium text-gray-700" style={{ width: '25%', minWidth: '80px' }}>Item</th>
                            <th className="px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-medium text-gray-700" style={{ width: '12%', minWidth: '40px' }}>Qty</th>
                            <th className="px-2 sm:px-3 py-2 text-right text-xs sm:text-sm font-medium text-gray-700" style={{ width: '15%', minWidth: '60px' }}>Price</th>
                            <th className="px-2 sm:px-3 py-2 text-right text-xs sm:text-sm font-medium text-gray-700" style={{ width: '15%', minWidth: '60px' }}>Total</th>
                            <th className="px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-medium text-gray-700" style={{ width: '13%', minWidth: '50px' }}>GST %</th>
                            <th className="px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-medium text-gray-700" style={{ width: '10%', minWidth: '50px' }}>
                              <span className="hidden sm:inline">Actions</span>
                              <span className="sm:hidden">⋯</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-300">
                          {editingBill.items?.map((item: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-left" style={{ width: '25%', minWidth: '80px' }}>
                                <div
                                  className="truncate"
                                  title={item.itemName || item.name || 'Unknown Item'}
                                  style={{
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    wordWrap: 'break-word'
                                  }}
                                >
                                  {item.itemName || item.name || 'Unknown Item'}
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-center" style={{ width: '12%', minWidth: '40px' }}>
                                <div
                                  className="truncate"
                                  title={String(item.itemQuantity || item.quantity || 1)}
                                  style={{
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {item.itemQuantity || item.quantity || 1}
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm currency-cell text-right" style={{ width: '15%', minWidth: '60px' }}>
                                <div
                                  className="truncate"
                                  title={formatCurrency(item.itemPrice || item.price || 0)}
                                  style={{
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {formatCurrency(item.itemPrice || item.price || 0)}
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium currency-cell text-right" style={{ width: '15%', minWidth: '60px' }}>
                                <div
                                  className="truncate"
                                  title={formatCurrency(Math.round((() => {
                                    const quantity = item.itemQuantity || item.quantity || 1;
                                    const price = item.itemPrice || item.price || 0;
                                    const totalPrice = quantity * price;
                                    // Since entered price is total including GST, calculate base amount
                                    const gstPercent = getGSTPercentageForDisplay(editingBill);
                                    const baseAmount = totalPrice / (1 + gstPercent / 100);
                                    return baseAmount;
                                  })()))}
                                  style={{
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {formatCurrency(Math.round((() => {
                                    const quantity = item.itemQuantity || item.quantity || 1;
                                    const price = item.itemPrice || item.price || 0;
                                    const totalPrice = quantity * price;
                                    // Since entered price is total including GST, calculate base amount
                                    const gstPercent = getGSTPercentageForDisplay(editingBill);
                                    const baseAmount = totalPrice / (1 + gstPercent / 100);
                                    return baseAmount;
                                  })()))}
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-center" style={{ width: '13%', minWidth: '50px' }}>
                                <div
                                  className="truncate"
                                  title={`${getGSTPercentageForDisplay(editingBill)}%`}
                                  style={{
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {getGSTPercentageForDisplay(editingBill)}%
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-center" style={{ width: '10%', minWidth: '50px' }}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 hover:bg-gray-100"
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                      onClick={() => handleEditItem(item, index)}
                                      className="cursor-pointer"
                                    >
                                      <Edit2 className="h-3 w-3 mr-2" />
                                      Edit Item
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleRemoveItem(index)}
                                      className="cursor-pointer text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      Remove Item
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill Summary */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Bill Summary</h3>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal(editingBill))}</span>
                  </div>
                  {calculateGSTAmount(editingBill) > 0 && (
                    <div className="flex justify-between">
                      <span>GST ({getGSTPercentageForDisplay(editingBill)}%):</span>
                      <span className="font-medium">{formatCurrency(calculateGSTAmount(editingBill))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t pt-1 text-base sm:text-lg">
                    <span>Total Amount:</span>
                    <span className="text-blue-600">{formatCurrency(calculateBillTotal(editingBill))}</span>
                  </div>
                  {editingBill.paymentType === "Partial" && (
                    <>
                      <div className="flex justify-between">
                        <span>Paid Amount:</span>
                        <span className="font-medium text-green-600">{formatCurrency(editingBill.paidAmount || 0)}</span>
                      </div>
                      <div className="flex justify-between text-red-600 font-medium border-t pt-1">
                        <span>Remaining:</span>
                        <span>{formatCurrency(calculateBillTotal(editingBill) - (editingBill.paidAmount || 0))}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
                <Button
                  onClick={() => {
                    setBillToUpdate(editingBill);
                    setUpdatePasswordDialogOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-2"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Update Bill
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={isUpdating}
                  className="text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-2"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          isOpen={showCustomerDetailsModal}
          onClose={() => {
            setShowCustomerDetailsModal(false);
            setSelectedCustomer(null);
          }}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          customerPhone={selectedCustomer.phone}
          customerAddress={selectedCustomer.address}
        />
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="itemName">Item Name</Label>
                <Input
                  id="itemName"
                  placeholder="Enter item name"
                  onChange={(e) => setEditingItem(prev => ({ ...prev, itemName: e.target.value, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="itemQuantity">Quantity</Label>
                  <Input
                    id="itemQuantity"
                    type="number"
                    min="1"
                    defaultValue="1"
                    onChange={(e) => setEditingItem(prev => ({
                      ...prev,
                      itemQuantity: parseFloat(e.target.value) || 1,
                      quantity: parseFloat(e.target.value) || 1
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="itemPrice">Price</Label>
                  <Input
                    id="itemPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    onChange={(e) => setEditingItem(prev => ({
                      ...prev,
                      itemPrice: parseFloat(e.target.value) || 0,
                      price: parseFloat(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    if (editingItem) {
                      handleSaveNewItem(editingItem);
                      setEditingItem(null);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Add Item
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddItemModal(false);
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Item Modal */}
      {showEditItemModal && editingItem && (
        <Dialog open={showEditItemModal} onOpenChange={setShowEditItemModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                Edit Item
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editItemName">Item Name</Label>
                <Input
                  id="editItemName"
                  defaultValue={editingItem.itemName || editingItem.name || ''}
                  placeholder="Enter item name"
                  onChange={(e) => setEditingItem(prev => ({ ...prev, itemName: e.target.value, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editItemQuantity">Quantity</Label>
                  <Input
                    id="editItemQuantity"
                    type="number"
                    min="1"
                    defaultValue={editingItem.itemQuantity || editingItem.quantity || 1}
                    onChange={(e) => setEditingItem(prev => ({
                      ...prev,
                      itemQuantity: parseFloat(e.target.value) || 1,
                      quantity: parseFloat(e.target.value) || 1
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="editItemPrice">Price</Label>
                  <Input
                    id="editItemPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editingItem.itemPrice || editingItem.price || 0}
                    placeholder="0.00"
                    onChange={(e) => setEditingItem(prev => ({
                      ...prev,
                      itemPrice: parseFloat(e.target.value) || 0,
                      price: parseFloat(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>

              {/* Real-time Total Display */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Total:</div>
                <div className="text-lg font-semibold text-blue-600">
                  {formatCurrency((editingItem.itemQuantity || editingItem.quantity || 1) * (editingItem.itemPrice || editingItem.price || 0))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveItemEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelItemEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Global Update History Modal */}
      <Dialog open={showGlobalUpdateHistory} onOpenChange={setShowGlobalUpdateHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600" />
              Update History - All Bills
            </DialogTitle>
            <DialogDescription>
              Complete history of all bill updates across the system
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {globalUpdateHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No update history available</p>
                <p className="text-xs text-gray-400 mt-2">Only bills that have been updated will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {globalUpdateHistory.map((entry, index) => (
                  <div key={`${entry.billId}-${entry.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{entry.changeIcon}</span>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900">
                            {entry.billNumber}
                          </span>
                          <span className="text-gray-500">—</span>
                          <span className="text-sm text-gray-700">
                            {entry.changeType}
                          </span>
                        </div>
                        {Array.isArray(entry.allChanges) && entry.allChanges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.allChanges.map((c: string, i: number) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span>Customer:</span>
                          <span className="font-medium">{entry.customerName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(entry.date).toLocaleDateString('en-IN', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(entry.date).toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowGlobalUpdateHistory(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
