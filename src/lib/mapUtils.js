import L from 'leaflet';

export const createModeIcon = (mode) => {
  const icons = {
    car: 'https://cdn-icons-png.flaticon.com/512/741/741407.png',
    bike: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
    bus: 'https://cdn-icons-png.flaticon.com/512/3066/3066256.png',
    walk: 'https://cdn-icons-png.flaticon.com/512/3663/3663335.png'
  };
  return L.icon({
    iconUrl: icons[mode] || icons.car,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    className: 'mode-icon-glow'
  });
};

export const getTileUrl = (mapType) => {
  switch (mapType) {
    case 'satellite': return 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
    case 'terrain': return 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
    case 'hybrid': return 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    default: return 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
  }
};
