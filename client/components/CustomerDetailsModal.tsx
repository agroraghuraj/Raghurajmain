import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Receipt, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download,
  Plus,
  IndianRupee,
} from 'lucide-react';
import { customerService } from '@/services/customerService';
import { billingService } from '@/services/billingService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PasswordProtection from '@/components/PasswordProtection';
import { pdfGenerator, InvoiceData } from '@/utils/pdfGenerator';
import { buildBillTemplateHTML, generatePDFBlobFromHTML } from '@/utils/billTemplatePDF';
import { useCompany } from '@/contexts/CompanyContext';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerData?: any; // Add customer data prop
  customerState?: string;
  customerPincode?: string;
  customerCity?: string;
}

interface CustomerBill {
  id: string;
  billNumber: string;
  billDate: string;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount: number;
  paymentType: 'Full' | 'Partial';
  status?: string;
  items: any[];
  createdAt: string;
  subtotal?: number;
  gstAmount?: number;
  billType?: 'GST' | 'NON_GST' | 'QUOTATION' | 'Demo';
  paymentMethod?: string;
  customerState?: string;
  state?: string;
  customerPincode?: string;
  pincode?: string;
  customerCity?: string;
  city?: string;
  customerGstin?: string;
}

export default function CustomerDetailsModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  customerPhone,
  customerAddress,
  customerState,        
  customerPincode,  
  customerCity, 
  customerData
}: CustomerDetailsModalProps) {
  const { companyInfo } = useCompany();
  const [customerBills, setCustomerBills] = useState<CustomerBill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<CustomerBill | null>(null);
  const [customerStats, setCustomerStats] = useState({
    totalBills: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    lastPurchase: null as string | null
  });
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [previewingBill, setPreviewingBill] = useState<CustomerBill | null>(null);
  const navigate = useNavigate();

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
      console.log('🔍 NON_GST bill - returning subtotal without GST:', subtotal);
      return Math.round(subtotal * 100) / 100;
    }

    // For GST bills, the entered price is already the total amount including GST
    // So we just sum up all the item prices (which are total amounts including GST)
    const totalAmount = bill.items.reduce((sum: number, item: any) => {
      const quantity = item.itemQuantity || item.quantity || 1;
      const price = item.itemPrice || item.price || 0;
      return sum + (quantity * price);
    }, 0);

    console.log('🔍 calculateBillTotal for GST bill:', bill.id, {
      totalAmount,
      customerState: bill.customerState || bill.state || customerState || 'N/A',
      companyState: companyInfo?.address?.state
    });

    return Math.round(totalAmount * 100) / 100;
  };

  // Calculate dynamic GST based on state settings (same logic as BillPreviewPage)
  const calculateDynamicGST = (billData: any, companyInfo: any) => {
    if (!billData || !companyInfo) return { gstPercent: 18, gstAmount: 0 };
    
    const companyState = companyInfo.address?.state?.toLowerCase();
    const customerState = (billData as any).state?.toLowerCase();
    
    console.log('🔍 Dynamic GST calculation:');
    console.log('🔍 Company State:', companyState);
    console.log('🔍 Customer State:', customerState);
    console.log('🔍 Company States:', companyInfo.states);
    
    let gstPercent = companyInfo.defaultGstRate || 18; // Use company default
    
    if (companyState && customerState) {
      if (companyState === customerState) {
        // Same state - use GST from company settings
        if (companyInfo.states && companyInfo.states.length > 0) {
          const stateInfo = companyInfo.states.find(state => 
            state.name.toLowerCase() === customerState
          );
          if (stateInfo && stateInfo.gstRate > 0) {
            gstPercent = stateInfo.gstRate;
            console.log('🔍 Using state-specific GST rate:', gstPercent);
          } else {
            gstPercent = companyInfo.defaultGstRate || 18;
            console.log('🔍 Using default GST rate (state not found):', gstPercent);
          }
        }
      } else {
        // Different state - use IGST
        if (companyInfo.states && companyInfo.states.length > 0) {
          const stateInfo = companyInfo.states.find(state => 
            state.name.toLowerCase() === customerState
          );
          if (stateInfo && stateInfo.gstRate > 0) {
            gstPercent = stateInfo.gstRate;
            console.log('🔍 Using state-specific IGST rate:', gstPercent);
          } else {
            gstPercent = companyInfo.defaultGstRate || 18;
            console.log('🔍 Using default IGST rate (state not found):', gstPercent);
          }
        }
      }
    }
    
    // Calculate subtotal from items if not available
    let subtotal = billData.subtotal || 0;
    if (subtotal === 0 && billData.items && Array.isArray(billData.items)) {
      subtotal = billData.items.reduce((sum: number, item: any) => {
        const quantity = item.itemQuantity || item.quantity || 1;
        const price = item.itemPrice || item.price || 0;
        return sum + (quantity * price);
      }, 0);
    }
    
    const gstAmount = subtotal * (gstPercent / 100);
    
    console.log('🔍 Final GST calculation:', { gstPercent, gstAmount, subtotal, items: billData.items });
    console.log('🔍 GST calculation details:');
    console.log('🔍 - Company default GST rate:', companyInfo.defaultGstRate);
    console.log('🔍 - Company states:', companyInfo.states);
    console.log('🔍 - Final gstPercent:', gstPercent);
    console.log('🔍 - Final gstAmount:', gstAmount);
    
    return { gstPercent, gstAmount };
  };

  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomerBills();
      fetchCustomerDetails();
    }
  }, [isOpen, customerId]);

  const fetchCustomerBills = async () => {
    setIsLoading(true);
    try {
      const bills = await billingService.getBillsByCustomer(customerId);
      setCustomerBills(bills);
      
      // Calculate customer stats using calculateBillTotal for accurate amounts
      console.log('🔍 CustomerDetailsModal - Bills data:', bills);
      bills.forEach((bill, index) => {
        console.log(`🔍 CustomerDetailsModal - Bill ${index}:`, {
          id: bill.id,
          totalAmount: bill.totalAmount,
          paidAmount: bill.paidAmount,
          calculatedTotal: calculateBillTotal(bill),
          items: bill.items,
          customerState: (bill as any).customerState,
          state: (bill as any).state
        });
      });
      
      const stats = {
        totalBills: bills.length,
        totalAmount: bills.reduce((sum, bill) => sum + calculateBillTotal(bill), 0),
        paidAmount: bills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0),
        pendingAmount: bills.reduce((sum, bill) => sum + (calculateBillTotal(bill) - (bill.paidAmount || 0)), 0),
        lastPurchase: bills.length > 0 ? bills[0].createdAt : null
      };
      
      console.log('🔍 CustomerDetailsModal - Calculated stats:', stats);
      console.log('🔍 CustomerDetailsModal - Individual bill calculations:');
      bills.forEach((bill, index) => {
        const calculatedTotal = calculateBillTotal(bill);
        const paidAmount = bill.paidAmount || 0;
        const pendingAmount = calculatedTotal - paidAmount;
        console.log(`🔍 Bill ${index}: DB Total=${bill.totalAmount}, Calculated Total=${calculatedTotal}, Paid=${paidAmount}, Pending=${pendingAmount}`);
      });
      
      setCustomerStats(stats);
    } catch (error) {
      console.error('Error fetching customer bills:', error);
      toast.error('Failed to fetch customer bills');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerDetails = async () => {
    try {
      console.log('🔍 CustomerDetailsModal - Fetching customer with ID:', customerId);
      console.log('🔍 CustomerDetailsModal - Customer data passed as prop:', customerData);
      
      // Always prioritize the customerData prop if it has any location information
      if (customerData && (customerData.state || customerData.city || customerData.pincode)) {
        console.log('🔍 CustomerDetailsModal - Using passed customer data');
        console.log('🔍 CustomerDetailsModal - Customer state from prop:', customerData.state);
        console.log('🔍 CustomerDetailsModal - Customer city from prop:', customerData.city);
        console.log('🔍 CustomerDetailsModal - Customer pincode from prop:', customerData.pincode);
        setCustomerDetails(customerData);
        return;
      }
      
      // If customerData doesn't have location info, try API call only for non-phone number IDs
      console.log('🔍 CustomerDetailsModal - Customer data missing location info, trying API call');
      
      // Check if customerId is a phone number (contains only digits and is 10+ digits)
      const isPhoneNumber = /^\d{10,}$/.test(customerId);
      
      if (isPhoneNumber) {
        console.log('🔍 CustomerDetailsModal - Phone number detected, using customerData as fallback');
        // For phone numbers, use customerData as fallback to avoid 404 error
        if (customerData) {
          setCustomerDetails(customerData);
        }
        return;
      }
      
      // Only try API call for non-phone number IDs
      try {
        let customer;
        try {
          // First try to get customer by ID
          customer = await customerService.getCustomerById(customerId);
          console.log('🔍 CustomerDetailsModal - Fetched customer details by ID:', customer);
        } catch (idError) {
          console.log('🔍 CustomerDetailsModal - ID lookup failed, trying name search:', idError);
          // If ID lookup fails, try searching by name
          try {
            const searchResults = await customerService.searchCustomers(customerId);
            if (searchResults && searchResults.length > 0) {
              // Use the first search result
              customer = searchResults[0];
              console.log('🔍 CustomerDetailsModal - Found customer by name search:', customer);
            } else {
              throw new Error('No customer found with the given name');
            }
          } catch (searchError) {
            console.log('🔍 CustomerDetailsModal - Name search also failed:', searchError);
            throw searchError;
          }
        }
        
        console.log('🔍 CustomerDetailsModal - Customer state:', customer.state);
        console.log('🔍 CustomerDetailsModal - Customer address:', customer.address);
        console.log('🔍 CustomerDetailsModal - Customer city:', customer.city);
        console.log('🔍 CustomerDetailsModal - Customer pincode:', customer.pincode);
        setCustomerDetails(customer);
      } catch (apiError) {
        console.log('🔍 CustomerDetailsModal - API call failed, using customerData as fallback:', apiError);
        // Use customerData as fallback even if it doesn't have complete location info
        if (customerData) {
          setCustomerDetails(customerData);
        }
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      // Use customerData as final fallback
      if (customerData) {
        console.log('🔍 CustomerDetailsModal - Using customerData as final fallback');
        setCustomerDetails(customerData);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      return dateObj.toLocaleDateString("en-IN");
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (bill: CustomerBill) => {
    // Always calculate status based on remaining amount - this is the source of truth
    const calculatedTotal = calculateBillTotal(bill);
    const calculatedRemainingAmount = calculatedTotal - (bill.paidAmount || 0);
    const isCompleted = calculatedRemainingAmount <= 0;
    const isPending = calculatedRemainingAmount > 0;
    
    console.log('🔍 CustomerDetailsModal - Status calculation for bill:', bill.billNumber, {
      calculatedTotal,
      paidAmount: bill.paidAmount,
      calculatedRemainingAmount,
      paymentType: bill.paymentType,
      isPending,
      isCompleted,
      backendStatus: bill.status
    });
    
    // Handle draft status first
    if (bill.status === 'draft') {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Draft</Badge>;
    }
    
    // Force correct status based on remaining amount
    if (isCompleted) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
    } else if (isPending) {
      return <Badge variant="destructive" className="bg-orange-100 text-orange-800">Pending</Badge>;
    } else {
      return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (bill: CustomerBill) => {
    // Always calculate status based on remaining amount - this is the source of truth
    const calculatedTotal = calculateBillTotal(bill);
    const calculatedRemainingAmount = calculatedTotal - (bill.paidAmount || 0);
    const isCompleted = calculatedRemainingAmount <= 0;
    const isPending = calculatedRemainingAmount > 0;
    
    // Handle draft status first
    if (bill.status === 'draft') {
      return <Edit className="h-4 w-4 text-yellow-600" />;
    }
    
    // Force correct icon based on remaining amount
    if (isCompleted) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (isPending) {
      return <AlertCircle className="h-4 w-4 text-orange-600" />;
    } else {
      return <Receipt className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleViewBill = async (bill: CustomerBill) => {
    try {
      console.log('🔍 Viewing bill:', bill);
      console.log('🔍 Bill items:', bill.items);
      console.log('🔍 Items length:', bill.items?.length);
      if (bill.items && bill.items.length > 0) {
        console.log('🔍 First item structure:', bill.items[0]);
        console.log('🔍 First item keys:', Object.keys(bill.items[0]));
      }
      navigate('/bill-preview', { state: { bill } });
    } catch (error) {
      console.error('Error viewing bill:', error);
      toast.error('Failed to view bill');
    }
  };

  const handleEditBill = (bill: CustomerBill) => {
    try {
      console.log("🔍 Editing bill from CustomerDetailsModal:", bill);
      console.log("🆔 Bill ID:", bill.id);
      console.log("📄 Bill Number:", bill.billNumber);
      console.log("📊 Bill Status:", bill.status);
      
      if (bill.status === "draft") {
        // For drafts, navigate to billing page
        navigate("/billing", { state: { editBill: bill } });
        onClose();
      } else {
        // For completed bills, navigate to billing page with edit state
        navigate("/billing", { state: { editBill: bill } });
        onClose();
      }
    } catch (error) {
      console.error("Error editing bill:", error);
      toast.error("Failed to edit bill");
    }
  };


  const handleDeleteBill = async (bill: CustomerBill) => {
    try {
      await billingService.deleteBill(bill.id);
      toast.success('Bill deleted successfully');
      fetchCustomerBills(); // Refresh the list
    } catch (error) {
      toast.error('Failed to delete bill');
    }
  };

  const handleDeleteWithPassword = (password: string) => {
    if (billToDelete) {
      handleDeleteBill(billToDelete);
    }
    setPasswordDialogOpen(false);
    setBillToDelete(null);
  };

  const handleDownloadPDF = async (bill: CustomerBill) => {
    try {
      console.log('Downloading PDF for bill:', bill);
      
      // Ensure we have valid bill data
      if (!bill.billNumber || !bill.totalAmount) {
        toast.error('Invalid bill data for PDF generation');
        return;
      }

      // Get customer state for GST calculation
      const customerStateForGST = (bill as any).state?.toLowerCase() || 
                                 (bill as any).customerState?.toLowerCase() || 
                                 customerDetails?.state?.toLowerCase();
      
      // Create bill data with customer state for GST calculation
      const billForGST = {
        ...bill,
        state: customerStateForGST
      };
      
      // Calculate proper values using the new GST logic
      // The entered price is the total amount including GST
      const totalAmount = bill.items.reduce((sum: number, item: any) => {
        const quantity = item.itemQuantity || item.quantity || item.qty || 1;
        const price = item.itemPrice || item.price || 0;
        return sum + (quantity * price);
      }, 0);
      
      // Get GST percentage
      const { gstPercent } = calculateDynamicGST(billForGST, companyInfo);
      
      // Calculate base amount (subtotal) by reverse calculation
      const subtotal = totalAmount / (1 + gstPercent / 100);
      
      // Calculate GST amount
      const gstAmount = totalAmount - subtotal;
      
      console.log('🔍 New GST Calculation:');
      console.log('🔍 - Total Amount (entered):', totalAmount);
      console.log('🔍 - GST Percent:', gstPercent);
      console.log('🔍 - Subtotal (base):', subtotal);
      console.log('🔍 - GST Amount:', gstAmount);

      // Determine if it's interstate (IGST) or intrastate (CGST/SGST)
      const companyState = companyInfo?.address?.state?.toLowerCase();
      // Try to get customer state from multiple sources
      const customerStateFromBill = (bill as any).state?.toLowerCase() || 
                                   (bill as any).customerState?.toLowerCase() || 
                                   customerDetails?.state?.toLowerCase();
      const isInterstate = companyState && customerStateFromBill && companyState !== customerStateFromBill;
      
      console.log('🔍 CustomerDetailsModal PDF Debug:');
      console.log('🔍 - subtotal:', subtotal);
      console.log('🔍 - gstPercent:', gstPercent);
      console.log('🔍 - gstAmount:', gstAmount);
      console.log('🔍 - totalAmount:', totalAmount);
      console.log('🔍 - isInterstate:', isInterstate);
      console.log('🔍 - companyState:', companyState);
      console.log('🔍 - customerStateFromBill:', customerStateFromBill);
      console.log('🔍 - bill.state:', (bill as any).state);
      console.log('🔍 - bill.customerState:', (bill as any).customerState);
      console.log('🔍 - customerDetails.state:', customerDetails?.state);
      
      // Transform bill data to match BillTemplate format
      const billData = {
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress || 'N/A',
        billingType: bill.billType || 'GST',
        items: (bill.items || []).map((item: any) => {
          const quantity = item.itemQuantity || item.quantity || item.qty || 1;
          const enteredPrice = item.itemPrice || item.price || 0;
          const totalEnteredPrice = quantity * enteredPrice;
          
          // For NON_GST bills, show the entered price as total
          if (bill.billType === 'NON_GST') {
            return {
              name: item.itemName || item.name || item.productName || 'Unknown Item',
              price: enteredPrice,
              quantity: quantity,
              total: totalEnteredPrice,
              gstAmount: 0,
            };
          }
          
          // For GST bills, calculate base amount (after removing GST)
          const baseAmount = totalEnteredPrice / (1 + gstPercent / 100);
          const itemGstAmount = totalEnteredPrice - baseAmount;
          
          return {
            name: item.itemName || item.name || item.productName || 'Unknown Item',
            price: enteredPrice, // Show entered price (total including GST)
            quantity: quantity,
            total: baseAmount, // Show base amount (after removing GST)
            gstAmount: itemGstAmount,
          };
        }),
        subtotal: subtotal,
        gstTotal: gstAmount,
        gstPercent: gstPercent,
        isInterstate: isInterstate || false,
        totalAmount: totalAmount,
        paidAmount: bill.paidAmount || 0,
        remainingAmount: totalAmount - (bill.paidAmount || 0),
        paymentMethod: bill.paymentMethod || 'cash',
        paymentType: bill.paymentType || 'Full',
        billNumber: bill.billNumber,
        companyInfo: {
          name: companyInfo?.name || 'Company Name',
          address: companyInfo?.address ? 
            `${companyInfo.address.street || ''}, ${companyInfo.address.city || ''}, ${companyInfo.address.state || ''} ${companyInfo.address.pincode || ''}`.trim() : 
            'Company Address',
          phone: companyInfo?.phone || 'Company Phone',
          email: companyInfo?.email || 'Company Email',
          gstNumber: companyInfo?.gstNumber || '',
          logo: companyInfo?.logo || undefined,
        },
      };


      console.log('Generated bill data:', billData);

      // Build invoice HTML only (logo header already applied in template)
      const baseHtml = buildBillTemplateHTML(billData as any, companyInfo);
      const blob = await generatePDFBlobFromHTML(baseHtml);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Invoice-${bill.billNumber || new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleDownloadCustomerDetails = async () => {
    try {
      // Create customer details PDF
      // Choose a reference bill to list products (most recent)
      const billForProducts = customerBills && customerBills.length > 0 ? customerBills[0] : null;

      const customerDetailsData = {
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress || customerDetails?.address || 'N/A',
        customerState: customerState || customerDetails?.state || (customerBills[0]?.customerState || customerBills[0]?.state) || 'N/A',
        customerPincode: customerPincode || customerDetails?.pincode || (customerBills[0]?.customerPincode || customerBills[0]?.pincode) || 'N/A',
        customerCity: customerCity || customerDetails?.city || (customerBills[0]?.customerCity || customerBills[0]?.city) || 'N/A',
        customerGstin: customerDetails?.gstin || customerBills[0]?.customerGstin || '',
        totalBills: customerStats.totalBills,
        totalAmount: customerStats.totalAmount,
        paidAmount: customerStats.paidAmount,
        pendingAmount: customerStats.pendingAmount,
        lastPurchase: customerStats.lastPurchase ? new Date(customerStats.lastPurchase).toLocaleDateString() : 'N/A',
        bills: customerBills.map(bill => {
          const calculatedTotal = calculateBillTotal(bill);
          const calculatedRemainingAmount = calculatedTotal - (bill.paidAmount || 0);
          const isCompleted = calculatedRemainingAmount <= 0;
          const isPending = calculatedRemainingAmount > 0;
          const isDraft = (bill as any).status === "draft";
          
          let status = 'pending';
          if (isDraft) {
            status = 'draft';
          } else if (isCompleted) {
            status = 'completed';
          } else if (isPending) {
            status = 'pending';
          }
          
          return {
            billNumber: bill.billNumber,
            billDate: bill.billDate || bill.createdAt ? new Date(bill.billDate || bill.createdAt).toLocaleDateString() : 'N/A',
            totalAmount: calculatedTotal,
            paidAmount: bill.paidAmount || 0,
            remainingAmount: calculatedRemainingAmount,
            paymentType: bill.paymentType,
            status: status
          };
        })
      };

      // Build per-bill sections: each bill followed by its products table
      const billsSectionsHtml = (customerBills || []).map((b) => {
        const calculatedTotal = calculateBillTotal(b);
        const paidAmount = b.paidAmount || 0;
        const remainingAmount = calculatedTotal - paidAmount;
        const isCompleted = remainingAmount <= 0;
        const status = (b as any).status === 'draft' ? 'Draft' : isCompleted ? 'Paid' : 'Pending';

        const rows = (b.items || []).map((item: any, idx: number) => {
          const q = item.itemQuantity || item.quantity || item.qty || 1;
          const p = item.itemPrice || item.price || 0;
          const t = q * p;
          const name = item.itemName || item.name || item.productName || 'Item';
          return `
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${idx + 1}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px;">${name}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${q}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">₹${p.toFixed(2)}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">₹${t.toFixed(2)}</td>
            </tr>`;
        }).join('');

        return `
          <div style="background: #ffffff; padding: 16px; border-radius: 8px; margin-top: 20px; border: 1px solid #e5e7eb;">
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="font-size:14px; color:#111827;"><strong>Bill:</strong> ${b.billNumber || 'N/A'}</div>
              <div style="font-size:12px; color:#6b7280;"><strong>Date:</strong> ${b.billDate ? new Date(b.billDate).toLocaleDateString() : (b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'N/A')}</div>
            </div>
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div style="font-size:12px; color:#374151;"><strong>Total:</strong> ₹${calculatedTotal.toLocaleString()}</div>
              <div style="font-size:12px; color:#374151;"><strong>Paid:</strong> ₹${paidAmount.toLocaleString()}</div>
              <div style="font-size:12px; color:#374151;"><strong>Remaining:</strong> ₹${remainingAmount.toLocaleString()}</div>
              <div style="font-size:12px; color:#374151;"><strong>Status:</strong> ${status}</div>
            </div>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 12px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="border: 1px solid #d1d5db; padding: 6px; text-align: center; width: 8%;">Sr.No.</th>
                  <th style="border: 1px solid #d1d5db; padding: 6px; text-align: left;">Product</th>
                  <th style="border: 1px solid #d1d5db; padding: 6px; text-align: center; width: 12%;">Qty</th>
                  <th style="border: 1px solid #d1d5db; padding: 6px; text-align: right; width: 15%;">Rate</th>
                  <th style="border: 1px solid #d1d5db; padding: 6px; text-align: right; width: 15%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>`;
      }).join('');

      // Generate PDF content
      const pdfContent = `
        <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #111827; margin-bottom: 10px;">Customer Details Report</h1>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              ${companyInfo?.logo ? `<div style="margin-bottom:10px; display:flex; justify-content:center;"><img src="${companyInfo.logo}" crossorigin="anonymous" alt="Logo" style="width:70px;height:70px;border-radius:8px;object-fit:cover;"/></div>` : ''}
              <p style="margin: 5px 0; color: #4b5563;"><strong>Address:</strong> ${companyInfo?.address ? 
                `${companyInfo.address.street || ''}, ${companyInfo.address.city || ''}, ${companyInfo.address.state || ''} ${companyInfo.address.pincode || ''}`.trim() : 
                'Company Address'}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Phone:</strong> ${companyInfo?.phone || 'Company Phone'}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Email:</strong> ${companyInfo?.email || 'Company Email'}</p>
              ${companyInfo?.gstNumber ? `<p style="margin: 5px 0; color: #4b5563;"><strong>GST Number:</strong> ${companyInfo.gstNumber}</p>` : ''}
            </div>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #111827; margin-bottom: 15px;">Customer Information</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <p><strong>Name:</strong> ${customerDetailsData.customerName || 'N/A'}</p>
              <p><strong>Phone:</strong> ${customerDetailsData.customerPhone || 'N/A'}</p>
              ${customerDetailsData.customerGstin ? `<p><strong>GSTIN:</strong> ${customerDetailsData.customerGstin}</p>` : ''}
              <p><strong>Address:</strong> ${customerDetailsData.customerAddress || 'N/A'}${customerDetailsData.customerState ? `, ${customerDetailsData.customerState}` : ''}${customerDetailsData.customerPincode ? ` ${customerDetailsData.customerPincode}` : ''}</p>
              <p><strong>City:</strong> ${customerDetailsData.customerCity || 'N/A'}</p>
            </div>
          </div>

          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #111827; margin-bottom: 15px;">Transaction Summary</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <p><strong>Total Bills:</strong> ${customerDetailsData.totalBills || 0}</p>
              <p><strong>Total Amount:</strong> ₹${(customerDetailsData.totalAmount || 0).toLocaleString()}</p>
              <p><strong>Paid Amount:</strong> ₹${(customerDetailsData.paidAmount || 0).toLocaleString()}</p>
              <p><strong>Pending Amount:</strong> ₹${(customerDetailsData.pendingAmount || 0).toLocaleString()}</p>
              <p><strong>Last Purchase:</strong> ${customerDetailsData.lastPurchase || 'N/A'}</p>
            </div>
          </div>

          <div>
            <h2 style="color: #111827; margin-bottom: 15px;">Bills & Products</h2>
            ${billsSectionsHtml}
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
            <p style="margin: 5px 0;"><strong>${companyInfo?.name || 'Company Name'}</strong></p>
            <p style="margin: 5px 0; font-size: 14px;">${companyInfo?.address ? 
              `${companyInfo.address.street || ''}, ${companyInfo.address.city || ''}, ${companyInfo.address.state || ''} ${companyInfo.address.pincode || ''}`.trim() : 
              'Company Address'}</p>
            <p style="margin: 5px 0; font-size: 14px;">Phone: ${companyInfo?.phone || 'Company Phone'} | Email: ${companyInfo?.email || 'Company Email'}</p>
            ${companyInfo?.gstNumber ? `<p style="margin: 5px 0; font-size: 14px;">GST Number: ${companyInfo.gstNumber}</p>` : ''}
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      `;

      // Create temporary element for PDF generation
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.padding = '20px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.innerHTML = pdfContent;
      document.body.appendChild(tempDiv);

      // Generate PDF
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
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
      
      // Clean up
      document.body.removeChild(tempDiv);
      
      pdf.save(`Customer-Details-${customerName}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('Customer details PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading customer details PDF:', error);
      toast.error('Failed to download customer details PDF');
    }
  };

  const handleNewInvoice = () => {
    console.log('🔍 CustomerDetailsModal - handleNewInvoice called');
    console.log('🔍 CustomerDetailsModal - customerDetails:', customerDetails);
    console.log('🔍 CustomerDetailsModal - customerDetails.state:', customerDetails?.state);
    console.log('🔍 CustomerDetailsModal - customerDetails.city:', customerDetails?.city);
    console.log('🔍 CustomerDetailsModal - customerDetails.pincode:', customerDetails?.pincode);
    
    const prefillData = {
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
      state: customerDetails?.state || '',
      pincode: customerDetails?.pincode || '',
      city: customerDetails?.city || '',
      gstin: customerDetails?.gstin || ''
    };
    
    console.log('🔍 CustomerDetailsModal - Prefill data being sent:', prefillData);
    
    navigate('/billing', { 
      state: { 
        prefillCustomer: prefillData
      } 
    });
    onClose();
  };

  const pendingBills = customerBills.filter(bill => {
    const calculatedRemainingAmount = calculateBillTotal(bill) - (bill.paidAmount || 0);
    return calculatedRemainingAmount > 0;
  });
  const paidBills = customerBills.filter(bill => {
    const calculatedRemainingAmount = calculateBillTotal(bill) - (bill.paidAmount || 0);
    return calculatedRemainingAmount <= 0;
  });
  const draftBills = customerBills.filter(bill => bill.status === 'draft');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden w-[98vw] sm:w-[95vw] md:w-[90vw] lg:w-[80vw] xl:w-[70vw] mx-auto p-2 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 text-base sm:text-lg pr-8">
            <User className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Customer Details</div>
              <div className="text-sm text-muted-foreground mt-1 break-words">
                {customerName}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadCustomerDetails()}
                  className="text-xs"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">{customerName}</p>
                    <p className="text-xs text-gray-500">Customer Name</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">{customerPhone}</p>
                    <p className="text-xs text-gray-500">Phone Number</p>
                  </div>
                </div>
                {(customerDetails?.customerGstin) && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Receipt className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base">{customerDetails?.customerGstin || customerBills[0]?.customerGstin}</p>
                      <p className="text-xs text-gray-500">Customer GSTIN</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base break-words">
                      {customerAddress || 'N/A'}
                      {(customerDetails?.state || customerState) && `, ${customerDetails?.state || customerState}`}
                      {(customerDetails?.pincode || customerPincode) && ` ${customerDetails?.pincode || customerPincode}`}
                    </p>
                    <p className="text-xs text-gray-500">Address</p>
                  </div>
                </div>
                {(customerDetails?.city || customerCity) && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base break-words">{customerDetails?.city || customerCity || 'N/A'}</p>
                      <p className="text-xs text-gray-500">City</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Statistics */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Card>
              <CardContent className="p-2 sm:p-3">
                <div className="text-center">
                  <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg sm:text-xl font-bold">{customerStats.totalBills}</p>
                  <p className="text-xs text-gray-500">Total Bills</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2 sm:p-3">
                <div className="text-center">
                  <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mx-auto mb-1" />
                  <p className="text-sm sm:text-lg font-bold break-all">{formatCurrency(customerStats.totalAmount)}</p>
                  <p className="text-xs text-gray-500">Total Amount</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2 sm:p-3">
                <div className="text-center">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mx-auto mb-1" />
                  <p className="text-sm sm:text-lg font-bold break-all">{formatCurrency(customerStats.paidAmount)}</p>
                  <p className="text-xs text-gray-500">Paid Amount</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2 sm:p-3">
                <div className="text-center">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 mx-auto mb-1" />
                  <p className="text-sm sm:text-lg font-bold break-all">{formatCurrency(customerStats.pendingAmount)}</p>
                  <p className="text-xs text-gray-500">Pending Amount</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Statistics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Card>
              <CardContent className="p-2 sm:p-3">
                <div className="text-center">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 mx-auto mb-1" />
                  <p className="text-lg sm:text-xl font-bold">{pendingBills.length}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2 sm:p-3">
                <div className="text-center">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mx-auto mb-1" />
                  <p className="text-lg sm:text-xl font-bold">{paidBills.length}</p>
                  <p className="text-xs text-gray-500">Paid</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2 sm:p-3">
                <div className="text-center">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mx-auto mb-1" />
                  <p className="text-xs sm:text-sm font-bold break-words">
                    {customerStats.lastPurchase ? formatDate(customerStats.lastPurchase) : 'Never'}
                  </p>
                  <p className="text-xs text-gray-500">Last Purchase</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-3">
            <Button onClick={handleNewInvoice} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </div>

          {/* Bills Sections */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading customer bills...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pending Bills */}
              {pendingBills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      Pending Bills ({pendingBills.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    {/* Table View - Mobile and Desktop */}
                    <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            <TableHead className="text-xs sm:text-sm">Bill #</TableHead>
                            <TableHead className="text-xs sm:text-sm">Date</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden md:table-cell">Type</TableHead>
                            <TableHead className="text-xs sm:text-sm">Total</TableHead>
                            <TableHead className="text-xs sm:text-sm">Paid</TableHead>
                            <TableHead className="text-xs sm:text-sm">Pending</TableHead>
                            <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingBills.map((bill) => (
                            <TableRow key={bill.id} className="hover:bg-gray-50">
                              <TableCell className="text-xs sm:text-sm">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                                  <Badge variant="destructive" className="text-xs">Pending</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-xs sm:text-sm">
                                <button
                                  onClick={() => handleViewBill(bill)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                >
                                  {bill.billNumber}
                                </button>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">{formatDate(bill.createdAt || bill.billDate)}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="outline" className="text-xs">{bill.billType}</Badge>
                              </TableCell>
                              <TableCell className="font-semibold text-xs sm:text-sm">{formatCurrency(calculateBillTotal(bill))}</TableCell>
                              <TableCell className="text-green-600 text-xs sm:text-sm">{formatCurrency(bill.paidAmount || 0)}</TableCell>
                              <TableCell className="text-red-600 font-semibold text-xs sm:text-sm">{formatCurrency(calculateBillTotal(bill) - (bill.paidAmount || 0))}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewBill(bill)}
                                    title="View Details"
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
                                    <Edit className="h-4 w-4" />
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
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Paid Bills */}
              {paidBills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Paid Bills ({paidBills.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    {/* Table View - Mobile and Desktop */}
                    <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            <TableHead className="text-xs sm:text-sm">Bill #</TableHead>
                            <TableHead className="text-xs sm:text-sm">Date</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden md:table-cell">Type</TableHead>
                            <TableHead className="text-xs sm:text-sm">Total</TableHead>
                            <TableHead className="text-xs sm:text-sm">Paid</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Method</TableHead>
                            <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paidBills.map((bill) => (
                            <TableRow key={bill.id} className="hover:bg-gray-50">
                              <TableCell className="text-xs sm:text-sm">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">Paid</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-xs sm:text-sm">
                                <button
                                  onClick={() => handleViewBill(bill)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                >
                                  {bill.billNumber}
                                </button>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">{formatDate(bill.createdAt || bill.billDate)}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="outline" className="text-xs">{bill.billType}</Badge>
                              </TableCell>
                              <TableCell className="font-semibold text-xs sm:text-sm">{formatCurrency(calculateBillTotal(bill))}</TableCell>
                              <TableCell className="text-green-600 text-xs sm:text-sm">{formatCurrency(bill.paidAmount || 0)}</TableCell>
                              <TableCell className="capitalize hidden lg:table-cell text-xs sm:text-sm">{bill.paymentMethod || 'Cash'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewBill(bill)}
                                    title="View Details"
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
                                    <Edit className="h-4 w-4" />
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
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Draft Bills */}
              {draftBills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="h-5 w-5 text-yellow-600" />
                      Draft Bills ({draftBills.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    {/* Table View - Mobile and Desktop */}
                    <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            <TableHead className="text-xs sm:text-sm">Bill #</TableHead>
                            <TableHead className="text-xs sm:text-sm">Date</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden md:table-cell">Type</TableHead>
                            <TableHead className="text-xs sm:text-sm">Total</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Items</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden xl:table-cell">Created</TableHead>
                            <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {draftBills.map((bill) => (
                            <TableRow key={bill.id} className="hover:bg-gray-50">
                              <TableCell className="text-xs sm:text-sm">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <Edit className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Draft</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-xs sm:text-sm">
                                <button
                                  onClick={() => handleViewBill(bill)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                >
                                  {bill.billNumber}
                                </button>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">{formatDate(bill.createdAt || bill.billDate)}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="outline" className="text-xs">{bill.billType}</Badge>
                              </TableCell>
                              <TableCell className="font-semibold text-xs sm:text-sm">{formatCurrency(calculateBillTotal(bill))}</TableCell>
                              <TableCell className="hidden lg:table-cell text-xs sm:text-sm">{bill.items?.length || 0}</TableCell>
                              <TableCell className="hidden xl:table-cell text-xs sm:text-sm">{formatDate(bill.createdAt)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewBill(bill)}
                                    title="View Details"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditBill(bill)}
                                    title="Continue Editing"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setBillToDelete(bill);
                                      setPasswordDialogOpen(true);
                                    }}
                                    title="Delete Draft"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {customerBills.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-muted-foreground">No bills found for this customer</p>
                    <Button onClick={handleNewInvoice} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Bill
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Bill Preview Modal */}
      {previewingBill && (
        <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden w-[95vw] sm:w-[90vw] lg:w-[80vw] xl:w-[70vw] mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl truncate">Bill Preview - {previewingBill.billNumber}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Bill Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold mb-3">Bill Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Bill Number:</span> {previewingBill.billNumber}</p>
                    <p><span className="font-medium">Date:</span> {formatDate(previewingBill.createdAt || previewingBill.billDate)}</p>
                    <p><span className="font-medium">Status:</span> 
                      <Badge variant={previewingBill.status === 'paid' ? 'default' : 'secondary'} className="ml-2">
                        {previewingBill.status || 'pending'}
                      </Badge>
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {customerName}</p>
                    <p><span className="font-medium">Phone:</span> {customerPhone}</p>
                    {(previewingBill as any)?.customerGstin && (
                      <p><span className="font-medium">GSTIN:</span> {(previewingBill as any).customerGstin}</p>
                    )}
                    <p><span className="font-medium">Address:</span> 
                      {customerAddress || 'N/A'}
                      {(previewingBill as any)?.state && `, ${(previewingBill as any).state}`}
                      {(previewingBill as any)?.pincode && ` ${(previewingBill as any).pincode}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bill Items */}
              {previewingBill.items && previewingBill.items.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-3">Items ({previewingBill.items.length})</h3>
                  <div className="space-y-2">
                    {previewingBill.items.map((item: any, index: number) => {
                      console.log(`🔍 Item ${index}:`, item);
                      const itemName = item.itemName || item.name || item.productName || 'Unknown Item';
                      const quantity = item.itemQuantity || item.quantity || item.qty || 1;
                      const price = item.itemPrice || item.price || 0;
                      const total = quantity * price;
                      
                      return (
                        <div key={index} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{itemName}</p>
                              <p className="text-xs text-gray-500">Qty: {quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">₹{total.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">₹{price.toLocaleString()} each</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No items found for this bill</p>
                  <p className="text-sm mt-2">Items: {previewingBill.items ? 'undefined' : 'null'}</p>
                  <p className="text-sm">Items length: {previewingBill.items?.length || 'N/A'}</p>
                </div>
              )}

              {/* Bill Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-3">Bill Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{(previewingBill.totalAmount * 0.85).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span>₹{(previewingBill.totalAmount * 0.15).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total Amount:</span>
                    <span>₹{previewingBill.totalAmount.toLocaleString()}</span>
                  </div>
                  {(() => {
                    const calculatedRemainingAmount = calculateBillTotal(previewingBill) - (previewingBill.paidAmount || 0);
                    return calculatedRemainingAmount > 0 ? (
                      <>
                        <div className="flex justify-between text-red-600">
                          <span>Paid Amount:</span>
                          <span>₹{(previewingBill.paidAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Remaining:</span>
                          <span>₹{calculatedRemainingAmount.toLocaleString()}</span>
                        </div>
                      </>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Password Protection Dialog */}
      <PasswordProtection
        isOpen={passwordDialogOpen}
        onClose={() => {
          setPasswordDialogOpen(false);
          setBillToDelete(null);
        }}
        onConfirm={handleDeleteWithPassword}
        title="Delete Bill - Password Required"
        description={`Please enter your password to delete bill ${billToDelete?.billNumber || billToDelete?.id}. This action cannot be undone.`}
        actionName="Delete Bill"
      />

    </Dialog>
  );
}
