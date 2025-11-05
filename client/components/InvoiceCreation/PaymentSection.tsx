import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getNumericInputValue } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, CreditCard, Banknote, Smartphone, Eye, Save, Printer, Download, Edit, Share } from "lucide-react";
import BillTemplate from "./BillTemplate";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import { pdfGenerator, InvoiceData } from "@/utils/pdfGenerator";
import { buildBillTemplateHTML, generatePDFBlobFromHTML, openPrintWindowWithHTML, generateBillTemplatePDF as downloadBillTemplatePDF } from "@/utils/billTemplatePDF";
import { useBilling } from "@/contexts/BillingContext";
import { useNavigate } from "react-router-dom";
import { billingService } from "@/services/billingService";

interface PaymentSectionProps {
  customerName: string;
  customerData?: any; // Add full customer data
  billingType: string;
  items: any[];
  subtotal: number;
  billId?: string | null; // Add bill ID
  billNumber?: string | null; // Add bill number
  isBillRegistered?: boolean; // Add registration status
  onBack: () => void;
  onComplete: (paymentData: PaymentData) => void;
  onReset?: () => void; // Add reset callback
  onClearDraft?: () => void; // Add clear draft callback
  editingDraftId?: string | null; // Add editing draft ID
}

interface PaymentData {
  paymentMethod: string;
  paymentType: "Full" | "Partial";
  paidAmount: number;
  finalAmount: number;
  remainingAmount?: number;
}

export default function PaymentSection({
  customerName,
  customerData,
  billingType,
  items,
  subtotal,
  billId,
  billNumber,
  isBillRegistered,
  onBack,
  onComplete,
  onReset,
  onClearDraft,
  editingDraftId
}: PaymentSectionProps) {
  const { toast } = useToast();
  const { addBill, refreshBills } = useBilling();
  const { companyInfo } = useCompany();
  const navigate = useNavigate();

  // Debug logging for bill number
  useEffect(() => {
    console.log("🔍 PaymentSection - BillNumber prop:", billNumber);
    console.log("🔍 PaymentSection - BillNumber type:", typeof billNumber);
    console.log("🔍 PaymentSection - BillNumber value:", JSON.stringify(billNumber));
  }, [billNumber]);

  // Calculate total amount first
  const isSameState = () => {
    const companyState = companyInfo?.address?.state;
    const customerState = customerData?.state;
    return companyState?.toLowerCase() === customerState?.toLowerCase();
  };

  const getTaxRate = () => {
    console.log('🔍 PaymentSection getTaxRate Debug:');
    console.log('🔍 Customer data:', customerData);
    console.log('🔍 Customer state:', customerData?.state);
    console.log('🔍 Company Info:', companyInfo);
    console.log('🔍 Is same state:', isSameState());
    
    if (isSameState()) {
      // Same state - use GST (applied to individual products)
      console.log('🔍 Same state - using GST on products');
      // Find the state-specific GST rate from company settings
      const customerState = customerData?.state;
      if (customerState && companyInfo?.states) {
        const stateInfo = companyInfo.states.find(state => 
          state.name.toLowerCase() === customerState.toLowerCase()
        );
        if (stateInfo && stateInfo.gstRate > 0) {
          console.log('🔍 Found state GST rate:', stateInfo.gstRate);
          return stateInfo.gstRate;
        }
      }
      // Fallback to default GST rate from company settings
      const defaultRate = companyInfo?.defaultGstRate || 18;
      console.log('🔍 Using default GST rate:', defaultRate);
      return defaultRate;
    } else {
      // Different state - use IGST (applied to subtotal)
      console.log('🔍 Different state - using IGST on subtotal');
      // For IGST, we should use the state-specific rate from company settings
      const customerState = customerData?.state;
      if (customerState && companyInfo?.states) {
        const stateInfo = companyInfo.states.find(state => 
          state.name.toLowerCase() === customerState.toLowerCase()
        );
        if (stateInfo && stateInfo.gstRate > 0) {
          console.log('🔍 Found state-specific IGST rate:', stateInfo.gstRate);
          return stateInfo.gstRate;
        }
      }
      // Fallback to default GST rate for IGST
      const defaultRate = companyInfo?.defaultGstRate || 18;
      console.log('🔍 Using default IGST rate:', defaultRate);
      return defaultRate;
    }
  };

  // Calculate tax based on state comparison - REVERSE CALCULATION
  let gstTotal = 0;
  let actualSubtotal = 0;
  let actualTotalAmount = 0;
  
  if (billingType === "gst") {
    // Calculate total amount from items (entered prices are total including GST)
    const totalFromItems = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    // Reverse calculate GST
    const gstRate = getTaxRate();
    actualSubtotal = totalFromItems / (1 + gstRate / 100);
    gstTotal = totalFromItems - actualSubtotal;
    actualTotalAmount = totalFromItems;
  } else {
    // Non-GST: entered prices are the final amounts
    actualSubtotal = subtotal;
    gstTotal = 0;
    actualTotalAmount = subtotal;
  }
  
  const totalAmount = Math.round(actualTotalAmount * 100) / 100; // Round to 2 decimal places
  const finalSubtotal = Math.round(actualSubtotal * 100) / 100;
  const finalGstTotal = Math.round(gstTotal * 100) / 100;
  const [paymentData, setPaymentData] = useState<PaymentData>({
    paymentMethod: "cash",
    paymentType: "Full",
    paidAmount: totalAmount,
    finalAmount: finalSubtotal
  });

  // Update paid amount when total amount changes
  useEffect(() => {
    setPaymentData(prev => ({
      ...prev,
      paidAmount: totalAmount,
      finalAmount: finalSubtotal
    }));
  }, [totalAmount, finalSubtotal]);

  const remainingAmount = totalAmount - paymentData.paidAmount;

  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [lastDraftSave, setLastDraftSave] = useState<number>(0);
  const [draftCooldown, setDraftCooldown] = useState<number>(0);
  const [lastInvoiceSave, setLastInvoiceSave] = useState<number>(0);
  const [invoiceCooldown, setInvoiceCooldown] = useState<number>(0);

  // Get company's state from company info
  const getCompanyState = () => {
    return companyInfo?.address?.state || '';
  };

  // Get tax type (GST for same state, IGST for different state)
  const getTaxType = () => {
    return isSameState() ? 'GST' : 'IGST';
  };

  // Generate a unique identifier for the current bill content
  const generateBillContentHash = () => {
    const content = {
      customerName,
      billingType,
      items: items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      subtotal,
      paymentMethod: paymentData.paymentMethod,
      paymentType: paymentData.paymentType,
      paidAmount: paymentData.paidAmount
    };
    return JSON.stringify(content);
  };

  // Check if we're in cooldown period for drafts
  const isInCooldown = () => {
    const now = Date.now();
    const timeSinceLastSave = now - lastDraftSave;
    return timeSinceLastSave < 5000; // 5 second cooldown
  };

  // Check if we're in cooldown period for invoices
  const isInInvoiceCooldown = () => {
    const now = Date.now();
    const timeSinceLastSave = now - lastInvoiceSave;
    return timeSinceLastSave < 5000; // 5 second cooldown
  };

  // Update final amount when subtotal changes
  useEffect(() => {
    const newTaxRate = getTaxRate();
    const newTotal = subtotal + (billingType === "gst" ? (subtotal * newTaxRate) / 100 : 0);
    setPaymentData(prev => ({
      ...prev,
      finalAmount: newTotal,
      paidAmount: prev.paymentType === "Full" ? newTotal : prev.paidAmount
    }));
  }, [subtotal, billingType, customerData?.state, customerData?.igst, companyInfo?.address?.state]);

  // Clear cooldown when it expires
  useEffect(() => {
    if (draftCooldown > 0) {
      const timer = setTimeout(() => {
        setDraftCooldown(0);
      }, draftCooldown - Date.now());
      
      return () => clearTimeout(timer);
    }
  }, [draftCooldown]);

  // Clear invoice cooldown when it expires
  useEffect(() => {
    if (invoiceCooldown > 0) {
      const timer = setTimeout(() => {
        setInvoiceCooldown(0);
      }, invoiceCooldown - Date.now());
      
      return () => clearTimeout(timer);
    }
  }, [invoiceCooldown]);

  const handlePaymentMethodChange = (value: string) => {
    setPaymentData(prev => ({ ...prev, paymentMethod: value }));
  };

  const handlePaymentTypeChange = (value: string) => {
    const newPaymentType = value as "Full" | "Partial";
    setPaymentData(prev => ({
      ...prev,
      paymentType: newPaymentType,
      paidAmount: newPaymentType === "Full" ? totalAmount : prev.paidAmount
    }));
  };

  const handlePaidAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    const roundedAmount = Math.round(amount * 100) / 100; // Round to 2 decimal places
    setPaymentData(prev => ({ ...prev, paidAmount: roundedAmount }));
  };

  // Print using centralized bill template (memo style)
  const handlePrint = async () => {
    try {
      const billData = {
        customerName,
        customerPhone: customerData?.phone,
        customerAddress: customerData?.address,
        customerState: customerData?.state,
        customerPincode: customerData?.pincode,
        customerCity: customerData?.city,
        billingType,
        items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, total: i.total })),
        subtotal: finalSubtotal,
        gstTotal: finalGstTotal,
        gstPercent: getTaxRate(),
        isInterstate: !isSameState(),
        totalAmount,
        paidAmount: paymentData.paidAmount,
        remainingAmount: Math.max(0, totalAmount - paymentData.paidAmount),
        paymentMethod: paymentData.paymentMethod,
        paymentType: paymentData.paymentType,
        billNumber: billNumber || `BILL-${Date.now()}`,
      };
      const html = buildBillTemplateHTML(billData as any, companyInfo);
      openPrintWindowWithHTML(html, `Invoice-${billData.billNumber}`);
      toast({ title: "Print Ready", description: "Print dialog opened", variant: "default" });
    } catch (error) {
      console.error('❌ Error printing:', error);
      toast({ title: "Error", description: "Error printing. Please try again.", variant: "destructive" });
    }
  };

  const handlePartialAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    const roundedAmount = Math.round(amount * 100) / 100; // Round to 2 decimal places
    setPaymentData(prev => ({ ...prev, paidAmount: roundedAmount }));
  };

  const handleDownloadPDF = async () => {
    try {
      const billData = {
        
        customerName,
        customerPhone: customerData?.phone,
        customerAddress: customerData?.address,
        customerState: customerData?.state,
        customerPincode: customerData?.pincode,
        customerCity: customerData?.city,
       customerGstin: customerData?.gstin,
        billingType,
        items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, total: i.total })),
        subtotal: finalSubtotal,
        gstTotal: finalGstTotal,
        gstPercent: getTaxRate(),
        isInterstate: !isSameState(),
        totalAmount,
        paidAmount: paymentData.paidAmount,
        remainingAmount: Math.max(0, totalAmount - paymentData.paidAmount),
        paymentMethod: paymentData.paymentMethod,
        paymentType: paymentData.paymentType,
        billNumber: billNumber || `BILL-${Date.now()}`,
      };
      const html = buildBillTemplateHTML(billData as any, companyInfo);
      const blob = await generatePDFBlobFromHTML(html);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Invoice-${billData.billNumber || new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "PDF Generated Successfully", description: "Invoice PDF has been downloaded", variant: "default" });
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      toast({ title: "Error", description: "Error generating PDF. Please try again.", variant: "destructive" });
    }
  };

  const handleShareInvoice = async () => {
    try {
      const billNo = billNumber || `BILL-${Date.now()}`;
      const billData = {
        customerName,
        customerPhone: customerData?.phone,
        customerAddress: customerData?.address,
        customerState: customerData?.state,
        customerPincode: customerData?.pincode,
        customerCity: customerData?.city,
        billingType,
        items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, total: i.total })),
        subtotal: finalSubtotal,
        gstTotal: finalGstTotal,
        gstPercent: getTaxRate(),
        isInterstate: !isSameState(),
        totalAmount,
        paidAmount: paymentData.paidAmount,
        remainingAmount: Math.max(0, totalAmount - paymentData.paidAmount),
        paymentMethod: paymentData.paymentMethod,
        paymentType: paymentData.paymentType,
        billNumber: billNo,
      };
      const html = buildBillTemplateHTML(billData as any, companyInfo);
      const pdfBlob = await generatePDFBlobFromHTML(html);
      if (navigator.share && navigator.canShare) {
        const file = new File([pdfBlob], `Invoice-${billNo}.pdf`, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          const details = `${customerName}${customerData?.phone ? `, ${customerData.phone}` : ''}${customerData?.address ? `, ${customerData.address}` : ''}`;
          const remainText = totalAmount - paymentData.paidAmount > 0 ? `\nRemaining: ₹${(totalAmount - paymentData.paidAmount).toFixed(2)}` : '';
          await navigator.share({ title: `Invoice ${billNo}`, text: `Invoice for ${details}${remainText}`, files: [file] });
          toast({ title: "Shared", description: "Invoice shared successfully", variant: "default" });
          return;
        }
      }
      const details = `${customerName}${customerData?.phone ? `, ${customerData.phone}` : ''}${customerData?.address ? `, ${customerData.address}` : ''}`;
      const remainText = totalAmount - paymentData.paidAmount > 0 ? `\nRemaining: ₹${(totalAmount - paymentData.paidAmount).toFixed(2)}` : '';
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Invoice ${billNo}\n${details}${remainText}`)}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('❌ Error sharing invoice:', error);
      toast({ title: "Error", description: "Failed to share invoice", variant: "destructive" });
    }
  };

  const handleSaveInvoice = async () => {
    try {
      // Check if we're already saving or in cooldown
      if (isSaving || isDraft || isInInvoiceCooldown()) {
        console.log('Invoice save blocked - already saving or in cooldown');
        toast({
          title: "Please Wait",
          description: "Invoice is already being saved or please wait before saving again.",
          variant: "default",
        });
        return;
      }

      setIsSaving(true);
      
      // Generate content hash to check for duplicates
      const contentHash = generateBillContentHash();
      console.log('Saving invoice with content hash:', contentHash);
      
      // Create invoice bill data
      const invoiceBillData = {
        customerName,
        customerPhone: customerData?.phone || "0000000000", // Use real customer phone
        customerAddress: customerData?.address || "Invoice Address", // Use real customer address
        customerGstin: customerData?.customerGstin || "", // Include customer GSTIN
        pincode: customerData?.pincode || "", // Include pincode from customer data
        customerId: customerData?.id || null, // Add customer ID
        billingType: billingType.toUpperCase(),
        billType: (billingType === "non-gst" ? "NON_GST" : billingType === "demo" ? "Demo" : billingType.toUpperCase()) as "GST" | "NON_GST" | "QUOTATION" | "Demo",
        items: items.map(item => ({
          itemName: item.name,
          itemPrice: item.price,
          itemQuantity: item.quantity,
          itemTotal: item.total
        })),
        subtotal,
        gstAmount: gstTotal,
        totalAmount,
        paymentMethod: paymentData.paymentMethod as "cash" | "online" | "mixed",
        paymentType: paymentData.paymentType,
        paidAmount: paymentData.paidAmount,
        remainingAmount: totalAmount - paymentData.paidAmount,
        status: "completed", // Mark as completed invoice
        billDate: new Date().toISOString(),
        // billNumber already exists from register API - don't override
        stateKey: `invoice-${Date.now()}`,
        createdAt: new Date().toISOString(),
        contentHash: contentHash // Add content hash for duplicate detection
      };
      
      console.log('Saving invoice directly to billing service...', invoiceBillData);
      
      // Import billing service directly to avoid context conflicts
      const { billingService } = await import("@/services/billingService");
      
      let result;
      if (isBillRegistered && billId) {
        // Bill is already registered, update it with payment information
        console.log('🔄 Bill already registered, updating with payment info...');
        result = await billingService.updateBill(billId, {
          ...invoiceBillData,
          paymentMethod: paymentData.paymentMethod as "cash" | "online" | "mixed",
          paymentType: paymentData.paymentType,
          paidAmount: paymentData.paidAmount,
          remainingAmount: totalAmount - paymentData.paidAmount,
          status: "completed"
        } as any);
        console.log('Bill updated successfully:', result);
      } else {
        // No bill registered - this should not happen in payment page
        console.error('❌ No bill registered - cannot proceed with payment');
        toast({
          title: "Error",
          description: "No bill found to update. Please go back and add items first.",
          variant: "destructive",
        });
        return;
      }
      
      // Set cooldown and last save time
      const now = Date.now();
      setLastInvoiceSave(now);
      setInvoiceCooldown(now + 5000); // 5 second cooldown
      
      // Clear draft from localStorage to prevent "Draft Restored" message
      if (onClearDraft) {
        onClearDraft();
      }
      
      // If we're editing a draft, delete the original draft
      if (editingDraftId) {
        try {
          const { billingService } = await import("@/services/billingService");
          await billingService.deleteBill(editingDraftId);
          console.log('Original draft deleted:', editingDraftId);
        } catch (deleteError) {
          console.error('Error deleting original draft:', deleteError);
          // Don't throw error, just log it
        }
      }
      
      // Refresh bills to include the new invoice
      await refreshBills();
      
      // Show success message
      toast({
        title: "New Invoice Created",
        description: "Your invoice has been saved successfully! Redirecting to billing tab...",
        variant: "default",
      });
      
      // Reset invoice creation state
      if (onReset) {
        onReset();
      }
      
      // Redirect to billing tab after a short delay
      setTimeout(() => {
        console.log('Attempting to navigate to /billing...');
        try {
          // Use replace to avoid back button issues
          navigate("/billing", { replace: true });
          console.log('Navigation successful');
        } catch (navError) {
          console.error('Navigation error:', navError);
          // Fallback: try window.location
          window.location.href = "/billing";
        }
      }, 1500);
      
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      
      // Handle NON GST bill limit exceeded error
      if (error?.response?.data?.message?.includes("NON GST bill limit exceeded")) {
        const errorData = error.response.data;
        toast({
          title: "NON GST Bill Limit Exceeded",
          description: `${errorData.message}. Current count: ${errorData.currentCount}/${errorData.limit}. Financial year: ${errorData.financialYear}`,
          variant: "destructive",
        });
        return;
      }
      
      // Handle other errors
      toast({
        title: "Error",
        description: "Failed to save invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate PDF using BillTemplate format
  const generateBillTemplatePDF = async (invoiceData: any, companyInfo: any): Promise<Blob> => {
    try {
      // Create HTML content using the same format as print function
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice - ${invoiceData.customer.name}</title>
            <meta charset="UTF-8">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Arial', sans-serif;
                line-height: 1.4;
                color: #333;
                background: white;
                padding: 20px;
              }
              
              .max-w-4xl {
                max-width: 56rem;
              }
              
              .mx-auto {
                margin-left: auto;
                margin-right: auto;
              }
              
              .p-4 {
                padding: 1rem;
              }
              
              .sm\\:p-6 {
                padding: 1.5rem;
              }
              
              .lg\\:p-8 {
                padding: 2rem;
              }
              
              .bg-white {
                background-color: white;
              }
              
              .border-b-2 {
                border-bottom-width: 2px;
              }
              
              .border-gray-300 {
                border-color: #d1d5db;
              }
              
              .pb-4 {
                padding-bottom: 1rem;
              }
              
              .sm\\:pb-6 {
                padding-bottom: 1.5rem;
              }
              
              .mb-4 {
                margin-bottom: 1rem;
              }
              
              .sm\\:mb-6 {
                margin-bottom: 1.5rem;
              }
              
              .flex {
                display: flex;
              }
              
              .items-start {
                align-items: flex-start;
              }
              
              .gap-4 {
                gap: 1rem;
              }
              
              .mb-4 {
                margin-bottom: 1rem;
              }
              
              .sm\\:-mb-14 {
                margin-bottom: -3.5rem;
              }
              
              .w-16 {
                width: 4rem;
              }
              
              .h-16 {
                height: 4rem;
              }
              
              .sm\\:w-20 {
                width: 5rem;
              }
              
              .sm\\:h-20 {
                height: 5rem;
              }
              
              .md\\:w-24 {
                width: 6rem;
              }
              
              .md\\:h-24 {
                height: 6rem;
              }
              
              .rounded-full {
                border-radius: 50%;
              }
              
              .flex-shrink-0 {
                flex-shrink: 0;
              }
              
              .text-left {
                text-align: left;
              }
              
              .text-sm {
                font-size: 0.875rem;
              }
              
              .text-gray-600 {
                color: #6b7280;
              }
              
              .space-y-1 > * + * {
                margin-top: 0.25rem;
              }
              
              .font-semibold {
                font-weight: 600;
              }
              
              .text-base {
                font-size: 1rem;
              }
              
              .text-gray-900 {
                color: #111827;
              }
              
              .justify-end {
                justify-content: flex-end;
              }
              
              .text-right {
                text-align: right;
              }
              
              .text-lg {
                font-size: 1.125rem;
              }
              
              .font-medium {
                font-weight: 500;
              }
              
              .text-gray-500 {
                color: #9ca3af;
              }
              
              .mt-1 {
                margin-top: 0.25rem;
              }
              
              .grid {
                display: grid;
              }
              
              .grid-cols-1 {
                grid-template-columns: repeat(1, minmax(0, 1fr));
              }
              
              .sm\\:grid-cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
              
              .gap-4 {
                gap: 1rem;
              }
              
              .sm\\:gap-8 {
                gap: 2rem;
              }
              
              .sm\\:gap-10 {
                gap: 2.5rem;
              }
              
              .mb-6 {
                margin-bottom: 1.5rem;
              }
              
              .sm\\:mb-8 {
                margin-bottom: 2rem;
              }
              
              .text-center {
                text-align: center;
              }
              
              .text-2xl {
                font-size: 1.5rem;
              }
              
              .sm\\:text-3xl {
                font-size: 1.875rem;
              }
              
              .font-bold {
                font-weight: 700;
              }
              
              .mb-2 {
                margin-bottom: 0.5rem;
              }
              
              .text-gray-700 {
                color: #374151;
              }
              
              .font-medium {
                font-weight: 500;
              }
              
              .text-xs {
                font-size: 0.75rem;
              }
              
              .sm\\:text-base {
                font-size: 1rem;
              }
              
              .overflow-x-auto {
                overflow-x: auto;
              }
              
              .w-full {
                width: 100%;
              }
              
              .border-collapse {
                border-collapse: collapse;
              }
              
              .border {
                border-width: 1px;
              }
              
              .border-gray-300 {
                border-color: #d1d5db;
              }
              
              .p-2 {
                padding: 0.5rem;
              }
              
              .sm\\:p-3 {
                padding: 0.75rem;
              }
              
              .bg-gray-100 {
                background-color: #f3f4f6;
              }
              
              .text-xs {
                font-size: 0.75rem;
              }
              
              .sm\\:text-sm {
                font-size: 0.875rem;
              }
              
              .font-semibold {
                font-weight: 600;
              }
              
              .text-gray-600 {
                color: #6b7280;
              }
              
              .border-t-2 {
                border-top-width: 2px;
              }
              
              .pt-4 {
                padding-top: 1rem;
              }
              
              .sm\\:pt-6 {
                padding-top: 1.5rem;
              }
              
              .max-w-sm {
                max-width: 24rem;
              }
              
              .sm\\:max-w-md {
                max-width: 28rem;
              }
              
              .ml-auto {
                margin-left: auto;
              }
              
              .space-y-2 > * + * {
                margin-top: 0.5rem;
              }
              
              .justify-between {
                justify-content: space-between;
              }
              
              .text-sm {
                font-size: 0.875rem;
              }
              
              .text-lg {
                font-size: 1.125rem;
              }
              
              .border-t {
                border-top-width: 1px;
              }
              
              .pt-2 {
                padding-top: 0.5rem;
              }
              
              .text-blue-600 {
                color: #2563eb;
              }
              
              .text-red-600 {
                color: #dc2626;
              }
              
              .mt-8 {
                margin-top: 2rem;
              }
              
              .sm\\:mt-12 {
                margin-top: 3rem;
              }
              
              .text-gray-500 {
                color: #9ca3af;
              }
              
              .mt-1 {
                margin-top: 0.25rem;
              }
              
              .sm\\:mt-2 {
                margin-top: 0.5rem;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
              }
              
              th, td {
                border: 1px solid #d1d5db;
                padding: 0.5rem;
                text-align: left;
              }
              
              th {
                background-color: #f3f4f6;
                font-weight: 600;
              }
              
              .text-right {
                text-align: right;
              }
              
              .text-center {
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-white">
              <!-- Bill Header -->
              <div class="border-b-2 border-gray-300 pb-4 sm:pb-6 mb-4 sm:mb-6">
                <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">INVOICE</h1> 
                <div class="flex justify-between items-start">
                  <div class="text-left gap-2">
                    <p class="text-base sm:text-lg text-gray-600">${companyInfo?.name || 'Savera Electricals'}</p>
                    <p class="text-base sm:text-lg text-gray-600">${companyInfo?.address?.city || ''}</p>
                    <p class="text-base sm:text-lg text-gray-600">${companyInfo?.address?.state || ''}</p>
                    <p class="text-base sm:text-lg text-gray-600">${companyInfo?.address?.pincode || ''}</p>
                    <p class="text-base sm:text-lg text-gray-600">${companyInfo?.phone || ''}</p>
                    <p class="text-base sm:text-lg text-gray-600">${companyInfo?.email || ''}</p>
                    <p class="text-base sm:text-lg text-gray-600">${companyInfo?.gstNumber || ''}</p>
                  </div>
                  <div class="text-right">
                    ${companyInfo?.logo ? `<img src="${companyInfo.logo}" crossorigin="anonymous" alt="Logo" style="width:72px;height:72px;object-fit:cover;border-radius:8px;margin-bottom:6px;" />` : ''}
                    <p class="text-base sm:text-lg text-gray-600">Bill Type: ${(invoiceData.billingMode || 'GST').toUpperCase()}</p>
                    <p class="text-xs sm:text-sm text-gray-500 mt-2">Bill No: ${invoiceData.billNumber}</p>
                  </div>
                </div>
              </div>

              <!-- Bill Details -->
              <div class="flex justify-between gap-8 sm:gap-8 mb-6 sm:mb-8">
                <div>
                  <h3 class="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-900">Bill To:</h3>
                  <div class="text-gray-700">
                    <p class="font-medium text-sm sm:text-base">${invoiceData.customer.name}</p>
                    <p class="text-xs sm:text-sm">Phone: ${invoiceData.customer.phone || 'N/A'}</p>
                    <p class="text-xs sm:text-sm">Address: ${invoiceData.customer.address || 'N/A'}</p>
                    <p class="text-xs sm:text-sm">${invoiceData.customer.city || ''} ${invoiceData.customer.state || ''} ${invoiceData.customer.pincode || ''}</p>
                    <p class="text-xs sm:text-sm">Payment Method: ${(invoiceData.paymentMethod || 'cash').toUpperCase()}</p>
                  </div>
                </div>
                <div>
                  <h3 class="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-900">Invoice Details:</h3>
                  <div class="text-gray-700">
                    <p class="text-sm sm:text-base">Date: ${new Date(invoiceData.billDate).toLocaleDateString('en-IN')}</p>
                    <p class="text-sm sm:text-base">Payment Type: ${(invoiceData.paymentMode === 'full' ? 'Full' : 'Partial').toUpperCase()}</p>
                  </div>
                </div>
              </div>

              <!-- Items Table -->
              <div class="mb-6 sm:mb-8 overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-xs sm:text-sm">
                  <thead>
                    <tr class="bg-gray-100">
                      <th class="border border-gray-300 p-2 sm:p-3 text-left font-semibold">Item</th>
                      <th class="border border-gray-300 p-2 sm:p-3 text-right font-semibold">Price</th>
                      <th class="border border-gray-300 p-2 sm:p-3 text-center font-semibold">Qty</th>
                      ${(invoiceData.billingMode || 'gst') === 'gst' ? `
                        <th class="border border-gray-300 p-2 sm:p-3 text-right font-semibold">GST</th>
                      ` : ''}
                      <th class="border border-gray-300 p-2 sm:p-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(invoiceData.items || []).map(item => `
                      <tr>
                        <td class="border border-gray-300 p-2 sm:p-3">
                          <div>
                            <p class="font-medium text-xs sm:text-sm">${item.itemName || 'Item'}</p>
                          </div>
                        </td>
                        <td class="border border-gray-300 p-2 sm:p-3 text-right">₹${(item.itemPrice || 0).toFixed(2)}</td>
                        <td class="border border-gray-300 p-2 sm:p-3 text-center">${item.itemQuantity || 1}</td>
                        ${(invoiceData.billingMode || 'gst') === 'gst' ? `
                          <td class="border border-gray-300 p-2 sm:p-3 text-right">
                            <div>
                              <p class="text-xs">${item.gstPercent || 18}%</p>
                              <p class="text-xs text-gray-600">₹${((item.itemPrice || 0) * (item.itemQuantity || 1) * (item.gstPercent || 18) / 100).toFixed(2)}</p>
                            </div>
                          </td>
                        ` : ''}
                        <td class="border border-gray-300 p-2 sm:p-3 text-right font-medium">₹${((item.itemTotal && item.itemTotal > 0) ? item.itemTotal : ((item.itemPrice || 0) * (item.itemQuantity || 1))).toFixed(2)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <!-- Summary -->
              <div class="border-t-2 border-gray-300 pt-4 sm:pt-6">
                <div class="max-w-sm sm:max-w-md ml-auto space-y-2">
                  <div class="flex justify-between text-xs sm:text-sm">
                    <span class="text-gray-700">Subtotal:</span>
                    <span class="font-medium">₹${(invoiceData.subtotal || 0).toFixed(2)}</span>
                  </div>
                  
                  ${(invoiceData.billingMode || 'gst') === 'gst' ? `
                    <div class="flex justify-between text-xs sm:text-sm">
                      <span class="text-gray-700">GST:</span>
                      <span class="font-medium">₹${(invoiceData.gstTotal || 0).toFixed(2)}</span>
                    </div>
                  ` : ''}
                  
                  <div class="flex justify-between text-sm sm:text-lg font-semibold border-t pt-2">
                    <span>Total Amount:</span>
                    <span>₹${(invoiceData.finalAmount || 0).toFixed(2)}</span>
                  </div>
                  
                  <div class="flex justify-between text-xs sm:text-sm text-blue-600">
                    <span>Paid Amount:</span>
                    <span>₹${(invoiceData.paidAmount || 0).toFixed(2)}</span>
                  </div>
                  
                  ${(invoiceData.pendingAmount || 0) > 0 ? `
                    <div class="flex justify-between text-xs sm:text-sm text-red-600 font-medium">
                      <span>Remaining Amount:</span>
                      <span>₹${(invoiceData.pendingAmount || 0).toFixed(2)}</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Footer -->
              <div class="mt-8 sm:mt-12 text-center text-xs sm:text-sm text-gray-500">
                <p>Thank you for your business!</p>
                <p class="mt-1 sm:mt-2">Generated on ${new Date().toLocaleString()}</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Convert HTML to PDF using html2canvas and jsPDF
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      
      // Create a temporary div with the HTML content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '800px';
      document.body.appendChild(tempDiv);

      // Generate canvas from HTML
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 800,
        height: tempDiv.scrollHeight
      });

      // Remove temporary div
      document.body.removeChild(tempDiv);

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
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

      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating BillTemplate PDF:', error);
      throw error;
    }
  };


  const handleSaveDraft = async () => {
    try {
      // Check if we're already saving or in cooldown
      if (isDraft || isSaving || isInCooldown()) {
        console.log('Draft save blocked - already saving or in cooldown');
        toast({
          title: "Please Wait",
          description: "Draft is already being saved or please wait before saving again.",
          variant: "default",
        });
        return;
      }

      setIsDraft(true);
      
      // Generate content hash to check for duplicates
      const contentHash = generateBillContentHash();
      console.log('Saving draft with content hash:', contentHash);
      
      // Create draft bill data
      const draftBillData = {
        customerName,
        customerPhone: customerData?.phone || "0000000000", // Use real customer phone
        customerAddress: customerData?.address || "Draft Address", // Use real customer address
        customerId: customerData?.id || null, // Add customer ID
        billingType: billingType.toUpperCase(),
        billType: (billingType === "non-gst" ? "NON_GST" : billingType === "demo" ? "Demo" : billingType.toUpperCase()) as "GST" | "NON_GST" | "QUOTATION" | "Demo",
        items: items.map(item => ({
          itemName: item.name,
          itemPrice: item.price,
          itemQuantity: item.quantity,
          itemTotal: item.total
        })),
        subtotal,
        gstAmount: gstTotal,
        totalAmount,
        paymentMethod: paymentData.paymentMethod as "cash" | "online" | "mixed",
        paymentType: paymentData.paymentType,
        paidAmount: paymentData.paidAmount,
        remainingAmount: totalAmount - paymentData.paidAmount,
        status: "draft", // Mark as draft
        billDate: new Date().toISOString(),
        // billNumber will be auto-generated by newBill.js pre-save hook
        stateKey: `draft-${Date.now()}`,
        createdAt: new Date().toISOString(),
        contentHash: contentHash // Add content hash for duplicate detection
      };
      
      console.log('Saving draft directly to billing service...', draftBillData);
      
      // Import billing service directly to avoid context conflicts
      const { billingService } = await import("@/services/billingService");
      
      // Draft saving disabled in payment page - only update existing bills
      console.log('Draft saving disabled in payment page');
      toast({
        title: "Draft Saving Disabled",
        description: "Draft saving is not available in payment page. Please complete the payment or go back to add items.",
        variant: "default",
      });
      return;
      
      // Set cooldown and last save time
      const now = Date.now();
      setLastDraftSave(now);
      setDraftCooldown(now + 5000); // 5 second cooldown
      
      // Clear draft from localStorage to prevent "Draft Restored" message
      if (onClearDraft) {
        onClearDraft();
      }
      
      // Refresh bills to include the new draft
      await refreshBills();
      
      // Show success message
      toast({
        title: "Draft Saved",
        description: "Your invoice has been saved as a draft. Redirecting to billing tab...",
        variant: "default",
      });
      
      // Reset invoice creation state
      if (onReset) {
        onReset();
      }
      
      // Redirect to billing tab after a short delay
      setTimeout(() => {
        console.log('Attempting to navigate to /billing...');
        try {
          navigate("/billing", { state: { openDraftsTab: true } });
          console.log('Navigation successful');
        } catch (navError) {
          console.error('Navigation error:', navError);
          // Fallback: try window.location
          window.location.href = "/billing";
        }
      }, 1000); // Reduced delay to 1 second
      
      // Also try immediate redirect as backup
      setTimeout(() => {
        console.log('Backup redirect attempt...');
        if (window.location.pathname !== "/billing") {
          console.log('Still not on billing page, trying backup redirect...');
          window.location.href = "/billing";
        }
      }, 1500);
      
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDraft(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowPreview(false);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    setShowPreview(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowPreview(true);
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  // Auto-save draft functionality - DISABLED
  // Bills will only save when "Save Invoice" button is clicked
  // useEffect(() => {
  //   const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  //     if (paymentData.paidAmount > 0) {
  //       e.preventDefault();
  //       e.returnValue = '';
  //       handleSaveDraft();
  //     }
  //   };

  //   const handleVisibilityChange = () => {
  //     if (document.hidden && paymentData.paidAmount > 0) {
  //       handleSaveDraft();
  //     }
  //   };

  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   document.addEventListener('visibilitychange', handleVisibilityChange);

  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, [paymentData]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Step 3: Payment Details</h1>
          <p className="text-gray-600">Complete payment information and preview your invoice</p>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Edit Payment Information
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSaveEdit}>
                    Save Changes
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="edit-payment-method">Payment Method</Label>
                <Select value={paymentData.paymentMethod} onValueChange={handlePaymentMethodChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="online">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Online
                      </div>
                    </SelectItem>
                    <SelectItem value="cheque">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cheque
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Type */}
              <div className="space-y-2">
                <Label htmlFor="edit-payment-type">Payment Type</Label>
                <Select value={paymentData.paymentType} onValueChange={handlePaymentTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full">Full Payment</SelectItem>
                    <SelectItem value="Partial">Partial Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Paid Amount */}
              <div className="space-y-2">
                <Label htmlFor="edit-paid-amount">Paid Amount (₹)</Label>
                <Input
                  id="edit-paid-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={getNumericInputValue(paymentData.paidAmount)}
                  onChange={(e) => handlePaidAmountChange(e.target.value)}
                  placeholder="Enter paid amount"
                />
                {/* Show remaining amount for partial payments */}
                {paymentData.paymentType === "Partial" && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                    <span className="font-medium">Remaining Amount: </span>
                    <span className="text-red-600 font-semibold">₹{remainingAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentData.paymentMethod} onValueChange={handlePaymentMethodChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="online">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Online
                      </div>
                    </SelectItem>
                    <SelectItem value="cheque">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cheque
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Type */}
              <div className="space-y-2">
                <Label htmlFor="payment-type">Payment Type</Label>
                <Select value={paymentData.paymentType} onValueChange={handlePaymentTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full">Full Payment</SelectItem>
                    <SelectItem value="Partial">Partial Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Paid Amount */}
              <div className="space-y-2">
                <Label htmlFor="paid-amount">Paid Amount (₹)</Label>
                <Input
                  id="paid-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={getNumericInputValue(paymentData.paidAmount)}
                  onChange={(e) => handlePaidAmountChange(e.target.value)}
                  placeholder="Enter paid amount"
                />
                {/* Show remaining amount for partial payments */}
                {paymentData.paymentType === "Partial" && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                    <span className="font-medium">Remaining Amount: </span>
                    <span className="text-red-600 font-semibold">₹{remainingAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Invoice Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>₹{finalSubtotal.toFixed(2)}</span>
              </div>
              
              {billingType === "gst" && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{getTaxType()} ({getTaxRate()}%):</span>
                  <span>₹{finalGstTotal.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total Amount:</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-blue-600">
                <span>Paid Amount:</span>
                <span>₹{paymentData.paidAmount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-red-600 font-medium">
                <span>Remaining Amount:</span>
                <span>₹{remainingAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {/* Payment Section - step 3 4 Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4">
        <Button variant="outline" onClick={handlePreview} className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        <Button 
          onClick={handleSaveInvoice} 
          disabled={isSaving || isDraft || isInInvoiceCooldown()}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 
           isInInvoiceCooldown() ? 'Please Wait...' : 
           'Save Invoice'}
        </Button>
        <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button 
          variant="outline" 
          onClick={handleDownloadPDF} 
          className="flex items-center gap-2"
          data-pdf-button
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
        <Button 
          variant="outline" 
          onClick={handleShareInvoice} 
          className="flex items-center gap-2"
        >
          <Share className="h-4 w-4" />
          Share
        </Button>
        
      </div>
                                   {/* click on preview button to show the preview modal */}
      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full max-w-[95vw] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <span>Invoice Preview</span>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={handleEdit} className="flex items-center gap-2 flex-1 sm:flex-none">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="flex items-center gap-2 flex-1 sm:flex-none">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleShareInvoice} className="flex items-center gap-2 flex-1 sm:flex-none">
                  <Share className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-x-auto">
            <BillTemplate
              customerName={customerName}
              customerPhone={customerData?.phone}
              customerAddress={customerData?.address}
              customerState={customerData?.state}
              customerPincode={customerData?.pincode}
              customerCity={customerData?.city}
              customerGstin={customerData?.gstin}
              billingType={billingType}
              items={items}
              subtotal={subtotal}
              gstTotal={gstTotal}
              totalAmount={totalAmount}
              paidAmount={paymentData.paidAmount}
              remainingAmount={remainingAmount}
              paymentMethod={paymentData.paymentMethod}
              paymentType={paymentData.paymentType}
              billNumber={billNumber} // Use actual bill number from backend
              taxRate={getTaxRate()}
              taxType={getTaxType()}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
