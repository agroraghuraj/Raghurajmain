import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import {
  billingService,
  Bill as ApiBill,
  BillData,
} from "@/services/billingService";
import { useToast } from "@/hooks/use-toast";

// Updated interface to match API structure
export interface BillItem {
  itemName: string;
  itemPrice: number;
  itemQuantity: number;
  itemTotal?: number;
}

export interface Bill {
  id: string;
  _id?: string;
  billNumber: string;
  billType: "GST" | "NON_GST" | "QUOTATION" | "Demo";
  billDate: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  pincode?: string;
  items: BillItem[];
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentType: "Full" | "Partial";
  paymentMethod: "cash" | "online" | "mixed";
  observation?: string;
  termsAndConditions?: string;
  stateKey: string;
  status?: string; // Add status field for drafts
  createdAt: string;
  updatedAt?: string;
}

interface BillingContextType {
  bills: Bill[];
  isLoading: boolean;
  error: string | null;
  fetchBills: (force?: boolean) => Promise<void>;
  refreshBills: () => Promise<void>;
  addBill: (billData: BillData) => Promise<Bill | null>;
  updateBill: (
    billId: string,
    updates: Partial<BillData>,
  ) => Promise<Bill | null>;
  deleteBill: (billId: string) => Promise<boolean>;
  getBillById: (billId: string) => Bill | undefined;
  isRateLimited: boolean;
  lastFetchTime: number;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { toast } = useToast();

  // Use refs to access current values without causing dependency issues
  const lastFetchTimeRef = useRef<number>(0);
  const isRateLimitedRef = useRef<boolean>(false);

  // Keep refs in sync with state
  useEffect(() => {
    lastFetchTimeRef.current = lastFetchTime;
  }, [lastFetchTime]);

  useEffect(() => {
    isRateLimitedRef.current = isRateLimited;
  }, [isRateLimited]);

  // Rate limiting configuration
  const MIN_FETCH_INTERVAL = 2000; // 2 seconds minimum between requests
  const RATE_LIMIT_COOLDOWN = 10000; // 10 seconds cooldown after rate limit

  // Fetch all bills from API with rate limiting
  const fetchBills = useCallback(async (force: boolean = false) => {
    const now = Date.now();
    
    
    // Check if we're currently rate limited
    if (isRateLimitedRef.current && (now - lastFetchTimeRef.current) < RATE_LIMIT_COOLDOWN) {
      const remainingTime = Math.ceil((RATE_LIMIT_COOLDOWN - (now - lastFetchTimeRef.current)) / 1000);
      console.log(`⏱️ Rate limited: Waiting ${remainingTime}s before retry`);
      toast({
        title: "Rate Limited",
        description: `Please wait ${remainingTime} seconds before trying again.`,
        variant: "destructive",
      });
      return;
    }
    
    // Rate limiting: prevent calls more frequent than every 10 seconds
    if (!force && (now - lastFetchTimeRef.current) < MIN_FETCH_INTERVAL) {
      const remainingTime = Math.ceil((MIN_FETCH_INTERVAL - (now - lastFetchTimeRef.current)) / 1000);
      console.log(`⏱️ Rate limited: Last fetch was ${Math.round((now - lastFetchTimeRef.current) / 1000)}s ago. Wait ${remainingTime}s`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsRateLimited(false);
      
      const apiBills = await billingService.getAllBills();
      
      // Additional deduplication at context level (ID only, not bill number)
      const uniqueBills = apiBills.filter((bill, index, self) => 
        index === self.findIndex(b => 
          (b.id && bill.id && b.id === bill.id) || 
          ((b as any)._id && (bill as any)._id && (b as any)._id === (bill as any)._id)
        )
      );
      
      setBills(uniqueBills);
      setLastFetchTime(now);
      lastFetchTimeRef.current = now;

    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch bills";
      
      // Handle rate limiting specifically
      if (errorMessage.includes("429") || errorMessage.includes("Too Many Requests")) {
        setIsRateLimited(true);
        setLastFetchTime(now);
        isRateLimitedRef.current = true;
        lastFetchTimeRef.current = now;
        toast({
          title: "Rate Limited",
          description: "Too many requests. Please wait 30 seconds before trying again.",
          variant: "destructive",
        });
      } else {
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove dependencies to prevent infinite loops

  // Manual refresh function (bypasses rate limiting)
  const refreshBills = useCallback(async () => {
    await fetchBills(true); // Force refresh
  }, []); // Remove fetchBills dependency to prevent infinite loops

  // Add new bill
  const addBill = useCallback(async (billData: BillData): Promise<Bill | null> => {
    try {
      setIsLoading(true);
      setError(null);

      // Generate bill number
      const billNumber = billingService.generateBillNumber(billData.billType);
      const billWithNumber = { ...billData, billNumber };

      const newBill = await billingService.createBill(billWithNumber);
      setBills((prev) => {
        // Check if bill already exists to prevent duplicates (ID only, not bill number)
        const exists = prev.some(bill => 
          (bill.id && newBill.id && bill.id === newBill.id) ||
          ((bill as any)._id && (newBill as any)._id && (bill as any)._id === (newBill as any)._id)
        );
        
        if (exists) {
          return prev;
        }
        
        return [newBill, ...prev];
      });

      toast({
        title: "Success",
        description: "Bill created successfully!",
        variant: "default",
      });

      return newBill;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create bill";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove toast dependency

  // Update bill
  const updateBill = useCallback(async (
    billId: string,
    updates: Partial<BillData>,
  ): Promise<Bill | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const updatedBill = await billingService.updateBill(billId, updates);

      // Ensure the updated bill has the correct ID
      const normalizedBill = {
        ...updatedBill,
        id: updatedBill.id || billId,
      };

      setBills((prev) =>
        prev.map((bill) => (bill.id === billId ? normalizedBill : bill)),
      );

      // Emit a custom event to notify all pages about the bill update
      const changes = (normalizedBill as any)._changes || [];
      const billUpdateEvent = new CustomEvent('billUpdated', {
        detail: { 
          billId, 
          updatedBill: normalizedBill,
          changes: changes
        }
      });
      window.dispatchEvent(billUpdateEvent);

      console.log('🔄 Bill updated - Status:', normalizedBill.status, 'Remaining:', normalizedBill.remainingAmount);
      console.log('📝 Changes detected:', changes);

      toast({
        title: "Success",
        description: "Bill updated successfully!",
        variant: "default",
      });

      return normalizedBill;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update bill";


      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove toast dependency

  // Delete bill
  const deleteBill = useCallback(async (billId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await billingService.deleteBill(billId);
      setBills((prev) => prev.filter((bill) => bill.id !== billId));

      toast({
        title: "Success",
        description: "Bill deleted successfully!",
        variant: "default",
      });

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete bill";

      // Check if it's a server endpoint issue
      if (errorMessage.includes("not available on the server")) {
        toast({
          title: "Feature Not Available",
          description:
            "Bill deletion is not yet supported by the server. Please contact support.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }

      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove toast dependency

  // Get bill by ID
  const getBillById = (billId: string) => {
    return bills.find((bill) => bill.id === billId);
  };

  // Fetch bills on component mount - only once
  useEffect(() => {
    fetchBills();
  }, []); // Empty dependency array to run only once

  const value = {
    bills,
    isLoading,
    error,
    fetchBills,
    refreshBills,
    addBill,
    updateBill,
    deleteBill,
    getBillById,
    isRateLimited,
    lastFetchTime,
  };

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (context === undefined) {
    throw new Error("useBilling must be used within a BillingProvider");
  }
  return context;
}
