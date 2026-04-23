import React, { useState, useEffect, useRef } from 'react';

import './SectorMonitor.css';

import { socket } from '../socket';

interface SectorMonitorProps {
  name: string;
  loadIconSrc: string;
  deviceId?: string;
  onLogEvent?: (type: 'critical'|'ok'|'warning'|'info', message: string) => void;
}

export const SectorMonitor: React.FC<SectorMonitorProps> = ({ name, loadIconSrc, deviceId, onLogEvent }) => {
  const [gridPower, setGridPower] = useState(true);
  const [loadPower, setLoadPower] = useState(true);
  const [, setIsLive] = useState(false);
  const [, setLastMessageTime] = useState<number>(Date.now());
  const [isCommLost, setIsCommLost] = useState(true);

  useEffect(() => {
    if (!deviceId) return;

    const handleDeviceStatus = (data: any) => {
      if (data.deviceId === deviceId) {
        setGridPower(data.gridPower);
        setLoadPower(data.loadPower);
        setLastMessageTime(Date.now());
        setIsLive(true);
        if (isCommLost) {
          setIsCommLost(false);
          onLogEvent?.('ok', 'Comunicación restablecida');
        }
      }
    };

    socket.on('device_status', handleDeviceStatus);
    
    // Timer to check communication status
    const commTimer = setInterval(() => {
      setLastMessageTime(prevTime => {
        if (prevTime !== null && Date.now() - prevTime > 120000) {
          setIsCommLost(curr => {
            if (!curr) {
              onLogEvent?.('warning', 'Pérdida de Comunicación (MQTT intermitente/desconectado > 2min)');
              return true;
            }
            return curr;
          });
        }
        return prevTime;
      });
    }, 5000);

    // Cleanup Listener
    return () => { 
      socket.off('device_status', handleDeviceStatus);
      clearInterval(commTimer);
    };
  }, [deviceId, isCommLost, onLogEvent]);

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

  if (isCommLost) {
    statusText = "ESPERANDO CONEXIÓN...";
    statusClass = "status-warning";
  } else if (gridPower && loadPower) {
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
        {isCommLost && (
          <div className="visualization-overlay">
            <div className="overlay-content blink-orange">
              <span className="overlay-icon">⚠️</span>
              <span className="overlay-text">Precaución: Sin Comunicación</span>
            </div>
          </div>
        )}
        
        {!isCommLost && (!gridPower && !loadPower) && (
          <div className="visualization-overlay">
            <div className="overlay-content blink-red">
              <span className="overlay-icon">🚨</span>
              <span className="overlay-text">Falla de Generador</span>
            </div>
          </div>
        )}

        {!isCommLost && (gridPower && !loadPower) && (
          <div className="visualization-overlay">
            <div className="overlay-content blink-red">
              <span className="overlay-icon">🚨</span>
              <span className="overlay-text">Falla de Carga</span>
            </div>
          </div>
        )}
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

        <div className={`node node-load ${loadPower && !isCommLost ? (gridActive ? 'active' : 'gen-active') : 'error'}`}>
          <div className="icon-box"><img src={loadIconSrc} className="realistic-icon" alt="Carga" /></div>
          <span className="node-label">Carga</span>
        </div>
      </div>
    </div>
  );
};
