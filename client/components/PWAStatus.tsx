import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Download, CheckCircle } from 'lucide-react';

export default function PWAStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if app is installed
    const checkInstallation = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
      setIsInstalled(standalone);
    };

    checkInstallation();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isInstalled) {
    return null; // Don't show status if not installed
  }

  // return (
  //   <div className="hidden lg:flex fixed top-4 right-4 z-50 flex-col gap-2">
  //     {/* Online/Offline Status */}
  //     <Badge 
  //       variant={isOnline ? "default" : "destructive"}
  //       className="flex items-center gap-1 px-2 py-1"
  //     >
  //       {isOnline ? (
  //         <>
  //           <Wifi className="h-3 w-3" />
  //           <span className="text-xs">Online</span>
  //         </>
  //       ) : (
  //         <>
  //           <WifiOff className="h-3 w-3" />
  //           <span className="text-xs">Offline</span>
  //         </>
  //       )}
  //     </Badge>

  //     {/* PWA Status */}
  //     <Badge 
  //       variant="secondary"
  //       className="flex items-center gap-1 px-2 py-1"
  //     >
  //       <CheckCircle className="h-3 w-3" />
  //       <span className="text-xs">App Mode</span>
  //     </Badge>
  //   </div>
  // );
}
