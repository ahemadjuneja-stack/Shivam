import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initGeminiAutoResponder } from "./server/autoResponder";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Reverse Geocoding proxy endpoint (prevents browser CORS & header issues)
  app.get("/api/reverse-geocode", async (req, res) => {
    try {
      const lat = req.query.lat as string;
      const lon = req.query.lon as string;
      if (!lat || !lon) {
        return res.status(400).json({ error: "Missing lat/lon parameters", city: "", taluka: "" });
      }

      // 1. Try Nominatim OSM with valid Node user-agent
      try {
        const osmRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'ShivamApp/1.0 (contact: ahemadjuneja@gmail.com)'
            },
            signal: AbortSignal.timeout(5000)
          }
        );
        if (osmRes.ok) {
          const data = (await osmRes.json()) as any;
          const address = data?.address || {};
          const city = address.city || address.town || address.village || address.suburb || '';
          const taluka = address.county || address.state_district || address.city_district || '';
          if (city || taluka) {
            return res.json({ city, taluka });
          }
        }
      } catch {
        // Fallback to secondary provider
      }

      // 2. Fallback: BigDataCloud free client reverse geocode API
      try {
        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (bdcRes.ok) {
          const bdcData = (await bdcRes.json()) as any;
          const city = bdcData?.city || bdcData?.locality || bdcData?.principalSubdivision || '';
          const taluka = bdcData?.locality || bdcData?.principalSubdivision || '';
          return res.json({ city, taluka });
        }
      } catch {
        // Ignore fallback error
      }

      return res.json({ city: '', taluka: '' });
    } catch {
      return res.json({ city: '', taluka: '' });
    }
  });

  // Initialize Gemini Auto-Responder backend service
  try {
    initGeminiAutoResponder();
  } catch (err) {
    console.error('Failed to initialize Gemini Auto-Responder:', err);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

