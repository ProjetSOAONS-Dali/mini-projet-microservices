# 🛒 Marketplace E-Commerce — Architecture Microservices

> Mini-Projet SoA et Microservices | Dr. Salah Gontara | A.U. 2025/2026

## Description

Application e-commerce complète basée sur une architecture microservices Node.js
avec communication gRPC, API REST + GraphQL, messaging asynchrone Kafka,
bases de données SQLite3 (SQL) et RxDB (NoSQL).

## Architecture

```
Client ──REST/GraphQL──► API Gateway :3000
                              │ gRPC
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
          Product          Order        Notification
          Service          Service       Service
          :50051           :50052         :50053
          SQLite3          SQLite3        RxDB
                             │  Kafka       ▲
                             └──────────────┘
                           order-created
                           order-updated
```

## Stack technique

| Composant               | Technologie                    |
|-------------------------|--------------------------------|
| Runtime                 | Node.js 20                     |
| Communication synchrone | gRPC (HTTP/2 + Protobuf)       |
| API Client              | REST (Express.js) + GraphQL (Apollo) |
| Messaging asynchrone    | Apache Kafka 4.2 (KRaft)       |
| Base SQL                | SQLite3 (better-sqlite3)       |
| Base NoSQL              | RxDB (in-memory)               |

## Microservices

| Service             | Port  | Base   | Méthodes gRPC                                                              |
|---------------------|-------|--------|----------------------------------------------------------------------------|
| ProductService      | 50051 | SQLite3 | GetProduct, SearchProducts, CreateProduct, UpdateProduct, DeleteProduct   |
| OrderService        | 50052 | SQLite3 | GetOrder, GetOrdersByCustomer, CreateOrder, UpdateOrderStatus             |
| NotificationService | 50053 | RxDB   | GetNotifications, MarkAsRead                                               |

## Installation

```bash
git clone https://github.com/VOTRE_USERNAME/mini-projet-microservices.git
cd mini-projet-microservices

# Installer les dépendances de chaque service
cd product-service      && npm install && cd ..
cd order-service        && npm install && cd ..
cd notification-service && npm install && cd ..
cd api-gateway          && npm install && cd ..

# Initialiser Kafka KRaft (1 seule fois)
KAFKA_CLUSTER_ID="$(kafka/bin/kafka-storage.sh random-uuid)"
kafka/bin/kafka-storage.sh format --standalone \
  -t "$KAFKA_CLUSTER_ID" -c kafka/config/server.properties

# Créer les topics Kafka
kafka/bin/kafka-topics.sh --create --partitions 3 --replication-factor 1 \
  --topic order-created --bootstrap-server localhost:9092
kafka/bin/kafka-topics.sh --create --partitions 3 --replication-factor 1 \
  --topic order-updated --bootstrap-server localhost:9092
```

## Démarrage (5 terminaux)

```bash
# T1 — Kafka Broker
kafka/bin/kafka-server-start.sh kafka/config/server.properties

# T2 — ProductService (port 50051)
cd product-service && node index.js

# T3 — OrderService (port 50052)
cd order-service && node index.js

# T4 — NotificationService (port 50053)
cd notification-service && node index.js

# T5 — API Gateway (port 3000)
cd api-gateway && node index.js
```

## Tests Postman

Importer `postman/Microservices_Ecommerce.postman_collection.json` dans Postman.

25 requêtes avec assertions automatiques — Run Collection → tous verts ✅

| Dossier                | Requêtes | Description                              |
|------------------------|----------|------------------------------------------|
| 01 — Products REST     | 9        | CRUD complet + cas d'erreur 404          |
| 02 — Orders REST       | 6        | Création, lecture, changements de statut |
| 03 — Notifications REST| 3        | Lecture auto Kafka + mark as read        |
| 04 — GraphQL Queries   | 4        | products, product, order, notifications  |
| 05 — GraphQL Mutations | 3        | createProduct, createOrder, deleteProduct|

## Flux Kafka (démo rapide)

```bash
# 1. Créer une commande → Kafka publie order-created → notification auto
curl -s -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"demo","items":[{"product_id":"p1","product_name":"Laptop Pro X","quantity":1,"unit_price":1299.99}]}'

# 2. Confirmer → Kafka publie order-updated → 2e notification
curl -s -X PATCH http://localhost:3000/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status":"CONFIRMED"}'

# 3. Voir les notifications créées automatiquement
curl -s http://localhost:3000/notifications/demo
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API REST](docs/API_REST.md)
- [GraphQL](docs/GRAPHQL.md)
- [Kafka Topics](docs/kafka-topics.md)
