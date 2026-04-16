import React, { useState, useEffect } from 'react';
import { api } from '../config/api';
import AnimatedNumber from './AnimatedNumber';

export default function StadiumHeatmap({ zones, isEmergency, onVisit }) {
  const [pulseZone, setPulseZone] = useState(null);

  const handleVisit = async (zoneId) => {
    if (onVisit) onVisit(zoneId); // Optimistic UI update
    setPulseZone(zoneId);
    setTimeout(() => setPulseZone(null), 500); // Pulse effect duration
    try {
      await api.post(`/zones/${zoneId}/visit`);
    } catch (err) {
      console.error(err);
    }
  };

  const getColor = (percent, type) => {
    if (isEmergency && type === 'GATE') return 'var(--success)'; // Exits are safe in emergency
    if (isEmergency) return 'rgba(239, 68, 68, 0.5)'; // Danger everything else
    if (percent < 0.5) return 'var(--success)';
    if (percent < 0.8) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      
      {/* Stadium Oval Graphic */}
      <div style={{ 
        position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%', 
        border: isEmergency ? '2px dashed var(--danger)' : '2px dashed rgba(255,255,255,0.1)', 
        borderRadius: '50%', pointerEvents: 'none',
        transition: 'all 0.5s ease'
      }}></div>

      <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: isEmergency ? 'var(--danger)' : 'var(--text-semi)',
          fontWeight: 'bold', fontSize: '1.2rem', pointerEvents: 'none',
          textShadow: isEmergency ? '0 0 10px var(--danger)' : 'none',
          transition: 'all 0.5s ease'
      }}>
          {isEmergency ? 'EVACUATE' : 'FIELD'}
      </div>

      {zones.map((zone) => {
        const percent = zone.currentOccupancy / zone.capacity;
        const color = getColor(percent, zone.type);
        const isPulsing = pulseZone === zone.id;

        return (
          <div key={zone.id} title={`${zone.name} - Wait: ${zone.estimatedWaitTime}m`} style={{
            position: 'absolute',
            left: `${zone.x}%`,
            top: `${zone.y}%`,
            transform: `translate(-50%, -50%) ${isPulsing ? 'scale(1.1)' : 'scale(1)'}`,
            background: color,
            boxShadow: `0 0 15px ${color}`,
            borderRadius: zone.type === 'GATE' ? '4px' : '50%',
            padding: '5px 10px',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: isEmergency && zone.type === 'GATE' ? 20 : 10,
            border: isEmergency && zone.type === 'GATE' ? '2px solid #fff' : '2px solid rgba(255,255,255,0.2)',
            animation: isEmergency && zone.type === 'GATE' ? 'pulse 1.5s infinite' : 'none'
          }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>{zone.name}</div>
            <div style={{ fontSize: '1.1rem', margin: '2px 0' }}>
               <AnimatedNumber value={zone.currentOccupancy} />
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); handleVisit(zone.id); }}
                style={{
                  marginTop: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                  padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer',
                  transition: 'background 0.2s', width: '100%'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(0,0,0,0.5)'}
                >
                {isEmergency && zone.type === 'GATE' ? 'EVACUATE HERE' : `Visit (${zone.estimatedWaitTime}m)`}
            </button>
          </div>
        );
      })}
    </div>
  );
}
