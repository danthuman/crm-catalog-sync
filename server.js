require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json({ limit: '10mb' })); // aumentar límite si hay muchas filas

// Configuración
const PORT = process.env.PORT || 3000;
const BRAZE_API_URL = process.env.BRAZE_API_URL; // URL de tu catalog API en Braze
const BRAZE_API_KEY = process.env.BRAZE_API_KEY; // API key de Braze
const SHARED_SECRET = process.env.SHARED_SECRET; // secreto que usas en Apps Script

// Lista de campos válidos en tu catálogo Braze
const CATALOG_FIELDS = [
  "content-name", "copy", "cta", "v-category",
  "c-category-1", "c-category-2", "c-category-3", "c-category-4",
  "portrait", "landscape", "square", "web-link", "deeplink", "landing-page"
];

// Endpoint para recibir items desde Google Apps Script
app.post('/sync-catalog', async (req, res) => {
  try {
    // Verificar el shared secret
    const secret = req.headers['x-shared-secret'];
    if (secret !== SHARED_SECRET) {
      return res.status(403).json({ error: 'Invalid shared secret' });
    }

    const itemsFromSheets = req.body.items;
    if (!itemsFromSheets || !Array.isArray(itemsFromSheets)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Preparar payload para Braze: upsert fila por fila
    const results = [];

    for (const item of itemsFromSheets) {
      if (!item.external_id) continue; // ignorar filas sin external_id

      // Filtrar atributos: solo enviar los que existen en el catálogo
      const attributes = {};
      if (item.attributes && typeof item.attributes === 'object') {
        for (const key of Object.keys(item.attributes)) {
          if (CATALOG_FIELDS.includes(key)) {
            attributes[key] = item.attributes[key];
          }
        }
      }

      const brazePayload = {
        items: [
          {
            external_id: String(item.external_id),
            attributes: attributes
          }
        ]
      };

      try {
        const response = await axios.post(BRAZE_API_URL, brazePayload, {
          headers: {
            'Authorization': `Bearer ${BRAZE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        results.push({ external_id: item.external_id, status: 'success', data: response.data });
      } catch (err) {
        results.push({ external_id: item.external_id, status: 'error', error: err.response ? err.response.data : err.message });
      }

      // Delay opcional para no saturar Braze
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({ message: 'Sync completed', results });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la sincronización con Braze', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
