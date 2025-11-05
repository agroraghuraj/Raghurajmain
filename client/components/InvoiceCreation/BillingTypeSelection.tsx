import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Receipt, FileText, Quote } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import ItemManagement from "./ItemManagement";

interface BillingTypeSelectionProps {
  customerName: string;
  onBack: () => void;
  onContinue: (billingType: string, items?: any[], subtotal?: number) => void;
}

const billingTypes = [
  {
    id: "gst",
    name: "GST Invoice",
    description: "Tax invoice with GST calculations",
    icon: Receipt,
    color: "bg-green-100 text-green-800 border-green-200",
    iconColor: "text-green-600",
  },
  {
    id: "non-gst",
    name: "Non-GST Invoice",
    description: "Simple invoice without GST",
    icon: FileText,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    iconColor: "text-blue-600",
  },
  {
    id: "quotation",
    name: "Quotation",
    description: "Price quote for products/services",
    icon: Quote,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    iconColor: "text-purple-600",
  },
];

export default function BillingTypeSelection({ customerName, onBack, onContinue }: BillingTypeSelectionProps) {
  const { companyInfo } = useCompany();
  const [selectedType, setSelectedType] = useState<string>("");
  const [showItemsSection, setShowItemsSection] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [invoiceSubtotal, setInvoiceSubtotal] = useState<number>(0);

  const handleContinue = () => {
    console.log("BillingTypeSelection handleContinue called with:", selectedType);
    if (selectedType) {
      setShowItemsSection(true);
    }
  };

  const handleItemsContinue = (items: any[], subtotal: number) => {
    console.log("BillingTypeSelection handleItemsContinue called with:", { items, subtotal });
    // Store the items and subtotal
    setInvoiceItems(items);
    setInvoiceSubtotal(subtotal);
    // Pass the items data to the parent component
    onContinue(selectedType, items, subtotal);
  };

  // If items section is shown, render the ItemManagement component
  if (showItemsSection) {
    return (
      <ItemManagement
        customerName={customerName}
        billingType={selectedType}
        onBack={() => setShowItemsSection(false)}
        onContinue={handleItemsContinue}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
          <p className="text-gray-600">Step 2: Select Billing Type for <span className="font-semibold">{customerName}</span></p>
        </div>
      </div>

      {/* Billing Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Billing Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select Billing Type</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a billing type..." />
              </SelectTrigger>
              <SelectContent>
                {(companyInfo?.showNonGstBills ? billingTypes : billingTypes.filter(t => t.id !== "non-gst")).map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{type.name}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Type Preview */}
          {selectedType && (
            <div className="p-4 bg-gray-50 rounded-lg">
              {(() => {
                const type = billingTypes.find(t => t.id === selectedType);
                if (!type) return null;
                const IconComponent = type.icon;
                return (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg">
                      <IconComponent className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{type.name}</h4>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                    <Badge className="ml-auto bg-green-100 text-green-800">
                      Selected
                    </Badge>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Continue Button */}
          {selectedType && (
            <div className="pt-4">
              <Button onClick={handleContinue} className="w-full">
                Continue to Add Items
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
