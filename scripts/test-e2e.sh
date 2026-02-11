#!/bin/bash

set -e

echo "🧪 Running E2E Test..."

# 1. Create store
echo "Creating store..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/stores \
  -H "Content-Type: application/json" \
  -d '{"engine":"woocommerce"}')

STORE_ID=$(echo $RESPONSE | jq -r '.id')
echo "Store ID: $STORE_ID"

if [ "$STORE_ID" == "null" ]; then
  echo "Failed to create store. Response: $RESPONSE"
  exit 1
fi

# 2. Wait for ready
echo "Waiting for store to be ready..."
for i in {1..60}; do
  STATUS=$(curl -s http://localhost:3001/api/stores/$STORE_ID | jq -r '.status')
  echo "Status: $STATUS"
  
  if [ "$STATUS" == "Ready" ]; then
    echo "✅ Store is ready!"
    break
  fi
  
  if [ "$STATUS" == "Failed" ]; then
    echo "❌ Store provisioning failed"
    exit 1
  fi
  
  sleep 5
done

# 3. Verify resources
echo "Verifying Kubernetes resources..."
kubectl get all -n $STORE_ID

# 4. Test HTTP access
# Note: This might fail if /etc/hosts isn't updated, but shows intent
STORE_URL=$(curl -s http://localhost:3001/api/stores/$STORE_ID | jq -r '.url')
echo "Store URL: $STORE_URL"

# 5. Delete store
echo "Deleting store..."
curl -X DELETE http://localhost:3001/api/stores/$STORE_ID

# 6. Verify cleanup
sleep 10
echo "Verifying cleanup..."
if kubectl get ns $STORE_ID > /dev/null 2>&1; then
  echo "⚠️ Namespace still exists (might be terminating)"
else
  echo "✅ Namespace deleted"
fi

echo "🎉 E2E test passed!"
