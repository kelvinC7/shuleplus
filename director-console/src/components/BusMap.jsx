import { useEffect, useRef } from 'react';
import { BUSES } from '../data/buses';

const SCHOOL = [-2.4835, 28.9085];

export function BusMap({ height = 220 }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const L = window.L;
    if (!ref.current) return;
    if (!L) {
      ref.current.innerHTML =
        '<div class="mapfb">The live map needs an internet connection.<br>Bus positions are still listed below.</div>';
      return;
    }
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    const map = L.map(ref.current, { zoomControl: false, attributionControl: true }).setView(SCHOOL, 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap © CARTO',
    }).addTo(map);
    L.marker(SCHOOL, {
      icon: L.divIcon({
        className: '',
        html: '<span class="schmk">★ St Matthew’s</span>',
        iconAnchor: [44, 12],
      }),
    }).addTo(map);
    BUSES.forEach((b) => {
      if (b.from && b.via) {
        L.polyline([b.from, b.via, SCHOOL], {
          color: b.st === 'late' ? '#E5484D' : '#13213D',
          weight: 3,
          opacity: 0.55,
          dashArray: '6 6',
        }).addTo(map);
      }
      const pos = b.via || b.from || SCHOOL;
      L.marker(pos, {
        icon: L.divIcon({
          className: '',
          html: `<span class="busmk ${b.st === 'late' ? 'late' : ''}">Bus ${b.n}</span>`,
          iconAnchor: [28, 12],
        }),
      }).addTo(map);
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div id="busmap" ref={ref} style={{ height, width: '100%', borderRadius: 14, overflow: 'hidden', background: '#e8ecf2' }} />;
}
