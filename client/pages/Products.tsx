import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getNumericInputValue } from "@/lib/utils";
import productService, { Product, CreateProductData } from "@/services/productService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Package,
  AlertTriangle,
  Filter,
  Grid,
  List,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

const categories = ["Mobile", "AC", "TV", "Laptop", "Refrigerator", "Washing Machine"];

export default function Products() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    brand: "",
    price: "",
    gstPercent: "",
    stockQuantity: "",
    warranty: "",
  });

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await productService.getAllProducts();
      setProducts(result.products);
    } catch (err) {
      setError("Failed to fetch products");
      console.error("Error fetching products:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter products based on search, category, and low stock filter
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || product.stockQuantity <= 5;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const lowStockProducts = products.filter(p => p.stockQuantity <= 5);

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      brand: "",
      price: "",
      gstPercent: "",
      stockQuantity: "",
      warranty: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      const productData: CreateProductData = {
        name: formData.name,
        category: formData.category,
        brand: formData.brand,
        price: parseFloat(formData.price),
        gstPercent: parseFloat(formData.gstPercent),
        stockQuantity: parseInt(formData.stockQuantity),
        warranty: formData.warranty || undefined,
      };

      if (editingProduct) {
        // 🔹 Update product
        await productService.updateProduct(editingProduct.id, productData);
      
        // 🔹 Refetch full product list to avoid white screen
        await fetchProducts();
      
        toast({
          title: "Success",
          description: "Product updated successfully!",
          variant: "default",
        });
      } else {
        // 🔹 Create product
        await productService.createProduct(productData);
      
        // 🔹 Refetch full list after create
        await fetchProducts();
      
        toast({
          title: "Success",
          description: "Product created successfully!",
          variant: "default",
        });
      }
      
      resetForm();
      setIsAddDialogOpen(false);
      setEditingProduct(null);
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      brand: product.brand,
      price: product.price.toString(),
      gstPercent: product.gstPercent.toString(),
      stockQuantity: product.stockQuantity.toString(),
      warranty: product.warranty || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    try {
      await productService.deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast({
        title: "Success",
        description: "Product deleted successfully!",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setDeleteProductId(null);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* All controls in one row for both mobile and desktop */}
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 lg:items-center justify-between ">
        {/* Low Stock Alert - Clickable to show low stock products */}
        {!isLoading && !error && lowStockProducts.length > 0 && (
          <div 
            className={`border rounded-lg px-2 py-1 flex-1 min-w-0 lg:flex-none lg:w-80 cursor-pointer transition-colors ${
              showLowStockOnly 
                ? 'bg-orange-200 border-orange-300' 
                : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
            }`}
            onClick={() => {
              // Toggle low stock filter
              setShowLowStockOnly(!showLowStockOnly);
              setSelectedCategory("all");
              setSearchTerm("");
            }}
          >
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3 text-orange-600" />
              <span className="text-orange-800 font-medium text-xs">
                {showLowStockOnly ? 'Showing Low Stock' : `Low Stock (${lowStockProducts.length})`}
              </span>
            </div>
          </div>
        )}
        
        {/* Search Bar */}
        <div className="relative flex-1 min-w-0 lg:flex-none lg:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        
        {/* Filter and Action Buttons - Grouped together for mobile */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Filter and View Toggle */}
          <div className="flex items-center gap-1">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-20 sm:w-24">
                <Filter className="h-3 w-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-6 w-6 p-0"
              >
                <Grid className="h-3 w-3" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-6 w-6 p-0"
              >
                <List className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              onClick={fetchProducts}
              disabled={isLoading}
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    resetForm();
                    setEditingProduct(null);
                  }} 
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={getNumericInputValue(formData.price)}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst">GST (%)</Label>
                    <Input
                      id="gst"
                      type="number"
                      value={getNumericInputValue(formData.gstPercent, true)}
                      onChange={(e) => setFormData(prev => ({ ...prev, gstPercent: e.target.value }))}
                      placeholder="18"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={getNumericInputValue(formData.stockQuantity, true)}
                    onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: e.target.value }))}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warranty">Warranty (Optional)</Label>
                  <Input
                    id="warranty"
                    value={formData.warranty}
                    onChange={(e) => setFormData(prev => ({ ...prev, warranty: e.target.value }))}
                    placeholder="e.g., 1 Year"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {editingProduct ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>{editingProduct ? "Update" : "Add"} Product</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <p className="font-medium">Error loading products</p>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchProducts}
              className="mt-2"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}


      {/* Products Display */}
      {!isLoading && !error && filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategory !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "Get started by adding your first product"}
              </p>
              {!searchTerm && selectedCategory === "all" && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Product
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filteredProducts.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map(product => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{product.brand}</p>
                      </div>
                      <Badge variant="outline">{product.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Price:</span>
                        <p className="font-semibold">₹{product.price.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">GST:</span>
                        <p className="font-semibold">{product.gstPercent}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stock:</span>
                        <p className={cn(
                          "font-semibold",
                          product.stockQuantity <= 5 ? "text-orange-600" : "text-green-600"
                        )}>
                          {product.stockQuantity} units
                        </p>
                      </div>
                      {product.warranty && (
                        <div>
                          <span className="text-muted-foreground">Warranty:</span>
                          <p className="font-semibold">{product.warranty}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="flex-1"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteProductId(product.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Products List</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {filteredProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className={cn(
                        "flex items-center justify-between p-4 hover:bg-muted/50",
                        index !== filteredProducts.length - 1 && "border-b"
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{product.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {product.brand} • {product.category}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <p className="font-semibold">₹{product.price.toLocaleString()}</p>
                          <p className="text-muted-foreground">{product.gstPercent}% GST</p>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "font-semibold",
                            product.stockQuantity <= 5 ? "text-orange-600" : "text-green-600"
                          )}>
                            {product.stockQuantity} units
                          </p>
                          <p className="text-muted-foreground">Stock</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteProductId(product.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProductId && handleDelete(deleteProductId)}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
