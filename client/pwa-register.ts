import { Workbox } from 'workbox-window';

// Check if the browser supports service workers
if ('serviceWorker' in navigator) {
  const wb = new Workbox('/sw.js');

  // Register the service worker
  wb.register().then((registration) => {
    console.log('Service Worker registered successfully:', registration);
  }).catch((error) => {
    console.log('Service Worker registration failed:', error);
  });

  // Listen for updates
  wb.addEventListener('waiting', () => {
    console.log('New service worker is waiting');
    // You can show a notification to the user here
  });

  wb.addEventListener('controlling', () => {
    console.log('Service worker is now controlling the page');
    // Reload the page to get the latest version
    window.location.reload();
  });
}

// Add to home screen functionality for iOS
export const addToHomeScreen = () => {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('App is already installed');
    return;
  }

  // For iOS devices
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    const isInStandaloneMode = (window.navigator as any).standalone === true;
    if (!isInStandaloneMode) {
      console.log('iOS device detected - show add to home screen instructions');
    }
  }
};

// Check if app is running in standalone mode
export const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

// Get device type
export const getDeviceType = () => {
  const userAgent = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'iOS';
  } else if (/Android/.test(userAgent)) {
    return 'Android';
  } else {
    return 'Desktop';
  }
};
