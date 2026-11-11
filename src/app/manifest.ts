import { type MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OgaSabi: artisans you can trust",
    short_name: "OgaSabi",
    description: "Find verified, trust-scored artisans near you.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4fbf6",
    theme_color: "#032515",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
