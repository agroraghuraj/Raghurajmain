import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users,
  Phone,
  MapPin,
  ShoppingBag,
  History,
  Calendar,
  Eye,
  MoreVertical,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { customerService, Customer, CustomerData } from "@/services/customerService";
import { billingService } from "@/services/billingService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import CustomerDetailsModal from "@/components/CustomerDetailsModal";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Purchase {
  id: string;
  customerId: string;
  amount: number;
  date: Date;
  items: number;
  invoiceNumber: string;
  type: "GST" | "Non-GST";
}

// No mock data - only API customers

// No mock purchases - only API data

export default function Customers() {
  const navigate = useNavigate();
  const { companyInfo } = useCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases] = useState<Purchase[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dropdownStates, setDropdownStates] = useState<{[key: string]: boolean}>({});
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
    address?: string;
  } | null>(null);
  const [customerBills, setCustomerBills] = useState<{[key: string]: any[]}>({});
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    state: "",
    pincode: "",
    city: "",
    // igst: 0, // Removed as it doesn't exist in Customer interface
  });

  // Load customer bills for last purchase data
  const loadCustomerBills = async (customerId: string) => {
    try {
      const bills = await billingService.getBillsByCustomer(customerId);
      setCustomerBills(prev => ({
        ...prev,
        [customerId]: bills
      }));
    } catch (error) {
      console.error('Error loading customer bills:', error);
    }
  };

  // Load customers from API on component mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        const result = await customerService.getAllCustomers();
        setCustomers(result.customers);
        
        // Load bills for each customer to get accurate last purchase data
        result.customers.forEach(customer => {
          loadCustomerBills(customer.id);
        });
      } catch (error) {
        console.error('Error loading customers:', error);
        // No fallback - only API customers
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.state && customer.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.pincode && customer.pincode.includes(searchTerm))
  );


  // Get actual last purchase date from bills
  const getLastPurchaseDate = (customerId: string) => {
    const bills = customerBills[customerId] || [];
    if (bills.length === 0) return null;
    
    // Sort bills by date (most recent first) and get the first one
    const sortedBills = bills.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.billDate || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.billDate || b.createdAt).getTime();
      return dateB - dateA;
    });
    
    return sortedBills[0].updatedAt || sortedBills[0].billDate || sortedBills[0].createdAt;
  };

  // Get total amount from actual bills
  const getTotalAmountFromBills = (customerId: string) => {
    const bills = customerBills[customerId] || [];
    return bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      address: "",
      email: "",
      state: "",
      pincode: "",
      city: "",
      // igst: 0, // Removed as it doesn't exist in formData interface
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.state.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      const customerData: CustomerData = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        email: formData.email || undefined,
        state: formData.state,
        pincode: formData.pincode,
        city: formData.city,
        // igst: formData.igst, // Removed as it doesn't exist in CustomerData interface
        customerType: "individual",
      };

      if (editingCustomer) {
        // Update existing customer
        const updatedCustomer = await customerService.updateCustomer(editingCustomer.id, customerData);
        setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? updatedCustomer : c));
        toast.success("Customer updated successfully");
      } else {
        // Create new customer
        const newCustomer = await customerService.createCustomer(customerData);
        setCustomers(prev => [...prev, newCustomer]);
        toast.success("Customer created successfully");
      }

      resetForm();
      setIsAddDialogOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error("Failed to save customer");
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      email: customer.email || "",
      state: customer.state || "",
      pincode: customer.pincode || "",
      city: customer.city || "",
      // igst: 0, // Removed as it doesn't exist in formData interface
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (customerId: string) => {
    try {
      await customerService.deleteCustomer(customerId);
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      setDeleteCustomerId(null);
      toast.success("Customer deleted successfully");
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error("Failed to delete customer");
    }
  };

  const handleCustomerClick = (customer: Customer) => {
    const customerInfo = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: `${customer.address}${customer.state ? `, ${customer.state}` : ''}${customer.pincode ? ` ${customer.pincode}` : ''}`
    };
    
    setSelectedCustomer(customerInfo);
    setShowCustomerModal(true);
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleExportAllCustomers = async () => {
    console.log("🔄 Button clicked - Starting export...");
    
    if (exporting) {
      console.log("⚠️ Export already in progress, ignoring click");
      return;
    }
    
    if (customers.length === 0) {
      console.log("⚠️ No customers to export");
      toast.error("No customers to export");
      return;
    }
    
    try {
      setExporting(true);
      console.log("🔄 Starting customer export...");
      console.log("📊 Company Info:", companyInfo);
      console.log("👥 Customers:", customers.length);
      
      // Test basic functionality first
      console.log("🧪 Testing basic PDF generation...");
      
      // Import pdfGenerator dynamically
      const { pdfGenerator } = await import("@/utils/pdfGenerator");
      console.log("📄 PDF Generator imported successfully");
      
      // Create customer list data for PDF
      const customerListData = customers.map((customer, index) => ({
        id: index + 1,
        name: customer.name,
        phone: customer.phone,
        address: `${customer.address}${customer.state ? `, ${customer.state}` : ''}${customer.pincode ? ` ${customer.pincode}` : ''}`,
        email: customer.email || 'N/A',
        totalPurchases: getTotalAmountFromBills(customer.id),
        orderCount: customerBills[customer.id]?.length || 0,
        lastPurchase: getLastPurchaseDate(customer.id) ? formatDate(getLastPurchaseDate(customer.id)!) : 'Never',
        customerSince: formatDate(customer.createdAt)
      }));

      console.log("📋 Customer data prepared:", customerListData.length, "customers");
      console.log("📋 Sample customer data:", customerListData[0]);

      // Generate PDF for customer list with company details
      console.log("🔄 Generating PDF...");
      await pdfGenerator.generateCustomerListPDF(customerListData, companyInfo);
      console.log("✅ PDF generation completed");
      
      toast.success("Customer list exported successfully");
    } catch (error) {
      console.error("❌ Error exporting customers:", error);
      console.error("❌ Error details:", error.message);
      console.error("❌ Error stack:", error.stack);
      toast.error(`Failed to export customers: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="px-4 py-2 lg:p-4 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        {/* Heading Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  resetForm();
                  setEditingCustomer(null);
                }}>
                  <Plus className="h-4 w-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
            </Dialog>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                disabled
              >
                <Users className="h-4 w-4" />
                Total: {customers.length}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  console.log("🖱️ Button clicked!");
                  handleExportAllCustomers();
                }}
                disabled={loading || customers.length === 0 || exporting}
                className="flex items-center gap-2"
                title={customers.length === 0 ? "No customers to export" : exporting ? "Exporting..." : "Export all customers to PDF"}
              >
                <Download className="h-4 w-4" />
                {exporting ? "Exporting..." : "Export All Customers"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 9876543210"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Complete address"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  State *
                </Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => {
                    setFormData(prev => {
                      const newData = { ...prev, state: value };
                      
                      // Auto-fill pincode and IGST when state is selected
                      if (value && companyInfo?.states) {
                        const selectedState = companyInfo.states.find(state => state.name === value);
                        if (selectedState) {
                          newData.pincode = selectedState.pincode || '';
                          // newData.igst = selectedState.gstRate || 0; // Removed as igst doesn't exist in formData interface
                        }
                      }
                      
                      return newData;
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state (Required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyInfo?.states && companyInfo.states.length > 0 ? (
                      companyInfo.states.map((state, index) => (
                        <SelectItem key={state._id || index} value={state.name}>
                          {state.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-states" disabled>
                        No states configured - Add states in Settings
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                  placeholder="Enter 6-digit pincode"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Enter city"
                />
              </div>

              {/* IGST field removed as it doesn't exist in formData interface */}

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingCustomer ? "Update" : "Add"} Customer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      {/* Stats Cards */}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, phone, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading customers...</div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">No customers found</div>
          </div>
        ) : (
          filteredCustomers.map(customer => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Customer Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <button
                          onClick={() => handleCustomerClick(customer)}
                          className="font-semibold text-lg text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors text-left block"
                        >
                          {customer.name}
                        </button>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-1">
                              <span>@</span>
                              <span className="truncate">{customer.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Address */}
                    <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
                      <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      <span className="break-words">
                        {customer.address}
                        {customer.state && `, ${customer.state}`}
                        {customer.pincode && ` ${customer.pincode}`}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-gray-600 text-xs mb-1">Total Purchases</div>
                        <div className="font-semibold text-green-600">₹{getTotalAmountFromBills(customer.id).toLocaleString()}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-gray-600 text-xs mb-1">Orders</div>
                        <div className="font-semibold text-blue-600">{customerBills[customer.id]?.length || 0}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-gray-600 text-xs mb-1">Last Purchase</div>
                        <div className="font-semibold text-gray-700">
                          {getLastPurchaseDate(customer.id) ? formatDate(getLastPurchaseDate(customer.id)!) : "Never"}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-gray-600 text-xs mb-1">Customer Since</div>
                        <div className="font-semibold text-gray-700">{formatDate(customer.createdAt)}</div>
                      </div>
                    </div>
                  </div>

                   {/* Three dots menu */}
                   <div className="flex-shrink-0">
                     <DropdownMenu 
                       open={dropdownStates[customer.id] || false}
                       onOpenChange={(open) => {
                         console.log('Dropdown state change:', open, 'for customer:', customer.name);
                         setDropdownStates(prev => ({
                           ...prev,
                           [customer.id]: open
                         }));
                       }}
                     >
                       <DropdownMenuTrigger asChild>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-8 w-8 p-0 hover:bg-muted"
                         >
                           <MoreVertical className="h-4 w-4" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" className="w-48">
                         <DropdownMenuItem 
                           onClick={() => {
                             console.log('View Details clicked for:', customer.name);
                             setSelectedCustomer({
                               id: customer.id,
                               name: customer.name,
                               phone: customer.phone,
                               address: `${customer.address}${customer.state ? `, ${customer.state}` : ''}${customer.pincode ? ` ${customer.pincode}` : ''}`
                             });
                             setShowCustomerModal(true);
                             setDropdownStates(prev => ({
                               ...prev,
                               [customer.id]: false
                             }));
                           }}
                           className="cursor-pointer"
                         >
                           <Eye className="h-4 w-4 mr-2" />
                           View Details
                         </DropdownMenuItem>
                         <DropdownMenuItem 
                           onClick={() => {
                             console.log('Edit clicked for:', customer.name);
                             handleEdit(customer);
                             setDropdownStates(prev => ({
                               ...prev,
                               [customer.id]: false
                             }));
                           }}
                         >
                           <Edit2 className="h-4 w-4 mr-2" />
                           Edit Customer
                         </DropdownMenuItem>
                         <DropdownMenuItem 
                           onClick={() => {
                             console.log('Delete clicked for:', customer.name);
                             setDeleteCustomerId(customer.id);
                             setDropdownStates(prev => ({
                               ...prev,
                               [customer.id]: false
                             }));
                           }}
                           className="text-red-600 focus:text-red-600"
                         >
                           <Trash2 className="h-4 w-4 mr-2" />
                           Delete Customer
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCustomerId} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone and will remove all associated purchase history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCustomerId && handleDelete(deleteCustomerId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          isOpen={showCustomerModal}
          onClose={() => {
            setShowCustomerModal(false);
            setSelectedCustomer(null);
          }}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          customerPhone={selectedCustomer.phone}
          customerAddress={selectedCustomer.address}
        />
      )}
    </div>
  );
}
