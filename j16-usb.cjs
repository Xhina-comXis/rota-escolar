const crypto = require('node:crypto');
const { get, put } = require('@vercel/blob');
const key = 'nova-alianca/tracking/j16-usb-ecosport.json';
const blobOptions = () => ({access:'private', token:process.env.BLOB_READ_WRITE_TOKEN});

function ecoSportUsbVehicle(vehicles) {
  const matches = vehicles.filter(v => /^EJF[A-Z0-9]{4}$/.test(String(v.plate).toUpperCase().replace(/[^A-Z0-9]/g,'')) &&
    /eco\s*sport/i.test(String(v.model)));
  return matches.length === 1 ? matches[0] : null;
}

async function readUsbPosition() {
  const result = await get(key, {...blobOptions(), useCache:false});
  if (!result) return null;
  if (result.statusCode !== 200 || !result.stream) throw Error('Posição USB indisponível.');
  return {position:await new Response(result.stream).json(), etag:result.blob.etag};
}

async function ingestUsb(req, res) {
  function reply(code) {
    res.writeHead(code, {'Cache-Control':'no-store'});
    res.end();
  }
  if (req.method !== 'POST') return reply(405);
  const token = process.env.J16_USB_TOKEN;
  const given = Buffer.from(String(req.headers.authorization || ''));
  const expected = Buffer.from('Bearer ' + token);
  if (!token || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return reply(401);
  let input;
  try {
    if (req.body !== undefined) {
      const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') :
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (Buffer.byteLength(raw) > 1024) return reply(413);
      input = JSON.parse(raw);
    } else {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        if ((size += chunk.length) > 1024) return reply(413);
        chunks.push(chunk);
      }
      input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
  } catch { return reply(400); }
  const {latitude,longitude,speed,time} = input || {};
  const timestamp = typeof time === 'string' ? Date.parse(time) : NaN;
  const now = Date.now();
  if (!Number.isFinite(timestamp) || timestamp < now - 120000 || timestamp > now + 15000 ||
      !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
      (speed !== null && (!Number.isFinite(speed) || speed < 0 || speed > 600))) return reply(422);

  const current = await readUsbPosition();
  if (current && Date.parse(current.position.time) >= timestamp) return reply(204);
  try {
    await put(key, JSON.stringify({latitude,longitude,speed,time:new Date(timestamp).toISOString()}), {
      ...blobOptions(), addRandomSuffix:false, allowOverwrite:!!current,
      ...(current ? {ifMatch:current.etag} : {}), contentType:'application/json'
    });
  } catch (error) {
    if (error.name === 'BlobPreconditionFailedError' || error.name === 'BlobAlreadyExistsError') return reply(409);
    throw error;
  }
  return reply(204);
}

module.exports = {ecoSportUsbVehicle, ingestUsb, readUsbPosition};
