# Troubleshooting

## Store Stuck in "Provisioning"

1. Check pods in the store namespace:
   ```bash
   kubectl get pods -n store-{id}
   ```
2. Describe pod for errors (ImagePullBackOff, Insufficient Resources):
   ```bash
   kubectl describe pod -l app=wordpress -n store-{id}
   ```

## Ingress Not Working

1. Check Ingress Controller pod:
   ```bash
   kubectl get pods -n ingress-nginx
   ```
2. Verify Ingress resource exists:
   ```bash
   kubectl get ingress -n store-{id}
   ```
3. Ensure `/etc/hosts` has the entry if not using nip.io or local DNS.
   ```
   127.0.0.1 store-{id}.local
   ```

## Helm Errors in Backend Logs

- Check if `helm` is in the PATH of the process running Node.js.
- Ensure kubeconfig is correctly loaded (usually `~/.kube/config`).
