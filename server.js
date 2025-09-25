import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch"; // viene incluido en Node 18+, si no: npm install node-fetch

const app = express();
app.use(bodyParser.json());

// 🔑 Variables de configuración
const BRAZE_REST_ENDPOINT = "https://rest.iad-01.braze.com"; // cambia según tu cluster
const BRAZE_API_KEY = process.env.BRAZE_API_KEY; // guárdalo como secret en Render
const CATALOG_NAME = "mi_catalogo"; // reemplaza por el nombre de tu catálogo en Braze

// 🔄 Endpoint que recibe datos (ej. desde Google Sheets o Apps Script)
app.post("/sync-catalog", async (req, res) => {
  try {
    // Esperamos recibir items en formato JSON desde Google Sheets
    const items = req.body.items;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Formato inválido. Debes enviar { items: [ ... ] }" });
    }

    // Llamada a Braze: /catalogs/{catalog_name}/items/update
    const response = await fetch(
      `${BRAZE_REST_ENDPOINT}/catalogs/${CATALOG_NAME}/items/update`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${BRAZE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Error en la API de Braze",
        details: data,
      });
    }

    res.json({
      message: "Sincronización exitosa con Braze",
      braze_response: data,
    });

  } catch (err) {
    console.error("Error en /sync-catalog:", err);
    res.status(500).json({ error: "Error interno", details: err.message });
  }
});

// Render usa el puerto asignado en process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
