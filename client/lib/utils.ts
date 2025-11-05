import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility function to format numeric values, hiding zero values
export function formatNumericValue(value: number | string, options: {
  showZero?: boolean;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
} = {}): string {
  const { showZero = false, decimalPlaces = 2, prefix = '', suffix = '' } = options;
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // If value is 0 and showZero is false, return empty string
  if (numValue === 0 && !showZero) {
    return '';
  }
  
  // If value is NaN or invalid, return empty string
  if (isNaN(numValue)) {
    return '';
  }
  
  // Format the number with specified decimal places
  const formatted = numValue.toFixed(decimalPlaces);
  
  return `${prefix}${formatted}${suffix}`;
}

// Utility function to get display value for numeric inputs
export function getNumericInputValue(value: number | string, showZero: boolean = false): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '';
  }
  
  if (numValue === 0 && !showZero) {
    return '';
  }
  
  // Round to 2 decimal places to avoid floating-point precision issues
  const roundedValue = Math.round(numValue * 100) / 100;
  return roundedValue.toString();
}