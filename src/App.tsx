import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import { SectorMonitor } from './components/SectorMonitor';
import { EventLog } from './components/EventLog';
import type { ScadaEvent } from './components/EventLog';

// Dynamically connect to the local Vite proxy or the same-domain production server
const socketURL = import.meta.env.DEV ? 'http://localhost:3001' : '/';
const socket = io(socketURL);

function App() {
  const [mqttStatus, setMqttStatus] = useState<boolean | null>(null);
  const [events, setEvents] = useState<ScadaEvent[]>([]);

  const addEvent = (sector: string, type: 'critical'|'ok'|'warning'|'info', message: string) => {
    setEvents(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date(),
      sector,
      type,
      message
    }]);
  };

  useEffect(() => {
    socket.on('mqtt_status', (data) => {
      setMqttStatus(prev => {
        if (prev === true && data.connected === false) {
           addEvent('System', 'critical', 'Sin Comunicación MQTT');
        } else if (prev === false && data.connected === true) {
           addEvent('System', 'ok', 'MQTT Conectado Exitosamente');
        }
        return data.connected;
      });
    });
    return () => {
      socket.off('mqtt_status');
    };
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <h1>SCADA System</h1>
        <p>Aeropuerto de Guayaquil - Monitoreo de Energía</p>
        <div className={`mqtt-badge ${mqttStatus ? 'mqtt-connected' : 'mqtt-disconnected'}`}>
          <div className="mqtt-dot"></div>
          <span>{mqttStatus ? 'MQTT CONECTADO (172.28.2.20)' : 'SIN COMUNICACIÓN MQTT (Reintentando...)'}</span>
        </div>
      </header>

      <main className="main-layout">
        <div className="dashboard">
          <SectorMonitor 
            name="Sector ILS (Localizador)" 
            loadIconSrc="/ils_localizer.png" 
            deviceId="controlador-ils" 
            onLogEvent={(t, m) => addEvent('Sector ILS', t, m)}
          />
          <SectorMonitor 
            name="Sector Glide Slope" 
            loadIconSrc="/glide_slope.png" 
            onLogEvent={(t, m) => addEvent('Glide Slope', t, m)}
          />
        </div>
        <div className="log-panel">
          <EventLog events={events} />
        </div>
      </main>
    </div>
  );
}

export default App;
