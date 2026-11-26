const normalizePlate = value => String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function fleetTracking(vehicles, env = process.env, request = fetch) {
  if (!env.TRACCAR_URL || !env.TRACCAR_TOKEN) return { configured: false, vehicles: [] };

  try {
    const base = new URL(env.TRACCAR_URL);
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
      throw Error('Invalid tracking URL');
    }
    base.pathname = base.pathname.replace(/\/?$/, '/');
    const signal = AbortSignal.timeout(5000);
    const read = async resource => {
      const response = await request(new URL('api/' + resource, base), {
        headers: { Authorization: 'Bearer ' + env.TRACCAR_TOKEN },
        redirect: 'error',
        signal
      });
      if (!response.ok) throw Error('Tracking upstream error');
      const data = await response.json();
      if (!Array.isArray(data)) throw Error('Invalid tracking response');
      return data;
    };
    const [devices, positions] = await Promise.all([read('devices'), read('positions')]);
    const devicesByPlate = new Map();
    for (const device of devices) {
      const plate = normalizePlate(device.name);
      devicesByPlate.set(plate, devicesByPlate.has(plate) ? null : device);
    }
    const positionsById = new Map(positions.map(position => [position.id, position]));
    return {
      configured: true,
      vehicles: vehicles.map(vehicle => {
        const device = devicesByPlate.get(normalizePlate(vehicle.plate));
        const position = positionsById.get(device?.positionId);
        const time = Date.parse(position?.fixTime);
        const valid = position?.deviceId === device?.id && position?.valid === true &&
          Number.isFinite(time) && Number.isFinite(position.latitude) && Math.abs(position.latitude) <= 90 &&
          Number.isFinite(position.longitude) && Math.abs(position.longitude) <= 180;
        const speed = valid && Number.isFinite(position.speed) ? Math.max(0, Math.round(position.speed * 1.852)) : 0;
        const recent = valid && Date.now() - time <= 15 * 60 * 1000;
        return {
          plate: vehicle.plate,
          status: !device ? 'unlinked' : !valid ? 'waiting' : !recent || device.status !== 'online' ? 'offline' : speed >= 3 ? 'moving' : 'stopped',
          position: valid ? { latitude: position.latitude, longitude: position.longitude, time: new Date(time).toISOString(), speed } : null
        };
      }).sort((a,b) => a.plate.localeCompare(b.plate))
    };
  } catch {
    const failure = Error('O receptor GPS não respondeu. Tente novamente.');
    failure.status = 502;
    throw failure;
  }
}
module.exports = { fleetTracking };
