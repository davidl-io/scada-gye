import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './SectorMonitor.css';

// Initialize global connection
const socket = io('http://localhost:3001');

interface SectorMonitorProps {
  name: string;
  loadIconSrc: string;
  deviceId?: string;
  onLogEvent?: (type: 'critical'|'ok'|'warning'|'info', message: string) => void;
}

export const SectorMonitor: React.FC<SectorMonitorProps> = ({ name, loadIconSrc, deviceId, onLogEvent }) => {
  const [gridPower, setGridPower] = useState(true);
  const [loadPower, setLoadPower] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!deviceId) return;

    const handleDeviceStatus = (data: any) => {
      if (data.deviceId === deviceId) {
        setGridPower(data.gridPower);
        setLoadPower(data.loadPower);
        setIsLive(true);
      }
    };

    socket.on('device_status', handleDeviceStatus);
    
    // Cleanup Listener
    return () => { socket.off('device_status', handleDeviceStatus); };
  }, [deviceId]);

  // Track state transitions to emit logs
  const prevGrid = useRef(gridPower);
  const prevLoad = useRef(loadPower);

  useEffect(() => {
    if (gridPower !== prevGrid.current) {
      if (!gridPower) onLogEvent?.('critical', 'Red Pública CNEL sin energía');
      else onLogEvent?.('ok', 'Regresa energía CNEL');
      prevGrid.current = gridPower;
    }
    if (loadPower !== prevLoad.current) {
      if (!loadPower) onLogEvent?.('critical', 'Carga sin energía');
      else onLogEvent?.('ok', 'Regresa energía Carga');
      prevLoad.current = loadPower;
    }
  }, [gridPower, loadPower, onLogEvent]);

  // Logic map
  let statusText = "";
  let statusClass = "";

  if (gridPower && loadPower) {
    statusText = "NORMAL (RED PÚBLICA CNEL)";
    statusClass = "status-ok";
  } else if (!gridPower && loadPower) {
    statusText = "GENERADOR CAT C32 ACTIVO";
    statusClass = "status-warning";
  } else if (!gridPower && !loadPower) {
    statusText = "FALLA GENERADOR CAT C32";
    statusClass = "status-critical";
  } else if (gridPower && !loadPower) {
    statusText = "FALLA LOCAL / CARGA";
    statusClass = "status-critical";
  }

  const gridActive = gridPower && loadPower;
  const genActive = !gridPower && loadPower;

  return (
    <div className="glass-panel sector-container">
      <div className="sector-header">
        <h2>{name}</h2>
        <span className={`badge ${statusClass}`}>{statusText}</span>
      </div>

      <div className="visualization">
        <svg className="power-lines" width="100%" height="100%">
          <line 
            x1="60" y1="52" x2="88%" y2="50%"
            className={`power-line ${gridActive ? 'flow-active-grid' : ''}`}
          />
          <line 
            x1="60" y1="188" x2="88%" y2="50%"
            className={`power-line ${genActive ? 'flow-active-gen' : ''}`}
          />
        </svg>

        <div className={`node node-grid ${gridPower ? 'active' : 'error'}`}>
          <div className="icon-box"><img src="/grid_pole.png" className="realistic-icon" alt="Red Pública CNEL" /></div>
          <span className="node-label">Red Pública CNEL</span>
        </div>

        <div className={`node node-gen ${genActive ? 'gen-active' : ''} ${!gridPower && !loadPower ? 'error' : ''} ${gridPower && loadPower ? 'idle' : ''}`}>
          <div className="icon-box"><img src="/cat_generator.png" className="realistic-icon" alt="Generador CAT C32" /></div>
          <span className="node-label">Generador CAT C32</span>
        </div>

        <div className={`node node-load ${loadPower ? (gridActive ? 'active' : 'gen-active') : 'error'}`}>
          <div className="icon-box"><img src={loadIconSrc} className="realistic-icon" alt="Carga" /></div>
          <span className="node-label">Carga</span>
        </div>
      </div>

      <div className="controls">
        <span className="node-label" style={{ marginRight: 'auto', display: 'flex', alignItems: 'center' }}>
          {isLive ? `DATOS EN VIVO MQTT (${deviceId})` : "Simulador Manual Dragino"}
        </span>
        <div className="control-group">
          <label className="toggle-switch">
            <input type="checkbox" checked={gridPower} disabled={isLive} onChange={(e) => setGridPower(e.target.checked)} />
            <span className="slider"></span>
          </label>
          <span className="node-label">IN1</span>
        </div>
        <div className="control-group">
          <label className="toggle-switch">
            <input type="checkbox" checked={loadPower} disabled={isLive} onChange={(e) => setLoadPower(e.target.checked)} />
            <span className="slider"></span>
          </label>
          <span className="node-label">IN2</span>
        </div>
      </div>
    </div>
  );
};
