import L from 'leaflet';

export const getSimFromIcon = () => {
  return L.divIcon({
    className: 'transition-transform duration-[3000ms] ease-linear',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75 animate-ping" style="animation-duration: 1.5s;"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-white shadow-md"></span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

export const getSimToIcon = () => {
  return L.divIcon({
    className: 'transition-transform duration-[3000ms] ease-linear',
    html: `
      <div class="relative flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 border-2 border-white shadow-[0_0_10px_rgba(225,29,72,0.6)]">
        <div class="w-2 h-2 rounded-full bg-white"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export const getBusIcon = (crowdStatus, ticketsSold, capacity, isSelected) => {
  let colorClass = 'bg-emerald-500';
  let ringClass = 'ring-emerald-500/30';

  if (crowdStatus === 'crowded') {
    colorClass = 'bg-amber-500';
    ringClass = 'ring-amber-500/30';
  } else if (crowdStatus === 'overcrowded') {
    colorClass = 'bg-orange-600';
    ringClass = 'ring-orange-600/30 animate-pulse';
  } else if (crowdStatus === 'full') {
    colorClass = 'bg-rose-700';
    ringClass = 'ring-rose-700/30';
  }

  const selectedStyle = isSelected ? 'scale-125 ring-4 ring-cyan-400 z-[999]' : 'ring-4';
  const seatIndicator = capacity >= ticketsSold ? `${capacity - ticketsSold}` : `+${ticketsSold - capacity}`;

  return L.divIcon({
    className: 'transition-transform duration-[3000ms] ease-linear',
    html: `
      <div class="relative flex items-center justify-center w-10 h-10 rounded-full shadow-2xl transition-all duration-300 ${colorClass} ${ringClass} ${selectedStyle}">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 text-white">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.317-5.074a2.25 2.25 0 0 0-2.247-2.112H18M4.75 6.75h14.5m-14.5 4h14.5M3 14.25h18M6.75 6.75v7.5m10.5-7.5v7.5" />
        </svg>
        <div class="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 border border-slate-700 text-[9px] font-extrabold text-white">
          ${seatIndicator}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

export const getUnofficialStopIcon = (isHighlighted) => {
  const colorClass = isHighlighted ? 'bg-emerald-500 shadow-emerald-500/80' : 'bg-amber-500 shadow-amber-500/80';
  return L.divIcon({
    className: 'transition-transform duration-[3000ms] ease-linear',
    html: `
      <div class="relative flex items-center justify-center w-5 h-5">
        <span class="absolute inline-flex h-3.5 w-3.5 rounded-full border-2 border-white ${colorClass} animate-ping"></span>
        <span class="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white ${colorClass} shadow-lg"></span>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

export const getOfficialStopIcon = (isHighlighted) => {
  const bgClass = isHighlighted ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-blue-600 shadow-blue-500/50';
  return L.divIcon({
    className: 'transition-transform duration-[3000ms] ease-linear',
    html: `
      <div class="relative flex items-center justify-center w-5 h-5 rounded-full ${bgClass} shadow-lg border border-white">
        <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};
