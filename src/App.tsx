import { useState, useEffect } from 'react';

import './App.css';
import { SectorMonitor } from './components/SectorMonitor';
import { EventLog } from './components/EventLog';
import type { ScadaEvent } from './components/EventLog';

import { socket } from './socket';

function App() {
  const [mqttStatus, setMqttStatus] = useState<boolean | null>(null);
  const [events, setEvents] = useState<ScadaEvent[]>([]);
  const [mqttUrl, setMqttUrl] = useState<string>('');

  useEffect(() => {
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEvents(data.map((item: any) => ({
            ...item,
            time: new Date(item.time)
          })));
        }
      })
      .catch(console.error);
  }, []);

  const addEvent = (sector: string, type: 'critical'|'ok'|'warning'|'info', message: string) => {
    const newEvent: ScadaEvent = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date(),
      sector,
      type,
      message
    };
    setEvents(prev => [...prev, newEvent]);
    socket.emit('log_event', newEvent);
  };

  useEffect(() => {
    socket.on('mqtt_status', (data) => {
      if (data.url) setMqttUrl(data.url);
      setMqttStatus(prev => {
        if (prev === true && data.connected === false) {
           addEvent('System', 'critical', 'Sin Comunicación MQTT');
        } else if (prev === false && data.connected === true) {
           addEvent('System', 'ok', `MQTT Conectado Exitosamente`);
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
          <span>{mqttStatus ? `MQTT CONECTADO (${mqttUrl.replace('mqtt://', '')})` : 'SIN COMUNICACIÓN MQTT (Reintentando...)'}</span>
        </div>
      </header>

      <main className="main-layout">
        <div className="log-panel">
          <EventLog events={events} />
        </div>
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
            deviceId="controlador-glide"
            onLogEvent={(t, m) => addEvent('Glide Slope', t, m)}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
