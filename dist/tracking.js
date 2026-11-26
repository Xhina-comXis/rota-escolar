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

let trackingBaseLayer = 'street';
const trackingMapStyles = `
.tracking-panel{padding:18px;overflow:hidden}
.tracking-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.tracking-header h2{margin:0}
.tracking-tools{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:12px 0}
.tracking-layers{display:inline-flex;padding:3px;gap:2px;border-radius:12px;background:#edf1f2}
.tracking-panel .tracking-tools button{min-height:40px;padding:0 11px;border:0;border-radius:9px;background:transparent;color:#15384b;font-weight:650}
.tracking-panel .tracking-tools button[aria-pressed=true]{background:#fff;box-shadow:0 1px 4px #15384b26}
.tracking-panel .tracking-tools .tracking-action{border:1px solid #dbe4e8;background:#fff}
.tracking-panel [data-tracking-map]{height:clamp(270px,48vh,440px);border-radius:15px;isolation:isolate;background:#edf1ee}
.tracking-panel .leaflet-control-zoom{border:0;border-radius:11px;box-shadow:0 1px 8px #15384b34;overflow:hidden}
.tracking-panel .leaflet-control-zoom a{width:36px;height:36px;line-height:36px;color:#15384b}
.tracking-panel .leaflet-control-attribution{white-space:normal;max-width:100%;font-size:9px}
.tracking-panel .help{margin:8px 0;color:#52646b}
.tracking-pin{display:grid;place-items:center;width:40px;height:40px;color:#fff;background:#15384b;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 10px #19384965;font-size:22px}
.tracking-tile-street{filter:saturate(.64) brightness(1.025)}
`;

function trackingCard(vehicle) {
  return '<section class="panel tracking-panel" data-vehicle-tracking="' + esc(vehicle.id) +
    '" data-tracking-plate="' + esc(vehicle.plate) + '"><style>' + trackingMapStyles + '</style>' +
    '<div class="tracking-header"><h2>Rastreamento</h2></div>' +
    '<p class="help" role="status">Consultando posição…</p>' +
    '<div data-map-controls hidden><div class="tracking-tools"><div class="tracking-layers" role="group" aria-label="Visual do mapa">' +
    '<button type="button" data-layer="street">Ruas</button><button type="button" data-layer="satellite">Satélite</button>' +
    '<button type="button" data-layer="terrain">Relevo</button></div>' +
    '<button type="button" class="tracking-action" data-center-map>Centralizar</button>' +
    '<button type="button" class="tracking-action" data-compare-location>Minha localização</button></div></div>' +
    '<div role="region" aria-label="Mapa da posição do veículo" hidden data-tracking-map></div>' +
    '<p class="help" role="status" data-location-status hidden></p><p class="help" data-map-message hidden></p></section>';
}

function initVehicleTracking() {
  const card = document.querySelector('[data-vehicle-tracking]');
  if (!card) return;
  const output = card.querySelector('[role="status"]');
  const canvas = card.querySelector('[data-tracking-map]');
  const centerButton = card.querySelector('[data-center-map]');
  const compareButton = card.querySelector('[data-compare-location]');
  const controls = card.querySelector('[data-map-controls]');
  const mapMessage = card.querySelector('[data-map-message]');
  const comparison = card.querySelector('[data-location-status]');
  const choices = [...card.querySelectorAll('[data-layer]')];
  const format = new Intl.DateTimeFormat('pt-BR', {dateStyle:'short',timeStyle:'medium',timeZone:'America/Sao_Paulo'});
  let map, marker, previous, latest, phone, phoneDot, accuracyCircle, activeLayer, layers, leaflet;
  centerButton.onclick = () => map?.panTo(marker.getLatLng());

  function compareLocations() {
    if (!phone || !latest) return;
    const distance = map.distance(phone.point, [latest.latitude, latest.longitude]);
    comparison.textContent = 'Celular × J16: ' + Math.round(distance).toLocaleString('pt-BR') + ' m entre os pontos · celular ±' +
      Math.ceil(phone.accuracy).toLocaleString('pt-BR') + ' m · comparação às ' + format.format(new Date(phone.time));
    comparison.hidden = false;
  }

  compareButton.onclick = () => {
    comparison.hidden = false;
    if (!navigator.geolocation) {
      comparison.textContent = 'Este navegador não oferece localização.';
      return;
    }
    compareButton.disabled = true;
    comparison.textContent = 'Consultando a localização deste aparelho…';
    navigator.geolocation.getCurrentPosition(({coords,timestamp}) => {
      if (!card.isConnected) return;
      compareButton.disabled = false;
      phone = {point:[coords.latitude,coords.longitude],accuracy:coords.accuracy,time:timestamp};
      phoneDot?.remove();
      accuracyCircle?.remove();
      accuracyCircle = leaflet.circle(phone.point,{radius:phone.accuracy,color:'#1976d2',weight:1,fillOpacity:.13}).addTo(map);
      phoneDot = leaflet.circleMarker(phone.point,{radius:8,color:'#fff',weight:3,fillColor:'#1976d2',fillOpacity:1})
        .addTo(map).bindTooltip('Localização deste aparelho');
      map.fitBounds(accuracyCircle.getBounds().extend(marker.getLatLng()),{padding:[32,32],maxZoom:18});
      compareLocations();
    }, () => {
      compareButton.disabled = false;
      comparison.textContent = 'Localização indisponível. Confira a permissão de localização no navegador.';
    }, {enableHighAccuracy:true,maximumAge:0,timeout:15000});
  };

  function changeLayer(name) {
    trackingBaseLayer = name;
    if (activeLayer) map.removeLayer(activeLayer);
    activeLayer = layers[name].addTo(map);
    mapMessage.hidden = true;
    for (const button of choices) button.setAttribute('aria-pressed',button.dataset.layer === name);
  }

  async function renderMap(position) {
    leaflet = await loadTrackingMap();
    if (!card.isConnected) return;
    latest = position;
    const point = [position.latitude, position.longitude];
    if (!map) {
      canvas.hidden = false;
      map = leaflet.map(canvas, {scrollWheelZoom:false,maxZoom:19}).setView(point, 17);
      const commons = {maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin'};
      const eox = 'https://tiles.maps.eox.at/wmts/1.0.0/';
      const osm = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
      const eoxLink = '<a href="https://maps.eox.at/">EOX</a>';
      layers = {
        street:leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          {...commons,className:'tracking-tile-street',attribution:osm}),
        satellite:leaflet.tileLayer(eox+'s2cloudless_3857/default/g/{z}/{y}/{x}.jpg',
          {...commons,maxNativeZoom:15,attribution:'<a href="https://cloudless.eox.at/">Sentinel-2 cloudless 2016</a> by '+eoxLink+' (modified Copernicus Sentinel data 2016/2017)'}),
        terrain:leaflet.tileLayer(eox+'terrain_3857/default/g/{z}/{y}/{x}.jpg',
          {...commons,maxNativeZoom:15,attribution:osm+' · NASA SRTM, USGS, Copernicus, Natural Earth · '+eoxLink})
      };
      for (const [name,layer] of Object.entries(layers)) {
        layer.on('tileerror',() => {
          if (trackingBaseLayer !== name) return;
          mapMessage.textContent = 'Parte desta camada não carregou. Você pode trocar a visualização.';
          mapMessage.hidden = false;
        });
      }
      for (const button of choices) button.onclick = () => changeLayer(button.dataset.layer);
      changeLayer(trackingBaseLayer);
      leaflet.control.scale({imperial:false}).addTo(map);
      const icon = leaflet.divIcon({
        className:'tracking-car-marker', iconSize:[40,40],iconAnchor:[20,20],popupAnchor:[0,-20],
        html:'<span class="tracking-pin" aria-hidden="true">🚗</span>'
      });
      const label = 'Veículo ' + card.dataset.trackingPlate;
      const popup = document.createElement('span');
      popup.textContent = label;
      marker = leaflet.marker(point,{icon,title:label,alt:label}).addTo(map).bindPopup(popup);
      controls.hidden = false;
    } else {
      marker.setLatLng(point);
    }
    compareLocations();
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
          (Number.isFinite(position.speed) ? position.speed + ' km/h' : 'GPS');
        previous = label.replace('Ao vivo via USB','Última posição conhecida · USB');
        try { await renderMap(position); }
        catch {
          mapMessage.textContent = 'O mapa não carregou. Coordenadas: ' + position.latitude.toFixed(5) + ', ' + position.longitude.toFixed(5);
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
