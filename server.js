import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// 🔑 Variables de configuración (usa .env en local y "Environment > Secrets" en Render)
const BRAZE_REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT; // ej: https://rest.iad-01.braze.com
const BRAZE_API_KEY = process.env.BRAZE_API_KEY;
const CATALOG_NAME = process.env.CATALOG_NAME; // nombre del catálogo en Braze

// 🔄 Endpoint que recibe datos (ej. desde Google Sheets o Postman)
app.post("/sync-catalog", async (req, res) => {
  try {
    const items = req.body.items;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Formato inválido. Debes enviar { items: [ ... ] }" });
    }

    // Llamada a Braze: /catalogs/{catalog_name}/items/update (upsert)
    const response = await axios.post(
      `${BRAZE_REST_ENDPOINT}/catalogs/${CATALOG_NAME}/items/update`,
      { items },
      {
        headers: {
          "Authorization": `Bearer ${BRAZE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      message: "Sincronización exitosa con Braze",
      braze_response: response.data,
    });

  } catch (err) {
    console.error("Error en /sync-catalog:", err.response?.data || err.message);
    res.status(500).json({
      error: "Error en la sincronización con Braze",
      details: err.response?.data || err.message,
    });
  }
});

// Render usa el puerto asignado en process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
