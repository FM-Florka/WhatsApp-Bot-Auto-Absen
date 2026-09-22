require('dotenv').config();
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { isAbsenMessage } = require('./detect');
const { fillMyRow } = require('./fill');

const MY_NAME = process.env.MY_NAME || 'Muhammad Nabil';
const MY_NO = parseInt(process.env.MY_ABSEN_NO || '19', 10);
const DRY_RUN = process.env.DRY_RUN === 'true';
const COOLDOWN_MS = (parseInt(process.env.COOLDOWN_MIN || '30', 10) || 30) * 60 * 1000;
const lastSent = new Map(); // jid -> timestamp, cegah spam dobel
const AUTH_DIR = process.env.AUTH_DIR || 'auth_info';
const PHONE = (process.env.PHONE_NUMBER || '').replace(/\D/g, ''); // 628xx, tanpa +

function getText(m) {
  const msg = m.message;
  if (!msg) return '';
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    ''
  );
}

// Prefilter murah sebelum panggil Gemini (hemat kuota).
function looksLikeList(text) {
  if (!/absen|daftar hadir|isi list|isi absen/i.test(text)) return false;
  const numbered = text.split('\n').filter((l) => /^\s*>?\s*\d{1,2}[.\)\-:]/.test(l));
  return numbered.length >= 3;
}

async function handle(m, sock) {
  if (!m.message || m.key.fromMe) return;
  const jid = m.key.remoteJid;
  if (!jid || !jid.endsWith('@g.us')) return; // grup saja
  if (m.message.protocolMessage) return;

  const text = getText(m);
  if (!text || text.length < 50) return;
  if (text.includes(MY_NAME)) return; // list sudah ada namaku, skip

  const now = Date.now();
  if (now - (lastSent.get(jid) || 0) < COOLDOWN_MS) return;

  if (!looksLikeList(text)) return;

  const { isAbsen } = await isAbsenMessage(text);
  if (!isAbsen) {
    console.log(`[${jid}] bukan pesan absen, skip.`);
    return;
  }

  const result = fillMyRow(text, MY_NO, MY_NAME);
  console.log(`[${jid}] absen terdeteksi -> ${result.status}`);

  if (result.status !== 'filled') return; // already / occupied: jangan timpa, jangan kirim
  if (DRY_RUN) {
    console.log('--- DRY_RUN, tidak dikirim ---\n' + result.newText);
    return;
  }

  await sock.sendMessage(jid, { text: result.newText }, { quoted: m });
  lastSent.set(jid, now);
  console.log(`[${jid}] absen terkirim (no ${MY_NO} = ${MY_NAME}).`);
}

async function start() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY kosong. Isi file .env dulu (lihat .env.example).');
    process.exit(1);
  }
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['WA Auto Absen', 'Chrome', '1.0'],
  });

  // Railway: tanpa layar, scan QR mustahil. Pairing code solusinya.
  if (!sock.authState.creds.registered) {
    if (!PHONE) {
      console.error('Belum pairing. Isi PHONE_NUMBER=628xx di env, deploy ulang, kode 8 digit muncul di log.');
    } else {
      const code = await sock.requestPairingCode(PHONE);
      console.log(`Pairing code buat ${PHONE}: ${code} (input di WA > Perangkat Tertaut > Tautkan dgn nomor telepon)`);
    }
  }

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('Scan QR ini pakai WA kamu:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') console.log(`Bot connect. Siap absen no ${MY_NO} = ${MY_NAME}.`);
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log('Koneksi putus, reconnect...');
        start();
      } else {
        console.log('Logged out. Hapus folder auth_info lalu jalankan ulang untuk scan QR baru.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      try {
        await handle(m, sock);
      } catch (e) {
        console.error('handle error:', e.message);
      }
    }
  });
}

module.exports = { start };
