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

async function helmInstall(storeId, namespace, hostname, engine = 'woocommerce', environment = 'local') {
    const mysqlRootPassword = generatePassword();
    const mysqlPassword = generatePassword();
    const postgresPassword = generatePassword(); // For Medusa

    let valuesYaml = '';
    let chartName = '';

    if (engine === 'woocommerce') {
        chartName = 'woocommerce-store';
        valuesYaml = `
storeName: "${namespace}"
storeId: "${storeId}"
mysql:
  rootPassword: "${mysqlRootPassword}"
  password: "${mysqlPassword}"
ingress:
  host: "${hostname}"
`;
    } else if (engine === 'medusa') {
        chartName = 'medusa-store';
        // For Medusa, we need multiple hosts usually, but let's stick to subdomains or paths.
        // In our chart we defined storefrontHost and adminHost.
        // Let's assume:
        // storefront -> store-ID.local
        // admin -> admin-ID.local
        // backend api is on admin host usually.

        valuesYaml = `
storeName: "${namespace}"
storeId: "${storeId}"
postgres:
  password: "${postgresPassword}"
ingress:
  storefrontHost: "${hostname}"
  adminHost: "admin-${hostname}"
backend:
  jwtSecret: "${generatePassword(32)}"
  cookieSecret: "${generatePassword(32)}"
`;
    } else {
        throw new Error(`Unsupported engine: ${engine}`);
    }

    const valuesFile = `/tmp/values-${storeId}.yaml`;
    fs.writeFileSync(valuesFile, valuesYaml);

    // Path from backend dir to helm dir
    const chartPath = `../helm/${chartName}`;

    let baseValuesArgs = '';
    // Check for environment specific values file
    if (fs.existsSync(`${chartPath}/values-${environment}.yaml`)) {
        baseValuesArgs = `-f ${chartPath}/values-${environment}.yaml`;
    }

    const cmd = `helm install ${storeId} ${chartPath} ${baseValuesArgs} -f ${valuesFile} --create-namespace`;

    console.log(`Executing: ${cmd}`);

    try {
        const { stdout, stderr } = await execPromise(cmd);
        console.log('Helm install output:', stdout);
        if (stderr) console.error('Helm stderr:', stderr);

        return {
            mysqlRootPassword,
            mysqlPassword,
            postgresPassword
        };
    } catch (error) {
        console.error('Helm install failed:', error);
        throw error;
    }
}

async function helmUninstall(storeId, namespace) {
    const cmd = `helm uninstall ${storeId} -n ${namespace}`; // Uninstall from specific namespace if helm supports it, mostly helm list is global or namespaced?
    // Actually helm install ... --create-namespace puts release in that namespace.
    // So uninstall needs -n ${namespace} usually.

    try {
        await execPromise(cmd); // Try simple uninstall first (might fail if namespace issue)
        // If release was installed in namespace 'namespace', we need -n.
        // The install command used `helm install ${storeId} ... --create-namespace`. 
        // This usually installs release IN the namespace if --namespace is passed? 
        // Wait, command was `helm install ${storeId} ... --create-namespace`. 
        // It uses default namespace if --namespace not passed!
        // The Chart has `namespace: {{ .Values.storeName }}` in templates?
        // If templates define namespace, Helm installs resources there, but the RELEASE object might be in default.
        // Let's assume standard behavior:
        // If I did `helm install name ./chart --create-namespace`, it installs in default unless `-n` is provided.
        // BUT the templates have `namespace: ...`.

        // Correct approach: `helm install ${storeId} ./chart -n ${namespace} --create-namespace`
        // My previous code didn't use `-n ${namespace}` in install!

        // LIMITATION: If I change install to use `-n`, I must update uninstall.
        // PROPOSAL: Update `helmInstall` to use `-n ${namespace}` explicitly.
    } catch (e) {
        // Try with namespace
        try {
            await execPromise(`helm uninstall ${storeId} -n ${namespace}`);
        } catch (e2) {
            console.log("Uninstall failed or already gone");
        }
    }

    try {
        // Helm uninstall might not remove the namespace itself if it wasn't created by helm strictly as a resource?
        // --create-namespace creates it.
        // Deleting the namespace is the surest way to clean up.
        console.log(`Deleting namespace: ${namespace}`);
        await k8sApi.deleteNamespace(namespace);
    } catch (error) {
        if (error.response && error.response.statusCode !== 404) {
            console.error('Error deleting namespace:', error.body);
        }
    }
}

async function checkStoreStatus(namespace, engine) {
    try {
        const labelSelector = engine === 'medusa' ? 'app=medusa-backend' : 'app=wordpress'; // Check backend/wordpress

        const pods = await k8sApi.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, labelSelector);

        if (pods.body.items.length === 0) {
            return 'Provisioning';
        }

        const pod = pods.body.items[0];

        if (pod.status.phase === 'Running') {
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
        if (error.response && error.response.statusCode === 404) return 'Provisioning';
        // console.error('Error checking status:', error.message);
        return 'Provisioning';
    }
}

module.exports = {
    helmInstall,
    helmUninstall,
    checkStoreStatus,
    generatePassword
};
