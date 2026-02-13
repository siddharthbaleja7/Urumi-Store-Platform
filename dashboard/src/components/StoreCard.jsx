import { StatusBadge } from './StatusBadge';

export function StoreCard({ store, onDelete }) {
    return (
        <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">ID: {store.id}</p>
                </div>
                <StatusBadge status={store.status} />
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-600 w-24">Engine:</span>
                    <span className="text-gray-900">{store.engine}</span>
                </div>

                <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-600 w-24">Created:</span>
                    <span className="text-gray-900">
                        {new Date(store.created_at).toLocaleString()}
                    </span>
                </div>

                {store.status === 'Ready' && store.url && (
                    <div className="space-y-2">
                        <div className="flex items-center text-sm">
                            <span className="font-medium text-gray-600 w-24">Store URL:</span>
                            <a
                                href={store.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                            >
                                {store.url}
                            </a>
                        </div>
                        {store.admin_url && (
                            <div className="flex items-center text-sm">
                                <span className="font-medium text-gray-600 w-24">Admin URL:</span>
                                <a
                                    href={store.admin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                >
                                    {store.admin_url}
                                </a>
                            </div>
                        )}
                        {store.engine === 'medusa' && (
                            <div className="bg-gray-100 p-2 rounded text-xs mt-2">
                                <p className="font-medium">Default Medusa Admin:</p>
                                <p>Email: admin@medusa-test.com</p>
                                <p>Pass: supersecret</p>
                            </div>
                        )}
                    </div>
                )}

                {store.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-600">
                            <strong>Error:</strong> {store.error}
                        </p>
                    </div>
                )}
            </div>

            <button
                onClick={() => onDelete(store.id)}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
                🗑️ Delete Store
            </button>
        </div>
    );
}
