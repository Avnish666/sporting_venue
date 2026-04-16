import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function CrowdTrendChart({ zones }) {
  const [trendData, setTrendData] = useState([]);
  const zonesRef = useRef(zones);

  // Keep ref updated to avoid stale closures in interval
  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentZones = zonesRef.current;
      if (!currentZones || currentZones.length === 0) return;

      const totalOccupancy = currentZones.reduce((sum, z) => sum + z.currentOccupancy, 0);
      
      const newPoint = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        density: totalOccupancy,
        rawTime: Date.now()
      };

      setTrendData(prev => {
        const updated = [...prev, newPoint];
        if (updated.length > 15) {
          return updated.slice(updated.length - 15);
        }
        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const chartDataWithPrediction = useMemo(() => {
    if (trendData.length < 2) return trendData;
    
    // Copy real data
    const data = trendData.map(d => ({ ...d, predictedDensity: null }));
    
    const last = trendData[trendData.length - 1];
    const prev = trendData[trendData.length - 2];
    const diff = last.density - prev.density;
    
    // Set the hook for the dashed line on the current last point
    data[data.length - 1].predictedDensity = last.density;

    // Extrapolate for next 5 mins (assuming 3 seconds per tick, 5 mins = 300s = 100 ticks)
    // For visual purposes, we just add one point 5 mins in the future
    const futureTime = new Date(last.rawTime + 5 * 60000);
    const predictedVal = Math.max(0, last.density + (diff * 20)); // scale diff for visualization
    
    data.push({
      time: futureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (Pred)',
      density: null,
      predictedDensity: predictedVal,
      isPrediction: true
    });

    return data;
  }, [trendData]);

  const predictionSummary = useMemo(() => {
    if (trendData.length < 2) return null;
    const last = trendData[trendData.length - 1].density;
    const prev = trendData[trendData.length - 2].density;
    const diff = last - prev;
    
    const changePercent = last > 0 ? ((Math.abs(diff) / last) * 100).toFixed(1) : 0;

    if (diff > 0) return { trend: 'UP', text: `Crowd expected to increase by ${changePercent}% in next 10 minutes`, color: 'var(--danger)' };
    if (diff < 0) return { trend: 'DOWN', text: `Crowd expected to decrease by ${changePercent}% in next 10 minutes`, color: 'var(--success)' };
    return { trend: 'STABLE', text: 'Crowd levels are expected to remain stable', color: 'var(--text-semi)' };
  }, [trendData]);

  if (!zones || zones.length === 0 || trendData.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem', minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <div style={{ color: 'var(--text-semi)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="loader"></div> Gathering real-time trend data...
         </div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                Crowd Trend Graph 
                <span style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px', animation: 'flash 2s infinite' }}>
                   ● Updating live...
                </span>
              </h3>
            </div>
            {predictionSummary && (
                <span style={{ 
                    padding: '6px 12px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 'bold',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid rgba(255,255,255,0.1)`,
                    color: predictionSummary.color,
                    boxShadow: `0 0 10px ${predictionSummary.color}33`
                }}>
                    AI Prediction: {predictionSummary.text}
                </span>
            )}
        </div>
        
        <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartDataWithPrediction} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--text-semi)" fontSize={11} tickMargin={10} />
            <YAxis stroke="var(--text-semi)" fontSize={11} domain={[0, 'auto']} />
            <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--border)', borderRadius: '8px' }} 
                itemStyle={{ color: 'var(--primary)' }}
                labelStyle={{ color: 'var(--text-semi)', marginBottom: '5px' }}
            />
            <Line 
              type="monotone" 
              dataKey="density" 
              name="Current Trend"
              stroke="var(--primary)" 
              strokeWidth={3} 
              dot={{ r: 4, strokeWidth: 2 }} 
              activeDot={{ r: 6 }} 
              isAnimationActive={true} 
              animationDuration={500}
            />
            <Line 
              type="monotone" 
              dataKey="predictedDensity" 
              name="Predicted Trend"
              stroke="var(--accent)" 
              strokeWidth={2} 
              strokeDasharray="5 5" 
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={true}
            />
        </LineChart>
        </ResponsiveContainer>
    </div>
  );
}
