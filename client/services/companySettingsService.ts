import apiClient, { API_BASE_URL } from "@/lib/api";

export interface CompanyInfo {
  id?: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  gstNumber: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  stateCode: string;
  invoiceTemplete: "Standard" | "Modern" | "Minimal";
  companyLogo: boolean;
  gstNumberDisplay: boolean;
  emailAddress: boolean;
  phoneNumber: boolean;
  termsConditions: boolean;
  signatureLine: boolean;
  gstBillPrefix: string;
  nonGstBillPrefix: string;
  demoBill: string;
  financialYearMonth: string;
  financialYearStart: number;
  currentFinancialYear: number;
  defaultGstRate: number;
  defaultNonGstRate: number;
  decimalPlaces: number;
  // States Management
  states?: Array<{
    _id?: string;
    name: string;
    pincode: string;
    gstRate: number;
  }>;
  // Billing Settings
  defaultPaymentMethod: "cash" | "online" | "mixed";
  paymentTerms: number;
  cgstRate: number;
  sgstRate: number;
  autoGenerateBillNumber: boolean;
  includeGstBreakdown: boolean;
  sendPaymentReminders: boolean;
  reminderDays: number;
  // Product Search Settings
  isProductSearch: boolean;
  enableProductSearch: boolean;
  // Non-GST Bill Visibility Settings
  showNonGstBills: boolean;
  searchByProductName: boolean;
  searchByCategory: boolean;
  searchByBrand: boolean;
  searchBySku: boolean;
  showProductImages: boolean;
  maxSearchResults: number;
  // Bill Number Configuration
  billNumberStartingCount: number;
  billNumberPrefix: string;
  billNumberResetOnFYEnd: boolean;
  currentBillCount: number;
  billCountLimit: number;
  enableBillCountLimit: boolean;
  // NON GST Bill Limit
  nonGstBillLimit?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateCompanyInfoData {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  gstNumber: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  stateCode: string;
  invoiceTemplete: "Standard" | "Modern" | "Minimal";
  companyLogo: boolean;
  gstNumberDisplay: boolean;
  emailAddress: boolean;
  phoneNumber: boolean;
  termsConditions: boolean;
  signatureLine: boolean;
  gstBillPrefix: string;
  nonGstBillPrefix: string;
  demoBill: string;
  financialYearMonth: string;
  financialYearStart: number;
  currentFinancialYear: number;
  defaultGstRate: number;
  defaultNonGstRate: number;
  decimalPlaces: number;
  // States Management
  states?: Array<{
    _id?: string;
    name: string;
    pincode: string;
    gstRate: number;
  }>;
  // Billing Settings
  defaultPaymentMethod: "cash" | "online" | "mixed";
  paymentTerms: number;
  cgstRate: number;
  sgstRate: number;
  autoGenerateBillNumber: boolean;
  includeGstBreakdown: boolean;
  sendPaymentReminders: boolean;
  reminderDays: number;
  // Product Search Settings
  isProductSearch: boolean;
  enableProductSearch: boolean;
  // Non-GST Bill Visibility Settings
  showNonGstBills: boolean;
  searchByProductName: boolean;
  searchByCategory: boolean;
  searchByBrand: boolean;
  searchBySku: boolean;
  showProductImages: boolean;
  maxSearchResults: number;
  // Bill Number Configuration
  billNumberStartingCount: number;
  billNumberPrefix: string;
  billNumberResetOnFYEnd: boolean;
  currentBillCount: number;
  billCountLimit: number;
  enableBillCountLimit: boolean;
}

export interface UpdateCompanyInfoData extends Partial<CreateCompanyInfoData> {}

class CompanySettingsService {
  async uploadLogo(formData: FormData): Promise<{ url: string }> {
    const res = await apiClient.post('/api/companyInfo/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    let url =
      res.data?.result?.logoUrl ||
      res.data?.result?.company?.logo ||
      res.data?.data?.logoUrl ||
      res.data?.data?.logo ||
      res.data?.logo ||
      res.data?.url ||
      '';
    if (!url) throw new Error('No logo URL returned');
    // Normalize to absolute URL if backend returned a relative path
    if (url.startsWith('/')) {
      url = `${API_BASE_URL}${url}`;
    }
    return { url };
  }
  async getCompanyInfo(): Promise<CompanyInfo | null> {
    try {
      const response = await apiClient.get('/api/companyInfo/getCompany');
      if (response.data && response.data.success) {
        const data = response.data.data;
        // Map _id to id for frontend compatibility
        if (data && data._id) {
          data.id = data._id;
          delete data._id;
        }
        // Normalize logo to absolute URL if it's a relative path
        if (data && typeof data.logo === 'string' && data.logo.startsWith('/')) {
          data.logo = `${API_BASE_URL}${data.logo}`;
        }
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching company info:', error);
      return null;
    }
  }

  async createCompanyInfo(data: CreateCompanyInfoData): Promise<CompanyInfo> {
    try {
      // Clean phone number to only digits
      const cleanedData = {
        ...data,
        phone: data.phone.replace(/\D/g, '') // Remove all non-digit characters
      };
      
      const response = await apiClient.post('/api/companyInfo/createCompany', cleanedData);
      if (response.data && response.data.success) {
        const result = response.data.data;
        // Map _id to id for frontend compatibility
        if (result && result._id) {
          result.id = result._id;
          delete result._id;
        }
        return result;
      }
      throw new Error('Failed to create company info');
    } catch (error) {
      console.error('Error creating company info:', error);
      throw error;
    }
  }

  async updateCompanyInfo(id: string, data: UpdateCompanyInfoData): Promise<CompanyInfo> {
    try {
      // Clean phone number to only digits if phone is being updated
      const cleanedData = {
        ...data,
        ...(data.phone && { phone: data.phone.replace(/\D/g, '') }) // Remove all non-digit characters
      };
      
      const response = await apiClient.put(`/api/companyInfo/${id}`, cleanedData);
      console.log('🔍 updateCompanyInfo - API response:', response.data);
      
      if (response.data && response.data.success) {
        // Backend returns data in 'result' field, not 'data' field
        const result = response.data.result || response.data.data;
        console.log('🔍 updateCompanyInfo - extracted result:', result);
        
        // Map _id to id for frontend compatibility
        if (result && result._id) {
          result.id = result._id;
          delete result._id;
        }
        console.log('🔍 updateCompanyInfo - final result:', result);
        return result;
      }
      throw new Error('Failed to update company info');
    } catch (error) {
      console.error('Error updating company info:', error);
      throw error;
    }
  }

  async deleteCompanyInfo(id: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/api/companyInfo/${id}`);
      if (!response.data || !response.data.success) {
        throw new Error('Failed to delete company info');
      }
    } catch (error) {
      console.error('Error deleting company info:', error);
      throw error;
    }
  }

  // Update product search settings specifically
  async updateProductSearchSettings(settings: {
    isProductSearch?: boolean;
    enableProductSearch?: boolean;
    searchByProductName?: boolean;
    searchByCategory?: boolean;
    searchByBrand?: boolean;
    searchBySku?: boolean;
    showProductImages?: boolean;
    maxSearchResults?: number;
  }): Promise<any> {
    try {
      // Get the current company info to get the ID
      const currentCompany = await this.getCompanyInfo();
      if (!currentCompany || !currentCompany.id) {
        throw new Error('No company info found');
      }
      
      const response = await apiClient.put(`/api/companyInfo/${currentCompany.id}`, settings);
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to update product search settings');
    } catch (error) {
      console.error('Error updating product search settings:', error);
      throw error;
    }
  }

  // Get company settings (including product search settings)
  async getCompanySettings(): Promise<CompanyInfo | null> {
    try {
      // Use the existing getCompanyInfo method instead of a non-existent endpoint
      return await this.getCompanyInfo();
    } catch (error) {
      console.error('Error fetching company settings:', error);
      return null;
    }
  }

  // Helper method to get default company info
  getDefaultCompanyInfo(): CompanyInfo {
    return {
      name: "Savera Electronics",
      address: {
        street: "123 Business Street",
        city: "Burhanpur",
        state: "Madhya Pradesh",
        pincode: "450331"
      },
      gstNumber: "23ABCDE1234F1Z5",
      phone: "9876543210",
      email: "info@saveraelectronic.com",
      website: "www.saveraelectronic.com",
      logo: "",
      stateCode: "23",
      invoiceTemplete: "Standard",
      companyLogo: true,
      gstNumberDisplay: true,
      emailAddress: true,
      phoneNumber: true,
      termsConditions: true,
      signatureLine: false,
      gstBillPrefix: "GST",
      nonGstBillPrefix: "NGST",
      demoBill: "DEMO",
      financialYearMonth: "April",
      financialYearStart: 2024,
      currentFinancialYear: 2025,
      defaultGstRate: 18, // Default rate, can be overridden per product
      defaultNonGstRate: 0,
      decimalPlaces: 2,
      // Billing Settings defaults
      defaultPaymentMethod: "cash",
      paymentTerms: 30,
      cgstRate: 9,
      sgstRate: 9,
      autoGenerateBillNumber: true,
      includeGstBreakdown: true,
      sendPaymentReminders: false,
      reminderDays: 7,
      // Product Search Settings defaults
      isProductSearch: false,
      enableProductSearch: true,
      // Non-GST Bill Visibility Settings defaults
      showNonGstBills: true,
      searchByProductName: true,
      searchByCategory: true,
      searchByBrand: true,
      searchBySku: false,
      showProductImages: true,
      maxSearchResults: 10,
      // Bill Number Configuration defaults
      billNumberStartingCount: 1,
      billNumberPrefix: "BILL",
      billNumberResetOnFYEnd: true,
      currentBillCount: 1,
      billCountLimit: 5000,
      enableBillCountLimit: false,
      // States Management defaults
      states: []
    };
  }
}

const companySettingsService = new CompanySettingsService();
export default companySettingsService;
