/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        // The catalogue moved to the root — the site is already at store.
        // elffie.com, so /store said it twice. Permanent (308) because these
        // URLs are indexed and have been shared: Google transfers the ranking
        // rather than treating the root as a new page, and old links keep
        // working. Next carries the query string through, so the footer's
        // /store?category=… links still land on the right filter.
        source: "/store",
        destination: "/",
        permanent: true,
      },
      {
        source: "/store/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      // Google Drive / user content
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      // Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      // Common image CDNs
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Catch-all for any HTTPS image source used in products
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
