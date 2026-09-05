import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Photography for the landing page. Referenced from Unsplash's CDN rather
    // than committed to the repo, so the images stay out of git history.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Photographs of itinerary places, referenced from the Wikipedia article
      // that describes the place. Referenced, never copied into the project:
      // the URL is resolved at view time and nothing is stored.
      //
      // Three hosts, all Wikimedia, because the photo lookup can return any of
      // them: `upload` serves article lead images, `thumb` serves some resized
      // ones, and a Commons `Special:FilePath` link lives on `commons` and
      // redirects to `thumb`. Allowing only the first left the others broken.
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "thumb.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
      },
    ],
  },
};

export default nextConfig;
