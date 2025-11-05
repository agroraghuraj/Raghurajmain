import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import productService from "@/services/productService";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus } from "lucide-react";
import { getNumericInputValue } from "@/lib/utils";

interface AddProductModalProps {
  onClose: () => void;
}

export default function AddProductModal({ onClose }: AddProductModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    brand: "",
    sku: "",
    gstPercent: "18", // Default GST rate
    stockQuantity: "0",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price.trim() || !formData.category.trim() || !formData.brand.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(formData.price);
    const gstPercent = parseFloat(formData.gstPercent);
    const stockQuantity = parseInt(formData.stockQuantity);

    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(gstPercent) || gstPercent < 0 || gstPercent > 100) {
      toast({
        title: "Invalid GST",
        description: "Please enter a valid GST percentage (0-100)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const newProduct = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: price,
        category: formData.category.trim(),
        brand: formData.brand.trim(),
        sku: formData.sku.trim(),
        gstPercent: gstPercent,
        stockQuantity: stockQuantity,
      };

      await productService.createProduct(newProduct);
      
      toast({
        title: "Success",
        description: "Product added successfully",
        variant: "default",
      });
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        price: "",
        category: "",
        brand: "",
        sku: "",
        gstPercent: "18", // Default GST rate
        stockQuantity: "0",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Product Name *
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Enter product name"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Enter product description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price (₹) *</Label>
          <Input
            id="price"
            type="number"
            placeholder="0.00"
            value={getNumericInputValue(formData.price)}
            onChange={(e) => handleInputChange("price", e.target.value)}
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Input
            id="category"
            type="text"
            placeholder="Enter category"
            value={formData.category}
            onChange={(e) => handleInputChange("category", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Brand *</Label>
          <Input
            id="brand"
            type="text"
            placeholder="Enter brand"
            value={formData.brand}
            onChange={(e) => handleInputChange("brand", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gstPercent">GST %</Label>
          <Input
            id="gstPercent"
            type="number"
            placeholder="18"
            value={getNumericInputValue(formData.gstPercent, true)}
            onChange={(e) => handleInputChange("gstPercent", e.target.value)}
            min="0"
            max="100"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="stockQuantity">Stock Quantity</Label>
        <Input
          id="stockQuantity"
          type="number"
          placeholder="0"
          value={getNumericInputValue(formData.stockQuantity, true)}
          onChange={(e) => handleInputChange("stockQuantity", e.target.value)}
          min="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sku">SKU</Label>
        <Input
          id="sku"
          type="text"
          placeholder="Enter SKU"
          value={formData.sku}
          onChange={(e) => handleInputChange("sku", e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Adding...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </div>
          )}
        </Button>
      </div>
    </form>
  );
}
