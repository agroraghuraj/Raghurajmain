import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBilling } from "@/contexts/BillingContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import customerService from "@/services/customerService";
import { Receipt, Plus, List, Calculator, FileText, MoreVertical, Eye, Edit, Trash2, Clock, CheckCircle, AlertCircle, ArrowLeft, Package, Download, User, Phone, MapPin, Calendar, Edit2, X } from "lucide-react";

// Import invoice creation components
import CustomerDetailsForm from "@/components/InvoiceCreation/CustomerDetailsForm";
import InvoiceCreationPage from "@/components/InvoiceCreation/InvoiceCreationPage";
import PaymentSection from "@/components/InvoiceCreation/PaymentSection";
import QuickBillPage from "@/components/InvoiceCreation/QuickBillPage";
import CustomerDetailsModal from "@/components/CustomerDetailsModal";
import PasswordProtection from "@/components/PasswordProtection";

export default function SimpleBilling() {
  const { bills, isLoading, deleteBill, fetchBills, addBill, updateBill, refreshBills } = useBilling();
  const { companyInfo } = useCompany();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Listen for bill updates from other pages
  useEffect(() => {
    const handleBillUpdate = (event: CustomEvent) => {
      console.log('🔄 SimpleBilling: Bill updated event received', event.detail);
      refreshBills(); // Refresh bills when any bill is updated
    };

    window.addEventListener('billUpdated', handleBillUpdate as EventListener);
    
    return () => {
      window.removeEventListener('billUpdated', handleBillUpdate as EventListener);
    };
  }, [refreshBills]);
  const [activeTab, setActiveTab] = useState("recent");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<any>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [showBillViewModal, setShowBillViewModal] = useState(false);
  const [viewingBill, setViewingBill] = useState<any>(null);
  const [dropdownStates, setDropdownStates] = useState<{ [key: string]: boolean }>({});
  const [editingBill, setEditingBill] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomerData, setSelectedCustomerData] = useState<any>(null);

  // Edit modal states (similar to BillingHistory)
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Recalculate totals when editingBill changes
  useEffect(() => {
    if (editingBill && editingBill.items && editingBill.items.length > 0) {
      const customerState = editingBill.customerState || editingBill.state || 'N/A';
      const totals = calculateTotals(editingBill.items, customerState, editingBill.billType);
      
      // Only update if the calculated values are different from current values
      if (editingBill.subtotal !== totals.subtotal || editingBill.gstAmount !== totals.gstAmount || editingBill.totalAmount !== totals.totalAmount) {
        setEditingBill(prev => ({
          ...prev,
          ...totals,
          remainingAmount: prev.paymentType === "Partial" 
            ? (totals.totalAmount - (prev.paidAmount || 0))
            : 0
        }));
      }
    }
  }, [editingBill?.items, editingBill?.customerState, editingBill?.state]);

  // Invoice creation state
  const [invoiceStep, setInvoiceStep] = useState<"main" | "customer" | "invoice-creation" | "payment" | "quick-bill">("main");
  const [customerData, setCustomerData] = useState<any>(null);
  const [billingType, setBillingType] = useState<string>("");
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [invoiceSubtotal, setInvoiceSubtotal] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [currentBillNumber, setCurrentBillNumber] = useState<string | null>(null);
  const [isBillRegistered, setIsBillRegistered] = useState<boolean>(false);

  // Fetch recent bills on component mount and when refreshTrigger changes
  useEffect(() => {
    fetchBills();
  }, [refreshTrigger]); // Add refreshTrigger as dependency

  // Reset dropdown states when bills change
  useEffect(() => {
    setDropdownStates({});
  }, [bills]);

  // Handle editBill state from navigation
  useEffect(() => {
    if (location.state?.editBill) {
      console.log("🔍 Edit bill state received:", location.state.editBill);
      const bill = location.state.editBill;

      if (bill.status === "draft") {
        // For drafts, navigate to invoice creation
        setCustomerData({
          name: bill.customerName,
          phone: bill.customerPhone,
          address: bill.customerAddress
        });
        setBillingType(bill.billType);
        setInvoiceItems(bill.items || []);
        setInvoiceStep("invoice-creation");
        toast({ title: "Success", description: "Editing draft bill", variant: "default" });
      } else {
        // For completed bills, open edit modal
        setEditingBill(bill);
        setShowEditModal(true);
        toast({ title: "Success", description: `Editing bill ${bill.billNumber || bill.id}`, variant: "default" });
      }

      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true });
    }
    
    // Handle prefillCustomer state from Customer Details modal
    if (location.state?.prefillCustomer) {
      console.log("🔍 Prefill customer state received:", location.state.prefillCustomer);
      const customer = location.state.prefillCustomer;
      console.log("🔍 Customer state from modal:", customer.state);
      console.log("🔍 Company state:", companyInfo?.address?.state);
      
      // Set customer data and navigate to invoice creation
      setCustomerData({
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        state: customer.state,
        pincode: customer.pincode,
        city: customer.city
      });
      setInvoiceStep("invoice-creation");
      toast({ title: "Success", description: `Creating invoice for ${customer.name}`, variant: "default" });

      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate]);






  const handleNewInvoice = () => {
    setInvoiceStep("customer");
  };


  const handleQuickBill = () => {
    setInvoiceStep("quick-bill");
  };

  const handleCustomerContinue = (customer: any) => {
    setCustomerData(customer);
    setInvoiceStep("invoice-creation");
  };

  const handleInvoiceCreationContinue = (type: string, items: any[], subtotal: number, billId?: string | null, isRegistered?: boolean, billNumber?: string | null) => {
    console.log("Invoice creation completed:", { type, items, subtotal, billId, isRegistered, billNumber });
    setBillingType(type);
    setInvoiceItems(items);
    setInvoiceSubtotal(subtotal);
    setCurrentBillId(billId || null);
    setCurrentBillNumber(billNumber || null);
    setIsBillRegistered(isRegistered || false);
    setInvoiceStep("payment");
    // No auto-save in payment step - bill is already registered
  };


  const handlePaymentComplete = async (paymentData: any) => {
    try {
      // Generate a temporary bill number (will be replaced by the service)
      const tempBillNumber = `TEMP-${Date.now()}`;

      // Map billing type to the correct format
      const billTypeMap: { [key: string]: "GST" | "NON_GST" | "QUOTATION" | "Demo" } = {
        "gst": "GST",
        "non-gst": "NON_GST",
        "quotation": "QUOTATION",
        "demo": "Demo"
      };

      const billData = {
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerId: customerData.id, // Add customerId
        customerAddress: customerData.address,
        customerGstin: customerData.gstin,
        billNumber: tempBillNumber,
        pincode: customerData.pincode,
        billType: billTypeMap[billingType] || "GST",
        items: invoiceItems.map(item => ({
          itemName: item.name,
          itemPrice: item.price,
          itemQuantity: item.quantity,
          itemTotal: item.total,
        })),
        discount: 0,
        paymentType: paymentData.paymentType,
        paidAmount: paymentData.paidAmount,
        paymentMethod: paymentData.paymentMethod,
      };

      await addBill(billData);

      toast({ title: "Success", description: "Invoice created successfully!", variant: "default" });

      // Reset invoice creation state
      setCustomerData(null);
      setBillingType("");
      setInvoiceItems([]);
      setInvoiceSubtotal(0);
      setInvoiceStep("main");

      // Refresh bills list
      fetchBills();

      // Trigger refresh for QuickBillPage
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create invoice. Please try again.", variant: "destructive" });
    }
  };

  const handleBackToMain = () => {
    setInvoiceStep("main");
    setCustomerData(null);
    setBillingType("");
    setInvoiceItems([]);
    setInvoiceSubtotal(0);
  };

  const handleViewBill = (bill: any) => {
    try {
      console.log("Opening bill view for:", bill);
      // Reset dropdown states to prevent conflicts
      setDropdownStates({});
      navigate('/bill-preview', { state: { bill } });
    } catch (error) {
      console.error("Error opening bill view:", error);
      toast({ title: "Error", description: "Failed to open bill view", variant: "destructive" });
    }
  };

  const handleEditBill = (bill: any) => {
    try {
      // Reset dropdown states to prevent conflicts
      setDropdownStates({});

      if (bill.status === "draft") {
        // For drafts, just show a message that draft editing is not available
        toast({ title: "Error", description: "Draft editing functionality has been removed.", variant: "destructive" });
      } else {
        // For completed bills, open edit modal
        // Recalculate totals to ensure correct values
        const customerState = bill.customerState || bill.state || 'N/A';
        const totals = calculateTotals(bill.items || [], customerState, bill.billType);
        const updatedBill = {
          ...bill,
          ...totals,
          remainingAmount: bill.paymentType === "Partial" 
            ? (totals.totalAmount - (bill.paidAmount || 0))
            : 0
        };
        
        setEditingBill(updatedBill);
        setShowEditModal(true);
        setShowBillViewModal(false); // Close view modal if open

        toast({ title: "Success", description: `Editing bill ${bill.billNumber || bill.id}`, variant: "default" });
      }
    } catch (error) {
      console.error("Error editing bill:", error);
      toast({ title: "Error", description: "Failed to edit bill", variant: "destructive" });
    }
  };

  const handleDeleteBill = async (bill: any) => {
    try {
      await deleteBill(bill.id);
      // Reset dropdown states and refresh data
      setDropdownStates({});
      setRefreshTrigger(prev => prev + 1);
      toast({ title: "Success", description: "Bill deleted successfully", variant: "default" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete bill", variant: "destructive" });
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

  const handleUpdateBill = async (billId: string, updates: any) => {
    try {
      setIsUpdating(true);
      await updateBill(billId, updates);
      // Reset dropdown states and refresh data
      setDropdownStates({});
      setRefreshTrigger(prev => prev + 1);
      toast({ title: "Success", description: "Bill updated successfully", variant: "default" });
      setShowEditModal(false);
      setEditingBill(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update bill", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper function to calculate correct total amount for display
  const calculateBillTotal = (bill: any) => {
    if (!bill || !bill.items || !Array.isArray(bill.items)) {
      return bill?.totalAmount || 0;
    }

    // For NON_GST bills, return subtotal without GST
    if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
      const subtotal = bill.items.reduce((sum: number, item: any) => {
        const quantity = item.itemQuantity || item.quantity || 1;
        const price = item.itemPrice || item.price || 0;
        return sum + (quantity * price);
      }, 0);
      return Math.round(subtotal * 100) / 100;
    }

    // For GST bills, the entered price is already the total amount including GST
    // So we just sum up all the item prices (which are total amounts including GST)
    const totalAmount = bill.items.reduce((sum: number, item: any) => {
      const quantity = item.itemQuantity || item.quantity || 1;
      const price = item.itemPrice || item.price || 0;
      return sum + (quantity * price);
    }, 0);

    return Math.round(totalAmount * 100) / 100;
  };

  // Helper function to calculate totals (similar to BillingHistory)
  const calculateTotals = (items: any[], customerState?: string, billType?: string) => {
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

    // For GST bills, calculate GST rate based on customer state
    const getGSTPercentage = (state: string) => {
      // First check if company has custom state rates
      if (companyInfo?.states && companyInfo.states.length > 0) {
        const normalizedCustomerState = state.toLowerCase().trim();
        const matchingState = companyInfo.states.find(state => 
          state.name.toLowerCase().trim() === normalizedCustomerState
        );
        
        if (matchingState) {
          return matchingState.gstRate;
        }
      }

      // Fallback to predefined state rates
      const stateGSTRates: { [key: string]: number } = {
        'maharashtra': 10,
        'gujarat': 9,
        'karnataka': 9,
        'tamil nadu': 9,
        'west bengal': 9,
        'uttar pradesh': 9,
        'rajasthan': 9,
        'madhya pradesh': 9,
        'andhra pradesh': 9,
        'telangana': 9,
        'kerala': 9,
        'punjab': 9,
        'haryana': 9,
        'delhi': 9,
        'default': companyInfo?.defaultGstRate || 18
      };
      
      const normalizedState = state.toLowerCase().trim();
      return stateGSTRates[normalizedState] || stateGSTRates['default'];
    };
    
    const gstPercent = getGSTPercentage(customerState || 'N/A');
    
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

  // Item management functions (similar to BillingHistory)
  const handleEditItem = (item: any, itemIndex: number) => {
    setEditingItem({ ...item, index: itemIndex });
    setShowEditItemModal(true);
  };

  const handleSaveItemEdit = () => {
    if (!editingItem || editingItem.index === undefined) return;

    const updatedItems = [...editingBill.items];
    updatedItems[editingItem.index] = {
      ...updatedItems[editingItem.index],
      itemName: editingItem.itemName || editingItem.name,
      itemQuantity: editingItem.itemQuantity || editingItem.quantity,
      itemPrice: editingItem.itemPrice || editingItem.price,
      itemTotal: (editingItem.itemQuantity || editingItem.quantity) * (editingItem.itemPrice || editingItem.price)
    };

    const customerState = editingBill.customerState || editingBill.state || 'N/A';
    const totals = calculateTotals(updatedItems, customerState, editingBill.billType);
    const remainingAmount = editingBill.paymentType === "Partial"
      ? totals.totalAmount - (editingBill.paidAmount || 0)
      : 0;

    setEditingBill(prev => ({
      ...prev,
      items: updatedItems,
      ...totals,
      remainingAmount
    }));

    setEditingItem(null);
    setShowEditItemModal(false);
  };

  const handleCancelItemEdit = () => {
    setEditingItem(null);
    setShowEditItemModal(false);
  };

  const handleRemoveItem = (itemIndex: number) => {
    const updatedItems = editingBill.items.filter((_: any, index: number) => index !== itemIndex);
    const customerState = editingBill.customerState || editingBill.state || 'N/A';
    const totals = calculateTotals(updatedItems, customerState, editingBill.billType);
    const remainingAmount = editingBill.paymentType === "Partial"
      ? totals.totalAmount - (editingBill.paidAmount || 0)
      : 0;

    setEditingBill(prev => ({
      ...prev,
      items: updatedItems,
      ...totals,
      remainingAmount
    }));
  };

  const handleAddItem = () => {
    setEditingItem({
      itemName: '',
      itemQuantity: 1,
      itemPrice: 0,
      itemTotal: 0
    });
    setShowAddItemModal(true);
  };

  const handleSaveNewItem = (newItem: any) => {
    const updatedItems = [...editingBill.items, newItem];
    const customerState = editingBill.customerState || editingBill.state || 'N/A';
    const totals = calculateTotals(updatedItems, customerState, editingBill.billType);
    const remainingAmount = editingBill.paymentType === "Partial"
      ? totals.totalAmount - (editingBill.paidAmount || 0)
      : 0;

    setEditingBill(prev => ({
      ...prev,
      items: updatedItems,
      ...totals,
      remainingAmount
    }));

    setShowAddItemModal(false);
    setEditingItem(null);
  };

  const handleCustomerNameClick = async (bill: any) => {
    try {
      console.log('🔍 SimpleBilling - handleCustomerNameClick called with bill:', bill);
      console.log('🔍 SimpleBilling - Bill data available:', {
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        customerAddress: bill.customerAddress,
        customerState: bill.customerState,
        customerCity: bill.customerCity,
        customerPincode: bill.customerPincode,
        billState: bill.state,
        billPincode: bill.pincode
      });
      
      // Create customer data object with available information
      // Check both bill.customerState and bill.state for state information
      let customerData = {
        id: bill.customerId || bill.customerPhone,
        name: bill.customerName,
        phone: bill.customerPhone,
        address: bill.customerAddress,
        state: bill.customerState || bill.state || '',
        city: bill.customerCity || '',
        pincode: bill.customerPincode || bill.pincode || ''
      };
      
      // If customer state is not available in bill data, try to get it from customer service
      if (!customerData.state && bill.customerId) {
        try {
          console.log('🔍 SimpleBilling - Customer state not in bill data, trying to fetch from customer service');
          const customer = await customerService.getCustomerById(bill.customerId);
          console.log('🔍 SimpleBilling - Fetched customer from service:', customer);
          
          if (customer && customer.state) {
            customerData = {
              ...customerData,
              state: customer.state,
              city: customer.city || '',
              pincode: customer.pincode || ''
            };
            console.log('🔍 SimpleBilling - Updated customer data with state:', customerData);
          }
        } catch (error) {
          console.log('🔍 SimpleBilling - Could not fetch customer from service:', error);
        }
      }
      
      console.log('🔍 SimpleBilling - Final customer data:', customerData);
      
    setSelectedCustomer({
      id: bill.customerId || bill.customerPhone,
      name: bill.customerName,
      phone: bill.customerPhone,
      address: bill.customerAddress
    });
      setSelectedCustomerData(customerData);
    setShowCustomerDetailsModal(true);
    } catch (error) {
      console.error('Error in handleCustomerNameClick:', error);
      // Fallback to basic customer data
      const customerData = {
        id: bill.customerId || bill.customerPhone,
        name: bill.customerName,
        phone: bill.customerPhone,
        address: bill.customerAddress,
        state: '',
        city: '',
        pincode: ''
      };
      
      setSelectedCustomer({
        id: bill.customerId || bill.customerPhone,
        name: bill.customerName,
        phone: bill.customerPhone,
        address: bill.customerAddress
      });
      setSelectedCustomerData(customerData);
      setShowCustomerDetailsModal(true);
    }
  };

  const handleDownloadPDF = async (bill: any) => {
    try {
      // Import pdfGenerator dynamically to avoid build issues
      const { pdfGenerator } = await import("@/utils/pdfGenerator");

      const invoiceData = {
        billNumber: bill.billNumber || `BILL-${bill.id?.slice(-4)}`,
        billDate: bill.updatedAt || bill.createdAt || new Date().toISOString(),
        customer: {
          name: bill.customerName || "Unknown Customer",
          phone: bill.customerPhone || "",
          address: bill.customerAddress || "",
        },
        items: bill.items?.map((item: any) => ({
          itemName: item.itemName || item.name,
          itemPrice: item.itemPrice || item.price,
          itemQuantity: item.itemQuantity || item.quantity,
          itemTotal: item.itemTotal || item.total,
        })) || [],
        subtotal: bill.subtotal || 0,
        discountPercent: 0,
        discountAmount: bill.discountAmount || 0,
        gstTotal: bill.gstAmount || 0,
        cgst: (bill.gstAmount || 0) / 2,
        sgst: (bill.gstAmount || 0) / 2,
        finalAmount: bill.totalAmount || 0,
        billingMode: bill.billType || "GST",
        paymentMode: bill.paymentType || "Full",
        paidAmount: bill.paidAmount || bill.totalAmount || 0,
        pendingAmount: bill.remainingAmount || 0,
        paymentMethod: bill.paymentMethod || "Cash",
        companyInfo: {
          name: companyInfo?.name || "Savera Electronic",
          address: companyInfo?.address ?
            `${companyInfo.address.street}, ${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.pincode}` :
            "Delhi, India",
          phone: companyInfo?.phone || "+91 98765 43210",
          email: companyInfo?.email || "info@saveraelectronic.com",
          gstNumber: companyInfo?.gstNumber || "07ABCDE1234F1Z5",
          logo: companyInfo?.logo || undefined,
        },
      };

      await pdfGenerator.generateInvoicePDF(invoiceData, companyInfo);

      toast({ title: "Success", description: "PDF downloaded successfully", variant: "default" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    }
  };

  const getStatusBadge = (bill: any) => {
    // Always calculate status based on remaining amount - this is the source of truth
    const calculatedTotal = calculateBillTotal(bill);
    const calculatedRemainingAmount = calculatedTotal - (bill.paidAmount || 0);
    const isCompleted = calculatedRemainingAmount <= 0;
    const isPending = calculatedRemainingAmount > 0;
    
    console.log('🔍 SimpleBilling - Status calculation for bill:', bill.billNumber, {
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
    } else if (isPending) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Pending</Badge>;
    } else {
      return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (bill: any) => {
    // Always calculate status based on remaining amount - this is the source of truth
    const calculatedTotal = calculateBillTotal(bill);
    const calculatedRemainingAmount = calculatedTotal - (bill.paidAmount || 0);
    const isCompleted = calculatedRemainingAmount <= 0;
    const isPending = calculatedRemainingAmount > 0;
    
    // Handle draft status first
    if (bill.status === "draft") {
      return <FileText className="h-4 w-4 text-orange-600" />;
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

  const formatCurrency = (amount: number) => {
    return `₹${amount?.toLocaleString("en-IN") || 0}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN");
  };

  // Helper function to calculate pending amount
  const calculatePendingAmount = (bill: any) => {
    const totalAmount = calculateBillTotal(bill);
    const paidAmount = bill.paidAmount || 0;
    return Math.max(0, totalAmount - paidAmount);
  };

  // Helper function to check if bill is pending
  const isBillPending = (bill: any) => {
    // Always calculate based on remaining amount - this is the source of truth
    const calculatedTotal = calculateBillTotal(bill);
    const calculatedRemainingAmount = calculatedTotal - (bill.paidAmount || 0);
    return calculatedRemainingAmount > 0;
  };

  // Step 1: Customer Details
  if (invoiceStep === "customer") {
    return (
      <CustomerDetailsForm
        onBack={handleBackToMain}
        onContinue={handleCustomerContinue}
      />
    );
  }

  // Step 2: Invoice Creation (Billing Type + Add Items + Summary)
  if (invoiceStep === "invoice-creation") {
    console.log("🔍 SimpleBilling - Passing customerData to InvoiceCreationPage:", customerData);
    return (
      <InvoiceCreationPage
        customerName={customerData?.name || "Customer"}
        customerData={customerData}
        onBack={() => setInvoiceStep("customer")}
        onContinue={handleInvoiceCreationContinue}
      />
    );
  }


  // Step 3: Payment + Preview + Save/Print/Download
  if (invoiceStep === "payment") {
    return (
      <PaymentSection
        customerName={customerData?.name || "Customer"}
        customerData={customerData}
        billingType={billingType}
        items={invoiceItems}
        subtotal={invoiceSubtotal}
        billId={currentBillId}
        billNumber={currentBillNumber}
        isBillRegistered={isBillRegistered}
        onBack={() => setInvoiceStep("invoice-creation")}
        onComplete={handlePaymentComplete}
        onReset={() => {
          // Reset invoice creation state
          setInvoiceStep("main");
          setCustomerData(null);
          setBillingType("");
          setInvoiceItems([]);
          setInvoiceSubtotal(0);
          setCurrentBillId(null);
          setIsBillRegistered(false);
        }}
      />
    );
  }

  // Step: Quick Bill - Customer Search and Selection
  if (invoiceStep === "quick-bill") {
    return (
      <QuickBillPage
        onBack={() => setInvoiceStep("main")}
        onSelectCustomer={(customer) => {
          setCustomerData(customer);
          setInvoiceStep("invoice-creation");
        }}
      />
    );
  }

  // Main billing page
  return (
    <div className="p-4 space-y-6">
      {/* Quick Actions Cards */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 mb-8">
        <Card
          className="hover:shadow-lg transition-all duration-300 cursor-pointer border border-green-400 hover:border-green-500 hover:shadow-green-200/50 hover:shadow-lg"
          onClick={handleQuickBill}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Billing</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Create bills quickly with pre-filled templates and fast entry
                </p>
                <div className="flex items-center text-green-600 font-medium">
                  <Calculator className="h-4 w-4 mr-2" />
                  Start Quick Bill
                </div>
              </div>
              <div className="bg-green-100 p-3 sm:p-4 rounded-full hover:bg-green-200 transition-all duration-300 hover:scale-110 transform">
                <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-lg transition-all duration-300 cursor-pointer border border-blue-400 hover:border-blue-500 hover:shadow-blue-200/50 hover:shadow-lg"
          onClick={handleNewInvoice}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">New Invoice</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Create detailed invoices with full customer and product management
                </p>
                <div className="flex items-center text-blue-600 font-medium">
                  <FileText className="h-4 w-4 mr-2" />
                  Create Invoice
                </div>
              </div>
              <div className="bg-blue-100 p-3 sm:p-4 rounded-full hover:bg-blue-200 transition-all duration-300 hover:scale-110 transform">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bills Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sticky top-0 bg-white z-10 border-b">
            <TabsTrigger value="recent" className="flex items-center gap-2 text-sm sm:text-base">
            <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Recent Bills</span>
              <span className="sm:hidden">Recent</span>
          </TabsTrigger>
          
            <TabsTrigger value="bills" className="flex items-center gap-2 text-sm sm:text-base">
            <List className="h-4 w-4" />
              <span className="hidden sm:inline">All Bills</span>
              <span className="sm:hidden">All</span>
          </TabsTrigger>
        </TabsList>

          <TabsContent value="recent" className="space-y-4 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Bills ({bills.slice(0, 5).length})
              </h2>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading recent bills...</p>
                </div>
              ) : bills.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-muted-foreground">No recent bills found</p>
                  <p className="text-sm mt-2">Create your first bill to see it here.</p>
                </div>
              ) : (
                bills.slice(0, 5).map((bill) => (
                    <div key={bill.id} className="border rounded-lg hover:bg-gray-50 transition-colors">
                      {/* Mobile Layout */}
                      <div className="sm:hidden p-3 space-y-2">
                        {/* Top Row: Bill Number and Status */}
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleViewBill(bill)}
                            className="font-semibold text-base text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                          >
                            {bill.billNumber || `BILL-${bill.id.slice(-4)}`}
                          </button>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(bill)}
                            {getStatusBadge(bill)}
                          </div>
                        </div>

                        {/* Middle Row: Customer Name */}
                        <button
                          onClick={() => handleCustomerNameClick(bill)}
                          className="text-sm font-medium text-gray-700 hover:text-blue-800 hover:underline cursor-pointer text-left block w-full"
                        >
                          {bill.customerName || bill.customerPhone || "Unknown Customer"}
                        </button>

                        {/* Bottom Row: Date, Amount, and Actions */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {bill.createdAt ? formatDate(bill.createdAt) : "N/A"}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                            <span className="text-sm font-semibold text-green-600">
                                {formatCurrency(calculateBillTotal(bill))}
                            </span>
                              {isBillPending(bill) && (
                                <p className="text-xs text-red-600 font-medium">
                                  Pending: {formatCurrency(calculatePendingAmount(bill))}
                                </p>
                              )}
                            </div>
                            <DropdownMenu
                              open={dropdownStates[`recent-mobile-${bill.id}`] || false}
                              onOpenChange={(open) => {
                                setDropdownStates(prev => ({
                                  ...prev,
                                  [`recent-mobile-${bill.id}`]: open
                                }));
                              }}
                            >
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    handleViewBill(bill);
                                    setDropdownStates(prev => ({
                                      ...prev,
                                      [`recent-mobile-${bill.id}`]: false
                                    }));
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    handleEditBill(bill);
                                    setDropdownStates(prev => ({
                                      ...prev,
                                      [`recent-mobile-${bill.id}`]: false
                                    }));
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setBillToDelete(bill);
                                    setPasswordDialogOpen(true);
                                    setDropdownStates(prev => ({
                                      ...prev,
                                      [`recent-mobile-${bill.id}`]: false
                                    }));
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(bill)}
                          <div>
                            <button
                              onClick={() => handleViewBill(bill)}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                            >
                              {bill.billNumber || `BILL-${bill.id.slice(-4)}`}
                            </button>
                            <button
                              onClick={() => handleCustomerNameClick(bill)}
                              className="text-sm text-gray-600 hover:text-blue-800 hover:underline cursor-pointer text-left block"
                            >
                              {bill.customerName || bill.customerPhone || "Unknown Customer"}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(calculateBillTotal(bill))}</p>
                            {isBillPending(bill) && (
                              <p className="text-sm text-red-600 font-medium">
                                Pending: {formatCurrency(calculatePendingAmount(bill))}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {bill.createdAt ? formatDate(bill.createdAt) : "N/A"}
                            </p>
                          </div>
                          {getStatusBadge(bill)}
                          <DropdownMenu
                            open={dropdownStates[`recent-desktop-${bill.id}`] || false}
                            onOpenChange={(open) => {
                              setDropdownStates(prev => ({
                                ...prev,
                                [`recent-desktop-${bill.id}`]: open
                              }));
                            }}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  handleViewBill(bill);
                                  setDropdownStates(prev => ({
                                    ...prev,
                                    [`recent-desktop-${bill.id}`]: false
                                  }));
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  handleEditBill(bill);
                                  setDropdownStates(prev => ({
                                    ...prev,
                                    [`recent-desktop-${bill.id}`]: false
                                  }));
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setBillToDelete(bill);
                                  setPasswordDialogOpen(true);
                                  setDropdownStates(prev => ({
                                    ...prev,
                                    [`recent-desktop-${bill.id}`]: false
                                  }));
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))
              )}
              </div>
        </TabsContent>

            <TabsContent value="bills" className="space-y-4 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <List className="h-5 w-5" />
                {(() => {
                  const visibleBills = companyInfo?.showNonGstBills ? bills : bills.filter(b => b.billType !== 'NON_GST');
                  return `All Bills (${visibleBills.length})`;
                })()}
                </h2>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading bills...</p>
                </div>
              ) : bills.length === 0 ? (
                <div className="text-center py-8">
                  <List className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-muted-foreground">No bills found</p>
                  <p className="text-sm mt-2">Create your first bill to see it here.</p>
                </div>
              ) : (
                  (companyInfo?.showNonGstBills ? bills : bills.filter(b => b.billType !== 'NON_GST')).map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(bill)}
                      <div>
                        <button
                          onClick={() => handleViewBill(bill)}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                        >
                          {bill.billNumber || `BILL-${bill.id.slice(-4)}`}
                        </button>
                        <button
                          onClick={() => handleCustomerNameClick(bill)}
                          className="text-sm text-gray-600 hover:text-blue-800 hover:underline cursor-pointer text-left block"
                        >
                          {bill.customerName || bill.customerPhone || "Unknown Customer"}
                        </button>
                      </div>
                      </div>
                      <div className="flex items-center gap-3">
                      <div className="text-right">
                          <p className="font-medium">₹{calculateBillTotal(bill).toLocaleString()}</p>
                          {isBillPending(bill) && (
                            <p className="text-sm text-red-600 font-medium">
                              Pending: ₹{calculatePendingAmount(bill).toLocaleString()}
                            </p>
                          )}
                        <p className="text-sm text-muted-foreground">
                          {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                        {getStatusBadge(bill)}
                    </div>
                </div>
                  ))
              )}
              </div>
        </TabsContent>
      </Tabs>
        </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete bill {billToDelete?.billNumber || billToDelete?.id}? This action cannot be undone.
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

      {/* Bill View Modal */}
      {showBillViewModal && viewingBill && (
        <Dialog open={showBillViewModal} onOpenChange={setShowBillViewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Bill Details - {viewingBill?.billNumber || `BILL-${viewingBill?.id?.slice(-4) || 'Unknown'}`}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  {viewingBill ? getStatusBadge(viewingBill) : <Badge variant="outline">Unknown</Badge>}
                  <Button
                    size="sm"
                    onClick={() => viewingBill && handleEditBill(viewingBill)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {viewingBill?.status === "draft" ? "Continue" : "Edit"}
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
                        <span className="font-medium">{viewingBill?.billNumber || `BILL-${viewingBill?.id?.slice(-4) || 'Unknown'}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bill Type:</span>
                        <Badge variant={viewingBill?.billType === "GST" ? "default" : "secondary"}>
                          {viewingBill?.billType || "GST"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">
                          {viewingBill?.createdAt ? formatDate(viewingBill.createdAt) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        {viewingBill ? getStatusBadge(viewingBill) : <Badge variant="outline">Unknown</Badge>}
                      </div>
                    </div>

                    {/* Quick Edit Actions */}
                    <div className="pt-3 border-t">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => viewingBill && handleEditBill(viewingBill)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          {viewingBill?.status === "draft" ? "Continue Editing" : "Edit Bill"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewingBill && handleDownloadPDF(viewingBill)}
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
                        <span className="font-medium">{viewingBill?.customerName || "Unknown Customer"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{viewingBill?.customerPhone || "N/A"}</span>
                      </div>
                      {viewingBill?.customerAddress && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="text-sm">
                            <p>{viewingBill.customerAddress}</p>
                            {(viewingBill.state || viewingBill.pincode) && (
                              <p className="text-gray-600 text-xs">
                                {viewingBill.state && viewingBill.pincode ? 
                                  `${viewingBill.state} - ${viewingBill.pincode}` : 
                                  viewingBill.state || viewingBill.pincode}
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
                  Items ({viewingBill.items?.length || 0})
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">Item</th>
                        <th className="text-right p-3 font-medium">Qty</th>
                        <th className="text-right p-3 font-medium">Price</th>
                        <th className="text-right p-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingBill.items?.map((item: any, index: number) => (
                        <tr key={index} className="border-t">
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{item?.itemName || item?.name || "Unknown Item"}</div>
                              {item?.description && (
                                <div className="text-sm text-muted-foreground">{item.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">{item?.itemQuantity || item?.quantity || 0}</td>
                          <td className="p-3 text-right">{formatCurrency(item?.itemPrice || item?.price || 0)}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(item?.itemTotal || item?.total || 0)}</td>
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

              {/* Bill Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(viewingBill?.subtotal || 0)}</span>
                  </div>
                  {(viewingBill?.discountAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span className="text-green-600">-{formatCurrency(viewingBill?.discountAmount || 0)}</span>
                    </div>
                  )}
                  {(viewingBill?.gstAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>GST ({viewingBill?.gstPercent || 18}%):</span>
                      <span>{formatCurrency(viewingBill?.gstAmount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(viewingBill?.totalAmount || 0)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Payment Type:</span>
                    <Badge variant={viewingBill?.paymentType === "Full" ? "default" : "destructive"}>
                      {viewingBill?.paymentType || "Full"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid Amount:</span>
                    <span>{formatCurrency(viewingBill?.paidAmount || viewingBill?.totalAmount || 0)}</span>
                  </div>
                  {(viewingBill?.remainingAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Remaining:</span>
                      <span className="text-red-600 font-medium">{formatCurrency(
                        viewingBill?.remainingAmount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="capitalize">{viewingBill?.paymentMethod || "Cash"}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Primary Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => viewingBill && handleEditBill(viewingBill)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {viewingBill?.status === "draft" ? "Continue Editing" : "Edit Bill"}
                    </Button>
                    <Button
                      onClick={() => viewingBill && handleDownloadPDF(viewingBill)}
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
                        setBillToDelete(viewingBill);
                        setPasswordDialogOpen(true);
                        setShowBillViewModal(false);
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Bill
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowBillViewModal(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                {/* Edit Status Info */}
                {viewingBill?.status === "draft" && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Draft Bill</span>
                    </div>
                    <p className="text-sm text-orange-700 mt-1">
                      This is a draft bill. Click "Continue Editing" to modify and complete it.
                    </p>
                  </div>
                )}

                {viewingBill.status !== "draft" && viewingBill.paymentType === "Partial" && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Partial Payment</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      This bill has partial payment. You can edit payment details or mark as completed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* all bill Edit Modal - SimpleBilling */}
      {showEditModal && editingBill && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-[98vw] sm:max-w-2xl max-h-[98vh] overflow-y-auto w-full mx-1 sm:mx-auto" style={{ maxWidth: 'calc(100vw - 8px)', margin: '4px' }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
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
                  defaultValue={`${editingBill.customerAddress || ''}${editingBill.state ? `, ${editingBill.state}` : ''}${editingBill.pincode ? ` - ${editingBill.pincode}` : ''}`}
                  className="w-full mt-1 px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  onChange={(e) => {
                    setEditingBill(prev => ({ ...prev, customerAddress: e.target.value }));
                  }}
                />
              </div>

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
                            <th className="px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium text-gray-700" style={{ width: '35%', minWidth: '100px' }}>Item</th>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium text-gray-700" style={{ width: '15%', minWidth: '50px' }}>Qty</th>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium text-gray-700" style={{ width: '20%', minWidth: '70px' }}>Price</th>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium text-gray-700" style={{ width: '20%', minWidth: '70px' }}>Total</th>
                            <th className="px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-medium text-gray-700" style={{ width: '10%', minWidth: '50px' }}>
                              <span className="hidden sm:inline">Actions</span>
                              <span className="sm:hidden">⋯</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {editingBill.items?.map((item: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', wordWrap: 'break-word' }}>
                                {item.itemName || item.name || 'N/A'}
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 currency-cell">
                                {item.itemQuantity || item.quantity || 1}
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 currency-cell">
                                ₹{(item.itemPrice || item.price || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 currency-cell">
                                ₹{((item.itemQuantity || item.quantity || 1) * (item.itemPrice || item.price || 0)).toLocaleString('en-IN')}
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditItem(item, index)}>
                                      <Edit className="h-3 w-3 mr-2" />
                                      Edit Item
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleRemoveItem(index)}
                                      className="text-red-600 focus:text-red-600"
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

              {/* Payment Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Payment Type</label>
                  <select
                    defaultValue={editingBill.paymentType}
                    className="w-full mt-1 px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      const newPaymentType = e.target.value;
                      const remainingAmount = newPaymentType === "Partial"
                        ? editingBill.totalAmount - (editingBill.paidAmount || 0)
                        : 0;
                      setEditingBill(prev => ({
                        ...prev,
                        paymentType: newPaymentType,
                        remainingAmount: Math.max(0, remainingAmount)
                      }));
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
                    <option value="mixed">Mixed</option>
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
                      const remainingAmount = Math.max(0, editingBill.totalAmount - paidAmount);
                      setEditingBill(prev => ({
                        ...prev,
                        paidAmount,
                        remainingAmount
                      }));
                    }}
                  />
                </div>
              )}

              {/* Bill Summary */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">Bill Summary</h3>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="currency-cell">₹{(editingBill.subtotal || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {editingBill.gstAmount > 0 && (
                    <div className="flex justify-between">
                      <span>GST ({editingBill.gstPercent || 18}%):</span>
                      <span className="currency-cell">₹{(editingBill.gstAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total Amount:</span>
                    <span className="currency-cell">₹{(editingBill.totalAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {editingBill.paymentType === "Partial" && (
                    <div className="flex justify-between text-red-600">
                      <span>Remaining:</span>
                      <span className="currency-cell">₹{(editingBill.remainingAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleUpdateBill(editingBill.id, editingBill)}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base"
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Bill
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="text-sm sm:text-base"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                    onChange={(e) => setEditingItem(prev => ({ ...prev, itemQuantity: parseInt(e.target.value) || 1, quantity: parseInt(e.target.value) || 1 }))}
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
                    onChange={(e) => setEditingItem(prev => ({ ...prev, itemPrice: parseFloat(e.target.value) || 0, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              {editingItem && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">
                    Total: ₹{((editingItem.itemQuantity || editingItem.quantity || 1) * (editingItem.itemPrice || editingItem.price || 0)).toLocaleString('en-IN')}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (editingItem && (editingItem.itemName || editingItem.name)) {
                      const newItem = {
                        itemName: editingItem.itemName || editingItem.name,
                        itemQuantity: editingItem.itemQuantity || editingItem.quantity || 1,
                        itemPrice: editingItem.itemPrice || editingItem.price || 0,
                        itemTotal: (editingItem.itemQuantity || editingItem.quantity || 1) * (editingItem.itemPrice || editingItem.price || 0)
                      };
                      handleSaveNewItem(newItem);
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
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editItemName">Item Name</Label>
                <Input
                  id="editItemName"
                  defaultValue={editingItem.itemName || editingItem.name}
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
                    onChange={(e) => setEditingItem(prev => ({ ...prev, itemQuantity: parseInt(e.target.value) || 1, quantity: parseInt(e.target.value) || 1 }))}
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
                    onChange={(e) => setEditingItem(prev => ({ ...prev, itemPrice: parseFloat(e.target.value) || 0, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">
                  Total: ₹{((editingItem.itemQuantity || editingItem.quantity || 1) * (editingItem.itemPrice || editingItem.price || 0)).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveItemEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
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

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          isOpen={showCustomerDetailsModal}
          onClose={() => {
            setShowCustomerDetailsModal(false);
            setSelectedCustomer(null);
            setSelectedCustomerData(null);
          }}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          customerPhone={selectedCustomer.phone}
          customerAddress={selectedCustomer.address}
          customerData={selectedCustomerData}
        />
      )}
    </div>
  );
}
