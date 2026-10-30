import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  // pdfkit carga sus fuentes estándar (Helvetica, Times…) de forma dinámica y el trazado
  // de archivos no las detecta; sin esto el servidor desplegado falla al cargar @react-pdf.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/pdfkit/js/**/*"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
