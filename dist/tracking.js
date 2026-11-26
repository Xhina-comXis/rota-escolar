function trackingCard(vehicle) {
  return '<section class="panel" data-vehicle-tracking="' + esc(vehicle.id) +
    '"><div class="section-head"><h2>Rastreamento</h2></div><p class="help">Consultando posição…</p></section>';
}

function initVehicleTracking() {
  const card = document.querySelector('[data-vehicle-tracking]');
  if (!card) return;
  const output = card.querySelector('p');
  const format = new Intl.DateTimeFormat('pt-BR', {dateStyle:'short',timeStyle:'medium',timeZone:'America/Sao_Paulo'});
  async function update() {
    if (!card.isConnected) return;
    try {
      const response = await fetch('/api/tracking?vehicle=' + encodeURIComponent(card.dataset.vehicleTracking),
        {cache:'no-store', signal:AbortSignal.timeout(9000)});
      if (!response.ok) throw Error();
      const data = await response.json();
      const position = data.position;
      output.textContent = data.source === 'usb' ?
        (position ? (data.live ? 'Ao vivo via USB' : 'USB · sem atualização recente') : 'J16 via USB · aguardando posição GPS') :
        (position ? 'Última posição recebida' : 'Sem posição de rastreador para este veículo.');
      if (position) {
        output.append(document.createElement('br'), format.format(new Date(position.time)) + ' · ' +
          position.latitude.toFixed(5) + ', ' + position.longitude.toFixed(5) +
          (position.speed === null ? '' : ' · ' + position.speed + ' km/h'));
      }
    } catch { output.textContent = 'Posição temporariamente indisponível.'; }
    if (card.isConnected) setTimeout(update, 15000);
  }
  update();
}
