import { RequestHandler } from "express";

// Sample Bill interface matching the API
export interface BillItem {
  itemName: string;
  itemPrice: number;
  itemQuantity: number;
  itemTotal?: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  billDate: string;
  customerName: string;
  customerPhone: string;
  customerId?: string; // Add customerId field
  customerAddress?: string;
  pincode?: string;
  items: BillItem[];
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentType: "Full" | "Partial";
  paymentMethod: "cash" | "online" | "mixed";
  observation?: string;
  termsAndConditions?: string;
  billType: "GST" | "NON_GST" | "QUOTATION" | "Demo";
  stateKey: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SalesReturn {
  id: string;
  billId: string;
  returnDate: string;
  items: BillItem[];
  totalReturnAmount: number;
  reason: string;
  createdAt: string;
  updatedAt?: string;
}

// Mock data store (in production, use database)
let bills: Bill[] = [];
let billCounter = 1;


// Create new bill
export const createBill: RequestHandler = (req, res) => {
  try {
    const billData = req.body;

    const newBill: Bill = {
      id: Date.now().toString(),
      billNumber:
        billData.billNumber ||
        `BILL/${new Date().getFullYear()}/${String(billCounter++).padStart(4, "0")}`,
      billDate: billData.billDate || new Date().toISOString(),
      customerId: billData.customerId || billData.customerPhone, // Use customerId or fallback to phone
      ...billData,
      createdAt: new Date().toISOString(),
    };

    bills.unshift(newBill);

    console.log("✅ Created new bill:", { id: newBill.id, customerId: newBill.customerId, customerName: newBill.customerName });

    res.status(201).json({
      success: true,
      message: "Bill created successfully",
      data: newBill,
    });
  } catch (error) {
    console.error("Create bill error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating bill",
      error: (error as Error).message,
    });
  }
};

// Get all bills
export const getAllBills: RequestHandler = (req, res) => {
  try {
    res.json({
      success: true,
      data: bills,
    });
  } catch (error) {
    console.error("Get bills error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bills",
      error: (error as Error).message,
    });
  }
};

// Get bill by ID
export const getBillById: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const bill = bills.find((b) => b.id === id);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    res.json({
      success: true,
      data: bill,
    });
  } catch (error) {
    console.error("Get bill error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bill",
      error: (error as Error).message,
    });
  }
};

// Update bill
export const updateBill: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const billIndex = bills.findIndex((b) => b.id === id);

    if (billIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    bills[billIndex] = {
      ...bills[billIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      message: "Bill updated successfully",
      data: bills[billIndex],
    });
  } catch (error) {
    console.error("Update bill error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating bill",
      error: (error as Error).message,
    });
  }
};

// Delete bill
export const deleteBill: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const billIndex = bills.findIndex((b) => b.id === id);

    if (billIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    bills.splice(billIndex, 1);

    res.json({
      success: true,
      message: "Bill deleted successfully",
    });
  } catch (error) {
    console.error("Delete bill error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting bill",
      error: (error as Error).message,
    });
  }
};

// Get bills by customer ID
export const getBillsByCustomer: RequestHandler = (req, res) => {
  try {
    const { customerId } = req.params;
    
    console.log("🔍 Searching for customer ID:", customerId);
    console.log("📋 Available bills:", bills.map(b => ({ id: b.id, customerName: b.customerName, customerPhone: b.customerPhone, customerId: b.customerId })));
    
    // Filter bills by customer ID, phone, or name
    const customerBills = bills.filter((bill) => {
      const matchesId = bill.customerId === customerId;
      const matchesPhone = bill.customerPhone === customerId;
      const matchesName = bill.customerName.toLowerCase().includes(customerId.toLowerCase());
      const matchesBillId = bill.id === customerId;
      
      return matchesId || matchesPhone || matchesName || matchesBillId;
    });

    console.log("✅ Found bills:", customerBills.length);

    res.json({
      success: true,
      data: customerBills,
    });
  } catch (error) {
    console.error("Get customer bills error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customer bills",
      error: (error as Error).message,
    });
  }
};

// Get recent bills
export const getRecentBills: RequestHandler = (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    
    // Sort bills by creation date (newest first) and limit
    const recentBills = bills
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    res.json({
      success: true,
      data: recentBills,
    });
  } catch (error) {
    console.error("Get recent bills error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent bills",
      error: (error as Error).message,
    });
  }
};