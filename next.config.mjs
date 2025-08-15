/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow images only from Google Drive/CDN variants
    domains: [
      'drive.google.com',
      'lh3.googleusercontent.com',
      'lh4.googleusercontent.com',
      'lh5.googleusercontent.com',
      'lh6.googleusercontent.com',
    ],
  },
};

export default nextConfig;
