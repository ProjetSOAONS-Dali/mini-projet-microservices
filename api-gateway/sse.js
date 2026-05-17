// api-gateway/sse.js
// Server-Sent Events — pousse les nouvelles notifications en temps réel
// Le frontend s'abonne à GET /events/:customerId et reçoit les events Kafka
// sans avoir besoin de faire du polling

const sseClients = new Map(); // customerId → Set<res>

/**
 * Enregistrer un client SSE
 * Le frontend appelle : GET /events/client-001
 */
const sseHandler = (req, res) => {
  const customerId = req.params.customerId;

  // Headers SSE obligatoires
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Ajouter ce client à la map
  if (!sseClients.has(customerId)) sseClients.set(customerId, new Set());
  sseClients.get(customerId).add(res);
  console.log(`📡 SSE: client ${customerId} connecté (${sseClients.get(customerId).size} connexions actives)`);

  // Ping toutes les 25s pour maintenir la connexion ouverte
  const ping = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  // Message de bienvenue
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Notifications en temps réel activées ✅', customerId })}\n\n`);

  // Nettoyage quand le client se déconnecte
  req.on('close', () => {
    clearInterval(ping);
    sseClients.get(customerId)?.delete(res);
    console.log(`📡 SSE: client ${customerId} déconnecté`);
  });
};

/**
 * Pousser une notification à un client spécifique
 * Appelé par le polling interne toutes les 2 secondes
 */
const pushToClient = (customerId, notification) => {
  const clients = sseClients.get(customerId);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify({ type: 'NOTIFICATION', notification })}\n\n`;
  clients.forEach(res => {
    try { res.write(payload); }
    catch (e) { clients.delete(res); }
  });
};

/**
 * Pousser un événement brut (pour debug / broadcast)
 */
const broadcast = (customerId, eventObj) => {
  const clients = sseClients.get(customerId);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(eventObj)}\n\n`;
  clients.forEach(res => {
    try { res.write(payload); }
    catch (e) { clients.delete(res); }
  });
};

module.exports = { sseHandler, pushToClient, broadcast, sseClients };