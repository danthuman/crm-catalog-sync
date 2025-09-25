import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const BRAZE_API_KEY = process.env.BRAZE_API_KEY;
const BRAZE_REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT; // ej. https://rest.iad-01.braze.com/catalog/items
const SHARED_SECRET = process.env.SHARED_SECRET; // el mismo que usas en Google Apps Script

app.post("/sync-catalog", async (req, res) => {
  try {
    // Validar shared secret
    const secret = req.headers["x-shared-secret"];
    if (secret !== SHARED_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const items = req.body.items;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const results = [];

    // Procesar fila por fila
    for (const item of items) {
      const { external_id, attributes } = item;

      if (!external_id || !attributes) {
        results.push({ external_id: external_id || null, status: "error", error: "Missing external_id or attributes" });
        continue;
      }

      // Convertir todos los campos a string (incluyendo vacíos)
      const attributesAsString = {};
      Object.keys(attributes).forEach(key => {
        attributesAsString[key] = attributes[key] != null ? String(attributes[key]) : "";
      });

      try {
        // Upsert en Braze
        const response = await axios.post(
          BRAZE_REST_ENDPOINT,
          [
            {
              external_id: external_id,
              attributes: attributesAsString
            }
          ],
          {
            headers: {
              "Authorization": `Bearer ${BRAZE_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );

        results.push({ external_id, status: "success", data: response.data });
      } catch (err) {
        results.push({ external_id, status: "error", error: err.response?.data || err.message });
      }
    }

    res.json({ message: "Sync completed", results });
  } catch (err) {
    res.status(500).json({ error: "Error en la sincronización con Braze", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

