const k8s = require('@kubernetes/client-node');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

function generatePassword(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

async function helmInstall(storeId, namespace, hostname, environment = 'local') {
    const mysqlRootPassword = generatePassword();
    const mysqlPassword = generatePassword();

    const valuesYaml = `
storeName: "${namespace}"
storeId: "${storeId}"
mysql:
  rootPassword: "${mysqlRootPassword}"
  password: "${mysqlPassword}"
ingress:
  host: "${hostname}"
`;

    const valuesFile = `/tmp/values-${storeId}.yaml`;
    fs.writeFileSync(valuesFile, valuesYaml);

    // Path from backend dir to helm dir
    const chartPath = '../helm/woocommerce-store';

    // Base values file (will be implemented in Phase 6, strictly speaking local vs prod, but for now just use provided yaml or defaults)
    // We don't have values-local.yaml yet, so rely on default values.yaml in chart + our override
    // Adding logic for future environment support
    let baseValuesArgs = '';
    if (fs.existsSync(`${chartPath}/values-${environment}.yaml`)) {
        baseValuesArgs = `-f ${chartPath}/values-${environment}.yaml`;
    }

    const cmd = `helm install ${storeId} ${chartPath} ${baseValuesArgs} -f ${valuesFile} --create-namespace`;

    console.log(`Executing: ${cmd}`);

    try {
        const { stdout, stderr } = await execPromise(cmd);
        console.log('Helm install output:', stdout);
        if (stderr) console.error('Helm stderr:', stderr);

        return { mysqlRootPassword, mysqlPassword };
    } catch (error) {
        console.error('Helm install failed:', error);
        throw error;
    }
}

async function helmUninstall(storeId, namespace) {
    const cmd = `helm uninstall ${storeId}`;

    try {
        await execPromise(cmd);
        console.log(`Helm uninstalled: ${storeId}`);

        // Namespace might take time to terminate, helm uninstall doesn't delete namespace usually unless configured, 
        // but in our chart we manage namespace? 
        // Actually, helm install --create-namespace created it, or the chart template created it.
        // If the chart creates the namespace resource, helm uninstall deletes it.
        // If we used --create-namespace, we might need to delete it manually if the chart didn't own it.
        // Our chart has a namespace.yaml, so Helm manages it.

        // However, let's play safe and try to delete namespace if it exists after a delay, 
        // or trust Helm if it's part of the chart.
        // In k8s-client.js provided in guide: "await k8sApi.deleteNamespace(namespace);"
        // Better to explicitly delete it if Helm doesn't.

        // Double check: if chart has Namespace resource, uninstall deletes it. 
        // But usually best practice is to let Helm manage it.
        // But just in case:
        try {
            await k8sApi.deleteNamespace(namespace);
            console.log(`Namespace delete requested: ${namespace}`);
        } catch (e) {
            // Ignore if not found
            if (e.response && e.response.statusCode !== 404) console.error("Error deleting namespace:", e.body);
        }

    } catch (error) {
        console.error('Helm uninstall failed:', error);
        throw error;
    }
}

async function checkStoreStatus(namespace) {
    try {
        // Check if WordPress pod is ready
        const pods = await k8sApi.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, 'app=wordpress');

        if (pods.body.items.length === 0) {
            return 'Provisioning';
        }

        const pod = pods.body.items[0];

        // Check phase
        if (pod.status.phase === 'Running') {
            // Check if container is ready
            const containerStatuses = pod.status.containerStatuses || [];
            const allReady = containerStatuses.every(cs => cs.ready) && containerStatuses.length > 0;

            if (allReady) {
                return 'Ready';
            }
        } else if (pod.status.phase === 'Failed' || pod.status.phase === 'Unknown') {
            return 'Failed';
        }

        return 'Provisioning';
    } catch (error) {
        console.error('Error checking status:', error.message);
        if (error.response && error.response.statusCode === 404) return 'Provisioning'; // Namespace might not exist yet
        return 'Provisioning';
    }
}

module.exports = {
    helmInstall,
    helmUninstall,
    checkStoreStatus,
    generatePassword
};
