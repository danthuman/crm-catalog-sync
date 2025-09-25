// server.js
import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Configuración
const BRAZE_API_KEY = process.env.BRAZE_API_KEY;
const BRAZE_REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT || 'https://rest.iad-05.braze.com';
const CATALOG_NAME = process.env.CATALOG_NAME || 'Catalogo_AppSync';
const SHARED_SECRET = process.env.SHARED_SECRET;

// Función para dividir en lotes
function chunkArray(arr, size){
  const out = [];
  for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size));
  return out;
}

app.post('/sync-catalog', async (req, res) => {
  try {
    // Validación de secret
    const secret = req.headers['x-shared-secret'];
    if (!SHARED_SECRET || secret !== SHARED_SECRET) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'no items provided' });
    }

    // Limpiar items: solo external_id + content-name
    const cleanItems = items.map(i => ({
      external_id: i.external_id,
      attributes: {
        "content-name": i.attributes["content-name"] || ""
      }
    }));

    const batches = chunkArray(cleanItems, 50);

    for (const batch of batches) {
      const url = `${BRAZE_REST_ENDPOINT.replace(/\/$/, '')}/catalogs/${encodeURIComponent(CATALOG_NAME)}/items`;
      try {
        const resp = await axios.put(url, { items: batch }, {
          headers: {
            'Authorization': `Bearer ${BRAZE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Braze response', resp.status);
      } catch (brazeErr) {
        console.error('Braze sync error:', brazeErr.response ? brazeErr.response.data : brazeErr.message);
        return res.status(500).json({ error: 'sync_failed', details: brazeErr.response ? brazeErr.response.data : brazeErr.message });
      }
    }

    return res.json({ message: 'ok', batches: batches.length });
  } catch (err) {
    console.error('server error:', err);
    return res.status(500).json({ error: 'sync_failed', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Servidor corriendo en puerto ${PORT}`));
