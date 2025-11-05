import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, User, Phone, Mail, MapPin } from "lucide-react";
import { customerService } from "@/services/customerService";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";

interface CustomerDetailsFormProps {
  onBack: () => void;
  onContinue: (customerData: CustomerData) => void;
}

interface CustomerData {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address: string;
  pincode: string;
  city?: string;
  state: string;
  igst?: number;
}

export default function CustomerDetailsForm({ onBack, onContinue }: CustomerDetailsFormProps) {
  const { toast } = useToast();
  const { companyInfo } = useCompany();
  const [formData, setFormData] = useState<CustomerData>({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    address: "",
    pincode: "",
    city: "",
    state: "",
    igst: 0,
  });

  const [errors, setErrors] = useState<Partial<CustomerData>>({});
  const [isCreating, setIsCreating] = useState(false);

  // Debug: Track companyInfo changes
  useEffect(() => {
    console.log('🔍 CustomerDetailsForm - companyInfo changed:', companyInfo);
    console.log('🔍 CustomerDetailsForm - states:', companyInfo?.states);
  }, [companyInfo]);

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-fill pincode and IGST when state is selected
      if (field === 'state' && value && companyInfo?.states) {
        const selectedState = companyInfo.states.find(state => state.name === value);
        if (selectedState) {
          newData.pincode = selectedState.pincode || '';
          newData.igst = selectedState.gstRate || 0;
          console.log('🔍 Auto-filled pincode:', selectedState.pincode);
          console.log('🔍 Auto-filled IGST:', selectedState.gstRate);
        }
      }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Customer name is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Please enter a valid 6-digit pincode";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsCreating(true);
    try {
      // Create customer via API
      console.log('🔍 Customer form data:', formData);
      console.log('🔍 GSTIN value:', formData.gstin);
      
      const customerData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || undefined,
        address: formData.address.trim(),
        pincode: formData.pincode.trim(),
        city: formData.city?.trim() || undefined,
        state: formData.state?.trim() || undefined,
        customerGstin: formData.gstin?.trim() || undefined, // Map gstin to customerGstin
        customerType: formData.gstin ? "business" as const : "individual" as const,
      };
      
      console.log('🔍 Customer data being sent:', customerData);

      const createdCustomer = await customerService.createCustomer(customerData);
      
      toast({
        title: "Success",
        description: "Customer created successfully!",
        variant: "default",
      });

      // Pass the created customer data to continue
      onContinue({
        ...formData,
        id: createdCustomer.id,
      });
    } catch (error) {
      console.error("Error creating customer:", error);
      toast({
        title: "Error",
        description: "Failed to create customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Step 1: Customer Details</h1>
          <p className="text-gray-600">Enter customer information to create invoice</p>
        </div>
      </div>

      {/* Customer Details Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter customer name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter 10-digit phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email (Optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label htmlFor="state" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  State *
                </Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => handleInputChange("state", value)}
                >
                  <SelectTrigger className={errors.state ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select state (Required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyInfo?.states && companyInfo.states.length > 0 ? (
                      companyInfo.states.map((state, index) => (
                        <SelectItem key={index} value={state.name}>
                          {state.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-sm text-red-600">{errors.state}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city">City (Optional)</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>

              {/* Pincode */}
              <div className="space-y-2">
                <Label htmlFor="pincode" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Pincode *
                </Label>
                <Input
                  id="pincode"
                  type="text"
                  placeholder="Enter 6-digit pincode"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange("pincode", e.target.value)}
                  className={errors.pincode ? "border-red-500" : ""}
                />
                {errors.pincode && <p className="text-sm text-red-600">{errors.pincode}</p>}
              </div>

              
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GSTIN */}
              <div className="space-y-2">
                <Label htmlFor="gstin" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer GSTIN (Optional)
                </Label>
                <Input
                  id="gstin"
                  type="text"
                  placeholder="Enter 15-digit GSTIN number"
                  value={formData.gstin}
                  onChange={(e) => handleInputChange("gstin", e.target.value)}
                  className={errors.gstin ? "border-red-500" : ""}
                />
                {errors.gstin && <p className="text-sm text-red-600">{errors.gstin}</p>}
              </div>

              {/* IGST */}
              <div className="space-y-2">
                <Label htmlFor="igst">IGST % (Auto-filled from state)</Label>
                <Input
                  id="igst"
                  type="number"
                  placeholder="IGST percentage"
                  value={formData.igst || ''}
                  onChange={(e) => handleInputChange("igst", e.target.value)}
                  min="0"
                  max="100"
                  step="0.01"
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address *
              </Label>
              <Input
                id="address"
                type="text"
                placeholder="Enter complete address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className={errors.address ? "border-red-500" : ""}
              />
              {errors.address && <p className="text-sm text-red-600">{errors.address}</p>}
            </div>

           

            {/* Continue Button */}
            <div className="flex justify-end pt-4">
              <Button type="submit" className="px-8" disabled={isCreating}>
                {isCreating ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating Customer...
                  </div>
                ) : (
                  "Continue to Invoice"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
