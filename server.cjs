const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());

// Servir la interfaz gráfica SCADA producida por Vite
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json());

// MongoDB Config
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const MONGO_DB_NAME = 'scada_db';
let db;
let logsCollection;

MongoClient.connect(MONGO_URL)
  .then(client => {
    console.log(`[MongoDB] Connectado a ${MONGO_URL}`);
    db = client.db(MONGO_DB_NAME);
    logsCollection = db.collection('events');
    // Ensure index on time
    logsCollection.createIndex({ time: -1 });
  })
  .catch(err => console.error('[MongoDB] Connection Fetch Error:', err));

// Obtener histórico de eventos
app.get('/api/logs', async (req, res) => {
  if (!logsCollection) return res.json([]);
  try {
    const logs = await logsCollection.find().sort({ time: -1 }).limit(100).toArray();
    res.json(logs.reverse()); // Devolver chronologicamente
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Fallback universal para SPA de React
app.get(/^(.*)$/, (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuración MQTT a The Things Network / Chirpstack (IP LAN local del Aeropuerto)
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://172.28.2.20:1883';
const MQTT_OPTIONS = {
  username: process.env.MQTT_USERNAME || 'tagsa',
  password: process.env.MQTT_PASSWORD || 'NXS',
  clientId: process.env.MQTT_CLIENT_ID || `scada_web_${Math.random().toString(16).slice(3)}`
};

const mqttClient = mqtt.connect(MQTT_BROKER_URL, MQTT_OPTIONS);

let isMqttConnected = false;

mqttClient.on('connect', () => {
  console.log(`[MQTT] Conectado exitosamente al broker en ${MQTT_BROKER_URL}`);
  isMqttConnected = true;
  io.emit('mqtt_status', { connected: true, url: MQTT_BROKER_URL });
  
  // Suscribirse a todos los uplinks de los dispositivos tagsa
  // El topic del ejemplo es: v3/tagsa/devices/controlador-ils/up
  const topicRegex = 'v3/tagsa/devices/+/up';
  mqttClient.subscribe(topicRegex, (err) => {
    if (!err) {
      console.log(`[MQTT] Suscrito a: ${topicRegex}`);
    } else {
      console.error('[MQTT] Error de suscripción:', err);
    }
  });
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Connection ERROR:', err.message);
  isMqttConnected = false;
  io.emit('mqtt_status', { connected: false, url: MQTT_BROKER_URL });
});

mqttClient.on('offline', () => {
  console.warn('[MQTT] Broker desconectado o inalcanzable');
  isMqttConnected = false;
  io.emit('mqtt_status', { connected: false, url: MQTT_BROKER_URL });
});


mqttClient.on('message', (topic, message) => {
  try {
    const payloadBuffer = message.toString();
    const payloadData = JSON.parse(payloadBuffer);

    // Filter relevant payload and parse the Dragino payload
    if (payloadData && payloadData.uplink_message && payloadData.uplink_message.decoded_payload) {
      const decodedPayload = payloadData.uplink_message.decoded_payload;
      const deviceId = payloadData.end_device_ids?.device_id;
      
      console.log(`[MQTT] Mensaje de ${deviceId}: `, decodedPayload);

      // Extract DI1 (Grid) and DI2 (Load) according to the user's mapped device
      const gridStatus = decodedPayload.DI1_Activo; // false = failure, true = powered
      const loadStatus = decodedPayload.DI2_Activo; // false = failure, true = powered

      // Emit to WebSocket UI
      io.emit('device_status', {
        deviceId,
        gridPower: gridStatus,
        loadPower: loadStatus,
        timestamp: payloadData.received_at
      });
    }
  } catch (e) {
    console.error('[MQTT] Fallo convirtiendo el payload JSON:', e.message);
  }
});

// Socket.io Connect Logging
io.on('connection', (socket) => {
  console.log('[Websocket] SCADA UI Cliente Conectado', socket.id);
  // Send immediate MQTT status to the newly connected UI
  socket.emit('mqtt_status', { connected: isMqttConnected, url: MQTT_BROKER_URL });

  // Recibir log desde el frontend y guardar en Mongo
  socket.on('log_event', async (logData) => {
    try {
      if (logsCollection) {
        logData.time = new Date(logData.time);
        await logsCollection.insertOne(logData);
      }
    } catch (e) {
      console.error('[MongoDB] Fallo insertando log:', e.message);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Servidor] MQTT Proxy ejecutándose en http://localhost:${PORT}`);
});
