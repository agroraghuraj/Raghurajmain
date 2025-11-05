import apiClient from "@/lib/api";

// Customer Service Interface
export interface CustomerData {
  name: string;
  phone: string;
  address: string;
  email?: string;
  customerType?: "individual" | "business";
  gstNumber?: string;
  pincode?: string;
  city?: string;
  state: string;
  country?: string;
  notes?: string;
}

export interface Customer extends CustomerData {
  id: string;
  _id?: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  customerType: "individual" | "business";
  gstNumber?: string;
  pincode?: string;
  city?: string;
  state: string;
  country?: string;
  notes?: string;
  totalPurchases: number;
  totalAmount: number;
  lastPurchaseDate?: string;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// Customer Service using axios
export const customerService = {
  // Create new customer
  async createCustomer(customerData: CustomerData): Promise<Customer> {
    console.log("🆕 Creating customer with data:", customerData);

    const customerPayload = {
      ...customerData,
      createdAt: new Date().toISOString(),
      isActive: true,
      totalPurchases: 0,
      totalAmount: 0
    };

    const response = await apiClient.post("/api/customers", customerPayload);

    let customer;
    // Handle different response formats
    if (response.data && response.data.data && response.data.data.customer) {
      customer = response.data.data.customer;
    } else if (response.data && response.data.data) {
      customer = response.data.data;
    } else if (response.data && response.data.customer) {
      customer = response.data.customer;
    } else {
      customer = response.data;
    }

    // Normalize the _id field to id
    return {
      ...customer,
      id: customer.id || customer._id,
    };
  },

  // Get all customers
  async getAllCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    customerType?: string;
    isActive?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ customers: Customer[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.customerType) queryParams.append('customerType', params.customerType);
    if (params?.isActive) queryParams.append('isActive', params.isActive);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/api/customers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get(url);

    let result;
    // Handle different response formats
    if (response.data && response.data.data) {
      result = response.data.data;
    } else if (response.data && response.data.success) {
      result = response.data;
    } else {
      result = response.data;
    }

    // Normalize all customers to have 'id' field for consistent client usage
    let customers = (result.customers || result.data || []).map((customer: any) => ({
      ...customer,
      id: customer.id || customer._id,
    }));

    // Apply local search if search parameter is provided and API doesn't support it
    if (params?.search && customers.length > 0) {
      const searchTerm = params.search.toLowerCase();
      customers = customers.filter(customer => 
        customer.name?.toLowerCase().includes(searchTerm) ||
        customer.phone?.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm) ||
        customer.address?.toLowerCase().includes(searchTerm)
      );
    }

    return {
      customers,
      pagination: result.pagination || {}
    };
  },

  // Get customer by ID
  async getCustomerById(id: string): Promise<Customer> {
    const response = await apiClient.get(`/api/customers/${id}`);

    let customer;
    // Handle different response formats
    if (response.data && response.data.data && response.data.data.customer) {
      customer = response.data.data.customer;
    } else if (response.data && response.data.data) {
      customer = response.data.data;
    } else {
      customer = response.data;
    }

    // Normalize the _id field to id
    return {
      ...customer,
      id: customer.id || customer._id || id,
    };
  },

  // Get customer by phone number
  async getCustomerByPhone(phone: string): Promise<Customer> {
    const response = await apiClient.get(`/api/customers/phone/${phone}`);

    let customer;
    // Handle different response formats
    if (response.data && response.data.data && response.data.data.customer) {
      customer = response.data.data.customer;
    } else if (response.data && response.data.data) {
      customer = response.data.data;
    } else {
      customer = response.data;
    }

    // Normalize the _id field to id
    return {
      ...customer,
      id: customer.id || customer._id || phone,
    };
  },

  // Update customer
  async updateCustomer(id: string, customerData: Partial<CustomerData>): Promise<Customer> {
    console.log("🔄 Updating customer with ID:", id);
    console.log("📝 Update data:", customerData);

    const customerPayload = {
      ...customerData,
      updatedAt: new Date().toISOString(),
    };

    console.log("📤 Sending update payload:", customerPayload);

    const response = await apiClient.put(
      `/api/customers/${id}`,
      customerPayload,
    );

    console.log("📥 Update response:", response.data);

    // Handle server response
    let updatedCustomer;
    if (response.data && response.data.data && response.data.data.customer) {
      updatedCustomer = response.data.data.customer;
    } else if (response.data && response.data.data) {
      updatedCustomer = response.data.data;
    } else {
      updatedCustomer = response.data;
    }

    // Normalize the _id field to id for consistent client-side usage
    const normalizedCustomer = {
      ...updatedCustomer,
      id: updatedCustomer.id || updatedCustomer._id || id,
    };

    console.log("✅ Normalized customer:", normalizedCustomer);

    return normalizedCustomer;
  },

  // Delete customer (soft delete)
  async deleteCustomer(id: string): Promise<void> {
    console.log("🗑️ Deleting customer with ID:", id);

    try {
      await apiClient.delete(`/api/customers/${id}`);
      console.log("✅ Customer deleted successfully");
    } catch (error: any) {
      console.error("❌ Error deleting customer:", error);
      throw error;
    }
  },

  // Search customers
  async searchCustomers(query: string): Promise<Customer[]> {
    try {
      console.log("🔍 CustomerService: Searching for customers with query:", query);
      
      // First try the search endpoint
      const response = await apiClient.get(`/api/customers/search?q=${encodeURIComponent(query)}`);
      
      let customers = [];
      // Handle different response formats
      if (response.data && response.data.data && response.data.data.customers) {
        customers = response.data.data.customers;
      } else if (response.data && response.data.data) {
        customers = response.data.data;
      } else if (response.data && response.data.success) {
        customers = response.data.customers || [];
      } else if (response.data && Array.isArray(response.data)) {
        customers = response.data;
      }

      console.log("✅ CustomerService: Found customers:", customers.length);

      // Normalize all customers to have 'id' field
      return customers.map((customer: any) => ({
        ...customer,
        id: customer.id || customer._id,
      }));
    } catch (error) {
      console.warn("⚠️ CustomerService: Search endpoint not available, falling back to getAllCustomers with search param");
      console.warn("⚠️ CustomerService: Search error:", error);
      
      // Fallback: use getAllCustomers with search parameter
      try {
        const result = await this.getAllCustomers({ search: query });
        console.log("✅ CustomerService: Fallback search found customers:", result.customers.length);
        return result.customers;
      } catch (fallbackError) {
        console.error("❌ CustomerService: Fallback search also failed:", fallbackError);
        
        // If both fail, return empty array but don't throw error
        return [];
      }
    }
  },

  // Get top customers
  async getTopCustomers(limit: number = 10): Promise<Customer[]> {
    const response = await apiClient.get(`/api/customers/top?limit=${limit}`);

    let customers = [];
    // Handle different response formats
    if (response.data && response.data.data && response.data.data.customers) {
      customers = response.data.data.customers;
    } else if (response.data && response.data.data) {
      customers = response.data.data;
    } else if (response.data && response.data.success) {
      customers = response.data.customers || [];
    }

    // Normalize all customers to have 'id' field
    return customers.map((customer: any) => ({
      ...customer,
      id: customer.id || customer._id,
    }));
  },

  // Get customer statistics
  async getCustomerStats(): Promise<any> {
    const response = await apiClient.get("/api/customers/stats");

    let stats;
    // Handle different response formats
    if (response.data && response.data.data) {
      stats = response.data.data;
    } else {
      stats = response.data;
    }

    return stats;
  },

  // Update customer purchase statistics
  async updatePurchaseStats(customerId: string, amount: number): Promise<Customer> {
    console.log("💰 Updating purchase stats for customer:", customerId, "Amount:", amount);

    const response = await apiClient.put(`/api/customers/${customerId}/purchase-stats`, {
      amount
    });

    let customer;
    // Handle different response formats
    if (response.data && response.data.data && response.data.data.customer) {
      customer = response.data.data.customer;
    } else if (response.data && response.data.data) {
      customer = response.data.data;
    } else {
      customer = response.data;
    }

    // Normalize the _id field to id
    return {
      ...customer,
      id: customer.id || customer._id || customerId,
    };
  }
};

export default customerService;
