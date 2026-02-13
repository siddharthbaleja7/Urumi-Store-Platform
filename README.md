# Urumi Store Platform

Kubernetes-based Store Provisioning Hub.

### Demo Video Script (Recommended)
1.  **Dashboard**: Create a store.
2.  **Terminal**: Show it running on Kubernetes:
    ```bash
    kubectl get namespaces
    kubectl get pods -n store-YOUR_ID
    kubectl get ingress -n store-YOUR_ID
    ```
3.  **Hosts**: Update `/etc/hosts`.
4.  **Browser**: Place an order.
5.  **Dashboard**: Delete the store.
6.  **Terminal**: Show cleanup:
    ```bash
    kubectl get namespaces # Store namespace should be gone
    ```

## 🎯 Features

-  On-demand **WooCommerce** & **MedusaJS** store provisioning
-  Kubernetes-native with Helm charts
-  Namespace-based isolation (one namespace per store)
-  **Local** (Kind) and **Production** (k3s) deployment support
-  Web dashboard for store management and status tracking
-  Automatic cleanup on deletion (Full Teardown)
-  Resource quotas and network policies (Configurable)
-  Local-to-Prod parity via Helm values (`values-local.yaml` -> `values-prod.yaml`)

## 🏗️ Architecture

1. **Dashboard (React)**: User interface for creating/managing stores. Selects engine (WooCommerce/Medusa).
2. **Backend API (Node.js)**: Orchestrates Helm deployments and tracks status via SQLite.
3. **Cluster (Kind/k3s)**: Runs store workloads (MySQL/Postgres + App) in isolated namespaces.
4. **Helm**: Manages templated deployments with environment-specific values.

## 📐 System Design & Tradeoffs

### Architecture Choice: Kubernetes-Native
- **Decision**: Used Helm Charts + Namespaces rather than pure Docker Compose.
- **Why**: Meets the requirement for "production-ready" orchestration. Docker Compose is hard to scale across nodes; K8s is designed for it.
- **Tradeoff**: Higher initial complexity (Ingress, PVCs) but provides better isolation and scalability.

### Isolation Strategy
- **Namespace-per-Tenant**: Each store lives in a `store-{uuid}` namespace.
- **Network Policies (Planned)**: Default deny-all, allow required ingress/egress.
- **Secrets**: Database credentials are auto-generated and mounted as K8s Secrets, never exposed in cleartext logs.

### Scalability
- **Horizontal**: The stateless parts (frontend/backend) can scale via `replicas`.
- **Vertical**: Database scaling is limited by the single-node PVC interaction in this MVP.
- **Provisioning**: Asynchronous. The backend fires a Helm install and polls for status, preventing blocking operations.

### Clean Teardown
- **Owner References (Future)**: Could use K8s garbage collection.
- **Current Approach**: `helm uninstall` removes the Release, which cascades to delete all resources (Deployment, Service, Ingress, Secret, PVC).

### Local vs. Production (Helm Values)
- **Local (`values-local.yaml`)**: Uses `NodePort` or `ClusterIP` with Kind Ingress. StorageClass is `standard`.
- **Production (`values-prod.yaml`)**: Should use `LoadBalancer`, real `InressClass` (e.g., nginx-cloud), and managed StorageClass (e.g., gp2/gp3 on AWS).

## 📋 Prerequisites

- Docker Desktop
- Kind (Kubernetes in Docker)
- Kubectl
- Helm
- Node.js (v18+)

## 🚀 Quick Start (Local)

### 1. Setup Kubernetes Cluster

```bash
kind create cluster --config kind-config.yaml
# Install NGINX Ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```

Wait for ingress controller to be ready:
```bash
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### 2. Start Backend

```bash
cd backend
npm install
# Ensure you are on Node 18+
node server.js
```
The server runs on `http://localhost:3001`.

### 3. Start Dashboard

```bash
cd dashboard
npm install
npm run dev
```

### 4. Access Dashboard

Open `http://localhost:5173` (or port shown in terminal).

### 5. Create a Store

1. Select Engine: **WooCommerce** or **MedusaJS**.
2. Click "Create New Store".
3. Wait for status to change to **Ready**.
4. Click the **Store URL** to access the storefront.
   - **WooCommerce**: Complete setup wizard -> Add product -> Place order.
   - **Medusa**: 
     - Storefront: `http://store-ID.local`
     - Admin: `http://admin-store-ID.local` (User: `admin@medusa-test.com`, Pass: `supersecret`)

> **Note**: For `.local` domains to work, add them to `/etc/hosts`:
> `127.0.0.1 store-xxxxxxxx.local admin-store-xxxxxxxx.local`
> (The ID is shown in the dashboard)

## 📦 Production Deployment (VPS)

See [docs/SETUP-VPS.md](docs/SETUP-VPS.md).

## 🧪 Testing API directly

### Create WooCommerce Store
```bash
curl -X POST http://localhost:3001/api/stores \
  -H "Content-Type: application/json" \
  -d '{"engine":"woocommerce", "environment":"local"}'
```

### Create Medusa Store
```bash
curl -X POST http://localhost:3001/api/stores \
  -H "Content-Type: application/json" \
  -d '{"engine":"medusa", "environment":"local"}'
```

### Delete Store
```bash
curl -X DELETE http://localhost:3001/api/stores/{store-id}
```

## 🔒 Security & Isolation

- **RBAC**: Backend uses restricted ServiceAccount (if deployed in cluster) or kubeconfig.
- **Namespaces**: Each store gets its own namespace (`store-{uuid}`).
- **Secrets**: Passwords generated dynamically and stored in K8s Secrets.
- **Quotas**: Max 5 stores per user (configurable in backend).
- **Cleanup**: Identifying namespace deletion removes all associated resources (PVCs, Services, etc).

## 👤 Author

Siddharth Baleja

