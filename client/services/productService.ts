import apiClient from "@/lib/api";

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  gstPercent: number;
  stockQuantity: number;
  warranty?: string;
  sku?: string;
  description?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductData {
  name: string;
  category: string;
  brand: string;
  price: number;
  gstPercent: number;
  stockQuantity: number;
  warranty?: string;
  sku?: string;
  description?: string;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  isActive?: boolean;
}

export interface ProductSearchParams {
  search?: string;
  category?: string;
  brand?: string;
  isActive?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

class ProductService {
  // Get all products with optional search and filters
  async getAllProducts(params?: ProductSearchParams): Promise<{ products: Product[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.search) queryParams.append('search', params.search);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.brand) queryParams.append('brand', params.brand);
      if (params?.isActive) queryParams.append('isActive', params.isActive);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `/api/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(url);

      let result;
      if (response.data && response.data.success) {
        result = response.data.data;
      } else if (response.data && response.data.data) {
        result = response.data.data;
      } else {
        result = response.data;
      }

      const products = (result.products || result.data || []).map((product: any) => ({
        ...product,
        id: product.id || product._id,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
      }));

      return { 
        products, 
        pagination: result.pagination || {} 
      };
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  }

  // Get product by ID
  async getProductById(id: string): Promise<Product> {
    try {
      const response = await apiClient.get(`/api/products/${id}`);
      
      let product;
      if (response.data && response.data.success) {
        product = response.data.data;
      } else if (response.data && response.data.data) {
        product = response.data.data;
      } else {
        product = response.data;
      }

      return {
        ...product,
        id: product.id || product._id,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
      };
    } catch (error) {
      console.error("Error fetching product:", error);
      throw error;
    }
  }

  // Create new product
  async createProduct(productData: CreateProductData): Promise<Product> {
    try {
      const response = await apiClient.post('/api/products', productData);
      
      let product;
      if (response.data && response.data.success) {
        product = response.data.data;
      } else if (response.data && response.data.data) {
        product = response.data.data;
      } else {
        product = response.data;
      }

      return {
        ...product,
        id: product.id || product._id,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
      };
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  // Update product
  async updateProduct(id: string, productData: UpdateProductData): Promise<Product> {
    try {
      const response = await apiClient.put(`/api/products/${id}`, productData);
      
      let product;
      if (response.data && response.data.success) {
        product = response.data.data;
      } else if (response.data && response.data.data) {
        product = response.data.data;
      } else {
        product = response.data;
      }

      return {
        ...product,
        id: product.id || product._id,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
      };
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }

  // Delete product
  async deleteProduct(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/products/${id}`);
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }

  // Search products
  async searchProducts(query: string): Promise<Product[]> {
    try {
      const response = await apiClient.get(`/api/products?search=${encodeURIComponent(query)}`);
      
      let products = [];
      if (response.data && response.data.data && response.data.data.products) {
        products = response.data.data.products;
      } else if (response.data && response.data.products) {
        products = response.data.products;
      } else if (response.data && Array.isArray(response.data)) {
        products = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        products = response.data.data;
      }

      return products.map((product: any) => ({
        ...product,
        id: product.id || product._id,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
      }));
    } catch (error) {
      console.error("Error searching products:", error);
      return [];
    }
  }

  // Get product categories
  async getCategories(): Promise<string[]> {
    try {
      const response = await apiClient.get('/api/products/categories');
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      } else if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }

  // Get product brands
  async getBrands(): Promise<string[]> {
    try {
      const response = await apiClient.get('/api/products/brands');
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      } else if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error("Error fetching brands:", error);
      return [];
    }
  }
}

export default new ProductService();
