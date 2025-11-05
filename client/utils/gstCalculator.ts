// GST Calculation Utility for Interstate and Intrastate transactions

export interface GSTCalculation {
  subtotal: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;
  totalAmount: number;
  isInterstate: boolean;
}

export interface GSTCalculationInput {
  subtotal: number;
  gstRate: number;
  companyState: string;
  customerState: string;
}

/**
 * Calculate GST based on whether transaction is interstate or intrastate
 * @param input - GST calculation input parameters
 * @returns GST calculation result
 */
export function calculateGST(input: GSTCalculationInput): GSTCalculation {
  const { subtotal, gstRate, companyState, customerState } = input;
  
  // Check if transaction is interstate
  const isInterstate = companyState !== customerState;
  
  // Calculate GST amount
  const gstAmount = (subtotal * gstRate) / 100;
  
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  
  if (isInterstate) {
    // Interstate transaction - apply IGST
    igst = gstAmount;
  } else {
    // Intrastate transaction - apply CGST + SGST
    cgst = gstAmount / 2;
    sgst = gstAmount / 2;
  }
  
  const totalGST = cgst + sgst + igst;
  const totalAmount = subtotal + totalGST;
  
  return {
    subtotal,
    gstRate,
    cgst,
    sgst,
    igst,
    totalGST,
    totalAmount,
    isInterstate
  };
}

/**
 * Calculate GST for multiple items
 * @param items - Array of items with price, quantity, and GST rate
 * @param companyState - Company's state
 * @param customerState - Customer's state
 * @returns GST calculation result for all items
 */
export function calculateGSTForItems(
  items: Array<{
    price: number;
    quantity: number;
    gstRate: number;
  }>,
  companyState: string,
  customerState: string
): GSTCalculation {
  // Calculate subtotal for all items
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  // Calculate weighted average GST rate
  const totalGSTAmount = items.reduce((sum, item) => {
    const itemSubtotal = item.price * item.quantity;
    return sum + (itemSubtotal * item.gstRate) / 100;
  }, 0);
  
  const weightedGSTRate = subtotal > 0 ? (totalGSTAmount / subtotal) * 100 : 0;
  
  return calculateGST({
    subtotal,
    gstRate: weightedGSTRate,
    companyState,
    customerState
  });
}

/**
 * Get GST breakdown text for display
 * @param calculation - GST calculation result
 * @returns Formatted GST breakdown text
 */
export function getGSTBreakdownText(calculation: GSTCalculation): string {
  if (calculation.isInterstate) {
    return `IGST @ ${calculation.gstRate}%: ₹${calculation.igst.toFixed(2)}`;
  } else {
    return `CGST @ ${calculation.gstRate / 2}%: ₹${calculation.cgst.toFixed(2)}, SGST @ ${calculation.gstRate / 2}%: ₹${calculation.sgst.toFixed(2)}`;
  }
}

/**
 * Get GST summary for invoice
 * @param calculation - GST calculation result
 * @returns GST summary object
 */
export function getGSTSummary(calculation: GSTCalculation) {
  return {
    subtotal: calculation.subtotal,
    gstRate: calculation.gstRate,
    cgst: calculation.cgst,
    sgst: calculation.sgst,
    igst: calculation.igst,
    totalGST: calculation.totalGST,
    totalAmount: calculation.totalAmount,
    isInterstate: calculation.isInterstate,
    breakdownText: getGSTBreakdownText(calculation)
  };
}

/**
 * Calculate bill total with state-wise GST
 * @param bill - Bill object with items
 * @param companyInfo - Company information for GST settings
 * @returns Total bill amount
 */
export function calculateBillTotal(bill: any, companyInfo?: any): number {
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
}