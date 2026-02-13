import { useState, useEffect } from 'react';
import { api } from './api/client';
import { StoreCard } from './components/StoreCard';
import './App.css';

function App() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStores = async () => {
    try {
      const response = await api.getStores();
      setStores(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch stores:', err);
      // Don't show error if it's just polling and fails once, but for now show it
      // setError('Failed to load stores');
    }
  };

  useEffect(() => {
    fetchStores();

    // Poll for updates every 3 seconds
    const interval = setInterval(fetchStores, 3000);

    return () => clearInterval(interval);
  }, []);

  const [selectedEngine, setSelectedEngine] = useState('woocommerce');

  const handleCreateStore = async () => {
    setLoading(true);
    try {
      await api.createStore({ engine: selectedEngine });
      await fetchStores();
      setError(null);
    } catch (err) {
      console.error('Failed to create store:', err);
      setError('Failed to create store: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async (id) => {
    if (!window.confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteStore(id);
      await fetchStores();
      setError(null);
    } catch (err) {
      console.error('Failed to delete store:', err);
      setError('Failed to delete store: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏪 Urumi Store Platform
          </h1>
          <p className="text-gray-600">
            Kubernetes-powered Store Provisioning Platform (WooCommerce & Medusa)
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Create Store Controls */}
        <div className="mb-8 flex items-center space-x-4">
          <select
            value={selectedEngine}
            onChange={(e) => setSelectedEngine(e.target.value)}
            disabled={loading}
            className="block w-48 pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm bg-white"
          >
            <option value="woocommerce">WooCommerce</option>
            <option value="medusa">MedusaJS</option>
          </select>

          <button
            onClick={handleCreateStore}
            disabled={loading}
            className={`
              inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white 
              ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 transition-colors'}
            `}
          >
            {loading ? '⏳ Creating Store...' : `+ Create ${selectedEngine === 'woocommerce' ? 'WooCommerce' : 'Medusa'} Store`}
          </button>
        </div>

        {/* Stores Grid */}
        {stores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No stores yet. Create your first store!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onDelete={handleDeleteStore}
              />
            ))}
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-12 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-900">{stores.length}</p>
              <p className="text-sm text-gray-600">Total Stores</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">
                {stores.filter(s => s.status === 'Ready').length}
              </p>
              <p className="text-sm text-gray-600">Ready</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-yellow-600">
                {stores.filter(s => s.status === 'Provisioning').length}
              </p>
              <p className="text-sm text-gray-600">Provisioning</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
