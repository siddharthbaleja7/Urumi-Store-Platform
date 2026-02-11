# Production Deployment (VPS)

## Prerequisites
- VPN/Cloud Server (e.g., DigitalOcean, Hetzner, AWS)
- Ubuntu 22.04 LTS recommended
- Minimum 2GB RAM

## Steps

1. **Install k3s**
   ```bash
   curl -sfL https://get.k3s.io | sh -
   ```

2. **Install Ingress Controller**
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
   ```

3. **Deploy Platform**
   Copy the code to VPS.
   
   Start Backend:
   ```bash
   cd backend
   npm install --production
   pm2 start server.js
   ```

   Build Dashboard:
   ```bash
   cd dashboard
   npm run build
   # Serve 'dist' folder using Nginx or 'serve'
   ```

4. **Environment Configuration**
   The backend uses `helm/woocommerce-store/values-prod.yaml` for production values (e.g. longer timeouts, resource quotas, real ingress hosts).

   Ensure you configure the `host` in `values-prod.yaml` to match your real domain.
