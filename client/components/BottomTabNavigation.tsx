import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/contexts/CompanyContext';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Receipt, 
  Users, 
  History, 
  MoreHorizontal,
  Package,
  Settings,
  User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BottomTabNavigationProps {
  className?: string;
}

export default function BottomTabNavigation({ className }: BottomTabNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyInfo } = useCompany();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/',
      active: location.pathname === '/'
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: Receipt,
      path: '/billing',
      active: location.pathname === '/billing'
    },
    {
      id: 'customers',
      label: 'Customer',
      icon: Users,
      path: '/customers',
      active: location.pathname === '/customers'
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      path: '/billing-history',
      active: location.pathname === '/billing-history'
    },
    {
      id: 'more',
      label: 'More',
      icon: MoreHorizontal,
      path: null, // No direct path, shows dropdown
      active: ['/products', '/settings', '/profile'].includes(location.pathname)
    }
  ];

  // Base more options
  const baseMoreOptions = [
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/settings'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile'
    }
  ];

  // Product option (conditional)
  const productOption = {
    id: 'products',
    label: 'Products',
    icon: Package,
    path: '/products'
  };

  // Conditionally include Products based on product search setting
  const moreOptions = useMemo(() => [
    ...(companyInfo?.isProductSearch ? [productOption] : []),
    ...baseMoreOptions
  ], [companyInfo?.isProductSearch]);

  const handleTabClick = (path: string | null) => {
    if (path) {
      navigate(path);
    }
  };

  const handleMoreOptionClick = (path: string) => {
    navigate(path);
    setIsMoreOpen(false);
  };

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50",
      "lg:hidden", // Only show on mobile and tablet, hide on desktop
      className
    )}>
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          
          if (tab.id === 'more') {
            return (
              <DropdownMenu key={tab.id} open={isMoreOpen} onOpenChange={setIsMoreOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex flex-col items-center justify-center min-w-0 flex-1 h-full px-1 py-2 transition-colors",
                      "hover:bg-gray-50 active:bg-gray-100",
                      tab.active 
                        ? "text-green-600" 
                        : "text-gray-500"
                    )}
                  >
                    <Icon 
                      className={cn(
                        "h-5 w-5 mb-1",
                        tab.active ? "text-green-600" : "text-gray-500"
                      )} 
                    />
                    <span className={cn(
                      "text-xs font-medium truncate",
                      tab.active ? "text-green-600" : "text-gray-500"
                    )}>
                      {tab.label}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  side="top" 
                  align="center"
                  className="w-48 mb-2"
                >
                  {moreOptions.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <DropdownMenuItem
                        key={option.id}
                        onClick={() => handleMoreOptionClick(option.path)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <OptionIcon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center min-w-0 flex-1 h-full px-1 py-2 transition-colors",
                "hover:bg-gray-50 active:bg-gray-100",
                tab.active 
                  ? "text-green-600" 
                  : "text-gray-500"
              )}
            >
              <Icon 
                className={cn(
                  "h-5 w-5 mb-1",
                  tab.active ? "text-green-600" : "text-gray-500"
                )} 
              />
              <span className={cn(
                "text-xs font-medium truncate",
                tab.active ? "text-green-600" : "text-gray-500"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
