// Simple icon generation script
// This creates basic colored icons for PWA

const fs = require('fs');
const { createCanvas } = require('canvas');

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background with green gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#16a34a');
  gradient.addColorStop(1, '#15803d');
  
  // Draw rounded rectangle background
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();
  
  // Draw store icon
  ctx.fillStyle = '#ffffff';
  const iconSize = size * 0.6;
  const iconX = (size - iconSize) / 2;
  const iconY = (size - iconSize) / 2;
  
  // Store building
  ctx.fillRect(iconX + iconSize * 0.1, iconY + iconSize * 0.3, iconSize * 0.8, iconSize * 0.6);
  
  // Store sign
  ctx.fillRect(iconX + iconSize * 0.2, iconY + iconSize * 0.1, iconSize * 0.6, iconSize * 0.2);
  
  // Door
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(iconX + iconSize * 0.4, iconY + iconSize * 0.5, iconSize * 0.2, iconSize * 0.4);
  
  // Windows
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(iconX + iconSize * 0.15, iconY + iconSize * 0.4, iconSize * 0.15, iconSize * 0.15);
  ctx.fillRect(iconX + iconSize * 0.7, iconY + iconSize * 0.4, iconSize * 0.15, iconSize * 0.15);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`Generated ${filename}`);
}

// Generate all required icons
generateIcon(192, 'pwa-192x192.png');
generateIcon(512, 'pwa-512x512.png');
generateIcon(180, 'apple-touch-icon.png');
generateIcon(144, 'pwa-144x144.png');
generateIcon(96, 'pwa-96x96.png');
generateIcon(72, 'pwa-72x72.png');
generateIcon(48, 'pwa-48x48.png');

console.log('All PWA icons generated successfully!');
