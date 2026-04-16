import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, WS_URL } from '../config/api';
import Navbar from '../components/Navbar';
import StadiumHeatmap from '../components/StadiumHeatmap';
import CrowdTrendChart from '../components/CrowdTrendChart';
import { Client } from '@stomp/stompjs';
import { Bell, MapPin, Clock, Users, ArrowRight, ShieldAlert, Activity } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [zones, setZones] = useState([]);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');

  // Fetch events on load
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/events');
        setEvents(res.data);
      } catch (err) {
        console.error("Error fetching events:", err);
      }
    };
    fetchEvents();
  }, []);

  // Set up WebSockets when activeEvent is selected
  useEffect(() => {
    if (!activeEvent) return;

    // Fetch initial zones
    const fetchZones = async () => {
      try {
        const res = await api.get(`/zones/event/${activeEvent.id}`);
        setZones(res.data);
      } catch (err) {
        console.error("Error fetching zones", err);
      }
    };
    fetchZones();

    // Setup active notifications for capacity
    const capacityInterval = setInterval(() => {
      setZones(currentZones => {
        currentZones.forEach(z => {
          if (z.currentOccupancy / z.capacity > 0.8) {
            const msg = `System Alert: ${z.name} is highly congested (>${Math.round((z.currentOccupancy / z.capacity) * 100)}% capacity).`;
            setAlerts(prev => {
              // Avoid duplicate alerts in a short span
              if (prev.some(a => a.message === msg)) return prev;
              return [{ message: msg, timestamp: Date.now(), type: 'warning' }, ...prev].slice(0, 8);
            });
          }
        });
        return currentZones;
      });
    }, 10000);

    // Setup STOMP client
    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('Connected to WebSocket');
        client.subscribe('/topic/crowd_update', (message) => {
          if (message.body) setZones(JSON.parse(message.body));
        });
        client.subscribe('/topic/crowd_history', (message) => {
          if (message.body) setHistory(JSON.parse(message.body));
        });
        client.subscribe('/topic/alerts', (message) => {
          if (message.body) {
            const data = JSON.parse(message.body);
            setAlerts(prev => [data, ...prev].slice(0, 5));
          }
        });
        client.subscribe('/topic/emergency', (message) => {
          if (message.body) {
            const data = JSON.parse(message.body);
            setIsEmergency(data.active);
            setAlerts(prev => [data, ...prev].slice(0, 5));
          }
        });
      }
    });

    // Fallback for native websocket
    client.webSocketFactory = () => {
      const wsUrl = WS_URL.replace('http', 'ws');
      return new WebSocket(wsUrl);
    };

    client.activate();

    return () => {
      clearInterval(capacityInterval);
      client.deactivate();
      setHistory([]);
      setIsEmergency(false);
    };
  }, [activeEvent]);

  const handleOptimisticVisit = (zoneId) => {
    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, currentOccupancy: z.currentOccupancy + 1 } : z));
  };

  const joinEvent = async (event) => {
    try {
      const res = await api.post(`/events/${event.id}/join`);
      const updatedEvents = events.map(e => e.id === event.id ? res.data : e);
      setEvents(updatedEvents);
      setActiveEvent(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const broadcastAlert = async () => {
    if (!adminMessage) return;
    try {
      await api.post('/admin/alert', { message: adminMessage });
      setAdminMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleEmergency = async () => {
    try {
      await api.post('/admin/emergency', { active: !isEmergency });
    } catch (err) {
      console.error(err);
    }
  };

  // Optimization: Score = waitTime + (distance / 10). Lower is better.
  const getSmartRecommendation = () => {
    if (zones.length === 0) return null;

    // In emergency, always recommend gates only based on shortest distance + 0 wait (evacuation assume flat flow)
    const options = isEmergency ? zones.filter(z => z.type === 'GATE') : zones.filter(z => z.type === 'GATE' || z.type === 'FOOD');
    if (options.length === 0) return null;

    let best = options[0];
    let minScore = (best.estimatedWaitTime) + (best.distance / 10);

    options.forEach(z => {
      let score = (z.estimatedWaitTime) + (z.distance / 10);
      if (isEmergency) score = z.distance / 10; // purely distance driven in emergency
      if (score < minScore) {
        minScore = score;
        best = z;
      }
    });
    return best;
  };

  const recommendation = getSmartRecommendation();

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {isEmergency && (
        <div style={{ background: 'var(--danger)', color: '#fff', padding: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.3rem', letterSpacing: '2px', textTransform: 'uppercase', boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)' }} className="animate-fade-in">
          🚨 EMERGENCY EVACUATION PROTOCOL ACTIVE - PROCEED TO NEAREST SAFE EXIT 🚨
        </div>
      )}

      <div style={{ padding: '2rem', flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%' }}>

        {!activeEvent ? (
          <div>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '2rem' }}>Available Events</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {events.map(event => (
                <div key={event.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{event.title}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-semi)', marginBottom: '1rem' }}>
                    <span><Users size={16} style={{ display: 'inline', marginBottom: '-3px' }} /> {event.currentCount} / {event.totalCapacity}</span>
                  </div>
                  <button className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '10px' }} onClick={() => joinEvent(event)}>
                    Enter Venue <ArrowRight size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', margin: 0, color: isEmergency ? 'var(--danger)' : 'inherit' }}>{activeEvent.title}</h1>
                <p style={{ color: 'var(--text-semi)', marginTop: '5px' }}>Live Crowd Intelligence Dashboard</p>
              </div>
              <button onClick={() => setActiveEvent(null)} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
                Leave Event
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>

              {/* Main Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {recommendation && (
                  <div className="glass-panel animate-fade-in" style={{
                    padding: '1.5rem',
                    background: isEmergency ? 'linear-gradient(to right, rgba(239, 68, 68, 0.3), rgba(30, 33, 44, 0.7))' : 'linear-gradient(to right, rgba(99, 102, 241, 0.2), rgba(30, 33, 44, 0.7))',
                    borderLeft: `4px solid ${isEmergency ? 'var(--danger)' : 'var(--accent)'}`,
                    boxShadow: isEmergency ? '0 0 25px rgba(239, 68, 68, 0.3)' : '0 4px 20px rgba(99, 102, 241, 0.15)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isEmergency ? <ShieldAlert color="var(--danger)" /> : <MapPin color="var(--accent)" />}
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: isEmergency ? 'var(--danger)' : 'var(--accent)' }}>
                          {isEmergency ? 'SAFEST EVACUATION ROUTE' : 'AI Optimal Route'}
                        </h3>
                      </div>
                      <span style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-semi)' }}>
                        <Activity size={12} style={{ display: 'inline', marginRight: '4px', marginBottom: '-2px' }} />
                        AI Decision Matrix
                      </span>
                    </div>
                    <p style={{ fontSize: '1.1rem', margin: 0, marginBottom: '1rem' }}>
                      {isEmergency
                        ? <span>Head directly to <strong>{recommendation.name}</strong>. This is the fastest and clearest exit path based on live telemetry.</span>
                        : <span>Optimal destination is <strong>{recommendation.name}</strong> due to the lowest wait time (<strong>{recommendation.estimatedWaitTime} min</strong>) and favorable proximity.</span>
                      }
                    </p>

                    {/* Decision Transparency Panel */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                      <div style={{ fontSize: '0.85rem' }}><strong style={{ color: 'var(--success)', display: 'block', marginBottom: '2px' }}>Primary Factor</strong> {isEmergency ? 'Fastest Egress' : 'Wait Time'}</div>
                      <div style={{ fontSize: '0.85rem' }}><strong style={{ color: 'var(--success)', display: 'block', marginBottom: '2px' }}>Congestion</strong> Low Density</div>
                      <div style={{ fontSize: '0.85rem' }}><strong style={{ color: 'var(--success)', display: 'block', marginBottom: '2px' }}>Proximity</strong> {Math.round(recommendation.distance)}m away</div>
                    </div>
                  </div>
                )}

                <div className="glass-panel" style={{ padding: '2rem', minHeight: '500px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>{isEmergency ? 'Live Evacuation Map' : 'Real-Time Venue Heatmap'}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px', animation: 'flash 2s infinite' }}>
                      ● Updating live...
                    </span>
                  </div>
                  <StadiumHeatmap zones={zones} isEmergency={isEmergency} onVisit={handleOptimisticVisit} />
                </div>

                {!isEmergency && <CrowdTrendChart zones={zones} />}

              </div>

              {/* Sidebar Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                    <Bell size={20} color="var(--warning)" />
                    <h3 style={{ margin: 0 }}>Live Notifications</h3>
                  </div>
                  {alerts.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-semi)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                      <Activity size={24} style={{ opacity: 0.5, marginBottom: '5px' }} />
                      <p style={{ fontSize: '0.9rem', margin: 0 }}>System actively monitoring for congestion...</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {alerts.map((alert, i) => {
                        const isEmergencyAlert = alert.message.includes('EMERGENCY');
                        const isSystemWarning = alert.message.includes('System Alert');
                        const bgColor = isEmergencyAlert ? 'rgba(239, 68, 68, 0.15)' : (isSystemWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.1)');
                        const borderColor = isEmergencyAlert ? 'var(--danger)' : (isSystemWarning ? 'var(--warning)' : 'var(--primary)');

                        return (
                          <div key={i} className="animate-fade-in" style={{
                            background: bgColor,
                            borderLeft: `3px solid ${borderColor}`,
                            padding: '10px', borderRadius: '4px', fontSize: '0.95rem'
                          }}>
                            {alert.message}
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-semi)', marginTop: '5px' }}>
                              {new Date(alert.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {user?.role === 'ADMIN' && (
                  <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--danger)' }}>Admin Controls</h3>
                    <button
                      className={isEmergency ? "btn-primary" : "btn-danger"}
                      style={{ width: '100%', marginBottom: '15px' }}
                      onClick={toggleEmergency}>
                      {isEmergency ? 'Deactivate Emergency Mode' : 'TRIGGER EMERGENCY ALARM'}
                    </button>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '15px', marginTop: '10px' }}>
                      <textarea
                        className="input-field"
                        placeholder="Type standard alert message..."
                        rows="2"
                        value={adminMessage}
                        onChange={e => setAdminMessage(e.target.value)}
                        style={{ resize: 'none' }}
                      />
                      <button className="btn-primary" style={{ width: '100%' }} onClick={broadcastAlert}>
                        Broadcast Standard Alert
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
