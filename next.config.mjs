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
    // The list previously ended with `hostname: "**"` as a catch-all. `**` is
    // only valid at the START of a hostname, and more to the point a catch-all
    // makes this an open image proxy: anyone could push arbitrary images from
    // anywhere through our optimiser, on our bandwidth. Named hosts only.
    //
    // Note: `next start` on 16.3.0 rejects every remote image locally with
    // `"url" parameter is not allowed` — it re-globs the already-compiled
    // patterns out of images-manifest.json, so nothing can match. Vercel's
    // optimiser does not do this and production serves these fine (verified
    // against the live site). Do not "fix" it here with unoptimized: true;
    // that would degrade production to work around a local-only quirk.
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
};

export default nextConfig;
