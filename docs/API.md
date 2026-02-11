# API Documentation

Base URL: `http://localhost:3001`

## Stores

### Get All Stores
`GET /api/stores`

Response:
```json
[
  {
    "id": "store-1234abcd",
    "name": "store-1234abcd",
    "status": "Ready",
    "url": "http://store-1234abcd.local",
    "created_at": "..."
  }
]
```

### Create Store
`POST /api/stores`

Body:
```json
{
  "engine": "woocommerce" // optional, default: woocommerce
}
```

Response:
Returns the created store object with status "Provisioning".

### Get Store
`GET /api/stores/:id`

### Delete Store
`DELETE /api/stores/:id`

Deletes the store resources (Namespace, Helm release) and database record.
