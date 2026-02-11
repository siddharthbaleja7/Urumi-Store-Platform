export function StatusBadge({ status }) {
    const getStatusColor = () => {
        switch (status) {
            case 'Ready':
                return 'bg-green-500';
            case 'Provisioning':
                return 'bg-yellow-500';
            case 'Failed':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor()}`}>
            {status}
        </span>
    );
}
