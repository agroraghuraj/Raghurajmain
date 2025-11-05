import React, { useState, useEffect, useRef } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Trash2,
  Package,
  Calculator,
  Receipt,
  User,
  Phone,
  MapPin,
} from "lucide-react";
import productService from "@/services/productService";
import billingService from "@/services/billingService";
import { useToast } from "@/hooks/use-toast";

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
  taxableAmount?: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  pincode?: string;
}

export default function DesktopBilling() {
  const { toast } = useToast();
  const [billingType, setBillingType] = useState<"gst" | "non-gst">("gst");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debug search results changes
  useEffect(() => {
    console.log('🔍 Search results state changed:', searchResults.length, 'products');
    if (searchResults.length > 0) {
      console.log('🔍 Search results products:', searchResults.map(p => ({ name: p.name, stock: p.stockQuantity })));
    }
  }, [searchResults]);

  // Force refresh search results when search term changes
  const [searchKey, setSearchKey] = useState(0);
  useEffect(() => {
    setSearchKey(prev => prev + 1);
  }, [searchTerm]);

  // Search products - Simplified and reliable
  const searchProducts = async (term: string) => {
    console.log('🔍 Search initiated for term:', term);
    
    // Always clear previous results first
    setSearchResults([]);
    setIsSearching(true);
    
    // Small delay to ensure UI is cleared
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      let products = [];
      
      if (term.length >= 2) {
        console.log('🔍 Searching with term:', term);
        // Only search with the exact term - no additional products
        products = await productService.searchProducts(term);
        console.log('🔍 Search results:', products.length, 'products found');
        console.log('🔍 Products found:', products.map(p => ({ name: p.name, stock: p.stockQuantity })));
      } else if (term.length === 1) {
        console.log('🔍 Single character search:', term);
        products = await productService.searchProducts(term);
        console.log('🔍 Single char results:', products.length, 'products found');
      } else {
        console.log('🔍 Empty search - showing recent products');
        const { products: allProducts } = await productService.getAllProducts({ 
          limit: 10,
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        });
        products = allProducts;
        console.log('🔍 Recent products:', products.length, 'products found');
      }
      
      console.log('🔍 Final products to display:', products.map(p => ({ name: p.name, stock: p.stockQuantity })));
      
      // Set search results with fresh data
      setSearchResults(products);
      
    } catch (error) {
      console.error("Error searching products:", error);
      toast({
        title: "Error",
        description: "Failed to search products",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search - Simplified
  useEffect(() => {
    console.log('🔍 Search term changed to:', searchTerm);
    
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Clear results immediately when search term changes
    setSearchResults([]);
    
    // Set timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      console.log('🔍 Executing search for term:', searchTerm);
      searchProducts(searchTerm);
    }, searchTerm.length === 0 ? 0 : 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Add item to bill
  const addItem = async (product: any) => {
    // Check if product is out of stock
    if (product.stockQuantity <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock. Available quantity: ${product.stockQuantity}`,
        variant: "destructive",
      });
      
      // Refresh search results after out-of-stock attempt
      console.log('🔍 Refreshing search after out-of-stock attempt');
      
      // Clear current results immediately
      setSearchResults([]);
      setIsRefreshing(true);
      
      // Refresh search after a short delay
      setTimeout(() => {
        console.log('🔍 Auto-refreshing search after out-of-stock');
        setIsRefreshing(false);
        if (searchTerm) {
          searchProducts(searchTerm);
        } else {
          // If no search term, show recent products
          searchProducts("");
        }
      }, 500); // Refresh after 0.5 seconds
      return;
    }

    const basePrice = product.price;
    const gstPercent = billingType === "gst" ? (product.gstPercent || 18) : 0;
    const taxableAmount = basePrice;
    const gstAmount = gstPercent ? (taxableAmount * gstPercent) / 100 : 0;
    const total = taxableAmount + gstAmount;

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
      taxableAmount,
    };

    // If this is the first item, create a new bill
    if (items.length === 0) {
      try {
        setIsLoading(true);
        // Convert InvoiceItem to BillItem format
        const billItems = [{
          itemName: newItem.name,
          itemPrice: newItem.price,
          itemQuantity: newItem.quantity,
          itemTotal: newItem.total
        }];
        
        const billData = {
          billType: billingType === "gst" ? "GST" as const : "NON_GST" as const,
          customerName: selectedCustomer?.name || "Walk-in Customer",
          customerAddress: selectedCustomer?.address || "",
          customerPhone: selectedCustomer?.phone || "",
          pincode: selectedCustomer?.pincode || "", // Include pincode from customer data
          items: billItems,
          discount: 0,
          paymentType: "Full" as const,
          paymentMethod: "cash" as const,
        };

        const response = await billingService.createBill(billData);
        setCurrentBillId(response.id);
        setItems([newItem]);
        
        toast({
          title: "Success",
          description: "Bill created and item added",
        });
      } catch (error) {
        console.error("Error creating bill:", error);
        toast({
          title: "Error",
          description: "Failed to create bill",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Update existing bill
      try {
        setIsLoading(true);
        const updatedItems = [...items, newItem];
        // Convert InvoiceItem to BillItem format
        const billItems = updatedItems.map(item => ({
          itemName: item.name,
          itemPrice: item.price,
          itemQuantity: item.quantity,
          itemTotal: item.total
        }));
        const billData = {
          items: billItems,
        };

        await billingService.updateBill(currentBillId!, billData);
        setItems(updatedItems);
        
        toast({
          title: "Success",
          description: "Item added to bill",
        });
      } catch (error) {
        console.error("Error updating bill:", error);
        toast({
          title: "Error",
          description: "Failed to add item to bill",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    setSearchTerm("");
    setSearchResults([]);
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const taxableAmount = item.price * quantity;
          const gstAmount = billingType === "gst" ? (taxableAmount * (item.gstPercent || 18)) / 100 : 0;
          const total = taxableAmount + gstAmount;
          
          return {
            ...item,
            quantity,
            taxableAmount,
            gstAmount,
            total,
          };
        }
        return item;
      })
    );
  };

  // Update item price
  const updateItemPrice = (itemId: string, price: number) => {
    if (price < 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const taxableAmount = price * item.quantity;
          const gstAmount = billingType === "gst" ? (taxableAmount * (item.gstPercent || 18)) / 100 : 0;
          const total = taxableAmount + gstAmount;
          
          return {
            ...item,
            price,
            taxableAmount,
            gstAmount,
            total,
          };
        }
        return item;
      })
    );
  };

  // Update GST percentage
  const updateItemGstPercent = (itemId: string, gstPercent: number) => {
    if (gstPercent < 0 || gstPercent > 100) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const taxableAmount = item.price * item.quantity;
          const gstAmount = billingType === "gst" ? (taxableAmount * gstPercent) / 100 : 0;
          const total = taxableAmount + gstAmount;
          
          return {
            ...item,
            gstPercent,
            taxableAmount,
            gstAmount,
            total,
          };
        }
        return item;
      })
    );
  };

  // Remove item
  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.taxableAmount || item.price * item.quantity), 0);
  const gstTotal = billingType === "gst" ? items.reduce((sum, item) => sum + (item.gstAmount || 0), 0) : 0;
  const grandTotal = subtotal + gstTotal;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Desktop Billing</h1>
            <p className="text-gray-600 mt-1">Create and manage bills efficiently</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              Bill #{currentBillId ? currentBillId.slice(-6) : "New"}
            </Badge>
          </div>
        </div>

        {/* Billing Type Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Billing Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="billing-type">Select Billing Type:</Label>
              <Select value={billingType} onValueChange={(value: "gst" | "non-gst") => setBillingType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gst">GST Invoice</SelectItem>
                  <SelectItem value="non-gst">Non-GST Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Add Item Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Product Search */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search products by name or ID..."
                    value={searchTerm}
                    onChange={(e) => {
                      console.log('🔍 Input changed from:', searchTerm, 'to:', e.target.value);
                      setSearchTerm(e.target.value);
                      // Always clear results when typing
                      setSearchResults([]);
                      // Force refresh search key to ensure clean state
                      setSearchKey(prev => prev + 1);
                    }}
                    onFocus={() => {
                      if (searchResults.length === 0) {
                        searchProducts(""); // Show all products when focused
                      }
                    }}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsSearching(true);
                    try {
                      const { products: allProducts } = await productService.getAllProducts({ 
                        limit: 50, // Show more products
                        sortBy: 'updatedAt',
                        sortOrder: 'desc'
                      });
                      setSearchResults(allProducts);
                    } catch (error) {
                      console.error("Error fetching all products:", error);
                    } finally {
                      setIsSearching(false);
                    }
                  }}
                  className="w-full"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Show All Products
                </Button>
              </div>

              {/* Search Results */}
              {(isSearching || isRefreshing) && (
                <div className="text-center py-4 text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                    {isRefreshing ? "Refreshing search..." : "Searching products..."}
                  </div>
                </div>
              )}
              
              {searchResults.length > 0 && !isSearching && !isRefreshing && (
                <div className="space-y-2" key={`search-results-${searchKey}-${searchTerm}`}>
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {searchResults.map((product) => {
                      console.log('🔍 UI Rendering product:', product.name, 'Stock:', product.stockQuantity);
                      return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-600">
                          ₹{product.price} • Stock: {product.stockQuantity || 0}
                          {billingType === "gst" && (
                            <span className="ml-2">• GST: {product.gstPercent || 18}%</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addItem(product)}
                        disabled={isLoading}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    );
                    })}
                  </div>
                  
                  {/* Show More Products Button */}
                  {searchTerm.length > 0 && searchResults.length < 10 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setIsSearching(true);
                        try {
                          const { products: allProducts } = await productService.getAllProducts({ 
                            limit: 30,
                            sortBy: 'updatedAt',
                            sortOrder: 'desc'
                          });
                          setSearchResults(allProducts);
                        } catch (error) {
                          console.error("Error fetching more products:", error);
                        } finally {
                          setIsSearching(false);
                        }
                      }}
                      className="w-full mt-2"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Show More Products
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        {items.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600">{item.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Editable Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Quantity */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Quantity</Label>
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
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                            onFocus={(e) => e.target.select()}
                            className="h-8 w-16 text-center"
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
                        <Label className="text-sm font-medium">Unit Price</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                            className="h-8 pl-8"
                          />
                        </div>
                      </div>

                      {/* GST Percentage */}
                      {billingType === "gst" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">GST %</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.gstPercent || 18}
                              onChange={(e) => updateItemGstPercent(item.id, parseFloat(e.target.value) || 0)}
                              className="h-8 pr-8"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                          </div>
                        </div>
                      )}

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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Section */}
        {items.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {billingType === "gst" && (
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span>₹{gstTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Grand Total:</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

