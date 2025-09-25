import 'dotenv/config';
import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json({ limit: '10mb' }));

const BRAZE_API_KEY = process.env.BRAZE_API_KEY;
const BRAZE_REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT; // ej: https://rest.iad-05.braze.com
const CATALOG_NAME = process.env.CATALOG_NAME; // ej: Catalogo_AppSync
const SHARED_SECRET = process.env.SHARED_SECRET;

// Divide en lotes de máximo 50 items
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

app.post('/sync-catalog', async (req, res) => {
  try {
    // Seguridad
    const secret = req.headers['x-shared-secret'];
    if (!SHARED_SECRET || secret !== SHARED_SECRET) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'no items provided' });
    }

    const batches = chunkArray(items, 50);

    for (const batch of batches) {
      const url = `${BRAZE_REST_ENDPOINT.replace(/\/$/, '')}/catalogs/${encodeURIComponent(CATALOG_NAME)}/items`;

      // Usar POST con upsert (crea si no existe, actualiza si existe)
      const resp = await axios.post(url, { items: batch }, {
        headers: {
          'Authorization': `Bearer ${BRAZE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Braze response', resp.status);
    }

    return res.json({ message: 'ok', batches: batches.length });
  } catch (err) {
    console.error('sync error', err.response ? err.response.data : err.message);
    return res.status(500).json({ error: 'sync_failed', details: err.response ? err.response.data : err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
