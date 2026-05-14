# Architecture — Marketplace E-Commerce Microservices

## Diagramme

```
Client (Postman / Browser)
         │ HTTP 1.1
         ▼ REST + GraphQL
┌────────────────────────────┐
│        API GATEWAY          │ :3000
│  Express + Apollo Server   │
└─────────────┬──────────────┘
              │ gRPC / HTTP2 + Protobuf
     ┌────────┼──────────┐
     │        │          │
     ▼        ▼          ▼
 ┌────────┐ ┌────────┐ ┌──────────────┐
 │Product │ │ Order  │ │Notification  │
 │Service │ │Service │ │  Service     │
 │ :50051 │ │ :50052 │ │   :50053     │
 │SQLite3 │ │SQLite3 │ │ RxDB (NoSQL) │
 └────────┘ └───┬────┘ └──────┬───────┘
               │   KAFKA      │
               └──────────────┘
            order-created :9092
            order-updated
```

## Flux synchrone (gRPC)
Client → API Gateway → microservice → réponse immédiate

## Flux asynchrone (Kafka)
OrderService publie → Kafka Broker → NotificationService consomme → RxDB

## Ports
| Service             | Port  | Protocole       |
|---------------------|-------|-----------------|
| API Gateway         | 3000  | HTTP (REST+GQL) |
| ProductService      | 50051 | gRPC / HTTP2    |
| OrderService        | 50052 | gRPC / HTTP2    |
| NotificationService | 50053 | gRPC / HTTP2    |
| Kafka Broker        | 9092  | TCP             |
