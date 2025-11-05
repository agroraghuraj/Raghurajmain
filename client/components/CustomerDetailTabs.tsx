import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  X,
  Receipt,
  Clock,
  CheckCircle,
  FileText,
  User,
  Phone,
  MapPin,
  Mail,
  Calendar,
  DollarSign,
} from "lucide-react";
import billingService from "@/services/billingService";

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
}

interface Bill {
  id: string;
  billNumber: string;
  billType: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  paymentStatus: string;
  items: any[];
}

interface CustomerDetailTabsProps {
  customer: Customer;
  onClose: () => void;
}

export default function CustomerDetailTabs({ customer, onClose }: CustomerDetailTabsProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerBills();
  }, [customer.id]);

  const fetchCustomerBills = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      const mockBills: Bill[] = [
        {
          id: "1",
          billNumber: "GST/2025-26/0001",
          billType: "GST",
          date: "2025-01-15",
          totalAmount: 1500,
          paidAmount: 1500,
          status: "completed",
          paymentStatus: "paid",
          items: [
            { name: "Product 1", quantity: 2, price: 500, total: 1000 },
            { name: "Product 2", quantity: 1, price: 500, total: 500 },
          ],
        },
        {
          id: "2",
          billNumber: "GST/2025-26/0002",
          billType: "GST",
          date: "2025-01-20",
          totalAmount: 2000,
          paidAmount: 1000,
          status: "completed",
          paymentStatus: "partial",
          items: [
            { name: "Product 3", quantity: 1, price: 2000, total: 2000 },
          ],
        },
        {
          id: "3",
          billNumber: "NGST/2025-26/0001",
          billType: "Non-GST",
          date: "2025-01-25",
          totalAmount: 800,
          paidAmount: 0,
          status: "pending",
          paymentStatus: "pending",
          items: [
            { name: "Product 4", quantity: 1, price: 800, total: 800 },
          ],
        },
      ];
      setBills(mockBills);
    } catch (error) {
      console.error("Error fetching customer bills:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case "pending":
        return <Badge className="bg-red-100 text-red-800">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBillTypeBadge = (type: string) => {
    switch (type) {
      case "GST":
        return <Badge className="bg-blue-100 text-blue-800">GST</Badge>;
      case "Non-GST":
        return <Badge className="bg-gray-100 text-gray-800">Non-GST</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const pastPurchases = bills.filter(bill => bill.paymentStatus === "paid");
  const pendingPayments = bills.filter(bill => bill.paymentStatus === "pending");
  const partialPayments = bills.filter(bill => bill.paymentStatus === "partial");

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto w-[98vw] sm:w-[95vw] md:w-[90vw] lg:w-[80vw] xl:w-[70vw] mx-auto p-2 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Customer Details - {customer.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">{customer.name}</p>
                    <p className="text-xs text-gray-500">Customer Name</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">{customer.phone}</p>
                    <p className="text-xs text-gray-500">Phone Number</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base break-words">{customer.address}</p>
                    <p className="text-xs text-gray-500">Address</p>
                  </div>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base break-words">{customer.email}</p>
                      <p className="text-xs text-gray-500">Email Address</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="all-bills" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="all-bills" className="text-xs sm:text-sm">All Bills</TabsTrigger>
              <TabsTrigger value="past-purchases" className="text-xs sm:text-sm">Past Purchases</TabsTrigger>
              <TabsTrigger value="pending-payments" className="text-xs sm:text-sm">Pending</TabsTrigger>
              <TabsTrigger value="partial-payments" className="text-xs sm:text-sm">Partial</TabsTrigger>
            </TabsList>

            <TabsContent value="all-bills" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    All Bills ({bills.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {loading ? (
                    <div className="text-center py-8">Loading bills...</div>
                  ) : bills.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No bills found</div>
                  ) : (
                    <div className="space-y-3">
                      {bills.map((bill) => (
                        <div key={bill.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm">{bill.billNumber}</p>
                              <p className="text-xs text-gray-500">{formatDate(bill.date)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{formatCurrency(bill.totalAmount)}</p>
                              <p className="text-xs text-gray-500">Total</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                              {getBillTypeBadge(bill.billType)}
                              {getPaymentStatusBadge(bill.paymentStatus)}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedBill(bill)}
                              className="h-8 px-3 text-xs"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="past-purchases" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Past Purchases ({pastPurchases.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {pastPurchases.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No past purchases</div>
                  ) : (
                    <div className="space-y-3">
                      {pastPurchases.map((bill) => (
                        <div key={bill.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm">{bill.billNumber}</p>
                              <p className="text-xs text-gray-500">{formatDate(bill.date)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{formatCurrency(bill.totalAmount)}</p>
                              <p className="text-xs text-gray-500">Total</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>{getBillTypeBadge(bill.billType)}</div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedBill(bill)}
                              className="h-8 px-3 text-xs"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending-payments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Pending Payments ({pendingPayments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {pendingPayments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No pending payments</div>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="block sm:hidden space-y-3">
                        {pendingPayments.map((bill) => (
                          <div key={bill.id} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <button
                                  onClick={() => setSelectedBill(bill)}
                                  className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                >
                                  {bill.billNumber}
                                </button>
                                <p className="text-xs text-gray-500">{formatDate(bill.date)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-orange-600" />
                                <Badge variant="destructive" className="text-xs">Pending</Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                              <div>
                                <span className="text-gray-500">Total:</span>
                                <span className="ml-1 font-medium">{formatCurrency(bill.totalAmount)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Type:</span>
                                <span className="ml-1">{bill.billType}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Paid:</span>
                                <span className="ml-1 font-medium text-green-600">{formatCurrency(bill.paidAmount || 0)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Pending:</span>
                                <span className="ml-1 font-medium text-red-600">{formatCurrency(bill.totalAmount - (bill.paidAmount || 0))}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedBill(bill)}
                                className="h-8 px-3 text-xs"
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden sm:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Status</TableHead>
                              <TableHead>Bill Number</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Total Amount</TableHead>
                              <TableHead>Paid Amount</TableHead>
                              <TableHead>Pending Amount</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingPayments.map((bill) => (
                              <TableRow key={bill.id} className="hover:bg-gray-50">
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-orange-600" />
                                    <Badge variant="destructive" className="text-xs">Pending</Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  <button
                                    onClick={() => setSelectedBill(bill)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                  >
                                    {bill.billNumber}
                                  </button>
                                </TableCell>
                                <TableCell>{formatDate(bill.date)}</TableCell>
                                <TableCell>
                                  {getBillTypeBadge(bill.billType)}
                                </TableCell>
                                <TableCell className="font-semibold">{formatCurrency(bill.totalAmount)}</TableCell>
                                <TableCell className="text-green-600">{formatCurrency(bill.paidAmount || 0)}</TableCell>
                                <TableCell className="text-red-600 font-semibold">{formatCurrency(bill.totalAmount - (bill.paidAmount || 0))}</TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedBill(bill)}
                                    className="h-8 px-3 text-xs"
                                  >
                                    View Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="partial-payments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Partial Payments ({partialPayments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {partialPayments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No partial payments</div>
                  ) : (
                    <div className="space-y-3">
                      {partialPayments.map((bill) => (
                        <div key={bill.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm">{bill.billNumber}</p>
                              <p className="text-xs text-gray-500">{formatDate(bill.date)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{formatCurrency(bill.totalAmount)}</p>
                              <p className="text-xs text-gray-500">Total</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                            <div>
                              <span className="text-gray-500">Paid:</span>
                              <span className="ml-1 font-medium">{formatCurrency(bill.paidAmount)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Balance:</span>
                              <span className="ml-1 font-medium text-red-600">
                                {formatCurrency(bill.totalAmount - bill.paidAmount)}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>{getBillTypeBadge(bill.billType)}</div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedBill(bill)}
                              className="h-8 px-3 text-xs"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Bill Details Dialog */}
        {selectedBill && (
          <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[90vw] lg:w-[80vw] xl:w-[70vw] mx-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="truncate">Bill Details - {selectedBill.billNumber}</span>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Bill Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Bill Number</Label>
                    <p className="font-semibold">{selectedBill.billNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Bill Type</Label>
                    <p>{getBillTypeBadge(selectedBill.billType)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Date</Label>
                    <p>{formatDate(selectedBill.date)}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-semibold mb-3">Items</h4>
                  <div className="space-y-2">
                    {selectedBill.items.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatCurrency(item.total)}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(item.price)} each</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-semibold">{formatCurrency(selectedBill.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid Amount:</span>
                      <span className="font-semibold">{formatCurrency(selectedBill.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>Balance:</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(selectedBill.totalAmount - selectedBill.paidAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

