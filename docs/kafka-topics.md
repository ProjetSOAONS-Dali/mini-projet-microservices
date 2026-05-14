# Kafka Topics — Marketplace E-Commerce

## Broker : localhost:9092 | Mode : KRaft (Kafka 4.2)

---

### `order-created`

- **Partitions** : 3
- **Producteur** : OrderService
- **Consommateur** : NotificationService
- **Déclencheur** : Création d'une nouvelle commande

**Payload :**
```json
{
  "event": "ORDER_CREATED",
  "order_id": "uuid",
  "customer_id": "string",
  "total": 1299.99,
  "items": [
    {
      "product_id": "p1",
      "product_name": "Laptop Pro X",
      "quantity": 1,
      "unit_price": 1299.99
    }
  ],
  "timestamp": "2025-05-08T10:00:00.000Z"
}
```

---

### `order-updated`

- **Partitions** : 3
- **Producteur** : OrderService
- **Consommateur** : NotificationService
- **Déclencheur** : Changement de statut d'une commande

**Payload :**
```json
{
  "event": "ORDER_STATUS_UPDATED",
  "order_id": "uuid",
  "customer_id": "string",
  "new_status": "CONFIRMED | SHIPPED | DELIVERED | CANCELLED",
  "timestamp": "2025-05-08T10:05:00.000Z"
}
```

---

## Statuts valides

| Statut | Description |
|---|---|
| `PENDING` | Commande créée, en attente de confirmation |
| `CONFIRMED` | Commande confirmée, en cours de préparation |
| `SHIPPED` | Commande expédiée |
| `DELIVERED` | Commande livrée |
| `CANCELLED` | Commande annulée |
