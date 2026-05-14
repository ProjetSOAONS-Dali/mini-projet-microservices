# API REST — http://localhost:3000

## Products

| Méthode | URL                  | Description          | Body requis                                      |
|---------|----------------------|----------------------|--------------------------------------------------|
| GET     | /products            | Tous les produits    | —                                                |
| GET     | /products?q=xxx      | Recherche par nom    | —                                                |
| GET     | /products?category=x | Filtre par catégorie | —                                                |
| GET     | /products/:id        | Produit par ID       | —                                                |
| POST    | /products            | Créer un produit     | `{name, description, price, stock, category}`    |
| PUT     | /products/:id        | Modifier un produit  | `{name?, description?, price?, stock?}`          |
| DELETE  | /products/:id        | Supprimer un produit | —                                                |

## Orders

| Méthode | URL                        | Description                  | Body requis                  |
|---------|----------------------------|------------------------------|------------------------------|
| POST    | /orders                    | Créer une commande ⚡Kafka    | `{customer_id, items[]}`     |
| GET     | /orders/:id                | Commande par ID              | —                            |
| PATCH   | /orders/:id/status         | Changer le statut ⚡Kafka     | `{status}`                   |
| GET     | /customers/:id/orders      | Commandes d'un client        | —                            |

Statuts valides : `PENDING` → `CONFIRMED` → `SHIPPED` → `DELIVERED` (ou `CANCELLED`)

## Notifications

| Méthode | URL                          | Description                        |
|---------|------------------------------|------------------------------------|
| GET     | /notifications/:customerId   | Toutes les notifs d'un client      |
| PATCH   | /notifications/:id/read      | Marquer une notification comme lue |

## Format de réponse

Toutes les réponses suivent le format normalisé :

```json
{
  "success": true,
  "count": 5,
  "data": { ... }
}
```

En cas d'erreur :
```json
{
  "success": false,
  "error": "Message d'erreur"
}
```
