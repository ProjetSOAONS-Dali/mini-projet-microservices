# GraphQL — POST http://localhost:3000/graphql

## Queries

```graphql
# Tous les produits
{ products { id name price stock category } }

# Recherche par nom
{ products(query: "Laptop") { id name price } }

# Filtre par catégorie
{ products(category: "Mobile") { id name price } }

# Produit par ID
{ product(id: "p1") { id name description price stock } }

# Commande par ID
{ order(id: "uuid") { id status total items { product_name quantity unit_price } } }

# Commandes d'un client
{ ordersByCustomer(customer_id: "client-001") { id status total created_at } }

# Notifications d'un client
{ notifications(customer_id: "client-001") { id type message read created_at } }
```

## Mutations

```graphql
# Créer un produit
mutation {
  createProduct(name: "X", description: "Desc", price: 99.99, stock: 10, category: "Cat") {
    id name price
  }
}

# Modifier un produit
mutation {
  updateProduct(id: "uuid", price: 89.99, stock: 5) { id price stock }
}

# Supprimer un produit
mutation { deleteProduct(id: "uuid") }

# Créer une commande (⚡ déclenche Kafka order-created)
mutation {
  createOrder(
    customer_id: "client-001",
    items: [{ product_id: "p1", product_name: "Laptop Pro X", quantity: 1, unit_price: 1299.99 }]
  ) { id status total }
}

# Changer le statut d'une commande (⚡ déclenche Kafka order-updated)
mutation {
  updateOrderStatus(order_id: "uuid", status: "CONFIRMED") { id status }
}

# Marquer une notification comme lue
mutation { markNotificationAsRead(notification_id: "uuid") }
```
