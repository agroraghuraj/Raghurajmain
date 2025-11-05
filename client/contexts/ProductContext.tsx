import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  gstPercent: number;
  stockQuantity: number;
  warranty?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductContextType {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  getProductById: (productId: string) => Product | undefined;
  updateStock: (productId: string, newQuantity: number) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Mock initial data
const initialProducts: Product[] = [
  {
    id: "1",
    name: "iPhone 15 Pro",
    category: "Mobile",
    brand: "Apple",
    price: 129999,
    gstPercent: 18, // Default GST rate
    stockQuantity: 12,
    warranty: "1 Year",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "Samsung Galaxy S24",
    category: "Mobile",
    brand: "Samsung",
    price: 99999,
    gstPercent: 18, // Default GST rate
    stockQuantity: 8,
    warranty: "1 Year",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    name: "LG 1.5 Ton Split AC",
    category: "AC",
    brand: "LG",
    price: 45999,
    gstPercent: 28,
    stockQuantity: 3,
    warranty: "5 Years Compressor",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "4",
    name: "Sony 55\" 4K Smart TV",
    category: "TV",
    brand: "Sony",
    price: 89999,
    gstPercent: 18, // Default GST rate
    stockQuantity: 5,
    warranty: "2 Years",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "5",
    name: "MacBook Air M2",
    category: "Laptop",
    brand: "Apple",
    price: 114900,
    gstPercent: 18, // Default GST rate
    stockQuantity: 6,
    warranty: "1 Year",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "6",
    name: "Dell XPS 13",
    category: "Laptop",
    brand: "Dell",
    price: 89999,
    gstPercent: 18, // Default GST rate
    stockQuantity: 4,
    warranty: "1 Year",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "7",
    name: "Samsung 265L Refrigerator",
    category: "Refrigerator",
    brand: "Samsung",
    price: 32999,
    gstPercent: 18, // Default GST rate
    stockQuantity: 7,
    warranty: "10 Years Compressor",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "8",
    name: "LG 7Kg Washing Machine",
    category: "Washing Machine",
    brand: "LG",
    price: 28999,
    gstPercent: 28,
    stockQuantity: 3,
    warranty: "2 Years",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(product => 
      product.id === productId ? { ...product, ...updates, updatedAt: new Date() } : product
    ));
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(product => product.id !== productId));
  };

  const getProductById = (productId: string) => {
    return products.find(product => product.id === productId);
  };

  const updateStock = (productId: string, newQuantity: number) => {
    updateProduct(productId, { stockQuantity: newQuantity });
  };

  const value = {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    updateStock,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
