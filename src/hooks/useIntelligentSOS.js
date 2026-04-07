
import { useEffect, useRef, useState } from 'react';

export const useIntelligentSOS = (user, location, onTrigger) => {
  const [batteryLevel, setBatteryLevel] = useState(null);
  const lastLocation = useRef(null);
  const lastMoveTime = useRef(Date.now());
  const NO_MOVEMENT_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    // 1. Battery Monitoring
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        const updateBattery = () => {
          const level = battery.level * 100;
          setBatteryLevel(level);
          if (level < 10 && !battery.charging) {
            console.warn("Low battery detected! Auto-triggering SOS...");
            onTrigger("Low Battery SOS");
          }
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        return () => battery.removeEventListener('levelchange', updateBattery);
      });
    }

    // 2. Movement Monitoring
    if (location) {
      if (!lastLocation.current) {
        lastLocation.current = location;
        lastMoveTime.current = Date.now();
      } else {
        const dist = getDistance(location[0], location[1], lastLocation.current[0], lastLocation.current[1]);
        if (dist > 0.01) { // Moved more than 10m
          lastLocation.current = location;
          lastMoveTime.current = Date.now();
        }
      }
    }

    const interval = setInterval(() => {
      if (Date.now() - lastMoveTime.current > NO_MOVEMENT_THRESHOLD) {
        console.warn("No movement detected! Auto-triggering SOS...");
        onTrigger("No Movement SOS");
        lastMoveTime.current = Date.now(); // Reset to avoid multiple triggers
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [location, onTrigger]);

  return { batteryLevel };
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
