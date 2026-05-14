#  Marketplace E-Commerce — Architecture Microservices

> **Mini-Projet — SoA et Microservices | Dr. Salah Gontara | A.U. 2025/2026**

---

## 📌 Présentation

Plateforme e-commerce basée sur une architecture microservices complète avec :
- **3 microservices** communiquant via **gRPC / Protobuf**
- **API Gateway** exposant une API **REST** et **GraphQL (Apollo)**
- **Apache Kafka** pour la communication asynchrone entre services
- **SQLite3** (SQL) et **RxDB** (NoSQL) comme bases de données

---

##  Architecture

```
Client (Postman / Navigateur)
          │
          ▼  HTTP 1.1  REST + GraphQL
┌─────────────────────────────────┐
│          API GATEWAY            │  ← PORT 3000
│    Express.js  +  Apollo        │
│  REST /products  /orders  ...   │
│  GraphQL  POST /graphql         │
└──────────────┬──────────────────┘
               │ gRPC / HTTP2 + Protobuf
       ┌───────┼───────────┐
       │       │           │
       ▼       ▼           ▼
 ┌──────────┐ ┌──────────┐ ┌──────────────────┐
 │ Product  │ │  Order   │ │  Notification    │
 │ Service  │ │ Service  │ │    Service       │
 │  :50051  │ │  :50052  │ │     :50053       │
 │ SQLite3  │ │ SQLite3  │ │  RxDB (NoSQL)    │
 └──────────┘ └────┬─────┘ └────────┬─────────┘
                   │                │
                   │   KAFKA BROKER :9092
                   │   ┌─────────────────┐
                   └──►│  order-created  │──►┘
                       │  order-updated  │
                       └─────────────────┘
```

---

## Structure du projet

```
mini-projet-microservices/
├── proto/
│   ├── product.proto          # Contrat gRPC ProductService
│   ├── order.proto            # Contrat gRPC OrderService
│   └── notification.proto     # Contrat gRPC NotificationService
├── product-service/
│   ├── index.js               # Serveur gRPC + logique métier
│   ├── db.js                  # SQLite3 + seed
│   └── package.json
├── order-service/
│   ├── index.js               # Serveur gRPC + logique métier
│   ├── db.js                  # SQLite3
│   ├── kafkaProducer.js       # Publication Kafka
│   └── package.json
├── notification-service/
│   ├── index.js               # Serveur gRPC
│   ├── db.js                  # RxDB (NoSQL, mémoire)
│   ├── kafkaConsumer.js       # Consommation Kafka
│   └── package.json
├── api-gateway/
│   ├── index.js               # Express + REST + GraphQL
│   ├── resolvers.js           # Résolveurs GraphQL
│   ├── schema.gql             # Schéma GraphQL
│   └── package.json
├                     
├── postman/
│   └── collection.json        # Collection Postman complète
└── README.md
```

---

##  Installation et démarrage

### Prérequis

| Outil | Version | Vérification |
|---|---|---|
| Node.js | 20 LTS | `node -v` |
| Java | 17+ | `java -version` |
| npm | 10+ | `npm -v` |

### 1. Cloner le projet

```bash
git clone https://github.com/ProjetSOAONS-Dali/mini-projet-microservices.git
cd mini-projet-microservices
```


### 2. Initialiser Kafka (une seule fois)

```bash
KAFKA_CLUSTER_ID="$(kafka/bin/kafka-storage.sh random-uuid)"
kafka/bin/kafka-storage.sh format --standalone \
  -t "$KAFKA_CLUSTER_ID" \
  -c kafka/config/server.properties
```

### 3. Démarrer les services (5 terminaux)

```bash
# Terminal 1 — Kafka
kafka/bin/kafka-server-start.sh kafka/config/server.properties

# Terminal 2 — Créer les topics (après démarrage Kafka)
kafka/bin/kafka-topics.sh --create --partitions 3 --replication-factor 1 \
  --topic order-created --bootstrap-server localhost:9092
kafka/bin/kafka-topics.sh --create --partitions 3 --replication-factor 1 \
  --topic order-updated --bootstrap-server localhost:9092

# Terminal 3 — ProductService
cd product-service && node index.js

# Terminal 4 — OrderService
cd order-service && node index.js

# Terminal 5 — NotificationService
cd notification-service && node index.js

# Terminal 6 — API Gateway
cd api-gateway && node index.js
```

### 4. Vérifier le démarrage

```
✅ ProductService gRPC démarré sur le port 50051
✅ OrderService gRPC démarré sur le port 50052
✅ NotificationService gRPC démarré sur le port 50053
🚀 API Gateway démarrée sur http://localhost:3000
✅ GraphQL disponible sur http://localhost:3000/graphql
```

---

##  Endpoints disponibles

| Type | Méthode | URL | Description |
|---|---|---|---|
| REST | GET | `/products` | Liste / recherche de produits |
| REST | GET | `/products/:id` | Produit par ID |
| REST | POST | `/products` | Créer un produit |
| REST | PUT | `/products/:id` | Modifier un produit |
| REST | DELETE | `/products/:id` | Supprimer un produit |
| REST | GET | `/orders/:id` | Commande par ID |
| REST | POST | `/orders` | Créer une commande |
| REST | PATCH | `/orders/:id/status` | Modifier le statut |
| REST | GET | `/customers/:id/orders` | Commandes d'un client |
| REST | GET | `/notifications/:customerId` | Notifications |
| REST | PATCH | `/notifications/:id/read` | Marquer comme lue |
| GraphQL | POST | `/graphql` | Toutes les queries/mutations |

---

##  Tests

Importer `postman/collection.json` dans Postman et exécuter la collection complète (25 requêtes REST + GraphQL + gRPC).

---

##  Technologies

| Couche | Technologie |
|---|---|
| Transport inter-services | gRPC + Protobuf |
| API externe | REST (Express.js) + GraphQL (Apollo Server) |
| Messagerie async | Apache Kafka 4.2 (KRaft) |
| Base de données SQL | SQLite3 (better-sqlite3) |
| Base de données NoSQL | RxDB (stockage mémoire) |
| Runtime | Node.js 20 LTS |
