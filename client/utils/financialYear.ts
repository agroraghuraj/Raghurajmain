export const getCurrentFinancialYear = (date: Date = new Date()): string => {
  const currentMonth = date.getMonth(); // 0-indexed
  const currentYear = date.getFullYear();

  // Financial year starts in April (month 3)
  if (currentMonth >= 3) { // April to December
    return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
  } else { // January to March
    return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
  }
};

export const getNextSequenceNumber = (billType: string, existingBillNumbers: string[]): number => {
  const currentYear = getCurrentFinancialYear();
  const prefix = billType === "GST" ? "GST" : billType === "NON_GST" ? "NGST" : "QUO";
  const regex = new RegExp(`^${prefix}/${currentYear}/(\\d+)$`);

  let maxSequence = 0;
  existingBillNumbers.forEach(billNum => {
    const match = billNum.match(regex);
    if (match && match[1]) {
      const sequence = parseInt(match[1], 10);
      if (!isNaN(sequence) && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }
  });
  return maxSequence + 1;
};

export const generateBillNumber = (billType: string, sequenceNumber: number): string => {
  const currentYear = getCurrentFinancialYear();
  const prefix = billType === "GST" ? "GST" : billType === "NON_GST" ? "NGST" : "QUO";
  return `${prefix}/${currentYear}/${String(sequenceNumber).padStart(4, '0')}`;
};

