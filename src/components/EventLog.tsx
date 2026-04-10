import React, { useRef, useEffect } from 'react';
import './EventLog.css';

export interface ScadaEvent {
  id: string;
  time: Date;
  sector: string;
  type: 'critical' | 'ok' | 'warning' | 'info';
  message: string;
}

interface EventLogProps {
  events: ScadaEvent[];
}

export const EventLog: React.FC<EventLogProps> = ({ events }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="glass-panel event-log-container">
      <div className="event-log-header">
        <h2>Registro de Eventos</h2>
      </div>
      <div className="event-log-list" ref={scrollRef}>
        {events.length === 0 ? (
          <div className="event-empty">Sin eventos registrados</div>
        ) : (
          events.map(ev => (
            <div key={ev.id} className={`event-item type-${ev.type}`}>
              <div className="event-meta">
                <span className="event-time">{ev.time.toLocaleTimeString()}</span>
                <span className="event-sector">{ev.sector}</span>
              </div>
              <span className="event-message">{ev.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
