import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  Building,
  FileText,
  Palette,
  Calculator,
  Save,
  RotateCcw,
  Upload,
  Download,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  Package,
  MapPin,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import companySettingsService, { CompanyInfo } from "@/services/companySettingsService";
import { useCompany } from "@/contexts/CompanyContext";

// Removed mock states - now using dynamic states from company settings

const stateCodes: { [key: string]: string } = {
  "Andhra Pradesh": "37", "Arunachal Pradesh": "12", "Assam": "18", "Bihar": "10",
  "Chhattisgarh": "22", "Goa": "30", "Gujarat": "24", "Haryana": "06",
  "Himachal Pradesh": "02", "Jharkhand": "20", "Karnataka": "29", "Kerala": "32",
  "Madhya Pradesh": "23", "Maharashtra": "27", "Manipur": "14", "Meghalaya": "17",
  "Mizoram": "15", "Nagaland": "13", "Odisha": "21", "Punjab": "03",
  "Rajasthan": "08", "Sikkim": "11", "Tamil Nadu": "33", "Telangana": "36",
  "Tripura": "16", "Uttar Pradesh": "09", "Uttarakhand": "05", "West Bengal": "19",
  "Delhi": "07"
};

export default function Settings() {
  const { toast } = useToast();
  const { companyInfo: globalCompanyInfo, updateCompanyInfo, refreshCompanyInfo, isLoading: globalIsLoading } = useCompany();
  const [activeTab, setActiveTab] = useState<"company" | "invoice" | "states" | "preview">("company");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [originalCompanyInfo, setOriginalCompanyInfo] = useState<CompanyInfo | null>(null);
  const [localStates, setLocalStates] = useState<any[]>([]);

  // States tab state management
  const [isAddStateModalOpen, setIsAddStateModalOpen] = useState(false);
  const [editingState, setEditingState] = useState<any>(null);
  const [deleteStateId, setDeleteStateId] = useState<string | null>(null);
  const [stateForm, setStateForm] = useState({
    name: "",
    pincode: "",
    gstRate: ""
  });

  // Load company info on component mount
  useEffect(() => {
    if (globalCompanyInfo) {
      console.log('🔍 Settings - Loading global company info:', globalCompanyInfo);
      console.log('🔍 Settings - States in global company info:', globalCompanyInfo.states);
      console.log('🔍 Settings - Number of states:', globalCompanyInfo.states?.length || 0);
      console.log('🔍 Settings - Current local states:', companyInfo?.states);
      console.log('🔍 Settings - Current local states count:', companyInfo?.states?.length || 0);
      console.log('🔍 Settings - nonGstBillLimit in global:', globalCompanyInfo.nonGstBillLimit);

      // Always update with global company info to ensure latest data
      console.log('🔄 Settings - Updating local state with global company info');
      setCompanyInfo(globalCompanyInfo);
      setOriginalCompanyInfo(globalCompanyInfo);
    }
  }, [globalCompanyInfo]);

  // Auto-refresh company info on component mount to get latest data
  useEffect(() => {
    const autoRefresh = async () => {
      try {
        console.log('🔍 Settings - Auto-refreshing company info on mount');
        const latestCompanyInfo = await companySettingsService.getCompanyInfo();
        if (latestCompanyInfo) {
          setCompanyInfo(latestCompanyInfo);
          setOriginalCompanyInfo(latestCompanyInfo);
          console.log('🔍 Settings - Auto-refresh - Updated company info:', latestCompanyInfo);
          console.log('🔍 Settings - Auto-refresh - nonGstBillLimit:', latestCompanyInfo.nonGstBillLimit);
        }
      } catch (error) {
        console.error('🔍 Settings - Auto-refresh failed:', error);
      }
    };

    autoRefresh();
  }, []); // Run once on mount

  // Debug: Track companyInfo changes
  useEffect(() => {
    console.log('🔍 Settings - companyInfo changed:', companyInfo);
    console.log('🔍 Settings - companyInfo.states:', companyInfo?.states);
    console.log('🔍 Settings - companyInfo.nonGstBillLimit:', companyInfo?.nonGstBillLimit);
  }, [companyInfo]);

  // Refresh company info periodically to get updated bill count
  useEffect(() => {
    const interval = setInterval(() => {
      if (refreshCompanyInfo) {
        refreshCompanyInfo();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [refreshCompanyInfo]);

  // Debug: Track modal state
  useEffect(() => {
    console.log('🔍 Modal state changed - isAddStateModalOpen:', isAddStateModalOpen);
  }, [isAddStateModalOpen]);

  const loadCompanyInfo = async () => {
    try {
      const data = await companySettingsService.getCompanyInfo();
      if (data) {
        setCompanyInfo(data);
        setOriginalCompanyInfo(data);
        updateCompanyInfo(data); // Update global state
      } else {
        // If no company info exists, use defaults
        const defaultInfo = companySettingsService.getDefaultCompanyInfo();
        setCompanyInfo(defaultInfo);
        setOriginalCompanyInfo(defaultInfo);
        updateCompanyInfo(defaultInfo); // Update global state
      }
    } catch (error) {
      console.error('Error loading company info:', error);
      toast({
        title: "Error",
        description: "Failed to load company information",
        variant: "destructive",
      });
      // Use defaults on error
      const defaultInfo = companySettingsService.getDefaultCompanyInfo();
      setCompanyInfo(defaultInfo);
      setOriginalCompanyInfo(defaultInfo);
      updateCompanyInfo(defaultInfo); // Update global state
    }
  };

  const handleCompanyChange = (field: keyof CompanyInfo | "state", value: any) => {
    if (!companyInfo) return;

    console.log('🔍 handleCompanyChange - field:', field, 'value:', value);

    setCompanyInfo(prev => {
      if (!prev) return prev;

      const updated = { ...prev };

      if (field === "state") {
        updated.stateCode = stateCodes[value] || "";
        updated.address = { ...updated.address, state: value };
      } else if (field === "address") {
        updated.address = { ...updated.address, ...value };
      } else {
        (updated as any)[field] = value;
      }

      console.log('🔍 handleCompanyChange - updated company info:', updated);
      console.log('🔍 handleCompanyChange - isProductSearch after update:', updated.isProductSearch);
      console.log('🔍 handleCompanyChange - nonGstBillLimit after update:', updated.nonGstBillLimit);

      return updated;
    });

    setHasChanges(true);
  };

  const handleAddressChange = (field: keyof CompanyInfo['address'], value: string) => {
    if (!companyInfo) return;

    setCompanyInfo(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      };
    });

    setHasChanges(true);
  };

  const saveSettings = async () => {
    if (!companyInfo) return;

    try {
      setIsSaving(true);

      console.log('🔍 Company Info ID:', companyInfo.id);
      console.log('🔍 Company Info:', companyInfo);
      console.log('🔍 isProductSearch before save:', companyInfo.isProductSearch);
      console.log('🔍 showNonGstBills before save:', companyInfo.showNonGstBills);
      console.log('🔍 nonGstBillLimit before save:', companyInfo.nonGstBillLimit);

      if (companyInfo.id) {
        // Update existing
        console.log('📝 Updating existing company with ID:', companyInfo.id);

        // Clean states by removing temporary _id values before sending to backend
        const cleanedCompanyInfo = {
          ...companyInfo,
          states: companyInfo.states?.map(state => ({
            name: state.name,
            pincode: state.pincode,
            gstRate: state.gstRate
            // Remove _id field to let MongoDB generate new ObjectIds
          })) || []
        };

        console.log('🔍 States being saved:', cleanedCompanyInfo.states);
        console.log('🔍 showNonGstBills being saved:', cleanedCompanyInfo.showNonGstBills);
        console.log('🔍 nonGstBillLimit being saved:', cleanedCompanyInfo.nonGstBillLimit);
        console.log('🔍 Full company data being sent:', JSON.stringify(cleanedCompanyInfo, null, 2));
        const updated = await companySettingsService.updateCompanyInfo(companyInfo.id, cleanedCompanyInfo);
        console.log('🔍 Updated company data:', updated);
        console.log('🔍 States after save:', updated.states);
        console.log('🔍 isProductSearch after save:', updated.isProductSearch);
        console.log('🔍 showNonGstBills after save:', updated.showNonGstBills);
        console.log('🔍 nonGstBillLimit after save:', updated.nonGstBillLimit);

        // Update local state with the response
        setCompanyInfo(updated);
        setOriginalCompanyInfo(updated);
        updateCompanyInfo(updated); // Update global state

        // Force refresh company info to get latest data
        await refreshCompanyInfo();

        // Force update local state with the latest data
        const latestCompanyInfo = await companySettingsService.getCompanyInfo();
        if (latestCompanyInfo) {
          setCompanyInfo(latestCompanyInfo);
          setOriginalCompanyInfo(latestCompanyInfo);
          console.log('🔍 Force updated company info:', latestCompanyInfo);
          console.log('🔍 Force updated nonGstBillLimit:', latestCompanyInfo.nonGstBillLimit);
        }

        setHasChanges(false); // Clear changes flag

        toast({
          title: "Success",
          description: "Company settings updated successfully",
          variant: "default",
        });
      } else {
        // Create new
        console.log('➕ Creating new company (no ID found)');
        const created = await companySettingsService.createCompanyInfo(companyInfo);
        console.log('🔍 Created company data:', created);
        console.log('🔍 isProductSearch after create:', created.isProductSearch);
        setCompanyInfo(created);
        setOriginalCompanyInfo(created);
        updateCompanyInfo(created); // Update global state
        toast({
          title: "Success",
          description: "Company settings created successfully",
          variant: "default",
        });
      }

      setHasChanges(false);

    } catch (error) {
      console.error('Error saving settings:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast({
        title: "Error",
        description: `Failed to save company settings: ${error.response?.data?.message || error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      const defaultInfo = companySettingsService.getDefaultCompanyInfo();
      setCompanyInfo(defaultInfo);
      setOriginalCompanyInfo(defaultInfo);
      setHasChanges(false);
      toast({
        title: "Reset",
        description: "Settings reset to default values",
        variant: "default",
      });
    }
  };

  const generateFinancialYear = () => {
    if (!companyInfo) return "";

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Get the start month from company settings
    const startMonth = getMonthNumber(companyInfo.financialYearMonth || "April");

    if (currentMonth >= startMonth) {
      return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    } else {
      return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
    }
  };

  // Helper function to convert month name to number
  const getMonthNumber = (monthName: string) => {
    const months: { [key: string]: number } = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4,
      'may': 5, 'june': 6, 'july': 7, 'august': 8,
      'september': 9, 'october': 10, 'november': 11, 'december': 12
    };
    return months[monthName.toLowerCase()] || 4; // Default to April if not found
  };

  // Calculate current financial year dynamically
  const getCurrentFinancialYear = () => {
    if (!companyInfo) return 2025;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const startMonth = getMonthNumber(companyInfo.financialYearMonth || "April");

    if (currentMonth >= startMonth) {
      return currentYear;
    } else {
      return currentYear - 1;
    }
  };

  // Get financial year start and end dates
  const getFinancialYearDates = () => {
    if (!companyInfo) return { start: null, end: null };

    const currentFY = getCurrentFinancialYear();
    const startMonth = getMonthNumber(companyInfo.financialYearMonth || "April");

    const startDate = new Date(currentFY, startMonth - 1, 1);
    const endDate = new Date(currentFY + 1, startMonth - 1, 0, 23, 59, 59, 999);

    return {
      start: startDate,
      end: endDate
    };
  };

  const calculateRemainingBills = () => {
    if (!companyInfo?.enableBillCountLimit || !companyInfo?.billCountLimit) {
      return "Unlimited";
    }

    const currentCount = companyInfo.currentBillCount || 1;
    const limit = companyInfo.billCountLimit || 5000;
    const remaining = limit - currentCount + 1; // +1 because currentCount is the next bill number

    return remaining > 0 ? remaining.toString() : "0 (Will auto-reset)";
  };

  // States management functions
  const resetStateForm = () => {
    setStateForm({ name: "", pincode: "", gstRate: "" });
    setEditingState(null);
  };

  const handleAddState = () => {
    console.log('🔍 Add State button clicked');
    resetStateForm();
    setIsAddStateModalOpen(true);
    console.log('🔍 Modal should open now, isAddStateModalOpen:', true);
  };

  const handleEditState = (state: any) => {
    setStateForm({
      name: state.name || "",
      pincode: state.pincode || "",
      gstRate: state.gstRate?.toString() || ""
    });
    setEditingState(state);
    setIsAddStateModalOpen(true);
  };

  // Auto-fill pincode based on state name
  const handleStateNameChange = (name: string) => {
    setStateForm(prev => ({ ...prev, name }));

    // Auto-fill pincode based on state name
    const statePincodeMap: { [key: string]: string } = {
      "Andhra Pradesh": "500001",
      "Arunachal Pradesh": "791001",
      "Assam": "781001",
      "Bihar": "800001",
      "Chhattisgarh": "492001",
      "Goa": "403001",
      "Gujarat": "380001",
      "Haryana": "121001",
      "Himachal Pradesh": "171001",
      "Jharkhand": "834001",
      "Karnataka": "560001",
      "Kerala": "682001",
      "Madhya Pradesh": "462001",
      "Maharashtra": "400001",
      "Manipur": "795001",
      "Meghalaya": "793001",
      "Mizoram": "796001",
      "Nagaland": "797001",
      "Odisha": "751001",
      "Punjab": "141001",
      "Rajasthan": "302001",
      "Sikkim": "737101",
      "Tamil Nadu": "600001",
      "Telangana": "500001",
      "Tripura": "799001",
      "Uttar Pradesh": "226001",
      "Uttarakhand": "248001",
      "West Bengal": "700001",
      "Delhi": "110001"
    };

    const trimmedName = name.trim();
    console.log('🔍 State name entered:', trimmedName);
    if (statePincodeMap[trimmedName]) {
      console.log('🔍 Auto-filling pincode:', statePincodeMap[trimmedName]);
      setStateForm(prev => ({ ...prev, pincode: statePincodeMap[trimmedName] }));
    } else {
      console.log('🔍 No pincode found for state:', trimmedName);
    }
  };

  const handleSaveState = () => {
    if (!stateForm.name.trim() || !stateForm.pincode.trim() || !stateForm.gstRate.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!companyInfo) return;

    const newState: { name: string; pincode: string; gstRate: number; _id?: string } = {
      name: stateForm.name.trim(),
      pincode: stateForm.pincode.trim(),
      gstRate: parseFloat(stateForm.gstRate)
    };

    let updatedStates = [...(companyInfo.states || [])];

    if (editingState) {
      // Update existing state
      const index = updatedStates.findIndex(s => s._id === editingState._id);
      if (index !== -1) {
        updatedStates[index] = { ...updatedStates[index], ...newState };
      }
    } else {
      // Add new state with temporary ID
      const tempId = `temp_${Date.now()}`;
      updatedStates.push({ ...newState, _id: tempId });
    }

    const updatedCompanyInfo = {
      ...companyInfo,
      states: updatedStates
    };

    // Update local state immediately (optimistic update)
    console.log('🔍 Updating local state immediately:', updatedCompanyInfo.states);
    setCompanyInfo(updatedCompanyInfo);
    setHasChanges(true); // Mark as having changes

    setIsAddStateModalOpen(false);
    resetStateForm();

    toast({
      title: "Success",
      description: editingState ? "State updated locally" : "State added locally - click Save Changes to save to database",
    });
  };

  const handleDeleteState = (stateId: string) => {
    if (!companyInfo) return;

    const updatedStates = (companyInfo.states || []).filter(s => s._id !== stateId);
    const updatedCompanyInfo = {
      ...companyInfo,
      states: updatedStates
    };

    // Update local state immediately (optimistic update)
    console.log('🔍 Deleting state locally:', updatedCompanyInfo.states);
    setCompanyInfo(updatedCompanyInfo);
    setHasChanges(true); // Mark as having changes
    setDeleteStateId(null);

    toast({
      title: "Success",
      description: "State deleted locally - click Save Changes to save to database",
    });
  };

  const tabs = [
    { id: "company", label: "Company Details", icon: Building },
    { id: "invoice", label: "Invoice Settings", icon: FileText },
    { id: "states", label: "States", icon: MapPin },
    { id: "preview", label: "Preview", icon: Eye },
  ];

  if (globalIsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Loading company settings...</p>
        </div>
      </div>
    );
  }

  if (!companyInfo) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 mx-auto text-red-600" />
          <p className="text-gray-600">Failed to load company settings</p>
          <Button onClick={loadCompanyInfo} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-6xl mx-auto">
      {/* Header with Tabs and Save Button in one row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg w-fit">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-2 text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
            >
              <tab.icon className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </Button>
          ))}
        </div>

        {/* Save, Reset, and Refresh Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={async () => {
              console.log('🔍 Manual refresh clicked');
              if (refreshCompanyInfo) {
                await refreshCompanyInfo();
              }
              // Force reload company info from API
              const latestCompanyInfo = await companySettingsService.getCompanyInfo();
              if (latestCompanyInfo) {
                setCompanyInfo(latestCompanyInfo);
                setOriginalCompanyInfo(latestCompanyInfo);
                console.log('🔍 Manual refresh - Updated company info:', latestCompanyInfo);
                console.log('🔍 Manual refresh - nonGstBillLimit:', latestCompanyInfo.nonGstBillLimit);
                toast({
                  title: "Refreshed",
                  description: "Company settings refreshed successfully",
                  variant: "default",
                });
              }
            }}
            className="w-full sm:w-auto"
            title="Refresh bill counter and company info"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {hasChanges && (
            <Button variant="outline" onClick={resetSettings} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Company Details Tab */}
      {activeTab === "company" && (
        <div className="space-y-4 md:space-y-6">
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-blue-50/30">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Building className="h-5 w-5 text-blue-600" />
                Company Information
              </CardTitle>
              <p className="text-sm text-gray-600">Update your company details and contact information</p>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
                    Company Name *
                  </Label>
                  <Input
                    id="companyName"
                    value={companyInfo.name}
                    onChange={(e) => handleCompanyChange('name', e.target.value)}
                    className="h-10 md:h-11"
                    placeholder="Enter company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstNumber" className="text-sm font-medium text-gray-700">
                    GST Number *
                  </Label>
                  <Input
                    id="gstNumber"
                    value={companyInfo.gstNumber}
                    onChange={(e) => handleCompanyChange('gstNumber', e.target.value)}
                    className="h-10 md:h-11"
                    placeholder="23ABCDE1234F1Z5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Address *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={companyInfo.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    className="h-10 md:h-11"
                    placeholder="Street Address"
                  />
                  <Input
                    value={companyInfo.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    className="h-10 md:h-11"
                    placeholder="City"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    value={companyInfo.address.state}
                    onValueChange={(value) => handleCompanyChange('state', value)}
                  >
                    <SelectTrigger className="h-10 md:h-11">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
                        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
                        "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
                        "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
                        "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
                      ].map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={companyInfo.address.pincode}
                    onChange={(e) => handleAddressChange('pincode', e.target.value)}
                    className="h-10 md:h-11"
                    placeholder="Pincode"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stateCode" className="text-sm font-medium text-gray-700">
                    State Code
                  </Label>
                  <Input
                    id="stateCode"
                    value={companyInfo.stateCode}
                    disabled
                    className="h-10 md:h-11 bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    value={companyInfo.phone}
                    onChange={(e) => handleCompanyChange('phone', e.target.value)}
                    className="h-10 md:h-11"
                    placeholder="9876543210"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => handleCompanyChange('email', e.target.value)}
                    className="h-10 md:h-11"
                    placeholder="info@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-medium text-gray-700">
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={companyInfo.website}
                    onChange={(e) => handleCompanyChange('website', e.target.value)}
                    className="h-10 md:h-11"
                    placeholder="www.company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo" className="text-sm font-medium text-gray-700">
                    Company Logo
                  </Label>

                  <div className="flex items-center gap-3">
                    {/* Hidden file input */}
                    <input
                      id="logo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // Optional: show loading toast
                        toast({ title: "Uploading...", description: "Please wait" });

                        try {
                          // Example: call your service to upload
                          const formData = new FormData();
                          formData.append("logo", file);

                          const res = await companySettingsService.uploadLogo(formData);
                          // 👆 you need to implement this in your service

                          // update local state
                          handleCompanyChange("logo", res.url);

                          // also update global context so sidebar updates immediately
                          setCompanyInfo(prev => {
                            if (!prev) return prev;
                            const updated = { ...prev, logo: res.url };
                            updateCompanyInfo(updated);
                            return updated;
                          });

                          // fetch latest company info to sync any backend-side processing
                          try {
                            const latest = await companySettingsService.getCompanyInfo();
                            if (latest) {
                              setCompanyInfo(latest);
                              setOriginalCompanyInfo(latest);
                              updateCompanyInfo(latest);
                            }
                          } catch {}

                          toast({ title: "Success", description: "Logo uploaded successfully" });
                        } catch (err) {
                          toast({ title: "Error", description: "Failed to upload logo", variant: "destructive" });
                        }
                      }}
                    />

                    {/* Button triggers file input click */}
                    <Button
                      variant="outline"
                      className="h-10 md:h-11"
                      onClick={() => document.getElementById("logo")?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>

                    {/* Optional logo preview */}
                    {companyInfo.logo && (
                      <img
                        src={companyInfo.logo}
                        alt="Company Logo"
                        className="h-10 rounded border"
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoice Settings Tab */}
      {activeTab === "invoice" && (
        <div className="space-y-4 md:space-y-6">
          {/* Template Selection */}
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-purple-50/30">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Palette className="h-5 w-5 text-purple-600" />
                Invoice Template
              </CardTitle>
              <p className="text-sm text-gray-600">Choose your preferred invoice design</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["Standard", "Modern", "Minimal"].map((template) => (
                  <div
                    key={template}
                    onClick={() => handleCompanyChange('invoiceTemplete', template)}
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md",
                      companyInfo.invoiceTemplete === template
                        ? "border-purple-500 bg-purple-50 shadow-md"
                        : "border-gray-200 hover:border-purple-300"
                    )}
                  >
                    <div className="text-center">
                      <div className="w-full h-20 bg-gray-100 rounded mb-3 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-gray-500" />
                      </div>
                      <h4 className="font-semibold text-gray-900">{template}</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {template === "Standard" && "Classic business layout"}
                        {template === "Modern" && "Clean contemporary design"}
                        {template === "Minimal" && "Simple minimal styling"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Fields */}
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-green-50/30">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-lg md:text-xl">Invoice Fields</CardTitle>
              <p className="text-sm text-gray-600">Customize what appears on your invoices</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'companyLogo', label: 'Company Logo' },
                  { key: 'gstNumberDisplay', label: 'GST Number' },
                  { key: 'emailAddress', label: 'Email Address' },
                  { key: 'phoneNumber', label: 'Phone Number' },
                  { key: 'termsConditions', label: 'Terms & Conditions' },
                  { key: 'signatureLine', label: 'Signature Line' }
                ].map(({ key, label }) => (
                  <Label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <Switch
                      checked={(companyInfo as any)[key]}
                      onCheckedChange={(checked) => handleCompanyChange(key as keyof CompanyInfo, checked)}
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </Label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Numbering */}
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-orange-50/30">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-lg md:text-xl">Invoice Numbering</CardTitle>
              <p className="text-sm text-gray-600">Configure invoice prefixes and numbering</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gstPrefix" className="text-sm font-medium text-gray-700">
                    GST Bill Prefix
                  </Label>
                  <Input
                    id="gstPrefix"
                    value={companyInfo.gstBillPrefix}
                    onChange={(e) => handleCompanyChange('gstBillPrefix', e.target.value)}
                    className="h-10 md:h-11"
                    placeholder="GST"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nonGstPrefix" className="text-sm font-medium text-gray-700">
                    Non-GST Bill Prefix
                  </Label>
                  <Input
                    id="nonGstPrefix"
                    value={companyInfo.nonGstBillPrefix}
                    onChange={(e) => handleCompanyChange('nonGstBillPrefix', e.target.value)}
                    className="h-10 md:h-11"
                    placeholder="NGST"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demoPrefix" className="text-sm font-medium text-gray-700">
                    Demo Bill Prefix
                  </Label>
                  <Input
                    id="demoPrefix"
                    value={companyInfo.demoBill}
                    onChange={(e) => handleCompanyChange('demoBill', e.target.value)}
                    className="h-10 md:h-11"
                    placeholder="DEMO"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Year */}
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-indigo-50/30">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-lg md:text-xl">Financial Year</CardTitle>
              <p className="text-sm text-gray-600">Set your financial year configuration</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fyStart" className="text-sm font-medium text-gray-700">
                    Financial Year Start Month
                  </Label>
                  <Select
                    value={companyInfo.financialYearMonth}
                    onValueChange={(value) => handleCompanyChange('financialYearMonth', value)}
                  >
                    <SelectTrigger className="h-10 md:h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                      ].map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentFY" className="text-sm font-medium text-gray-700">
                    Current Financial Year
                  </Label>
                  <div className="flex items-center h-10 md:h-11 px-3 py-2 border border-gray-300 rounded-md bg-blue-50">
                    <span className="text-sm font-medium text-blue-700">
                      {generateFinancialYear()}
                    </span>
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                      Auto-calculated
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">Automatically calculated based on start month and current date</p>
                </div>
              </div>

              {/* Financial Year Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-900">Financial Year Information</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• <strong>Current Financial Year:</strong> {getCurrentFinancialYear()}</p>
                      <p>• <strong>Financial Year Range:</strong> {generateFinancialYear()}</p>
                      <p>• <strong>Start Month:</strong> {companyInfo.financialYearMonth || "April"}</p>
                      <p>• <strong>Next Financial Year:</strong> {getCurrentFinancialYear() + 1}</p>
                      <p>• <strong>FY Period:</strong> {getFinancialYearDates().start?.toLocaleDateString()} to {getFinancialYearDates().end?.toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bill Number Configuration */}
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-purple-50/30">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <FileText className="h-5 w-5 text-purple-600" />
                Bill Number Configuration
              </CardTitle>
              <p className="text-sm text-gray-600">Configure bill numbering system and reset behavior</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billNumberPrefix" className="text-sm font-medium text-gray-700">
                    Bill Number Prefix
                  </Label>
                  <Input
                    id="billNumberPrefix"
                    value={companyInfo.billNumberPrefix || "BILL"}
                    onChange={(e) => handleCompanyChange('billNumberPrefix', e.target.value)}
                    placeholder="BILL"
                    className="h-10 md:h-11"
                  />
                  <p className="text-xs text-gray-500">Prefix for all bill numbers (e.g., BILL, INV, GST)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billNumberStartingCount" className="text-sm font-medium text-gray-700">
                    Starting Bill Number
                  </Label>
                  <Input
                    id="billNumberStartingCount"
                    type="number"
                    min="1"
                    value={companyInfo.billNumberStartingCount || 1}
                    onChange={(e) => handleCompanyChange('billNumberStartingCount', parseInt(e.target.value))}
                    className="h-10 md:h-11"
                  />
                  <p className="text-xs text-gray-500">Number to start counting from (e.g., 1, 100, 1000)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentBillCount" className="text-sm font-medium text-gray-700">
                    Current Bill Count
                  </Label>
                  <Input
                    id="currentBillCount"
                    type="number"
                    min="1"
                    value={companyInfo.currentBillCount || 1}
                    onChange={(e) => handleCompanyChange('currentBillCount', parseInt(e.target.value))}
                    className="h-10 md:h-11"
                  />
                  <p className="text-xs text-gray-500">Current bill number counter (next bill will be this + 1)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billNumberReset" className="text-sm font-medium text-gray-700">
                    Reset Bill Count
                  </Label>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-800">Reset on Financial Year End</p>
                      <p className="text-xs text-gray-600">
                        {companyInfo.billNumberResetOnFYEnd
                          ? "Bill count will reset to starting number at financial year end"
                          : "Bill count will continue incrementing across financial years"
                        }
                      </p>
                    </div>
                    <Switch
                      id="billNumberReset"
                      checked={companyInfo.billNumberResetOnFYEnd}
                      onCheckedChange={(checked) => handleCompanyChange('billNumberResetOnFYEnd', checked)}
                      className="data-[state=checked]:bg-purple-600"
                    />
                  </div>
                </div>
              </div>

              {/* Bill Count Limit Configuration */}
              <div className="space-y-4 p-4 border border-orange-200 bg-orange-50/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-gray-700">Bill Count Limit</h4>
                    <p className="text-xs text-gray-600">Set maximum number of bills per financial year</p>
                  </div>
                  <Switch
                    id="enableBillCountLimit"
                    checked={companyInfo.enableBillCountLimit || false}
                    onCheckedChange={(checked) => handleCompanyChange('enableBillCountLimit', checked)}
                    className="data-[state=checked]:bg-orange-600"
                  />
                </div>

                {companyInfo.enableBillCountLimit && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="billCountLimit" className="text-sm font-medium text-gray-700">
                          Maximum Bills Per Financial Year
                        </Label>
                        <Input
                          id="billCountLimit"
                          type="number"
                          min="100"
                          max="99999"
                          value={companyInfo.billCountLimit || 5000}
                          onChange={(e) => handleCompanyChange('billCountLimit', parseInt(e.target.value))}
                          className="h-10 md:h-11"
                        />
                        <p className="text-xs text-gray-500">Maximum bills allowed in current financial year (e.g., 5000)</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="remainingBills" className="text-sm font-medium text-gray-700">
                          Bills Remaining This Year
                        </Label>
                        <Input
                          id="remainingBills"
                          value={calculateRemainingBills()}
                          disabled
                          className="h-10 md:h-11 bg-gray-50"
                        />
                        <p className="text-xs text-gray-500">Bills remaining before auto-reset</p>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-amber-800">Auto-Reset Behavior</p>
                          <p className="text-xs text-amber-700">
                            When the limit is reached, bill count will automatically restart from 0 for the current financial year.
                            This ensures continuous billing even after reaching the maximum limit.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bill Number Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Bill Number Preview</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Next Bill Number:</span>
                    <span className="font-mono text-sm font-medium bg-white px-2 py-1 rounded border">
                      {(companyInfo.billNumberPrefix || "BILL")}-{(companyInfo.currentBillCount || 1).toString().padStart(4, '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Starting Number:</span>
                    <span className="font-mono text-sm font-medium bg-white px-2 py-1 rounded border">
                      {(companyInfo.billNumberPrefix || "BILL")}-{(companyInfo.billNumberStartingCount || 1).toString().padStart(4, '0')}
                    </span>
                  </div>
                  {companyInfo.enableBillCountLimit && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Bill Limit:</span>
                      <span className="font-mono text-sm font-medium bg-orange-100 text-orange-800 px-2 py-1 rounded border border-orange-200">
                        {companyInfo.billCountLimit || 5000} bills/year
                      </span>
                    </div>
                  )}
                  {companyInfo.enableBillCountLimit && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Remaining:</span>
                      <span className={`font-mono text-sm font-medium px-2 py-1 rounded border ${calculateRemainingBills() === "0 (Will auto-reset)"
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-green-100 text-green-800 border-green-200"
                        }`}>
                        {calculateRemainingBills()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Search Settings */}
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-green-50/30">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Package className="h-5 w-5 text-green-600" />
                Product Search Settings
              </CardTitle>
              <p className="text-sm text-gray-600">Configure product search functionality</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-green-200 bg-green-50/50">
                <div className="space-y-1">
                  <Label htmlFor="isProductSearch" className="text-base font-semibold text-gray-800">
                    Enable Product Search
                  </Label>
                  <p className="text-sm text-gray-600">
                    {companyInfo.isProductSearch
                      ? "Product search functionality is enabled - Products tab will be visible in sidebar and search will be available in create invoice page"
                      : "Product search functionality is disabled - Only manual product entry will be available"
                    }
                  </p>
                </div>
                <Switch
                  id="isProductSearch"
                  checked={companyInfo.isProductSearch}
                  onCheckedChange={(checked) => handleCompanyChange('isProductSearch', checked)}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* Non-GST Bill Visibility Settings */}
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-blue-50/30">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <FileText className="h-5 w-5 text-blue-600" />
                Non-GST Bill Visibility
              </CardTitle>
              <p className="text-sm text-gray-600">Control visibility of non-GST bills across the application</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50">
                <div className="space-y-1">
                  <Label htmlFor="showNonGstBills" className="text-base font-semibold text-gray-800">
                    Show Non-GST Bills
                  </Label>
                  <p className="text-sm text-gray-600">
                    {companyInfo.showNonGstBills
                      ? "Non-GST bills are visible in all bill lists and reports"
                      : "Non-GST bills are hidden from all bill lists and reports"
                    }
                  </p>
                </div>
                <Switch
                  id="showNonGstBills"
                  checked={companyInfo.showNonGstBills}
                  onCheckedChange={(checked) => handleCompanyChange('showNonGstBills', checked)}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* NON GST Bill Limit Settings */}
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-orange-50/30">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <FileText className="h-5 w-5 text-orange-600" />
                Non-GST Bill Limit
              </CardTitle>
              <p className="text-sm text-gray-600">Set the maximum number of non-GST bills that can be created per financial year</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nonGstBillLimit" className="text-base font-semibold text-gray-800">
                  Non-GST Bill Limit (Per Financial Year)
                </Label>
                <p className="text-sm text-gray-600">
                  Maximum number of non-GST bills that can be created in the current financial year (April to March). Leave empty for unlimited bills.
                </p>
                <Input
                  id="nonGstBillLimit"
                  type="number"
                  min="1"
                  value={companyInfo?.nonGstBillLimit || ''}
                  onChange={(e) => {
                    console.log('🔍 NON GST Limit input changed:', e.target.value);
                    const value = e.target.value === '' ? null : parseInt(e.target.value);
                    console.log('🔍 NON GST Limit parsed value:', value);
                    handleCompanyChange('nonGstBillLimit', value);
                  }}
                  className="w-full"
                  placeholder="Enter limit (e.g., 1000)"
                />
                <p className="text-xs text-gray-500">
                  Current financial year: {(() => {
                    const currentDate = new Date();
                    const currentYear = currentDate.getFullYear();
                    const currentMonth = currentDate.getMonth() + 1;
                    if (currentMonth >= 4) {
                      return `${currentYear}-${currentYear + 1}`;
                    } else {
                      return `${currentYear - 1}-${currentYear}`;
                    }
                  })()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tax Settings */}
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-red-50/30">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Calculator className="h-5 w-5 text-red-600" />
                Tax Settings
              </CardTitle>
              <p className="text-sm text-gray-600">Configure default tax rates and calculations</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultGST" className="text-sm font-medium text-gray-700">
                    Default GST Rate (%)
                  </Label>
                  <Input
                    id="defaultGST"
                    type="number"
                    min="0"
                    max="100"
                    value={companyInfo.defaultGstRate}
                    onChange={(e) => handleCompanyChange('defaultGstRate', parseFloat(e.target.value) || 0)}
                    className="h-10 md:h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="decimalPlaces" className="text-sm font-medium text-gray-700">
                    Decimal Places
                  </Label>
                  <Select
                    value={companyInfo.decimalPlaces.toString()}
                    onValueChange={(value) => handleCompanyChange('decimalPlaces', parseInt(value))}
                  >
                    <SelectTrigger className="h-10 md:h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* States Tab */}
      {activeTab === "states" && (
        <div className="space-y-4 md:space-y-6">
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-green-50/30">
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg md:text-xl">States Management</CardTitle>
                <Button
                  onClick={handleAddState}
                  className="flex items-center gap-2"
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  Add State
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {companyInfo?.states && companyInfo.states.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>State Name</TableHead>
                        <TableHead>Pincode</TableHead>
                        <TableHead>GST Rate %</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companyInfo.states.map((state, index) => {
                        console.log('🔍 Rendering state:', state, 'Index:', index);
                        return (
                          <TableRow key={state._id || index}>
                            <TableCell className="font-medium">{state.name}</TableCell>
                            <TableCell>{state.pincode}</TableCell>
                            <TableCell>{state.gstRate}%</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditState(state)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete State</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{state.name}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteState(state._id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No States Added</h3>
                  <p className="text-gray-600 mb-4">
                    Add states to manage IGST rates and pincodes for your business.
                  </p>
                  <Button onClick={handleAddState} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add First State
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === "preview" && (
        <div className="space-y-4 md:space-y-6">
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50/30">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-lg md:text-xl">Invoice Preview</CardTitle>
              <p className="text-sm text-gray-600">
                Preview how your invoice will look with current settings
              </p>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 md:p-6 bg-white text-black max-w-2xl mx-auto shadow-lg">
                {/* Invoice Header */}
                <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                  <div className="space-y-2">
                    {companyInfo.companyLogo && (
                      <div className="w-20 md:w-24 h-10 md:h-12 bg-gray-200 rounded mb-2 flex items-center justify-center">
                        <span className="text-xs text-gray-500">LOGO</span>
                      </div>
                    )}
                    <h1 className="text-xl md:text-2xl font-bold">{companyInfo.name}</h1>
                    <p className="text-xs md:text-sm text-gray-600">
                      {companyInfo.address.street}, {companyInfo.address.city}, {companyInfo.address.state} {companyInfo.address.pincode}
                    </p>
                    {companyInfo.phoneNumber && (
                      <p className="text-xs md:text-sm">Phone: {companyInfo.phone}</p>
                    )}
                    {companyInfo.emailAddress && (
                      <p className="text-xs md:text-sm">Email: {companyInfo.email}</p>
                    )}
                    {companyInfo.gstNumberDisplay && (
                      <p className="text-xs md:text-sm">GST: {companyInfo.gstNumber}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg md:text-xl font-bold">INVOICE</h2>
                    <p className="text-xs md:text-sm">#{companyInfo.gstBillPrefix}/24/0001</p>
                    <p className="text-xs md:text-sm">Date: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2 text-sm md:text-base">Bill To:</h3>
                  <div className="text-xs md:text-sm">
                    <p>Sample Customer</p>
                    <p>123 Customer Street</p>
                    <p>City, State 123456</p>
                    <p>Phone: +91 9876543210</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto mb-6">
                  <table className="w-full border-collapse border border-gray-300 text-xs md:text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left">Item</th>
                        <th className="border border-gray-300 p-2 text-right">Qty</th>
                        <th className="border border-gray-300 p-2 text-right">Rate</th>
                        <th className="border border-gray-300 p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2">Sample Product</td>
                        <td className="border border-gray-300 p-2 text-right">1</td>
                        <td className="border border-gray-300 p-2 text-right">₹1,000.00</td>
                        <td className="border border-gray-300 p-2 text-right">₹1,000.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-6">
                  <div className="w-48 md:w-64 text-xs md:text-sm">
                    <div className="flex justify-between py-1">
                      <span>Subtotal:</span>
                      <span>₹1,000.00</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>CGST (9%):</span>
                      <span>₹90.00</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>SGST (9%):</span>
                      <span>₹90.00</span>
                    </div>
                    <div className="flex justify-between py-1 font-bold border-t">
                      <span>Total:</span>
                      <span>₹1,180.00</span>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions */}
                {companyInfo.termsConditions && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2 text-sm md:text-base">Terms & Conditions:</h3>
                    <div className="text-xs text-gray-600 whitespace-pre-line">
                      Payment is due within 30 days of invoice date. Interest @ 18% per annum will be charged on overdue amounts.
                    </div>
                  </div>
                )}

                {/* Signature */}
                {companyInfo.signatureLine && (
                  <div className="text-right">
                    <div className="inline-block">
                      <div className="w-32 md:w-40 border-t border-gray-400 mt-12 md:mt-16 mb-2"></div>
                      <p className="text-xs md:text-sm">Authorized Signature</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit State Modal */}
      <Dialog open={isAddStateModalOpen} onOpenChange={setIsAddStateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingState ? "Edit State" : "Add New State"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stateName">State Name</Label>
              <Input
                id="stateName"
                value={stateForm.name}
                onChange={(e) => handleStateNameChange(e.target.value)}
                placeholder="Enter state name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={stateForm.pincode}
                onChange={(e) => setStateForm(prev => ({ ...prev, pincode: e.target.value }))}
                placeholder="Enter pincode"
                type="number"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstRate">GST Rate %</Label>
              <Input
                id="gstRate"
                value={stateForm.gstRate}
                onChange={(e) => setStateForm(prev => ({ ...prev, gstRate: e.target.value }))}
                placeholder="Enter GST Rate percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddStateModalOpen(false);
                  resetStateForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveState}>
                {editingState ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}