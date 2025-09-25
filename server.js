import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BRAZE_API_KEY = process.env.BRAZE_API_KEY; // tu API key de Braze
const BRAZE_CATALOG_ID = process.env.BRAZE_CATALOG_ID; // tu catalog ID

app.post("/sync-catalog", async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "items inválidos" });
  }

  const results = [];

  for (const item of items) {
    try {
      const payload = {
        external_id: item.external_id,
        attributes: {
          "content-name": item.attributes["content-name"] || ""
        }
      };

      // Llamada a Braze para upsert en el catálogo
      const response = await axios.post(
        `https://rest.iad-01.braze.com/catalogs/${BRAZE_CATALOG_ID}/upsert_items`,
        { items: [payload] },
        {
          headers: {
            "Authorization": `Bearer ${BRAZE_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      results.push({ external_id: item.external_id, status: "ok", response: response.data });
    } catch (err) {
      results.push({ external_id: item.external_id, status: "error", error: err.response?.data || err.message });
    }
  }

  res.json({ message: "Sync completed", results });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
