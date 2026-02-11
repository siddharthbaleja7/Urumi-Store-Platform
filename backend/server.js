require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { randomUUID: uuidv4 } = require('crypto');
const storeDb = require('./db');
const k8s = require('./k8s-client');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Get all stores
app.get('/api/stores', (req, res) => {
    try {
        const stores = storeDb.getAll();
        res.json(stores);
    } catch (error) {
        console.error('Error fetching stores:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single store
app.get('/api/stores/:id', (req, res) => {
    try {
        const store = storeDb.getById(req.params.id);
        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }
        res.json(store);
    } catch (error) {
        console.error('Error fetching store:', error);
        res.status(500).json({ error: error.message });
    }
});

const rateLimitMiddleware = require('./middleware/rate-limit');
const MAX_STORES_PER_USER = 5; // Configurable

// Create new store
app.post('/api/stores', rateLimitMiddleware, async (req, res) => {
    try {
        // Check quota
        const existingStores = storeDb.getAll();
        if (existingStores.length >= MAX_STORES_PER_USER) {
            return res.status(403).json({
                error: `Maximum store limit reached (${MAX_STORES_PER_USER})`
            });
        }
        const { engine = 'woocommerce' } = req.body;

        const shortId = uuidv4().slice(0, 8);
        const id = `store-${shortId}`;
        const namespace = id;
        const hostname = `${id}.local`;
        const url = `http://${hostname}`;

        const store = {
            id: id,
            name: namespace,
            namespace,
            engine,
            status: 'Provisioning',
            url,
            mysql_root_password: null,
            mysql_password: null,
            error: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        storeDb.create(store);

        // Return immediately with Provisioning status
        res.json(store);

        // Start provisioning in background
        (async () => {
            try {
                console.log(`Starting provisioning for ${id}...`);

                const passwords = await k8s.helmInstall(id, namespace, hostname);

                console.log(`Helm install complete for ${id}, waiting for pods...`);

                // Poll until ready
                let attempts = 0;
                const maxAttempts = 60; // 5 minutes (5s interval)

                while (attempts < maxAttempts) {
                    const status = await k8s.checkStoreStatus(namespace);

                    if (status === 'Ready') {
                        storeDb.update(id, {
                            status: 'Ready',
                            mysql_root_password: passwords.mysqlRootPassword,
                            mysql_password: passwords.mysqlPassword
                        });
                        console.log(`✅ Store ${id} is Ready!`);
                        break;
                    }

                    if (status === 'Failed') {
                        storeDb.update(id, {
                            status: 'Failed',
                            error: 'Pod failed to start'
                        });
                        break;
                    }

                    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
                    attempts++;
                }

                if (attempts >= maxAttempts) {
                    storeDb.update(id, {
                        status: 'Failed',
                        error: 'Timeout waiting for store to be ready'
                    });
                }

            } catch (error) {
                console.error(`Provisioning failed for ${id}:`, error);
                storeDb.update(id, {
                    status: 'Failed',
                    error: error.message
                });
            }
        })();

    } catch (error) {
        console.error('Error creating store:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete store
app.delete('/api/stores/:id', async (req, res) => {
    try {
        const store = storeDb.getById(req.params.id);

        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        // Delete from Kubernetes
        await k8s.helmUninstall(store.id, store.namespace);

        // Delete from database
        storeDb.delete(req.params.id);

        res.json({ message: 'Store deleted successfully' });

    } catch (error) {
        console.error('Error deleting store:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
