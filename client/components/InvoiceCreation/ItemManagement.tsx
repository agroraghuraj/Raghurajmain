import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Trash2,
  Package,
  Calculator,
  Edit,
} from "lucide-react";
import productService from "@/services/productService";
import AddProductModal from "./AddProductModal";
import { formatNumericValue, getNumericInputValue } from "@/lib/utils";
import { useCompany } from "@/contexts/CompanyContext";

interface ItemManagementProps {
  customerName: string;
  billingType: string;
  onBack: () => void;
  onContinue: (items: InvoiceItem[], subtotal: number) => void;
}

interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  total: number;
  gstPercent?: number;
  gstAmount?: number;
  stockQuantity?: number; // Add stock quantity for validation
}

export default function ItemManagement({
  customerName,
  billingType,
  onContinue,
}: ItemManagementProps) {
  const { companyInfo } = useCompany();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // 📌 Search debouncing
  React.useEffect(() => {
    const timer = setTimeout(() => searchProducts(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 📌 Search Products
  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setProducts([]);
      return;
    }
    setIsLoadingProducts(true);
    try {
      const searchResults = await productService.searchProducts(query);
      setProducts(searchResults);
    } catch {
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // 📌 Select Product
  const selectProduct = (product: any) => {
    setSelectedProduct(product);
  };

  // 📌 Add Selected Item
  const addSelectedItem = () => {
    if (!selectedProduct) return;
    
    // Check if product is out of stock
    if (selectedProduct.stockQuantity <= 0) {
      toast({
        title: "Out of Stock",
        description: `${selectedProduct.name} is currently out of stock. Available quantity: ${selectedProduct.stockQuantity}`,
        variant: "destructive",
      });
      return;
    }
    
    const basePrice = selectedProduct.price;
    // For same state: use product GST, for interstate: no individual GST (IGST applied to subtotal)
    const gstPercent = billingType === "gst" ? selectedProduct.gstPercent : 0;
    const gstAmount = gstPercent ? (basePrice * gstPercent) / 100 : 0;
    const total = basePrice + gstAmount;

    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      productId: selectedProduct.id,
      name: selectedProduct.name,
      description: selectedProduct.description,
      price: basePrice,
      quantity: 1,
      total,
      gstPercent,
      gstAmount,
      stockQuantity: selectedProduct.stockQuantity, // Store stock quantity for validation
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedProduct(null);
    setSearchTerm("");
  };

  // 📌 Add Item
  const addItem = (product: any) => {
    // Check if product is out of stock
    if (product.stockQuantity <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock. Available quantity: ${product.stockQuantity}`,
        variant: "destructive",
      });
      return;
    }

    const basePrice = product.price;
    // For same state: use product GST, for interstate: no individual GST (IGST applied to subtotal)
    const gstPercent = billingType === "gst" ? product.gstPercent : 0;
    const gstAmount = gstPercent ? (basePrice * gstPercent) / 100 : 0;
    const total = basePrice + gstAmount;

    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      productId: product.id,
      name: product.name,
      description: product.description,
      price: basePrice,
      quantity: 1,
      total,
      gstPercent,
      gstAmount,
      stockQuantity: product.stockQuantity, // Store stock quantity for validation
    };
    setItems((prev) => [...prev, newItem]);
    setSearchTerm("");
  };

  // 📌 Update Qty
  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          // Check stock quantity if available
          if (item.stockQuantity !== undefined && quantity > item.stockQuantity) {
            toast({
              title: "Insufficient Stock",
              description: `Cannot set quantity to ${quantity} for ${item.name}. Available stock: ${item.stockQuantity}`,
              variant: "destructive",
            });
            return item; // Return unchanged item
          }
          
          return {
            ...item,
            quantity,
            gstAmount: billingType === "gst" ? (item.price * quantity * item.gstPercent) / 100 : 0,
            total:
              item.price * quantity +
              (billingType === "gst" ? (item.price * quantity * item.gstPercent) / 100 : 0),
          };
        }
        return item;
      })
    );
  };

  const updateItemPrice = (itemId: string, price: number) => {
    if (price < 0) return;
    
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const baseTotal = price * item.quantity;
        const gstAmount = billingType === "gst" ? (baseTotal * item.gstPercent) / 100 : 0;
        const total = baseTotal + gstAmount;
        
        return {
          ...item,
          price,
          total: total,
          gstAmount: gstAmount,
        };
      }
      return item;
    }));
  };

  const handleEditItem = (itemId: string) => {
    // For now, just log - you can add edit functionality later
    console.log("Edit item:", itemId);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  // Get dynamic GST rate from company settings
  const getDynamicGstRate = () => {
    // For now, use default GST rate from company settings
    // In a real implementation, you might want to pass customer state info
    return companyInfo?.defaultGstRate || 18; // Use company's default GST rate
  };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const gstTotal =
    billingType === "gst"
      ? items.reduce((sum, i) => sum + (i.gstAmount || 0), 0)
      : 0;
  const grandTotal = subtotal + gstTotal;

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Add Items</h1>
        <p className="text-gray-600">
          Adding items for <span className="font-semibold">{customerName}</span>{" "}
          <Badge className="ml-2">{billingType.toUpperCase()}</Badge>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left - Search & Add Product */}
        <Card className="lg:col-span-1 shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" /> Search Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New Product Button - Top Priority */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Add New Product
                  </DialogTitle>
                </DialogHeader>
                <AddProductModal onClose={() => {}} />
              </DialogContent>
            </Dialog>


            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-lg"
            />

            {/* Search Results */}
            {searchTerm && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">Search Results</Label>
                  <span className="text-xs text-gray-500">{products.length} found</span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2 bg-gray-50">
                  {isLoadingProducts ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Searching...</p>
                    </div>
                  ) : products.length > 0 ? (
                    products.map((p) => (
                      <div
                        key={p.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 shadow-sm ${
                          selectedProduct?.id === p.id
                            ? "bg-blue-100 border-blue-300 ring-2 ring-blue-200"
                            : "bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-200"
                        }`}
                        onClick={() => selectProduct(p)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-600">₹{p.price}</p>
                            {p.description && (
                              <p className="text-xs text-gray-500 mt-1">{p.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedProduct?.id === p.id && (
                              <span className="text-xs text-blue-600 font-medium">Selected</span>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                addItem(p);
                              }}
                              className="ml-2"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">No products found</p>
                      <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                    </div>
                  )}
                </div>
                
                {/* Add Item Button - Only show when a product is selected */}
                {selectedProduct && (
                  <Button 
                    onClick={addSelectedItem}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item: {selectedProduct.name}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Middle - Items */}
        <Card className="lg:col-span-2 shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" /> Selected Items ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500 mb-2">No items added yet</p>
                <p className="text-sm text-gray-400">Search for products or add new ones to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <Card key={item.id} className="p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      {/* Item Info */}
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditItem(item.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button> */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Quantity */}
                      <div className="space-y-2">
                        <Label htmlFor={`qty-${item.id}`} className="text-sm font-medium">
                          Quantity
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="h-8 w-8 p-0"
                          >
                            -
                          </Button>
                          <Input
                            id={`qty-${item.id}`}
                            type="number"
                            min="1"
                            value={getNumericInputValue(item.quantity, true)}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="h-8 w-16 text-center"
                            placeholder="1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            className="h-8 w-8 p-0"
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="space-y-2">
                        <Label htmlFor={`price-${item.id}`} className="text-sm font-medium">
                          Unit Price
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                          <Input
                            id={`price-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={getNumericInputValue(item.price)}
                            onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                            className="h-8 pl-8"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Total */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Total</Label>
                        <div className="h-8 flex items-center justify-between bg-gray-50 px-3 rounded-md">
                          <span className="text-sm text-gray-600">
                            {billingType === "gst" && (
                              <span>GST: ₹{item.gstAmount?.toFixed(2)}</span>
                            )}
                          </span>
                          <span className="font-semibold">₹{item.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right - Summary */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-md rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5" /> Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatNumericValue(subtotal, { prefix: '₹', showZero: true })}</span>
              </div>
              {billingType === "gst" && (
                <div className="flex justify-between">
                  <span>GST ({getDynamicGstRate()}%):</span>
                  <span>{formatNumericValue(gstTotal, { prefix: '₹', showZero: true })}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatNumericValue(grandTotal, { prefix: '₹', showZero: true })}</span>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => onContinue(items, subtotal)}
            disabled={!items.length}
            size="lg"
            className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white"
          >
            Continue to Payment
          </Button>
        </div>
      </div>
    </div>
  );
}
