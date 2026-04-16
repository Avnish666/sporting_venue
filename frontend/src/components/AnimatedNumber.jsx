import React, { useState, useEffect } from 'react';

export default function AnimatedNumber({ value, duration = 500, style }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTimestamp = null;
    const startValue = displayValue;
    const endValue = value;
    if (startValue === endValue) return;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function (easeOutQuad)
      const easeProgress = progress * (2 - progress);
      
      const currentVal = Math.floor(startValue + (endValue - startValue) * easeProgress);
      setDisplayValue(currentVal);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span style={style}>{displayValue}</span>;
}
