# Urumi Store Platform

Kubernetes-based WooCommerce store provisioning platform for Round 1 of Urumi AI SDE Internship.

## 🎯 Features

- ✅ On-demand WooCommerce store provisioning
- ✅ Kubernetes-native with Helm charts
- ✅ Namespace-based isolation
- ✅ Local (Kind) and Production (k3s) deployment
- ✅ Web dashboard for store management
- ✅ Automatic cleanup on deletion
- ✅ Resource quotas and network policies
- ✅ End-to-end order placement testing

## 🏗️ Architecture

1. **Dashboard (React)**: User interface for creating/managing stores.
2. **Backend API (Node.js)**: Orchestrates Helm deployments and tracks status via SQLite.
3. **Cluster (Kind/k3s)**: Runs store workloads (MySQL + WordPress) in isolated namespaces.
4. **Helm**: Manages templated deployments with environment-specific values.

## 📋 Prerequisites

- Docker Desktop
- Kind
- Kubectl
- Helm
- Node.js (v18+)

## 🚀 Quick Start (Local)

### 1. Setup Kubernetes Cluster

```bash
kind create cluster --config kind-config.yaml
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
npm run dev
```

### 3. Start Dashboard

```bash
cd dashboard
npm install
npm run dev
```

### 4. Access Dashboard

Open http://localhost:5173 (or port shown in terminal)

### 5. Create a Store

1. Click "Create New Store"
2. Wait for status to change to "Ready"
3. Click the store URL
4. Complete WordPress setup -> Install WooCommerce -> Place Order

## 📦 Production Deployment (VPS)

See [docs/SETUP-VPS.md](docs/SETUP-VPS.md).

## 🧪 Testing

### Test Store Creation

```bash
# Create store via API
curl -X POST http://localhost:3001/api/stores \
  -H "Content-Type: application/json" \
  -d '{"engine":"woocommerce"}'
```

### Test Cleanup

```bash
# Delete store
curl -X DELETE http://localhost:3001/api/stores/{store-id}
```

## 🔒 Security

- RBAC for orchestrator (least privilege)
- Namespace-based isolation
- Rate limiting on API (10 req/min)
- Max 5 stores per user quota
- NetworkPolicies allowed (in production values)

## 👤 Author

Siddharth Baleja
Submission for Urumi AI SDE Internship - Round 1
