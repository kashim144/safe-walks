
/**
 * Simple Safety Prediction Model
 * Calculates a safety score (0-100) based on various factors.
 */
export const calculateSafetyScore = (lat, lng, timeStr, incidents = [], reports = []) => {
  let score = 85; // Base score

  // 1. Time of Day Factor
  const hour = new Date(timeStr).getHours();
  if (hour >= 22 || hour <= 4) {
    score -= 20; // Late night is riskier
  } else if (hour >= 18 || hour <= 6) {
    score -= 10; // Evening/Early morning
  }

  // 2. Proximity to Incidents (Simulated Crime Data)
  // In a real app, this would use a spatial index
  incidents.forEach(incident => {
    const dist = getDistance(lat, lng, incident.lat, incident.lng);
    if (dist < 0.5) { // Within 500m
      score -= 30;
    } else if (dist < 1) { // Within 1km
      score -= 15;
    }
  });

  // 3. Community Reports
  reports.forEach(report => {
    const dist = getDistance(lat, lng, report.lat, report.lng);
    if (dist < 0.3) {
      score -= 10;
    }
  });

  return Math.max(0, Math.min(100, score));
};

// Haversine distance in km
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

/**
 * Mock ML Model (Decision Tree logic)
 */
export const predictSafety = (features) => {
  const { hour, density, history } = features;
  
  if (hour > 22 || hour < 5) {
    if (density < 2) return "High Risk";
    return "Moderate Risk";
  }
  
  if (history > 5) return "High Risk";
  
  return "Safe";
};
