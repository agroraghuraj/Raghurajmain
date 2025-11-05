import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoiceData {
  billNumber: string;
  billDate: string;
  customer: {
    name: string;
    phone: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    email?: string;
    gstNumber?: string;
  };
  items: Array<{
    itemName: string;
    itemPrice: number;
    itemQuantity: number;
    itemTotal: number;
    gstPercent?: number;
    gstAmount?: number;
  }>;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  gstTotal: number;
  finalAmount: number;
  billingMode: string;
  observation?: string;
  termsAndConditions?: string;
  paymentMode: string;
  paidAmount: number;
  pendingAmount: number;
  paymentMethod: string;
  isSameState?: boolean;
  cgst?: number;
  sgst?: number;
  igst?: number;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstNumber: string;
    logo?: string;
  };
}

export class PDFGenerator {
  private doc: jsPDF;
  // Cache for loaded logo data URLs to avoid repeated fetch/encode
  private logoCache: Record<string, string> = {};

  constructor() {
    this.doc = new jsPDF("p", "mm", "a4");
  }

  // Load an image URL into a data URL that jsPDF can embed. Caches by URL.
  private async loadImageDataUrl(url?: string): Promise<string | null> {
    try {
      if (!url) return null;
      const key = url.trim();
      if (this.logoCache[key]) return this.logoCache[key];
      const res = await fetch(key, { mode: 'cors' });
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      this.logoCache[key] = dataUrl;
      return dataUrl;
    } catch (e) {
      console.warn('Failed to load logo for PDF:', e);
      return null;
    }
  }

  // ✅ FIX: Changed ₹ to Rs.
  private formatCurrency(amount: number): string {
    return `Rs. ${amount.toFixed(2)}`;
  }

  private formatDate(date: string): string {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  private numberToWords(num: number): string {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];

    if (num === 0) return "Zero";
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "");
    if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " and " + this.numberToWords(num % 100) : "");
    if (num < 100000) return this.numberToWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 !== 0 ? " " + this.numberToWords(num % 1000) : "");
    if (num < 10000000) return this.numberToWords(Math.floor(num / 100000)) + " Lakh" + (num % 100000 !== 0 ? " " + this.numberToWords(num % 100000) : "");
    return this.numberToWords(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 !== 0 ? " " + this.numberToWords(num % 10000000) : "");
  }

  public async generateInvoicePDF(invoiceData: InvoiceData, companyInfo?: any) {
    try {
      console.log('📄 PDF Generator called with:', { invoiceData, companyInfo });
      
      // Create a new PDF document for each generation
      this.doc = new jsPDF("p", "mm", "a4");
    
    // Use companyInfo parameter first, then invoiceData.companyInfo, then defaults
    const company = companyInfo ? {
      name: companyInfo.name || "Savera Electronics",
      address: companyInfo.address ? 
        `${companyInfo.address.street}, ${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.pincode}` : 
        "Burhanpur, India",
      phone: companyInfo.phone || "+91 98765 43210",
      email: companyInfo.email || "info@saveraelectronic.com",
      gstNumber: companyInfo.gstNumber || "07ABCDE1234F1Z5",
    } : invoiceData.companyInfo || {
      name: "Savera Electronics",
      address: "Burhanpur, India",
      phone: "+91 98765 43210",
      email: "info@saveraelectronic.com",
      gstNumber: "07ABCDE1234F1Z5",
    };

    console.log('🏢 Final company data for PDF:', company);

    // Header + Logo
    const drawHeader = async () => {
      let leftX = 15;
      const topY = 15;
      const lineGap = 5;
      let currentY = topY;

      // Try to draw logo (fits in 20x20mm box)
      const logoSrc: string | undefined = (companyInfo && companyInfo.logo) ? companyInfo.logo : (invoiceData.companyInfo && invoiceData.companyInfo.logo) ? invoiceData.companyInfo.logo : undefined;
      const logoDataUrl = await this.loadImageDataUrl(logoSrc);
      if (logoDataUrl) {
        try {
          this.doc.addImage(logoDataUrl, 'PNG', leftX, currentY, 20, 20, undefined, 'FAST');
          leftX += 24; // add spacing after logo box
        } catch {}
      }
      // Do not render company name text; show only logo
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(company.address, leftX, currentY + 12);
      this.doc.text(`Phone: ${company.phone}`, leftX, currentY + 17);
      this.doc.text(`Email: ${company.email}`, leftX, currentY + 22);
      this.doc.text(`GST: ${company.gstNumber}`, leftX, currentY + 27);
    };

    await drawHeader();

    // Push header baseline a bit lower to make room for the logo block
    
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(14);
    this.doc.text("TAX INVOICE", 105, 55, { align: "center" });

    // Invoice details
    autoTable(this.doc, {
      startY: 65,
      head: [["Invoice No", "Invoice Date", "Billing Mode", "Payment Method"]],
      body: [[
        invoiceData.billNumber,
        this.formatDate(invoiceData.billDate),
        invoiceData.billingMode,
        invoiceData.paymentMethod,
      ]],
      styles: { fontSize: 10, halign: "center" },
      headStyles: { fillColor: [66, 66, 66], textColor: 255 },
    });

    // Customer details
    autoTable(this.doc, {
      startY: (this.doc as any).lastAutoTable.finalY + 10,
      head: [["Customer Name", "Phone", "Email", "GST No"]],
      body: [[
        invoiceData.customer.name,
        invoiceData.customer.phone,
        invoiceData.customer.email || "-",
        invoiceData.customer.gstNumber || "-",
      ]],
      styles: { fontSize: 10, halign: "center" },
      headStyles: { fillColor: [200, 200, 200], textColor: 20 },
    });

    if (invoiceData.customer.address) {
      this.doc.text(`Address: ${invoiceData.customer.address}`, 15, (this.doc as any).lastAutoTable.finalY + 8);
    }

    // Items table
    const items = invoiceData.items.map((item) => [
      item.itemName,
      item.itemQuantity,
      this.formatCurrency(item.itemPrice),
      this.formatCurrency(item.itemTotal),
      invoiceData.billingMode === "GST" ? `${item.gstPercent || 18}%` : "-",
      invoiceData.billingMode === "GST" ? this.formatCurrency(item.gstAmount || 0) : "-",
      this.formatCurrency(invoiceData.billingMode === "GST" ? item.itemTotal + (item.gstAmount || 0) : item.itemTotal),
    ]);

    autoTable(this.doc, {
      startY: (this.doc as any).lastAutoTable.finalY + 15,
      head: [["Item", "Qty", "Rate", "Item Total", "GST%", "GST Amt", "Total"]],
      body: items,
      styles: { fontSize: 10, halign: "center" },
      headStyles: { fillColor: [100, 100, 100], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Totals section
    autoTable(this.doc, {
      startY: (this.doc as any).lastAutoTable.finalY + 10,
      body: [
        ["Subtotal", this.formatCurrency(invoiceData.subtotal)],
        invoiceData.discountPercent > 0
          ? [`Discount (${invoiceData.discountPercent}%)`, `-${this.formatCurrency(invoiceData.discountAmount)}`]
          : [],
        invoiceData.billingMode === "GST" ? ["CGST", this.formatCurrency(invoiceData.cgst)] : [],
        invoiceData.billingMode === "GST" ? ["SGST", this.formatCurrency(invoiceData.sgst)] : [],
        invoiceData.billingMode === "GST" ? ["GST Total", this.formatCurrency(invoiceData.gstTotal)] : [],
        ["Final Amount", this.formatCurrency(invoiceData.finalAmount)],
      ].filter(row => row.length > 0),
      styles: { fontSize: 10 },
      theme: "plain",
      columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
    });

    // Amount in words
    this.doc.setFont("helvetica", "italic");
    this.doc.text(
      `Amount in Words: ${this.numberToWords(invoiceData.finalAmount)} Only`,
      15,
      (this.doc as any).lastAutoTable.finalY + 10
    );

    // Footer
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.text("Thank you for your business!", 105, 280, { align: "center" });
    this.doc.text("This is a computer generated invoice. No signature required.", 105, 287, { align: "center" });

    this.doc.save(`Invoice-${invoiceData.billNumber}.pdf`);
    console.log('✅ PDF saved successfully');
    } catch (error) {
      console.error('❌ PDF Generation Error:', error);
      throw error; // Re-throw to be caught by calling function
    }
  }

  public async generateInvoicePDFBlob(invoiceData: InvoiceData, companyInfo?: any): Promise<Blob> {
    try {
      console.log('📄 PDF Generator (Blob) called with:', { invoiceData, companyInfo });
      
      // Create a new PDF document for each generation
      this.doc = new jsPDF("p", "mm", "a4");
    
    // Use companyInfo parameter first, then invoiceData.companyInfo, then defaults
    const company = companyInfo ? {
      name: companyInfo.name || "Savera Electronics",
      address: companyInfo.address ? 
        `${companyInfo.address.street}, ${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.pincode}` : 
        "Burhanpur, India",
      phone: companyInfo.phone || "+91 98765 43210",
      email: companyInfo.email || "info@saveraelectronic.com",
      gstNumber: companyInfo.gstNumber || "07ABCDE1234F1Z5",
    } : invoiceData.companyInfo || {
      name: "Savera Electronics",
      address: "Burhanpur, India",
      phone: "+91 98765 43210",
      email: "info@saveraelectronic.com",
      gstNumber: "07ABCDE1234F1Z5",
    };

    console.log('🏢 Final company data for PDF:', company);

    // Header: render only logo, no company name text
    const logoSrc: string | undefined = (companyInfo && companyInfo.logo) ? companyInfo.logo : (invoiceData.companyInfo && invoiceData.companyInfo.logo) ? invoiceData.companyInfo.logo : undefined;
    const logoDataUrl = await this.loadImageDataUrl(logoSrc);
    if (logoDataUrl) {
      try {
        this.doc.addImage(logoDataUrl, 'PNG', 15, 12, 20, 20, undefined, 'FAST');
      } catch {}
    }

    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(company.address, 39, 20);
    this.doc.text(`Phone: ${company.phone}`, 39, 25);
    this.doc.text(`Email: ${company.email}`, 39, 30);
    this.doc.text(`GST: ${company.gstNumber}`, 39, 35);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(14);
    this.doc.text("TAX INVOICE", 105, 50, { align: "center" });

    // Invoice details
    autoTable(this.doc, {
      startY: 60,
      head: [["Invoice No", "Invoice Date", "Billing Mode", "Payment Method"]],
      body: [[
        invoiceData.billNumber,
        this.formatDate(invoiceData.billDate),
        invoiceData.billingMode,
        invoiceData.paymentMethod
      ]],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    // Customer details with full address information
    const customerDetails = [
      invoiceData.customer.name,
      `Phone: ${invoiceData.customer.phone}`,
      `Email: ${invoiceData.customer.email || 'N/A'}`,
      `Address: ${invoiceData.customer.address || 'N/A'}`,
      `City: ${invoiceData.customer.city || 'N/A'}`,
      `State: ${invoiceData.customer.state || 'N/A'}`,
      `Pincode: ${invoiceData.customer.pincode || 'N/A'}`
    ].join('\n');

    autoTable(this.doc, {
      startY: 80,
      head: [["Bill To"]],
      body: [[customerDetails]],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    // Items table
    const tableData = invoiceData.items.map(item => [
      item.itemName,
      item.itemQuantity.toString(),
      `₹${item.itemPrice.toLocaleString()}`,
      `₹${item.itemTotal.toLocaleString()}`
    ]);

    autoTable(this.doc, {
      startY: 110,
      head: [["Item", "Qty", "Price", "Total"]],
      body: tableData,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    // Summary with state-wise GST
    const finalY = (this.doc as any).lastAutoTable.finalY + 20;
    
    // Build summary rows based on state-wise GST
    const summaryRows = [
      ["Subtotal", `₹${(invoiceData.subtotal || 0).toLocaleString()}`]
    ];
    
    // Add state-wise GST rows
    if (invoiceData.isSameState) {
      // Same state - show CGST and SGST
      if (invoiceData.cgst > 0) {
        summaryRows.push(["CGST (9%)", `₹${invoiceData.cgst.toLocaleString()}`]);
      }
      if (invoiceData.sgst > 0) {
        summaryRows.push(["SGST (9%)", `₹${invoiceData.sgst.toLocaleString()}`]);
      }
    } else {
      // Different state - show IGST
      if (invoiceData.igst > 0) {
        summaryRows.push(["IGST (18%)", `₹${invoiceData.igst.toLocaleString()}`]);
      }
    }
    
    // Add remaining rows
    summaryRows.push(
      ["Total Amount", `₹${(invoiceData.finalAmount || 0).toLocaleString()}`],
      ["Paid Amount", `₹${(invoiceData.paidAmount || 0).toLocaleString()}`],
      ["Pending Amount", `₹${(invoiceData.pendingAmount || 0).toLocaleString()}`]
    );
    
    autoTable(this.doc, {
      startY: finalY,
      body: summaryRows,
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: 'right' } }
    });

    // Footer
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.text("Thank you for your business!", 105, 280, { align: "center" });
    this.doc.text("This is a computer generated invoice. No signature required.", 105, 287, { align: "center" });

    // Return blob instead of saving
    const pdfBlob = this.doc.output('blob');
    console.log('✅ PDF blob generated successfully');
    return pdfBlob;
    } catch (error) {
      console.error('❌ PDF Generation Error:', error);
      throw error; // Re-throw to be caught by calling function
    }
  }

  public generateMultipleBillsPDF(allBillsData: InvoiceData[], companyInfo?: any, customerName?: string) {
    try {
      console.log('📄 Multiple Bills PDF Generator called with:', { billsCount: allBillsData.length, customerName, companyInfo });
      
      // Create a new PDF document for multiple bills
      this.doc = new jsPDF("p", "mm", "a4");
      
      // Use companyInfo parameter first, then defaults
      const company = companyInfo ? {
        name: companyInfo.name || "Savera Electronics",
        address: companyInfo.address ? 
          `${companyInfo.address.street}, ${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.pincode}` : 
          "Burhanpur, India",
        phone: companyInfo.phone || "+91 98765 43210",
        email: companyInfo.email || "info@saveraelectronic.com",
        gstNumber: companyInfo.gstNumber || "07ABCDE1234F1Z5",
      } : {
        name: "Savera Electronics",
        address: "Burhanpur, India",
        phone: "+91 98765 43210",
        email: "info@saveraelectronic.com",
        gstNumber: "07ABCDE1234F1Z5",
      };

      for (let i = 0; i < allBillsData.length; i++) {
        const invoiceData = allBillsData[i];
        
        // Add new page for each bill (except the first one)
        if (i > 0) {
          this.doc.addPage();
        }

        let currentY = 20;

        // Header for each bill
        this.doc.setFontSize(16);
        this.doc.setFont("helvetica", "bold");
        this.doc.text(company.name, 15, currentY);
        currentY += 7;

        this.doc.setFontSize(10);
        this.doc.setFont("helvetica", "normal");
        this.doc.text(company.address, 15, currentY);
        currentY += 5;
        this.doc.text(`Phone: ${company.phone}`, 15, currentY);
        currentY += 5;
        this.doc.text(`Email: ${company.email}`, 15, currentY);
        currentY += 5;
        this.doc.text(`GST: ${company.gstNumber}`, 15, currentY);
        currentY += 10;

        // Bill title
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(14);
        this.doc.text("TAX INVOICE", 105, currentY, { align: "center" });
        currentY += 10;

        // Invoice details
        autoTable(this.doc, {
          startY: currentY,
          head: [["Invoice No", "Invoice Date", "Billing Mode", "Payment Method"]],
          body: [[
            invoiceData.billNumber,
            this.formatDate(invoiceData.billDate),
            invoiceData.billingMode,
            invoiceData.paymentMethod,
          ]],
          styles: { fontSize: 10, halign: "center" },
          headStyles: { fillColor: [66, 66, 66], textColor: 255 },
        });

        currentY = (this.doc as any).lastAutoTable.finalY + 10;

        // Customer details
        autoTable(this.doc, {
          startY: currentY,
          head: [["Customer Name", "Phone", "Email", "GST No"]],
          body: [[
            invoiceData.customer.name,
            invoiceData.customer.phone,
            invoiceData.customer.email || "-",
            invoiceData.customer.gstNumber || "-",
          ]],
          styles: { fontSize: 10, halign: "center" },
          headStyles: { fillColor: [200, 200, 200], textColor: 20 },
        });

        currentY = (this.doc as any).lastAutoTable.finalY + 8;

        if (invoiceData.customer.address) {
          this.doc.text(`Address: ${invoiceData.customer.address}`, 15, currentY);
          currentY += 5;
        }

        // Items table
        const items = invoiceData.items.map((item) => [
          item.itemName,
          item.itemQuantity,
          this.formatCurrency(item.itemPrice),
          this.formatCurrency(item.itemTotal),
          invoiceData.billingMode === "GST" ? `${item.gstPercent || 18}%` : "-",
          invoiceData.billingMode === "GST" ? this.formatCurrency(item.gstAmount || 0) : "-",
          this.formatCurrency(invoiceData.billingMode === "GST" ? item.itemTotal + (item.gstAmount || 0) : item.itemTotal),
        ]);

        autoTable(this.doc, {
          startY: currentY,
          head: [["Item", "Qty", "Rate", "Item Total", "GST%", "GST Amt", "Total"]],
          body: items,
          styles: { fontSize: 10, halign: "center" },
          headStyles: { fillColor: [100, 100, 100], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });

        currentY = (this.doc as any).lastAutoTable.finalY + 10;

        // Totals section
        autoTable(this.doc, {
          startY: currentY,
          body: [
            ["Subtotal", this.formatCurrency(invoiceData.subtotal)],
            invoiceData.discountPercent > 0
              ? [`Discount (${invoiceData.discountPercent}%)`, `-${this.formatCurrency(invoiceData.discountAmount)}`]
              : [],
            invoiceData.billingMode === "GST" ? ["CGST", this.formatCurrency(invoiceData.cgst)] : [],
            invoiceData.billingMode === "GST" ? ["SGST", this.formatCurrency(invoiceData.sgst)] : [],
            invoiceData.billingMode === "GST" ? ["GST Total", this.formatCurrency(invoiceData.gstTotal)] : [],
            ["Final Amount", this.formatCurrency(invoiceData.finalAmount)],
          ].filter(row => row.length > 0),
          styles: { fontSize: 10 },
          theme: "plain",
          columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
        });

        currentY = (this.doc as any).lastAutoTable.finalY + 10;

        // Amount in words
        this.doc.setFont("helvetica", "italic");
        this.doc.setFontSize(9);
        this.doc.text(
          `Amount in Words: ${this.numberToWords(invoiceData.finalAmount)} Only`,
          15,
          currentY
        );

        // Footer for each bill
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(9);
        this.doc.text("Thank you for your business!", 105, 280, { align: "center" });
        this.doc.text("This is a computer generated invoice. No signature required.", 105, 287, { align: "center" });

        console.log(`✅ Bill ${invoiceData.billNumber} added to PDF`);
      }

      const fileName = customerName ? 
        `All_Bills_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf` :
        `All_Bills_${new Date().toISOString().split('T')[0]}.pdf`;

      this.doc.save(fileName);
      console.log('✅ Multiple Bills PDF saved successfully');
    } catch (error) {
      console.error('❌ Multiple Bills PDF Generation Error:', error);
      throw error;
    }
  }

  // Export all customers to PDF
  async generateCustomerListPDF(customerData: any[], companyInfo?: any) {
    try {
      console.log('📄 Generating Customer List PDF...');
      console.log('📊 Customer Data:', customerData.length, 'customers');
      console.log('🏢 Company Info:', companyInfo);
      
      // Test if jsPDF is working
      console.log('🧪 Testing jsPDF...');
      this.doc = new jsPDF("p", "mm", "a4");
      console.log('✅ jsPDF created successfully');
      
      // Remove test text for cleaner design
      
      let startY = 20; // Default starting position
      
      // Company Header (if company info is provided)
      if (companyInfo) {
        console.log('🏢 Company Info Structure:', companyInfo);
        console.log('🏢 Address type:', typeof companyInfo.address, companyInfo.address);
        console.log('🏢 Phone type:', typeof companyInfo.phone, companyInfo.phone);
        console.log('🏢 Email type:', typeof companyInfo.email, companyInfo.email);
        console.log('🏢 GST type:', typeof companyInfo.gstNumber, companyInfo.gstNumber);
        
        // Company name with professional styling
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(20);
        this.doc.setTextColor(41, 128, 185);
        const companyName = typeof companyInfo.name === 'string' ? companyInfo.name : String(companyInfo.name || "Company Name");
        this.doc.text(companyName, 105, 22, { align: "center" });
        
        // Contact details with better formatting
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(11);
        this.doc.setTextColor(60, 60, 60);
        let yPos = 30;
        
        if (companyInfo.address) {
          let addressText = '';
          if (typeof companyInfo.address === 'string') {
            addressText = companyInfo.address;
          } else if (typeof companyInfo.address === 'object' && companyInfo.address !== null) {
            // Format address object properly
            const addr = companyInfo.address;
            const parts = [];
            if (addr.street) parts.push(addr.street);
            if (addr.city) parts.push(addr.city);
            if (addr.state) parts.push(addr.state);
            if (addr.pincode) parts.push(addr.pincode);
            addressText = parts.join(', ');
          } else {
            addressText = String(companyInfo.address);
          }
          
          if (addressText) {
            this.doc.text(addressText, 105, yPos, { align: "center" });
            yPos += 5;
          }
        }
        
        // Format contact information in a modern way
        const contactInfo = [];
        if (companyInfo.phone) {
          const phoneText = typeof companyInfo.phone === 'string' ? companyInfo.phone : String(companyInfo.phone);
          contactInfo.push(`Phone: ${phoneText}`);
        }
        if (companyInfo.email) {
          const emailText = typeof companyInfo.email === 'string' ? companyInfo.email : String(companyInfo.email);
          contactInfo.push(`Email: ${emailText}`);
        }
        if (companyInfo.gstNumber) {
          const gstText = typeof companyInfo.gstNumber === 'string' ? companyInfo.gstNumber : String(companyInfo.gstNumber);
          contactInfo.push(`GST: ${gstText}`);
        }
        
        // Display contact info in a single line or multiple lines
        if (contactInfo.length > 0) {
          const contactText = contactInfo.join(' | ');
          this.doc.text(contactText, 105, yPos, { align: "center" });
          yPos += 6;
        }
        
        // Add a professional line separator
        this.doc.setDrawColor(41, 128, 185);
        this.doc.setLineWidth(1);
        this.doc.line(20, yPos + 3, 190, yPos + 3);
        yPos += 10;
        
        startY = yPos + 10; // Adjust starting position for report header
      }
      
      // Report Header with professional styling
      // Add a subtle background for the report title
      this.doc.setFillColor(245, 245, 245);
      this.doc.rect(15, startY - 8, 180, 20, 'F');
      
      // Add a border around the header
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.5);
      this.doc.rect(15, startY - 8, 180, 20);
      
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(18);
      this.doc.setTextColor(41, 128, 185);
      this.doc.text("Customer List Report", 105, startY + 2, { align: "center" });
      
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(11);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, startY + 8, { align: "center" });
      this.doc.text(`Total Customers: ${customerData.length}`, 105, startY + 13, { align: "center" });
      
      // Reset text color for table
      this.doc.setTextColor(0, 0, 0);
      
      // Customer table
      const tableData = customerData.map(customer => [
        customer.id,
        customer.name,
        customer.phone,
        customer.email,
        `Rs. ${customer.totalPurchases.toLocaleString()}`,
        customer.orderCount,
        customer.lastPurchase,
        customer.customerSince
      ]);

      autoTable(this.doc, {
        head: [['#', 'Name', 'Phone', 'Email', 'Total Purchases', 'Orders', 'Last Purchase', 'Customer Since']],
        body: tableData,
        startY: startY + 20,
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        showHead: 'everyPage',
        styles: { 
          fontSize: 9,
          cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
          lineColor: [220, 220, 220],
          lineWidth: 0.2,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: { top: 6, right: 4, bottom: 6, left: 4 }
        },
        alternateRowStyles: { 
          fillColor: [250, 250, 250]
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }, // #
          1: { cellWidth: 28, halign: 'left', fontStyle: 'bold' }, // Name
          2: { cellWidth: 22, halign: 'left' }, // Phone
          3: { cellWidth: 32, halign: 'left' }, // Email
          4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }, // Total Purchases
          5: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }, // Orders
          6: { cellWidth: 22, halign: 'center' }, // Last Purchase
          7: { cellWidth: 22, halign: 'center' }  // Customer Since
        },
        didDrawPage: (data) => {
          // Add page numbers
          const totalPages = this.doc.getNumberOfPages ? this.doc.getNumberOfPages() : (this.doc.internal && (this.doc.internal as any).getNumberOfPages) ? (this.doc.internal as any).getNumberOfPages() : data.pageNumber;
          this.doc.setFontSize(8);
          this.doc.setTextColor(128, 128, 128);
          const pageHeight = (this.doc.internal && this.doc.internal.pageSize && this.doc.internal.pageSize.height)
            ? this.doc.internal.pageSize.height
            : this.doc.internal.pageSize ? (this.doc.internal.pageSize.getHeight ? this.doc.internal.pageSize.getHeight() : 297) : 297;
          this.doc.text(
            `Page ${data.pageNumber} of ${totalPages}`,
            105,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      });

      const fileName = `Customer_List_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('💾 Saving PDF with filename:', fileName);
      
      // Save the PDF
      this.doc.save(fileName);
      console.log('✅ Customer List PDF saved successfully');
    } catch (error) {
      console.error('❌ Customer List PDF Generation Error:', error);
      throw error;
    }
  }

  // Export all bills to PDF
  async generateBillListPDF(billData: any[], companyInfo?: any) {
    try {
      console.log('📄 Generating Bill List PDF...');
      console.log('🏢 Company Info:', companyInfo);
      
      this.doc = new jsPDF("p", "mm", "a4");
      
      let startY = 20; // Default starting position
      
      // Company Header (if company info is provided)
      if (companyInfo) {
        console.log('🏢 Adding company header to Bill List PDF');
        
        // Company name with professional styling
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(20);
        this.doc.setTextColor(41, 128, 185);
        const companyName = typeof companyInfo.name === 'string' ? companyInfo.name : String(companyInfo.name || "Company Name");
        this.doc.text(companyName, 105, 22, { align: "center" });
        
        // Contact details with better formatting
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(11);
        this.doc.setTextColor(60, 60, 60);
        let yPos = 30;
        
        if (companyInfo.address) {
          let addressText = '';
          if (typeof companyInfo.address === 'string') {
            addressText = companyInfo.address;
          } else if (typeof companyInfo.address === 'object' && companyInfo.address !== null) {
            // Format address object properly
            const addr = companyInfo.address;
            const parts = [];
            if (addr.street) parts.push(addr.street);
            if (addr.city) parts.push(addr.city);
            if (addr.state) parts.push(addr.state);
            if (addr.pincode) parts.push(addr.pincode);
            addressText = parts.join(', ');
          } else {
            addressText = String(companyInfo.address);
          }
          
          if (addressText) {
            this.doc.text(addressText, 105, yPos, { align: "center" });
            yPos += 5;
          }
        }
        
        // Format contact information in a modern way
        const contactInfo = [];
        if (companyInfo.phone) {
          const phoneText = typeof companyInfo.phone === 'string' ? companyInfo.phone : String(companyInfo.phone);
          contactInfo.push(`Phone: ${phoneText}`);
        }
        if (companyInfo.email) {
          const emailText = typeof companyInfo.email === 'string' ? companyInfo.email : String(companyInfo.email);
          contactInfo.push(`Email: ${emailText}`);
        }
        if (companyInfo.gstNumber) {
          const gstText = typeof companyInfo.gstNumber === 'string' ? companyInfo.gstNumber : String(companyInfo.gstNumber);
          contactInfo.push(`GST: ${gstText}`);
        }
        
        // Display contact info in a single line or multiple lines
        if (contactInfo.length > 0) {
          const contactText = contactInfo.join(' | ');
          this.doc.text(contactText, 105, yPos, { align: "center" });
          yPos += 6;
        }
        
        // Add a professional line separator
        this.doc.setDrawColor(41, 128, 185);
        this.doc.setLineWidth(1);
        this.doc.line(20, yPos + 3, 190, yPos + 3);
        yPos += 10;
        
        startY = yPos + 10; // Adjust starting position for report header
      }
      
      // Report Header with professional styling
      // Add a subtle background for the report title
      this.doc.setFillColor(245, 245, 245);
      this.doc.rect(15, startY - 8, 180, 20, 'F');
      
      // Add a border around the header
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.5);
      this.doc.rect(15, startY - 8, 180, 20);
      
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(18);
      this.doc.setTextColor(41, 128, 185);
      this.doc.text("Bill List Report", 105, startY + 2, { align: "center" });
      
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(11);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, startY + 8, { align: "center" });
      this.doc.text(`Total Bills: ${billData.length}`, 105, startY + 13, { align: "center" });
      
      // Reset text color for content
      this.doc.setTextColor(0, 0, 0);
      
      // Calculate totals
      const totalRevenue = billData.reduce((sum, bill) => sum + bill.totalAmount, 0);
      const totalPaid = billData.reduce((sum, bill) => sum + bill.paidAmount, 0);
      const totalPending = billData.reduce((sum, bill) => sum + bill.remainingAmount, 0);
      
      this.doc.text(`Total Revenue: Rs. ${totalRevenue.toLocaleString()}`, 15, startY + 25);
      this.doc.text(`Total Paid: Rs. ${totalPaid.toLocaleString()}`, 15, startY + 32);
      this.doc.text(`Total Pending: Rs. ${totalPending.toLocaleString()}`, 15, startY + 39);
      
      // Bill table
      const tableData = billData.map(bill => [
        bill.id,
        bill.billNumber,
        bill.date,
        bill.customerName,
        bill.billType,
        `Rs. ${bill.totalAmount.toLocaleString()}`,
        `Rs. ${bill.paidAmount.toLocaleString()}`,
        `Rs. ${bill.remainingAmount.toLocaleString()}`,
        bill.paymentType,
        bill.status
      ]);

      autoTable(this.doc, {
        head: [['#', 'Bill No', 'Date', 'Customer', 'Type', 'Total', 'Paid', 'Pending', 'Payment', 'Status']],
        body: tableData,
        startY: startY + 50,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      const fileName = `Bill_List_${new Date().toISOString().split('T')[0]}.pdf`;
      this.doc.save(fileName);
      console.log('✅ Bill List PDF saved successfully');
    } catch (error) {
      console.error('❌ Bill List PDF Generation Error:', error);
      throw error;
    }
  }
}

export const pdfGenerator = new PDFGenerator();
