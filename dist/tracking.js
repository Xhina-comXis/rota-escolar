const trackingLabels = {
  unlinked: 'Sem rastreador vinculado', waiting: 'Aguardando posição',
  offline: 'Sem sinal recente', moving: 'Em movimento', stopped: 'Parado'
};

function trackingView() {
  return pageHead('Rastreamento', 'Últimas posições dos rastreadores associados à frota.') +
    '<section class="panel"><h2>Veículos por placa</h2>' +
    '<label>Buscar placa <input id="tracking-filter" type="search" autocomplete="off"></label> ' +
    '<button type="button" class="text" id="tracking-refresh">Atualizar posições</button>' +
    '<p id="tracking-state" role="status"></p><div id="tracking-results"></div></section>';
}

function initTracking() {
  const results = document.getElementById('tracking-results');
  const status = document.getElementById('tracking-state');
  const filter = document.getElementById('tracking-filter');
  const refresh = document.getElementById('tracking-refresh');
  let vehicles = [];
  const normalize = value => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const timeFormat = new Intl.DateTimeFormat('pt-BR', {dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'});

  function render() {
    const visible = vehicles.filter(vehicle => normalize(vehicle.plate).includes(normalize(filter.value)));
    results.innerHTML = visible.map(vehicle => {
      const position = vehicle.position;
      return '<div class="row"><div class="grow"><strong>' + esc(vehicle.plate) + '</strong><div>' +
        esc(trackingLabels[vehicle.status]) + (position ? ' · ' + position.speed + ' km/h</div><small>' +
          esc(timeFormat.format(new Date(position.time))) + ' · ' + position.latitude.toFixed(5) + ', ' +
          position.longitude.toFixed(5) + '</small>' : '</div>') + '</div></div>';
    }).join('');
    if (vehicles.length && !visible.length) results.textContent = 'Nenhuma placa encontrada.';
  }

  async function loadTracking() {
    refresh.disabled = true;
    status.textContent = 'Consultando posições…';
    try {
      const response = await fetch('/api/tracking', {cache:'no-store', signal:AbortSignal.timeout(9000)});
      if (!response.ok) throw Error(response.status === 401 || response.status === 403 ?
        'Entre com uma conta de administração ou gestão.' : 'Não foi possível consultar as posições.');
      const data = await response.json();
      vehicles = data.vehicles;
      status.textContent = !data.configured ? 'Receptor GPS aguardando configuração no servidor.' :
        vehicles.length ? 'Posições consultadas às ' + timeFormat.format(new Date()) + '.' : 'Cadastre veículos na frota para começar.';
      render();
    } catch (error) {
      vehicles = [];
      render();
      status.textContent = error.name === 'TimeoutError' ? 'A consulta demorou demais. Tente atualizar.' : error.message;
    } finally {
      refresh.disabled = false;
    }
  }
  filter.addEventListener('input', render);
  refresh.addEventListener('click', loadTracking);
  loadTracking();
}
