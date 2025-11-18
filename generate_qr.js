const QRCode = require('qrcode');

// Function to generate QR code for photo download
async function generateQRCode(photoId, networkIP) {
  try {
    const url = `http://${networkIP}:3000/api/photos/${photoId}/download`;
    const filePath = `photo-${photoId}-qr.png`;

    await QRCode.toFile(filePath, url);
    console.log(`QR code generated successfully: ${filePath}`);
  } catch (err) {
    console.error('Failed to generate QR code:', err);
  }
}

// Example usage
const photoId = 1; // Replace with actual photo ID
const networkIP = '10.181.50.155'; // Replace with your current network IP
generateQRCode(photoId, networkIP);