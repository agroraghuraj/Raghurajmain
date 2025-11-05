import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Download, 
  Receipt, 
  User, 
  Phone, 
  MapPin, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { pdfGenerator, InvoiceData } from '@/utils/pdfGenerator';
import { generateBillTemplatePDF } from '@/utils/billTemplatePDF';
import { useCompany } from '@/contexts/CompanyContext';
import { billingService } from '@/services/billingService';
import { calculateBillTotal } from '@/utils/gstCalculator';

interface BillPreviewPageProps {}

export default function BillPreviewPage({}: BillPreviewPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { companyInfo } = useCompany();
  const [bill, setBill] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to get GST percentage
  const getGSTPercentage = (bill: any) => {
    // For NON_GST bills, return 0
    if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
      return 0;
    }

    // For GST bills, calculate GST percentage based on customer state
    // First check if company has custom state rates
    if (companyInfo?.states && companyInfo.states.length > 0) {
      const customerState = bill.customerState || bill.state || 'N/A';
      const normalizedCustomerState = customerState.toLowerCase().trim();
      const matchingState = companyInfo.states.find((state: any) => 
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
    
    const customerState = bill.customerState || bill.state || 'N/A';
    const normalizedState = customerState.toLowerCase().trim();
    return stateGSTRates[normalizedState] || stateGSTRates['default'];
  };

  // Helper functions for calculations
  const calculateSubtotal = (bill: any) => {
    if (bill.subtotal) return bill.subtotal;
    
    // For NON_GST bills, return the sum of item prices
    if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
      if (bill.items && Array.isArray(bill.items)) {
        return bill.items.reduce((sum: number, item: any) => {
          const quantity = item.itemQuantity || item.quantity || 1;
          const price = item.itemPrice || item.price || 0;
          return sum + (quantity * price);
        }, 0);
      }
      return 0;
    }
    
    // For GST bills, the entered price is the total amount including GST
    // We need to calculate the base amount (subtotal) by removing GST
    if (bill.items && Array.isArray(bill.items)) {
      const totalAmount = bill.items.reduce((sum: number, item: any) => {
        const quantity = item.itemQuantity || item.quantity || 1;
        const price = item.itemPrice || item.price || 0;
        return sum + (quantity * price);
      }, 0);
      
      // Get GST percentage
      const gstPercent = getGSTPercentage(bill);
      
      // Calculate base amount by reverse calculation
      const baseAmount = totalAmount / (1 + gstPercent / 100);
      return baseAmount;
    }
    return 0;
  };

  const calculateGSTAmount = (bill: any) => {
    // For NON_GST bills, return 0
    if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
      return 0;
    }

    const totalAmount = bill.items.reduce((sum: number, item: any) => {
      const quantity = item.itemQuantity || item.quantity || 1;
      const price = item.itemPrice || item.price || 0;
      return sum + (quantity * price);
    }, 0);
    
    // Get GST percentage using the global functiond
    const gstPercent = getGSTPercentage(bill);
    
    console.log('🔍 BillPreviewPage - GST calculation:', {
      totalAmount,
      gstPercent,
      customerState: bill.customerState || bill.state || 'N/A',
      companyState: companyInfo?.address?.state
    });
    
    // Since the entered price is the total amount including GST,
    // we need to calculate the GST amount by reverse calculation
    const baseAmount = totalAmount / (1 + gstPercent / 100);
    const gstAmount = totalAmount - baseAmount;
    
    return gstAmount;
  };

  const calculateTotalAmount = (bill: any) => {
    // Use centralized calculator for consistency
    return calculateBillTotal(bill, companyInfo);
  };

  const calculateRemainingAmount = (bill: any) => {
    const totalAmount = calculateTotalAmount(bill);
    const paidAmount = bill.paidAmount || 0;
    return totalAmount - paidAmount;
  };
  

  useEffect(() => {
    const fetchBill = async () => {
      console.log('🔍 BillPreviewPage - fetchBill called');
      console.log('📄 location.state:', location.state);
      console.log('🆔 id from params:', id);
      console.log('🔍 BillPreviewPage - Bill number from location.state:', location.state?.bill?.billNumber);
      
      if (location.state?.bill) {
        console.log('✅ Using bill from location state');
        const billData = location.state.bill;
        
        // Calculate dynamic GST based on state settings
        if ((billData as any).state && companyInfo) {
          const { gstPercent, gstAmount } = calculateDynamicGST(billData, companyInfo);
          (billData as any).gstPercent = gstPercent;
          (billData as any).gstAmount = gstAmount;
        }
        
        console.log('🔍 BillPreviewPage - Setting bill from location.state:', billData);
        console.log('🔍 BillPreviewPage - Bill number from location.state:', billData.billNumber);
        setBill(billData);
      } else if (id) {
        try {
          console.log('🔄 Fetching bill with ID:', id);
          setIsLoading(true);
          const billData = await billingService.getBillById(id);
          console.log('✅ Bill fetched successfully:', billData);
          console.log('🔍 BillPreviewPage - Bill number from API:', billData.billNumber);
          
          // Calculate dynamic GST based on state settings
          if ((billData as any).state && companyInfo) {
            const { gstPercent, gstAmount } = calculateDynamicGST(billData, companyInfo);
            (billData as any).gstPercent = gstPercent;
            (billData as any).gstAmount = gstAmount;
          }
          
          console.log('🔍 BillPreviewPage - Setting bill from API:', billData);
          console.log('🔍 BillPreviewPage - Bill number from API:', billData.billNumber);
          setBill(billData);
        } catch (error) {
          console.error('❌ Error fetching bill:', error);
          toast.error('Failed to load bill details');
          navigate(-1);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('⚠️ No bill data or ID, redirecting back');
        navigate(-1);
      }
    };

    fetchBill();
  }, [location.state, id, navigate, companyInfo]);

  // Calculate dynamic GST based on state settings
  const calculateDynamicGST = (billData: any, companyInfo: any) => {
    if (!billData || !companyInfo) return { gstPercent: 18, gstAmount: 0 };
    
    // Check if bill type is NON_GST - if so, return 0 GST
    if (billData.billType === 'NON_GST' || billData.billType === 'non-gst') {
      console.log('🔍 NON_GST bill - returning 0 GST');
      return { gstPercent: 0, gstAmount: 0 };
    }
    
    const customerState = billData.customerState || billData.state || 'N/A';
    
    console.log('🔍 Dynamic GST calculation:');
    console.log('🔍 Company State:', companyInfo.address?.state);
    console.log('🔍 Customer State:', customerState);
    console.log('🔍 Company States:', companyInfo.states);
    
    // Use the same logic as getGSTPercentage
    let gstPercent = companyInfo.defaultGstRate || 18;
    
    // First check if company has custom state rates
    if (companyInfo?.states && companyInfo.states.length > 0) {
      const normalizedCustomerState = customerState.toLowerCase().trim();
      const matchingState = companyInfo.states.find((state: any) => 
        state.name.toLowerCase().trim() === normalizedCustomerState
      );
      
      if (matchingState) {
        gstPercent = matchingState.gstRate;
        console.log('🔍 Using custom state GST rate:', gstPercent, 'for state:', customerState);
      } else {
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
        
        const normalizedState = customerState.toLowerCase().trim();
        gstPercent = stateGSTRates[normalizedState] || stateGSTRates['default'];
        console.log('🔍 Using predefined GST rate:', gstPercent, 'for state:', customerState);
      }
    } else {
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
      
      const normalizedState = customerState.toLowerCase().trim();
      gstPercent = stateGSTRates[normalizedState] || stateGSTRates['default'];
      console.log('🔍 Using predefined GST rate:', gstPercent, 'for state:', customerState);
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
    
    return { gstPercent, gstAmount };
  };

  // Recalculate GST when bill or company info changes
  useEffect(() => {
    if (bill && companyInfo) {
      const { gstPercent, gstAmount } = calculateDynamicGST(bill, companyInfo);
      
      // Only update if the calculated values are different from current values
      if (bill.gstPercent !== gstPercent || bill.gstAmount !== gstAmount) {
        console.log('🔍 Updating GST values:', { 
          oldGstPercent: bill.gstPercent, 
          newGstPercent: gstPercent,
          oldGstAmount: bill.gstAmount,
          newGstAmount: gstAmount 
        });
        
        // Update bill with calculated GST rate and amount
        setBill(prevBill => ({
          ...prevBill,
          gstPercent: gstPercent,
          gstAmount: gstAmount
        }));
      }
    }
  }, [bill, companyInfo]);

  // Debug logging for bill number
  useEffect(() => {
    if (bill) {
      console.log('🔍 BillPreviewPage - Bill state updated:', bill);
      console.log('🔍 BillPreviewPage - Bill number in state:', bill.billNumber);
      console.log('🔍 BillPreviewPage - Bill number type:', typeof bill.billNumber);
    }
  }, [bill]);


  const formatDate = (dateString: string) => {
    try {
      console.log('🔍 formatDate called with:', dateString);
      const formatted = new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log('🔍 formatDate result:', formatted);
      return formatted;
    } catch (error) {
      console.log('🔍 formatDate error:', error, 'returning:', dateString);
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusIcon = (bill: any) => {
    if (bill.status === 'paid' || bill.paymentType === 'Full') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (bill.status === 'draft') {
      return <Clock className="h-4 w-4 text-orange-600" />;
    }
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (bill: any) => {
    if (bill.status === 'paid' || bill.paymentType === 'Full') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
    } else if (bill.status === 'draft') {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Draft</Badge>;
    }
    return <Badge variant="destructive" className="bg-red-100 text-red-800">Pending</Badge>;
  };

  const handleDownloadPDF = async () => {
    if (!bill) return;
    
    try {
      setIsLoading(true);
      console.log('Downloading PDF for bill:', bill);
      
      // Ensure we have valid bill data
      if (!bill.billNumber || !bill.totalAmount) {
        toast.error('Invalid bill data for PDF generation');
        return;
      }

      // Calculate proper values using the new GST logic
      // The entered price is the total amount including GST
      const totalAmount = bill.items.reduce((sum: number, item: any) => {
        const quantity = item.itemQuantity || item.quantity || item.qty || 1;
        const price = item.itemPrice || item.price || 0;
        return sum + (quantity * price);
      }, 0);
      
      // Get GST percentage
      const gstPercent = getGSTPercentage(bill);
      
      // Calculate base amount (subtotal) by reverse calculation
      const subtotal = totalAmount / (1 + gstPercent / 100);
      
      // Calculate GST amount
      const gstAmount = totalAmount - subtotal;

      // Determine if it's interstate (IGST) or intrastate (CGST/SGST)
      const companyState = companyInfo?.address?.state?.toLowerCase();
      const customerState = (bill as any).state?.toLowerCase();
      const isInterstate = companyState && customerState && companyState !== customerState;
      
      console.log('🔍 PDF Generation Debug:');
      console.log('🔍 - gstPercent:', gstPercent);
      console.log('🔍 - gstAmount:', gstAmount);
      console.log('🔍 - isInterstate:', isInterstate);
      console.log('🔍 - companyState:', companyState);
      console.log('🔍 - customerState:', customerState);

      // Transform bill data to match BillTemplate format
      const billData = {
        customerName: bill.customerName || 'Unknown Customer',
        customerPhone: bill.customerPhone || 'N/A',
        customerAddress: `${bill.customerAddress || 'N/A'}${(bill as any).state ? `, ${(bill as any).state}` : ''}${bill.pincode ? ` ${bill.pincode}` : ''}`,
        customerState: (bill as any).state || 'N/A',
        customerPincode: bill.pincode || 'N/A',
        customerCity: (bill as any).city || 'N/A',
        customerGstin: bill.customerGstin || '',
        billingType: bill.billType || 'GST',
        items: (bill.items || []).map((item: any) => {
          const quantity = item.itemQuantity || item.quantity || item.qty || 1;
          const enteredPrice = item.itemPrice || item.price || 0;
          const totalEnteredPrice = quantity * enteredPrice;
          
          // For NON_GST bills, show the entered price as total
          if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
            return {
              name: item.itemName || item.name || item.productName || 'Unknown Item',
              price: enteredPrice,
              quantity: quantity,
              total: totalEnteredPrice,
              gstAmount: 0
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
            gstAmount: itemGstAmount
          };
        }),
        subtotal: subtotal,
        gstTotal: gstAmount,
        gstPercent: gstPercent,
        isInterstate: isInterstate || false,
        totalAmount: totalAmount,
        paidAmount: bill.paidAmount || 0,
        remainingAmount: calculateRemainingAmount(bill),
        paymentMethod: bill.paymentMethod || 'cash',
        paymentType: bill.paymentType || 'Full',
        billNumber: bill.billNumber,
      };

      console.log('Generated bill data:', billData);
      console.log('🔍 PDF Debug - billingType:', billData.billingType);
      console.log('🔍 PDF Debug - gstTotal:', billData.gstTotal);
      console.log('🔍 PDF Debug - gstPercent:', billData.gstPercent);
      console.log('🔍 PDF Debug - isInterstate:', billData.isInterstate);
      await generateBillTemplatePDF(billData, companyInfo);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsLoading(false);
    }
  };


  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bill details...</p>
          <p className="text-xs text-gray-500 mt-2">
            ID: {id} | Loading: {isLoading ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div key={`bill-${bill?.id}-${bill?.updatedAt}`} className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-3">
          {/* First Row: Back Button and Bill Number Heading */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Bill Preview - {bill.billNumber}
            </h1>
          </div>
          
          {/* Second Row: Date, Status, and Download PDF (Mobile Only) */}
          <div className="flex flex-col sm:hidden gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {(() => {
                    const displayDate = bill.updatedAt || bill.billDate || bill.createdAt;
                    const isUpdatedDate = bill.updatedAt && displayDate === bill.updatedAt;
                    console.log('📅 BillPreviewPage - Mobile date display for bill:', bill.billNumber, {
                      updatedAt: bill.updatedAt,
                      billDate: bill.billDate,
                      createdAt: bill.createdAt,
                      displayDate: displayDate,
                      isUpdatedDate: isUpdatedDate
                    });
                    const formatted = formatDate(displayDate);
                    return (
                      <div className="space-y-1">
                        <div className={isUpdatedDate ? "text-green-600 font-bold" : ""}>
                          {formatted}
                          {isUpdatedDate && " (Updated)"}
                        </div>
                        {bill.updatedAt && bill.createdAt && bill.updatedAt !== bill.createdAt && (
                          <div className="text-xs text-gray-500">
                            Created: {formatDate(bill.createdAt)}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(bill)}
                <Button
                  onClick={handleDownloadPDF}
                  disabled={isLoading}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  {isLoading ? 'Downloading...' : 'PDF'}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Desktop: Date, Status, and Actions */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {(() => {
                  const displayDate = bill.updatedAt || bill.billDate || bill.createdAt;
                  const isUpdatedDate = bill.updatedAt && displayDate === bill.updatedAt;
                  console.log('📅 BillPreviewPage - Desktop date display for bill:', bill.billNumber, {
                    updatedAt: bill.updatedAt,
                    billDate: bill.billDate,
                    createdAt: bill.createdAt,
                    displayDate: displayDate,
                    isUpdatedDate: isUpdatedDate
                  });
                  const formatted = formatDate(displayDate);
                  return (
                    <div className="space-y-1">
                      <div className={isUpdatedDate ? "text-green-600 font-bold" : ""}>
                        {formatted}
                        {isUpdatedDate && " (Updated)"}
                      </div>
                      {bill.updatedAt && bill.createdAt && bill.updatedAt !== bill.createdAt && (
                        <div className="text-xs text-gray-500">
                          Created: {formatDate(bill.createdAt)}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(bill)}
              <Button
                onClick={handleDownloadPDF}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isLoading ? 'Downloading...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </div>

        {/* Bill Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Bill Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(bill)}
                  <div>
                    <p className="font-medium">Bill Number: {bill.billNumber}</p>
                    <p className="text-sm text-gray-500">Bill ID</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="font-medium">
                      {(() => {
                        const displayDate = bill.updatedAt || bill.billDate || bill.createdAt;
                        const isUpdatedDate = bill.updatedAt && displayDate === bill.updatedAt;
                        console.log('📅 BillPreviewPage - Date display for bill:', bill.billNumber, {
                          updatedAt: bill.updatedAt,
                          billDate: bill.billDate,
                          createdAt: bill.createdAt,
                          displayDate: displayDate,
                          isUpdatedDate: isUpdatedDate
                        });
                        const formatted = formatDate(displayDate);
                        console.log('📅 BillPreviewPage - Final formatted date for UI:', formatted);
                        return (
                          <div className="space-y-1">
                            <div className={isUpdatedDate ? "text-green-600 font-bold" : ""}>
                              {formatted}
                              {isUpdatedDate && " (Updated)"}
                            </div>
                            {bill.updatedAt && bill.createdAt && bill.updatedAt !== bill.createdAt && (
                              <div className="text-xs text-gray-500">
                                Created: {formatDate(bill.createdAt)}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <p className="text-sm text-gray-500">Bill Date</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{bill.billType || 'Standard'}</p>
                    <p className="text-sm text-gray-500">Bill Type</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{bill.customerName || 'Unknown Customer'}</p>
                    <p className="text-sm text-gray-500">Customer Name</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{bill.customerPhone || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Phone Number</p>
                  </div>
                </div>
                {bill.customerGstin && (
                  <div className="flex items-center gap-3">
                    <Receipt className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">{bill.customerGstin}</p>
                      <p className="text-sm text-gray-500">Customer GSTIN</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">
                      {bill.customerAddress || 'N/A'}
                      {(bill as any).state && `, ${(bill as any).state}`}
                      {bill.pincode && ` ${bill.pincode}`}
                    </p>
                    <p className="text-sm text-gray-500">Address</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bill Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Items ({bill.items?.length || 0})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {bill.items && bill.items.length > 0 ? (
              <div className="overflow-x-auto">
                <Table className="min-w-[400px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Item</TableHead>
                      <TableHead className="text-center text-xs sm:text-sm w-16">Qty</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm w-20 sm:w-24">Price</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm w-20 sm:w-24">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bill.items.map((item: any, index: number) => {
                      console.log(`🔍 Item ${index}:`, item);
                      return (
                        <TableRow key={index}>
                          <TableCell className="p-2 sm:p-3">
                            <div className="min-w-0">
                              <div className="font-medium text-xs sm:text-sm truncate">{item.itemName || item.name || item.productName || 'Unknown Item'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm p-2 sm:p-3">{item.itemQuantity || item.quantity || item.qty || 1}</TableCell>
                          <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap p-2 sm:p-3">₹{(item.itemPrice || item.price || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs sm:text-sm font-medium whitespace-nowrap p-2 sm:p-3">
                            {(() => {
                              const quantity = item.itemQuantity || item.quantity || item.qty || 1;
                              const enteredPrice = item.itemPrice || item.price || 0;
                              const totalEnteredPrice = quantity * enteredPrice;
                              
                              // For NON_GST bills, show the entered price as total
                              if (bill.billType === 'NON_GST' || bill.billType === 'non-gst') {
                                return `₹${totalEnteredPrice.toLocaleString()}`;
                              }
                              
                              // For GST bills, calculate base amount (after removing GST)
                              const gstPercent = getGSTPercentage(bill);
                              const baseAmount = totalEnteredPrice / (1 + gstPercent / 100);
                              return `₹${baseAmount.toLocaleString()}`;
                            })()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No items found for this bill</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bill Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Bill Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateSubtotal(bill))}</span>
              </div>
              {/* Only show GST for GST bills */}
              {(bill.billType !== 'NON_GST' && bill.billType !== 'non-gst') && (
                <div className="flex justify-between">
                  <span>GST ({getGSTPercentage(bill)}%):</span>
                  <span>{formatCurrency(calculateGSTAmount(bill))}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg border-t pt-3">
                <span>Total Amount:</span>
                <span>{formatCurrency(calculateTotalAmount(bill))}</span>
              </div>
              {bill.paymentType === 'Partial' && (
                <>
                  <div className="flex justify-between text-blue-600">
                    <span>Paid Amount:</span>
                    <span>{formatCurrency(bill.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Remaining Amount:</span>
                    <span>{formatCurrency(calculateRemainingAmount(bill))}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}


