let trackingMapLibrary;

function loadTrackingMap() {
  if (trackingMapLibrary) return trackingMapLibrary;
  const base = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/';
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = base + 'leaflet.css';
  css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  const js = document.createElement('script');
  js.src = base + 'leaflet.js';
  js.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
  const load = asset => new Promise((resolve, reject) => {
    asset.crossOrigin = 'anonymous';
    asset.onload = resolve;
    asset.onerror = reject;
    document.head.append(asset);
  });
  trackingMapLibrary = Promise.all([load(css), load(js)]).then(() => window.L).catch(error => {
    css.remove();
    js.remove();
    trackingMapLibrary = null;
    throw error;
  });
  return trackingMapLibrary;
}

function trackingCard(vehicle) {
  return '<section class="panel" data-vehicle-tracking="' + esc(vehicle.id) +
    '" data-tracking-plate="' + esc(vehicle.plate) + '"><div class="section-head"><h2>Rastreamento</h2>' +
    '<button type="button" class="text" data-center-map hidden style="display:none">Centralizar veículo</button></div>' +
    '<p class="help" role="status">Consultando posição…</p>' +
    '<div role="region" aria-label="Mapa da posição do veículo" hidden ' +
    'style="height:clamp(240px,45vh,420px);border-radius:12px;isolation:isolate;background:#eef0eb" data-tracking-map></div>' +
    '<p class="help" data-map-message hidden></p></section>';
}

function initVehicleTracking() {
  const card = document.querySelector('[data-vehicle-tracking]');
  if (!card) return;
  const output = card.querySelector('[role="status"]');
  const canvas = card.querySelector('[data-tracking-map]');
  const centerButton = card.querySelector('[data-center-map]');
  const mapMessage = card.querySelector('[data-map-message]');
  const format = new Intl.DateTimeFormat('pt-BR', {dateStyle:'short',timeStyle:'medium',timeZone:'America/Sao_Paulo'});
  let map, marker, previous;
  centerButton.onclick = () => map?.panTo(marker.getLatLng());

  async function renderMap(position) {
    const leaflet = await loadTrackingMap();
    if (!card.isConnected) return;
    const point = [position.latitude, position.longitude];
    if (!map) {
      canvas.hidden = false;
      map = leaflet.map(canvas, {scrollWheelZoom:false}).setView(point, 16);
      leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom:19, referrerPolicy:'strict-origin-when-cross-origin',
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      const icon = leaflet.divIcon({
        className:'tracking-car-marker', iconSize:[40,40], iconAnchor:[20,20], popupAnchor:[0,-20],
        html:'<span aria-hidden="true" style="display:grid;place-items:center;width:40px;height:40px;background:#15384b;color:white;border:2px solid white;border-radius:50%;box-shadow:0 2px 8px #172a4266;font-size:21px">🚗</span>'
      });
      const label = 'Veículo ' + card.dataset.trackingPlate;
      const popup = document.createElement('span');
      popup.textContent = label;
      marker = leaflet.marker(point, {icon,title:label,alt:label}).addTo(map).bindPopup(popup);
      centerButton.hidden = false;
      centerButton.style.removeProperty('display');
    } else {
      marker.setLatLng(point);
    }
    mapMessage.hidden = true;
  }

  async function update() {
    if (!card.isConnected) {
      map?.remove();
      return;
    }
    try {
      const response = await fetch('/api/tracking?vehicle=' + encodeURIComponent(card.dataset.vehicleTracking),
        {cache:'no-store', signal:AbortSignal.timeout(9000)});
      if (!response.ok) throw Error();
      const data = await response.json();
      if (!card.isConnected) return;
      const position = data.position;
      let label = data.source === 'usb' ?
        (position ? (data.live ? 'Ao vivo via USB' : 'Última posição conhecida · USB') : 'J16 via USB · aguardando posição GPS') :
        (position ? 'Última posição recebida' : 'Sem posição de rastreador para este veículo.');
      if (position) {
        label += ' · ' + format.format(new Date(position.time)) + ' · ' +
          position.latitude.toFixed(5) + ', ' + position.longitude.toFixed(5) +
          (position.speed === null ? '' : ' · ' + position.speed + ' km/h');
        previous = label.replace('Ao vivo via USB','Última posição conhecida · USB');
        try { await renderMap(position); }
        catch {
          mapMessage.textContent = 'O mapa não carregou. As coordenadas estão acima.';
          mapMessage.hidden = false;
        }
      }
      if (output.textContent !== label) output.textContent = label;
    } catch { output.textContent = previous ? previous + ' · atualização indisponível' : 'Posição temporariamente indisponível.'; }
    finally {
      if (card.isConnected) setTimeout(update, 15000);
      else map?.remove();
    }
  }
  update();
}
