import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import companySettingsService, { CompanyInfo } from '@/services/companySettingsService';
import { toast } from 'sonner';

interface CompanyContextType {
  companyInfo: CompanyInfo | null;
  isLoading: boolean;
  updateCompanyInfo: (newInfo: CompanyInfo) => void;
  refreshCompanyInfo: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

interface CompanyProviderProps {
  children: ReactNode;
}

export function CompanyProvider({ children }: CompanyProviderProps) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCompanyInfo = async () => {
    try {
      setIsLoading(true);
      // Try to get company settings first (includes product search settings)
      let data = await companySettingsService.getCompanySettings();
      
      // If no settings found, try to get basic company info
      if (!data) {
        data = await companySettingsService.getCompanyInfo();
      }
      
      if (data) {
        // Ensure all required fields exist, merge with defaults if missing
        const defaultInfo = companySettingsService.getDefaultCompanyInfo();
        const mergedData = { ...defaultInfo, ...data };
        console.log('🏢 Loaded company data:', mergedData);
        console.log('🔍 isProductSearch value:', mergedData.isProductSearch);
        setCompanyInfo(mergedData);
      } else {
        // Use default company info if none exists
        const defaultInfo = companySettingsService.getDefaultCompanyInfo();
        console.log('🏢 Using default company data:', defaultInfo);
        console.log('🔍 Default isProductSearch value:', defaultInfo.isProductSearch);
        setCompanyInfo(defaultInfo);
      }
    } catch (error) {
      console.error('Error loading company info:', error);
      // Use default company info on error
      try {
        const defaultInfo = companySettingsService.getDefaultCompanyInfo();
        setCompanyInfo(defaultInfo);
      } catch (defaultError) {
        console.error('Error setting default company info:', defaultError);
        // Set minimal fallback
        setCompanyInfo({
          name: "Company",
          states: []
        } as CompanyInfo);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateCompanyInfo = useCallback((newInfo: CompanyInfo) => {
    if (!newInfo) {
      console.warn('⚠️ updateCompanyInfo called with undefined newInfo');
      return;
    }

    try {
      setCompanyInfo(prevInfo => {
        // Ensure newInfo has all required fields by merging with defaults
        const defaultInfo = companySettingsService.getDefaultCompanyInfo();
        const mergedNewInfo = { ...defaultInfo, ...newInfo };
        
        // Only update if the values actually changed
        if (prevInfo && 
            prevInfo.isProductSearch === mergedNewInfo.isProductSearch &&
            prevInfo.name === mergedNewInfo.name &&
            prevInfo.id === mergedNewInfo.id &&
            JSON.stringify(prevInfo.states) === JSON.stringify(mergedNewInfo.states)) {
          console.log('🔄 Company info unchanged, skipping update');
          return prevInfo;
        }
        
        console.log('🏢 Company info updated globally:', mergedNewInfo?.name || 'Unknown');
        console.log('🔍 Context - States in updated info:', mergedNewInfo?.states);
        console.log('🔍 Context - Number of states:', mergedNewInfo?.states?.length || 0);
        return mergedNewInfo;
      });
    } catch (error) {
      console.error('Error updating company info in context:', error);
    }
  }, []);

  const refreshCompanyInfo = useCallback(async () => {
    await loadCompanyInfo();
  }, []);

  useEffect(() => {
    loadCompanyInfo();
  }, []); // Empty dependency array to run only once on mount

  const value: CompanyContextType = useMemo(() => ({
    companyInfo,
    isLoading,
    updateCompanyInfo,
    refreshCompanyInfo,
  }), [companyInfo, isLoading, updateCompanyInfo, refreshCompanyInfo]);

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
