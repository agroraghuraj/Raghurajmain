import { Bill, BillItem, SalesReturn } from "../routes/billing";

export class BillingService {
  private bills: Bill[] = []; // In real app, this would be MongoDB operations
  private salesReturns: SalesReturn[] = [];
  private billCounters: { [key: string]: number } = {};

  // State codes for GST calculation
  private stateCodes: { [key: string]: string } = {
    "Andhra Pradesh": "37",
    "Arunachal Pradesh": "12",
    "Assam": "18",
    "Bihar": "10",
    "Chhattisgarh": "22",
    "Goa": "30",
    "Gujarat": "24",
    "Haryana": "06",
    "Himachal Pradesh": "02",
    "Jharkhand": "20",
    "Karnataka": "29",
    "Kerala": "32",
    "Madhya Pradesh": "23",
    "Maharashtra": "27",
    "Manipur": "14",
    "Meghalaya": "17",
    "Mizoram": "15",
    "Nagaland": "13",
    "Odisha": "21",
    "Punjab": "03",
    "Rajasthan": "08",
    "Sikkim": "11",
    "Tamil Nadu": "33",
    "Telangana": "36",
    "Tripura": "16",
    "Uttar Pradesh": "09",
    "Uttarakhand": "05",
    "West Bengal": "19",
    "Delhi": "07",
  };

  // Calculate bill amounts with proper GST logic
  async calculateBillAmounts(billData: Partial<Bill>): Promise<Partial<Bill>> {
    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const isInterState = ((billData as any).customer?.state || (billData as any).state) !== (billData as any).company?.state;
    
    const calculatedItems: BillItem[] = billData.items?.map(item => {
      const taxableAmount = (item as any).quantity * (item as any).rate;
      const gstAmount = (taxableAmount * (item as any).gstRate) / 100;
      
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;

      if (billData.billType === "GST") {
        if (isInterState) {
          igstAmount = gstAmount;
        } else {
          cgstAmount = gstAmount / 2;
          sgstAmount = gstAmount / 2;
        }
      }

      subtotal += taxableAmount;
      cgstTotal += cgstAmount;
      sgstTotal += sgstAmount;
      igstTotal += igstAmount;

      return {
        ...item,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount: taxableAmount + gstAmount,
      };
    }) || [];

    const discountAmount = (subtotal * ((billData as any).discountPercent || 0)) / 100;
    const taxableAmount = subtotal - discountAmount;
    const totalTax = cgstTotal + sgstTotal + igstTotal;
    const beforeRounding = taxableAmount + totalTax;
    const finalAmount = Math.round(beforeRounding);
    const roundOffAmount = finalAmount - beforeRounding;

    return {
      ...billData,
      items: calculatedItems,
      subtotal,
      discountAmount,
      // taxableAmount, // Removed as it doesn't exist in Bill interface
      // cgstTotal, // Removed as it doesn't exist in Bill interface
      // sgstTotal, // Removed as it doesn't exist in Bill interface
      // igstTotal, // Removed as it doesn't exist in Bill interface
      // totalTax, // Removed as it doesn't exist in Bill interface
      // roundOffAmount, // Removed as it doesn't exist in Bill interface
      // finalAmount, // Removed as it doesn't exist in Bill interface
    };
  }

  // Generate bill number based on financial year and bill type
  async generateBillNumber(billType: string, financialYear: string): Promise<string> {
    const key = `${billType}-${financialYear}`;
    
    if (!this.billCounters[key]) {
      this.billCounters[key] = 0;
    }
    
    this.billCounters[key]++;
    
    const prefix = billType === "GST" ? "GST" : billType === "Non-GST" ? "NGST" : "DEMO";
    const fyShort = financialYear.split("-").map(y => y.slice(-2)).join("");
    
    return `${prefix}/${fyShort}/${this.billCounters[key].toString().padStart(4, "0")}`;
  }

  // Generate return number
  async generateReturnNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const key = `return-${currentYear}`;
    
    if (!this.billCounters[key]) {
      this.billCounters[key] = 0;
    }
    
    this.billCounters[key]++;
    
    return `RET/${currentYear}/${this.billCounters[key].toString().padStart(4, "0")}`;
  }

  // CRUD operations for bills
  async getBills(filters: any, pagination: { page: number; limit: number }) {
    // Mock implementation - in real app, this would be MongoDB queries
    let filteredBills = [...this.bills];
    
    // Apply filters
    if (filters.$or) {
      filteredBills = filteredBills.filter(bill => 
        filters.$or.some((condition: any) => {
          if (condition.billNumber) {
            return bill.billNumber.toLowerCase().includes(condition.billNumber.$regex.toLowerCase());
          }
          if (condition['customer.name']) {
            return (bill as any).customer.name.toLowerCase().includes(condition['customer.name'].$regex.toLowerCase());
          }
          if (condition['customer.phone']) {
            return (bill as any).customer.phone.includes(condition['customer.phone'].$regex);
          }
          return false;
        })
      );
    }

    if (filters.billType) {
      filteredBills = filteredBills.filter(bill => bill.billType === filters.billType);
    }

    if (filters.paymentStatus) {
      filteredBills = filteredBills.filter(bill => (bill as any).paymentStatus === filters.paymentStatus);
    }

    if (filters.billDate) {
      filteredBills = filteredBills.filter(bill => {
        const billDate = new Date(bill.billDate);
        if (filters.billDate.$gte && billDate < filters.billDate.$gte) return false;
        if (filters.billDate.$lte && billDate > filters.billDate.$lte) return false;
        return true;
      });
    }

    const total = filteredBills.length;
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    
    return {
      bills: filteredBills.slice(startIndex, endIndex),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async getBillById(id: string): Promise<Bill | null> {
    return this.bills.find(bill => bill.id === id) || null;
  }

  async createBill(billData: Bill): Promise<Bill> {
    const newBill = {
      ...billData,
      id: Date.now().toString(),
    };
    
    this.bills.push(newBill);
    return newBill;
  }

  async updateBill(id: string, updates: Partial<Bill>): Promise<Bill | null> {
    const index = this.bills.findIndex(bill => bill.id === id);
    if (index === -1) return null;
    
    this.bills[index] = { ...this.bills[index], ...updates };
    return this.bills[index];
  }

  async deleteBill(id: string): Promise<boolean> {
    const index = this.bills.findIndex(bill => bill.id === id);
    if (index === -1) return false;
    
    this.bills.splice(index, 1);
    return true;
  }

  // Dashboard statistics
  async getDashboardStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todaysBills = this.bills.filter(bill => 
      new Date(bill.billDate) >= startOfToday
    );

    const monthsBills = this.bills.filter(bill => 
      new Date(bill.billDate) >= startOfMonth
    );

    const totalRevenue = this.bills.reduce((sum, bill) => sum + (bill as any).finalAmount, 0);
    const todaysRevenue = todaysBills.reduce((sum, bill) => sum + (bill as any).finalAmount, 0);
    const monthsRevenue = monthsBills.reduce((sum, bill) => sum + (bill as any).finalAmount, 0);

    const uniqueCustomers = new Set(this.bills.map(bill => (bill as any).customer.id)).size;
    const todaysCustomers = new Set(todaysBills.map(bill => (bill as any).customer.id)).size;

    return {
      totalRevenue,
      totalSales: this.bills.length,
      totalCustomers: uniqueCustomers,
      todaysRevenue,
      todaysSales: todaysBills.length,
      todaysCustomers,
      monthsRevenue,
      monthsSales: monthsBills.length,
      recentTransactions: this.bills
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10),
      paymentStatusBreakdown: {
        paid: this.bills.filter(b => (b as any).paymentStatus === "Paid").length,
        pending: this.bills.filter(b => (b as any).paymentStatus === "Pending").length,
        overdue: this.bills.filter(b => (b as any).paymentStatus === "Overdue").length,
      },
      billTypeBreakdown: {
        gst: this.bills.filter(b => b.billType === "GST").length,
        nonGst: this.bills.filter(b => b.billType === "NON_GST").length,
        demo: this.bills.filter(b => b.billType === "Demo").length,
      },
    };
  }

  // Sales Returns
  async getSalesReturns(filters: any, pagination: { page: number; limit: number }) {
    let filteredReturns = [...this.salesReturns];
    
    // Apply filters similar to bills
    if (filters.$or) {
      filteredReturns = filteredReturns.filter(ret => 
        filters.$or.some((condition: any) => {
          if (condition.returnNumber) {
            return (ret as any).returnNumber.toLowerCase().includes(condition.returnNumber.$regex.toLowerCase());
          }
          if (condition.originalBillNumber) {
            return (ret as any).originalBillNumber.toLowerCase().includes(condition.originalBillNumber.$regex.toLowerCase());
          }
          if (condition['customer.name']) {
            return (ret as any).customer.name.toLowerCase().includes(condition['customer.name'].$regex.toLowerCase());
          }
          return false;
        })
      );
    }

    const total = filteredReturns.length;
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    
    return {
      returns: filteredReturns.slice(startIndex, endIndex),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async createSalesReturn(returnData: SalesReturn): Promise<SalesReturn> {
    const newReturn = {
      ...returnData,
      id: Date.now().toString(),
    };
    
    this.salesReturns.push(newReturn);
    return newReturn;
  }

  async updateSalesReturnStatus(id: string, status: string): Promise<SalesReturn | null> {
    const index = this.salesReturns.findIndex(ret => ret.id === id);
    if (index === -1) return null;
    
    (this.salesReturns[index] as any).status = status as any;
    return this.salesReturns[index];
  }

  // PDF Generation (mock implementation)
  async generatePDF(bill: Bill): Promise<Buffer> {
    // In real implementation, use jsPDF or puppeteer
    const pdfContent = `
      Bill Number: ${bill.billNumber}
      Date: ${bill.billDate}
      Customer: ${(bill as any).customer.name}
      Total: ₹${(bill as any).finalAmount}
      
      Items:
      ${bill.items.map(item => 
        `${(item as any).productName} x ${(item as any).quantity} @ ₹${(item as any).rate} = ₹${(item as any).totalAmount}`
      ).join('\n')}
      
      Subtotal: ₹${bill.subtotal}
      ${bill.billType === 'GST' ? `
      CGST: ₹${(bill as any).cgstTotal}
      SGST: ₹${(bill as any).sgstTotal}
      IGST: ₹${(bill as any).igstTotal}
      ` : ''}
      Total: ₹${(bill as any).finalAmount}
    `;
    
    return Buffer.from(pdfContent, 'utf-8');
  }
}
