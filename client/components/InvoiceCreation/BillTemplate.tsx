import React from "react";
import { useCompany } from "@/contexts/CompanyContext";

interface BillTemplateProps {
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerState?: string;
  customerPincode?: string;
  customerCity?: string;
  customerGstin?: string;
  billingType: string;
  items: any[];
  subtotal: number;
  gstTotal: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  paymentType: string;
  billNumber?: string;
  className?: string;
  taxRate?: number;
  taxType?: string;
}

export default function BillTemplate({
  customerName,
  customerPhone,
  customerAddress,
  customerState,
  customerPincode,
  customerCity,
  customerGstin,
  billingType,
  items,
  subtotal,
  gstTotal,
  totalAmount,
  paidAmount,
  remainingAmount,
  paymentMethod,
  paymentType,
  billNumber,
  className = "",
  taxRate = 18,
  taxType = "GST"
}: BillTemplateProps) {
  const { companyInfo } = useCompany();
  return (
    <div className={`max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-white ${className}`} id="bill-content">
      {/* Bill Header */}
      <div className="border-b-2 border-gray-300 pb-4 sm:pb-6 mb-4 sm:mb-6">
        {/* Company Logo and Details - Left Side */}
        <div className=" items-start gap-4 mb-4 sm:-mb-14 ">
          {companyInfo?.logo && (
            <img 
              src={companyInfo.logo}
              alt={`${companyInfo?.name || "Savera Electricals"} Logo`} 
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex-shrink-0"
            />
          )}
          
          {/* Company Details */}
          <div className="text-left text-sm text-gray-600 space-y-1">
            <p className="font-semibold text-base text-gray-900">{companyInfo?.name || "Savera Electricals"}</p>
            {companyInfo?.address && (
              <p>{companyInfo.address.street}, {companyInfo.address.city}</p>
            )}
            {companyInfo?.address && (
              <p>{companyInfo.address.state} - {companyInfo.address.pincode}</p>
            )}
            {companyInfo?.phone && (
              <p>Phone: {companyInfo.phone}</p>
            )}
            {companyInfo?.email && (
              <p>Email: {companyInfo.email}</p>
            )}
            {companyInfo?.gstNumber && (
              <p>GST: {companyInfo.gstNumber}</p>
            )}
          </div>
        </div>

        {/* Bill Type and Number - Right Side */}
        <div className="flex justify-end">
          <div className="text-right">
            <p className="text-base sm:text-lg text-gray-600 font-medium">Bill Type: {billingType.toUpperCase()}</p>
            {billNumber && (
              <p className="text-sm text-gray-500 mt-1">Bill No: {billNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bill Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-900">Bill To:</h3>
          <div className="text-gray-700">
            <p className="font-medium text-sm sm:text-base">{customerName}</p>
            {customerPhone && (
              <p className="text-xs sm:text-sm">Phone: {customerPhone}</p>
            )}
            {customerGstin && (
              <p className="text-xs sm:text-sm">GSTIN: {customerGstin}</p>
            )}
            {customerAddress && (
              <p className="text-xs sm:text-sm">
                {customerAddress}
                {customerState && `, ${customerState}`}
                {customerPincode && ` - ${customerPincode}`}
              </p>
            )}
            <p className="text-xs sm:text-sm">Payment Method: {paymentMethod.toUpperCase()}</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-900">Invoice Details:</h3>
          <div className="text-gray-700">
            <p className="text-xs sm:text-sm">Date: {new Date().toLocaleDateString()}</p>
            <p className="text-xs sm:text-sm">Payment Type: {paymentType}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6 sm:mb-8 overflow-x-auto">
        <table 
          className="w-full border-collapse text-xs sm:text-sm"
          style={{
            border: '1px solid #000',
            borderCollapse: 'collapse'
          }}
        >
          <thead>
            <tr className="bg-gray-100">
              <th 
                className="p-2 sm:p-3 text-left font-semibold"
                style={{ border: '1px solid #000', padding: '8px' }}
              >
                Item
              </th>
              <th 
                className="p-2 sm:p-3 text-right font-semibold"
                style={{ border: '1px solid #000', padding: '8px' }}
              >
                Price
              </th>
              <th 
                className="p-2 sm:p-3 text-center font-semibold"
                style={{ border: '1px solid #000', padding: '8px' }}
              >
                Qty
              </th>
              {billingType === "gst" && (
                <th 
                  className="p-2 sm:p-3 text-right font-semibold"
                  style={{ border: '1px solid #000', padding: '8px' }}
                >
                  GST
                </th>
              )}
              <th 
                className="p-2 sm:p-3 text-right font-semibold"
                style={{ border: '1px solid #000', padding: '8px' }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td 
                  className="p-2 sm:p-3"
                  style={{ border: '1px solid #000', padding: '8px' }}
                >
                  <div>
                    <p className="font-medium text-xs sm:text-sm">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-gray-600">{item.description}</p>
                    )}
                  </div>
                </td>
                <td 
                  className="p-2 sm:p-3 text-right"
                  style={{ border: '1px solid #000', padding: '8px' }}
                >
                  ₹{item.price.toFixed(2)}
                </td>
                <td 
                  className="p-2 sm:p-3 text-center"
                  style={{ border: '1px solid #000', padding: '8px' }}
                >
                  {item.quantity}
                </td>
                {billingType === "gst" && (
                  <td 
                    className="p-2 sm:p-3 text-right"
                    style={{ border: '1px solid #000', padding: '8px' }}
                  >
                    <div>
                      <p className="text-xs">{item.gstPercent}%</p>
                      <p className="text-xs text-gray-600">₹{item.gstAmount?.toFixed(2)}</p>
                    </div>
                  </td>
                )}
                <td 
                  className="p-2 sm:p-3 text-right font-medium"
                  style={{ border: '1px solid #000', padding: '8px' }}
                >
                  ₹{((item.total && item.total > 0) ? item.total : (item.price * item.quantity)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="border-t-2 border-gray-300 pt-4 sm:pt-6">
        <div className="max-w-sm sm:max-w-md ml-auto space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-700">Subtotal:</span>
            <span className="font-medium">₹{subtotal.toFixed(2)}</span>
          </div>
          
          {billingType === "gst" && (
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-700">{taxType} ({taxRate}%):</span>
              <span className="font-medium">₹{gstTotal.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm sm:text-lg font-semibold border-t pt-2">
            <span>Total Amount:</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-xs sm:text-sm text-blue-600">
            <span>Paid Amount:</span>
            <span>₹{paidAmount.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-xs sm:text-sm text-red-600 font-medium">
            <span>Remaining Amount:</span>
            <span>₹{remainingAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 sm:mt-12 text-center text-xs sm:text-sm text-gray-500">
        <p>Thank you for your business!</p>
        <p className="mt-1 sm:mt-2">Generated on {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
