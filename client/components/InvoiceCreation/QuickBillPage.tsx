import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Search, User, Phone, Mail, MapPin, Receipt, Plus, RefreshCw, AlertCircle, Download } from "lucide-react";
import { customerService } from "@/services/customerService";
import { billingService } from "@/services/billingService";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";

interface QuickBillPageProps {
  onBack: () => void;
  onSelectCustomer: (customer: any) => void;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  pincode?: string; // Make pincode optional to match service interface
  city?: string;
  state?: string;
}

interface Bill {
  id: string;
  billNumber: string;
  customerName: string;
  totalAmount: number;
  paymentType: string;
  createdAt: string;
  status?: string; // Make status optional to match service interface
  _id?: string; // Add _id field for compatibility
  items?: any[]; // Add items field for bill details
  paidAmount?: number; // Add paid amount field
  remainingAmount?: number; // Add remaining amount field
  billDate?: string; // Add bill date field
  billType?: string; // Add bill type field
  paymentMethod?: string; // Add payment method field
  discount?: number; // Add discount field
  discountAmount?: number; // Add discount amount field
  subtotal?: number; // Add subtotal field
  gstAmount?: number; // Add GST amount field
}

// Extended interface for bill preview with complete data
interface CompleteBill extends Bill {
  items: any[];
  paidAmount: number;
  remainingAmount: number;
  billDate: string;
  billType: string;
  paymentMethod: string;
  discount: number;
  discountAmount: number;
  subtotal: number;
  gstAmount: number;
}

export default function QuickBillPage({ onBack, onSelectCustomer }: QuickBillPageProps) {
  const { companyInfo } = useCompany();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [customerBills, setCustomerBills] = useState<Bill[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [isLoadingCustomerDetails, setIsLoadingCustomerDetails] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [previewingBill, setPreviewingBill] = useState<CompleteBill | null>(null);

  // Error boundary effect
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("❌ QuickBillPage error:", error);
      setHasError(true);
      toast({
        title: "Error",
        description: "Something went wrong. Please refresh the page.",
        variant: "destructive",
      });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [toast]);

  // Search customers
  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setCustomers([]);
      return;
    }

    setIsLoadingCustomers(true);
    try {
      const searchResults = await customerService.searchCustomers(query);
      console.log("🔍 QuickBillPage: Customer search results:", searchResults);
      
      // If no customers found from API, try to find customers from existing bills
      if (searchResults.length === 0) {
        console.log("🔍 QuickBillPage: No customers from API, searching in bills...");
        const customersFromBills = await getCustomersFromBills(query);
        setCustomers(customersFromBills);
      } else {
        setCustomers(searchResults);
      }
    } catch (error) {
      console.error("Error searching customers:", error);
      // Try to get customers from bills as fallback
      try {
        const customersFromBills = await getCustomersFromBills(query);
        setCustomers(customersFromBills);
      } catch (fallbackError) {
        console.error("Fallback customer search also failed:", fallbackError);
        setCustomers([]);
        toast({
          title: "Error",
          description: "Failed to search customers. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Get customers from existing bills
  const getCustomersFromBills = async (query: string): Promise<Customer[]> => {
    try {
      console.log("🔍 QuickBillPage: Getting customers from bills for query:", query);
      const allBills = await billingService.getAllBills();
      console.log("📋 QuickBillPage: All bills received:", allBills.length);
      
      // Create unique customers from bills
      const customerMap = new Map();
      
      allBills.forEach(bill => {
        const customerKey = `${bill.customerPhone}_${bill.customerName}`;
        if (!customerMap.has(customerKey)) {
          // Check if this customer matches the search query
          const matchesQuery = 
            bill.customerName?.toLowerCase().includes(query.toLowerCase()) ||
            bill.customerPhone?.includes(query) ||
            bill.customerAddress?.toLowerCase().includes(query.toLowerCase());
          
          if (matchesQuery) {
            const customer: Customer = {
              id: bill.customerPhone || bill.id || '', // Use phone as ID since no customerId exists
              name: bill.customerName || 'Unknown',
              phone: bill.customerPhone || '',
              address: bill.customerAddress || '',
              pincode: bill.pincode || '', // Optional field
              city: '',
              state: '',
              email: ''
            };
            customerMap.set(customerKey, customer);
          }
        }
      });
      
      const customers = Array.from(customerMap.values());
      console.log("✅ QuickBillPage: Found customers from bills:", customers.length);
      return customers;
    } catch (error) {
      console.error("❌ QuickBillPage: Error getting customers from bills:", error);
      return [];
    }
  };

  // Get customer bills
  const getCustomerBills = async (customerId: string) => {
    setIsLoadingBills(true);
    try {
      console.log("🔍 Fetching bills for customer ID:", customerId);
      console.log("🔍 Customer ID type:", typeof customerId);
      console.log("🔍 Customer ID length:", customerId?.length);
      
      if (!customerId) {
        console.error("❌ No customer ID provided!");
        setCustomerBills([]);
        return;
      }
      
      // Since customerId is actually the phone number, use it directly
      const bills = await billingService.getBillsByCustomer(customerId);
      console.log("📋 Customer bills received:", bills);
      setCustomerBills(bills);
    } catch (error) {
      console.error("❌ Error fetching customer bills:", error);
      setCustomerBills([]);
    } finally {
      setIsLoadingBills(false);
    }
  };


  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);


  const handleCustomerSelect = async (customer: Customer) => {
    try {
      console.log("🔍 Selected customer:", customer);
      console.log("🆔 Customer ID:", customer.id);
      console.log("📞 Customer phone:", customer.phone);
      setSelectedCustomer(customer);
      
      // Clear the search results and show only the selected customer
      setCustomers([customer]);
      
      // Fetch detailed customer information
      await fetchCustomerDetails(customer.id);
      
      // Get customer bills
      await getCustomerBills(customer.id);
    } catch (error) {
      console.error("❌ Error in handleCustomerSelect:", error);
      toast({
        title: "Error",
        description: "Failed to select customer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setCustomerDetails(null);
    setCustomerBills([]);
    setSearchTerm("");
    setCustomers([]);
  };

  // Generate multiple bills PDF using BillTemplate format
  const generateMultipleBillsWithBillTemplateFormat = async (allBillsData: any[], companyInfo: any, customerName: string) => {
    try {
      console.log(`📄 Generating multiple bills PDF with BillTemplate format for ${allBillsData.length} bills...`);
      
      // Import required libraries
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      
      for (let i = 0; i < allBillsData.length; i++) {
        const invoiceData = allBillsData[i];
        
        // Create HTML content for each bill using BillTemplate format
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
                      <p class="text-xs sm:text-sm">Address: ${invoiceData.customer.address}  ${invoiceData.customer.state} ${invoiceData.customer.pincode}</p>
                      ${invoiceData.customer.gstin ? `<p class="text-xs sm:text-sm">GSTIN: ${invoiceData.customer.gstin}</p>` : ''}
                      <p class="text-xs sm:text-sm mt-2">Payment Method: ${(invoiceData.paymentMethod || 'cash').toUpperCase()}</p>
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
                        ${(invoiceData.billingMode || 'GST').toLowerCase().includes('gst') ? `
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
                          ${(invoiceData.billingMode || 'GST').toLowerCase().includes('gst') ? `
                            <td class="border border-gray-300 p-2 sm:p-3 text-right">
                              <div>
                                <p class="text-xs">${item.gstPercent || 18}%</p>
                                <p class="text-xs text-gray-600">₹${(item.gstAmount || 0).toFixed(2)}</p>
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
                    
                    ${(invoiceData.billingMode || 'GST').toLowerCase().includes('gst') ? `
                      ${invoiceData.isSameState ? `
                        ${invoiceData.cgst > 0 ? `
                          <div class="flex justify-between text-xs sm:text-sm">
                            <span class="text-gray-700">CGST (${(invoiceData.gstPercentage || 18) / 2}%):</span>
                            <span class="font-medium">₹${(invoiceData.cgst || 0).toFixed(2)}</span>
                          </div>
                        ` : ''}
                        ${invoiceData.sgst > 0 ? `
                          <div class="flex justify-between text-xs sm:text-sm">
                            <span class="text-gray-700">SGST (${(invoiceData.gstPercentage || 18) / 2}%):</span>
                            <span class="font-medium">₹${(invoiceData.sgst || 0).toFixed(2)}</span>
                          </div>
                        ` : ''}
                      ` : `
                        ${invoiceData.igst > 0 ? `
                          <div class="flex justify-between text-xs sm:text-sm">
                            <span class="text-gray-700">IGST (${invoiceData.gstPercentage || 18}%):</span>
                            <span class="font-medium">₹${(invoiceData.igst || 0).toFixed(2)}</span>
                          </div>
                        ` : ''}
                      `}
                    ` : ''}
                    
                    <div class="flex justify-between text-sm sm:text-lg font-semibold border-t pt-2">
                      <span>Total Amount:</span>
                      <span>₹${(invoiceData.finalAmount || 0).toFixed(2)}</span>
                    </div>
                    
                    <div class="flex justify-between text-xs sm:text-sm text-blue-600">
                      <span>Paid Amount:</span>
                      <span>₹${(invoiceData.paidAmount || 0).toFixed(2)}</span>
                    </div>
                    
                    <div class="flex justify-between text-xs sm:text-sm text-red-600 font-medium">
                      <span>Remaining Amount:</span>
                      <span>₹${(invoiceData.pendingAmount || 0).toFixed(2)}</span>
                    </div>
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

        // Add to PDF
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        // Add new page for each bill (except the first one)
        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      // Save the PDF
      const fileName = `All_Bills_${customerName}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      console.log(`✅ Multiple bills PDF generated successfully with ${allBillsData.length} bills`);
      
    } catch (error) {
      console.error('❌ Error generating multiple bills PDF:', error);
      throw error;
    }
  };

  const handleExportAllBills = async () => {
    if (!selectedCustomer || customerBills.length === 0) {
      toast({
        title: "No Bills to Export",
        description: "No bills found for this customer.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Exporting Bills",
        description: `Preparing ${customerBills.length} bills for download...`,
      });

      // Import pdfGenerator dynamically
      const { pdfGenerator } = await import("@/utils/pdfGenerator");
      
      const customerName = selectedCustomer.name;
      const allBillsData = [];
      
      // Collect all bills data first
      for (let i = 0; i < customerBills.length; i++) {
        const bill = customerBills[i];
        
        try {
          // Fetch complete bill data first
          const completeBill = await billingService.getBillById(bill.id);
          
          // Calculate subtotal from items if not available
          let subtotal = completeBill.subtotal || 0;
          if (subtotal === 0 && completeBill.items && Array.isArray(completeBill.items)) {
            subtotal = completeBill.items.reduce((sum: number, item: any) => {
              const quantity = item.itemQuantity || item.quantity || item.qty || 1;
              const price = item.itemPrice || item.price || 0;
              return sum + (quantity * price);
            }, 0);
          }
          
          // Get dynamic GST percentage based on customer state first
          const getGSTPercentage = (state: string) => {
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
              'default': 18
            };
            
            const normalizedState = state.toLowerCase().trim();
            return stateGSTRates[normalizedState] || stateGSTRates['default'];
          };
          
          const gstPercentage = getGSTPercentage(selectedCustomer.state || 'N/A');
          
          // Check if bill type is NON_GST - if so, set GST to 0
          let gstAmount = 0;
          let cgst = 0;
          let sgst = 0;
          let igst = 0;
          
          // Determine if customer is in same state as company for CGST/SGST vs IGST
          const companyState = companyInfo?.address?.state || 'Delhi';
          const customerState = selectedCustomer.state || 'N/A';
          const isSameState = companyState.toLowerCase() === customerState.toLowerCase();
          
          if (completeBill.billType !== 'NON_GST') {
            // For GST bills, the entered price is already the total amount including GST
            // We need to calculate the GST amount by reverse calculation
            const totalAmount = completeBill.items.reduce((sum: number, item: any) => {
              const quantity = item.itemQuantity || item.quantity || 1;
              const price = item.itemPrice || item.price || 0;
              return sum + (quantity * price);
            }, 0);
            
            // Calculate base amount and GST amount by reverse calculation
            const baseAmount = totalAmount / (1 + gstPercentage / 100);
            gstAmount = totalAmount - baseAmount;
            
            // Apply state-wise GST logic
            cgst = isSameState ? gstAmount / 2 : 0;
            sgst = isSameState ? gstAmount / 2 : 0;
            igst = !isSameState ? gstAmount : 0;
          }

          const invoiceData = {
            billNumber: completeBill.billNumber,
            billDate: completeBill.updatedAt || completeBill.billDate || completeBill.createdAt,
            customer: {
              name: customerName,
              phone: selectedCustomer.phone || 'N/A',
              email: selectedCustomer.email || 'N/A',
              address: selectedCustomer.address || 'N/A',
              pincode: selectedCustomer.pincode || 'N/A',
              city: selectedCustomer.city || 'N/A',
              state: selectedCustomer.state || 'N/A'
            },
            items: (completeBill.items || []).map((item: any) => {
              const quantity = item.itemQuantity || item.quantity || item.qty || 1;
              const price = item.itemPrice || item.price || 0;
              const itemTotal = quantity * price;
              
              // For NON_GST bills, set GST to 0
              const gstPercent = (completeBill.billType === 'NON_GST') ? 0 : gstPercentage;
              const gstAmount = (completeBill.billType === 'NON_GST') ? 0 : itemTotal * (gstPercent / 100);
              
              return {
                itemName: item.itemName || item.name || item.productName || 'Unknown Item',
                itemPrice: price,
                itemQuantity: quantity,
                itemTotal: itemTotal,
                gstPercent: gstPercent,
                gstAmount: gstAmount
              };
            }),
            subtotal: subtotal,
            discountPercent: completeBill.discount || 0,
            discountAmount: completeBill.discountAmount || 0,
            gstTotal: gstAmount,
            cgst: cgst,
            sgst: sgst,
            igst: igst,
            isSameState: isSameState,
            gstPercentage: gstPercentage,
            finalAmount: subtotal + gstAmount,
            billingMode: completeBill.billType || 'GST',
            paymentMode: completeBill.paymentType || 'Full',
            paidAmount: completeBill.paidAmount || 0,
            pendingAmount: (subtotal + gstAmount) - (completeBill.paidAmount || 0),
            paymentMethod: completeBill.paymentMethod || 'cash',
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

          allBillsData.push(invoiceData);
          console.log(`✅ Bill data collected for ${completeBill.billNumber}`);
        } catch (billError) {
          console.error(`❌ Error fetching bill ${bill.billNumber}:`, billError);
        }
      }
      
      if (allBillsData.length > 0) {
        console.log(`📄 Generating single PDF with ${allBillsData.length} bills...`);
        
        // Generate single PDF with all bills using BillTemplate format
        await generateMultipleBillsWithBillTemplateFormat(allBillsData, companyInfo, customerName);
        
        toast({
          title: "Export Completed",
          description: `Successfully exported ${allBillsData.length} bills for ${customerName} in one PDF`,
          variant: "default",
        });
      } else {
        toast({
          title: "Export Failed",
          description: "No bills could be processed for export.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error("❌ Error exporting bills:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export bills. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch detailed customer information
  const fetchCustomerDetails = async (customerId: string) => {
    setIsLoadingCustomerDetails(true);
    try {
      console.log("🔍 QuickBillPage: Fetching customer details for ID:", customerId);
      const details = await customerService.getCustomerById(customerId);
      console.log("🔍 QuickBillPage: Customer details received:", details);
      console.log("🔍 QuickBillPage: Customer state:", details?.state);
      console.log("🔍 QuickBillPage: Customer address:", details?.address);
      console.log("🔍 QuickBillPage: Customer pincode:", details?.pincode);
      setCustomerDetails(details);
    } catch (error) {
      console.error("Error fetching customer details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch customer details. Using basic information.",
        variant: "destructive",
      });
      // Use the basic customer info as fallback
      setCustomerDetails(selectedCustomer);
    } finally {
      setIsLoadingCustomerDetails(false);
    }
  };

  const handleNewInvoice = () => {
    try {
      if (selectedCustomer) {
        console.log("🔍 Creating new invoice for customer:", selectedCustomer);
        console.log("🔍 Customer details:", customerDetails);
        console.log("🔍 Customer state:", customerDetails?.state || selectedCustomer?.state);
        console.log("🔍 Customer address:", customerDetails?.address || selectedCustomer?.address);
        console.log("🔍 Customer pincode:", customerDetails?.pincode || selectedCustomer?.pincode);
        
        // Pass the customer data to the billing type page
        const customerToPass = customerDetails || selectedCustomer;
        console.log("🔍 Passing customer data:", customerToPass);
        onSelectCustomer(customerToPass);
      } else {
        toast({
          title: "Error",
          description: "No customer selected. Please select a customer first.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Error in handleNewInvoice:", error);
      toast({
        title: "Error",
        description: "Failed to create new invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBillPreview = async (bill: Bill) => {
    try {
      console.log("🔍 Opening bill preview for:", bill);
      console.log("🆔 Bill ID:", bill.id);
      console.log("📄 Bill Number:", bill.billNumber);
      // Navigate to bill preview page using bill ID
      navigate(`/bill-preview/${bill.id}`);
    } catch (error) {
      console.error("Error opening bill preview:", error);
      toast({
        title: "Error",
        description: "Failed to open bill preview.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Debug logging
  console.log("🔍 QuickBillPage render - selectedCustomer:", selectedCustomer);
  console.log("🔍 QuickBillPage render - customerDetails:", customerDetails);
  console.log("🔍 QuickBillPage render - customerBills:", customerBills);

  // Error fallback UI
  if (hasError) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quick Bill</h1>
            <p className="text-gray-600">Search and select a customer to create a new invoice</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
            <p className="text-sm text-gray-600 mb-4">There was an error loading the quick bill page.</p>
            <Button onClick={() => setHasError(false)}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-1 sm:gap-2">
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Quick Bill</h1>
          <p className="text-xs sm:text-base text-gray-600">Search and select a customer to create a new invoice</p>
        </div>
      </div>
                          {/* step 1 customer search and select */}

      <div className={`grid gap-6 ${selectedCustomer ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Left Column - Customer Search (Hidden when customer selected) */}
        {!selectedCustomer && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-search">Search by name or phone</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="customer-search"
                      placeholder="Type customer name or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

              {/* Search Results */}
              {isLoadingCustomers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Searching...</p>
                </div>
              ) : customers.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{customer.name}</p>
                          <p className="text-xs text-gray-600">{customer.phone}</p>
                        </div>
                        {selectedCustomer?.id === customer.id && (
                          <Badge className="bg-green-100 text-green-800">Selected</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchTerm ? (
                <div className="text-center py-4 text-gray-500">
                  <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No customers found</p>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Search for customers to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}
                  {/* step 2 customer details and bills */}

        {/* Right Column - Selected Customer Details */}
        <div className="space-y-6">
          {selectedCustomer ? (
            <Card>
              <CardHeader className="space-y-3">
                {/* Customer Details Heading - First Row */}
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-lg">Customer Details</span>
                  {isLoadingCustomerDetails && (
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                  )}
                </CardTitle>
                
                {/* Buttons - Second Row */}
                <div className="flex flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportAllBills}
                    className="text-green-600 hover:text-green-800 text-xs sm:text-sm flex-1"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Export All Bills</span>
                    <span className="sm:hidden">Export</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSelection}
                    className="text-gray-600 hover:text-gray-800 text-xs sm:text-sm flex-1"
                  >
                    <span className="hidden sm:inline">Clear Selection</span>
                    <span className="sm:hidden">Clear</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">{selectedCustomer.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{selectedCustomer.phone}</p>
                  </div>
                </div>

                {/* Mobile: One row layout, Desktop: Stacked layout */}
                <div className="flex flex-col sm:space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-2 sm:gap-3">
                    {(customerDetails?.email || selectedCustomer.email) && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                        <span className="truncate">{customerDetails?.email || selectedCustomer.email}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{customerDetails?.address || selectedCustomer.address}</p>
                        <p className="text-gray-600 text-xs truncate">
                          {customerDetails?.city && `${customerDetails.city}, `}
                          {customerDetails?.state && `${customerDetails.state} - `}
                          {customerDetails?.pincode || selectedCustomer.pincode}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={handleNewInvoice} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Customer Selected</h3>
                <p className="text-sm">Search and select a customer to view details</p>
              </CardContent>
            </Card>
          )}
                                  
                                  {/* step 3 customer bills */}
          {/* Customer Bills */}
          {selectedCustomer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Customer Bills ({customerBills.length})</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => getCustomerBills(selectedCustomer.id)}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                    disabled={isLoadingBills}
                  >
                    <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoadingBills ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                    <span className="sm:hidden">↻</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingBills ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading bills...</p>
                  </div>
                ) : customerBills.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {customerBills.map((bill) => (
                      <div key={bill.id} className="p-2 sm:p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => handleBillPreview(bill)}
                              className="font-medium text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left truncate block"
                            >
                              #{bill.billNumber}
                            </button>
                            <p className="text-xs text-gray-600">{formatDate(bill.createdAt)}</p>
                          </div>
                          <div className="flex items-center justify-between sm:flex-col sm:items-end sm:text-right gap-2">
                            <p className="font-semibold text-xs sm:text-sm">{formatCurrency(bill.totalAmount)}</p>
                            <Badge variant={bill.status === 'paid' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                              {bill.status || 'pending'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No bills found for this customer</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

      </div>
                                 
      {/* Bill Preview Modal */}
      {previewingBill && (
        <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full max-w-[95vw] sm:max-w-4xl p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Bill Preview - {previewingBill.billNumber}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 overflow-x-auto">
              {/* Bill Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-sm sm:text-base mb-2">Bill Information</h3>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p><span className="font-medium">Bill Number:</span> {previewingBill.billNumber}</p>
                    <p><span className="font-medium">Date:</span> {formatDate(previewingBill.createdAt)}</p>
                    <p><span className="font-medium">Status:</span> 
                      <Badge variant={previewingBill.status === 'paid' ? 'default' : 'secondary'} className="ml-2 text-xs">
                        {previewingBill.status || 'pending'}
                      </Badge>
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base mb-2">Customer Information</h3>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p><span className="font-medium">Name:</span> {selectedCustomer?.name}</p>
                    <p><span className="font-medium">Phone:</span> {selectedCustomer?.phone}</p>
                    <p><span className="font-medium">Address:</span> {selectedCustomer?.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Bill Items */}
              {previewingBill.items && previewingBill.items.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm sm:text-base mb-3">Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left p-2">Item</th>
                          <th className="text-center p-2">Qty</th>
                          <th className="text-right p-2">Price</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewingBill.items.map((item: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">{item.name || item.productName}</td>
                            <td className="p-2 text-center">{item.quantity || item.qty}</td>
                            <td className="p-2 text-right">₹{item.price?.toLocaleString() || 0}</td>
                            <td className="p-2 text-right">₹{((item.quantity || item.qty) * (item.price || 0)).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bill Summary */}
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-sm sm:text-base mb-3">Bill Summary</h3>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{(previewingBill.subtotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span>₹{(previewingBill.gstAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total Amount:</span>
                    <span>₹{previewingBill.totalAmount.toLocaleString()}</span>
                  </div>
                  {previewingBill.paymentType === 'Partial' && (
                    <div className="flex justify-between text-red-600">
                      <span>Paid Amount:</span>
                      <span>₹{(previewingBill.paidAmount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  {previewingBill.paymentType === 'Partial' && (
                    <div className="flex justify-between text-red-600">
                      <span>Remaining:</span>
                      <span>₹{(previewingBill.remainingAmount || 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
