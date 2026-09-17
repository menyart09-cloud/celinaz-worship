import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Celinaz Worship",
    short_name: "Worship",
    description: "Worship service planning for Celinaz",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f6",
    theme_color: "#a3402b",
    icons: [
      { src: "/logo-192.png", sizes: "192x192", type: "image/png" },
      { src: "/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
