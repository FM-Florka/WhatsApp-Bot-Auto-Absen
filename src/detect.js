const { GoogleGenerativeAI } = require('@google/generative-ai');

let model = null;
function getModel() {
  if (model) return model;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
  return model;
}

const PROMPT = `Kamu pengklasifikasi pesan WhatsApp grup kelas.
Tugas: tentukan apakah pesan berikut adalah PESAN ABSEN / DAFTAR HADIR yang harus diisi siswa.
Ciri pesan absen: ada kata absen/daftar hadir/isi list, ada daftar bernomor (1. nama, 2. nama, dst, boleh berisi titik-titik "..." untuk slot kosong).
Bukan absen: obrolan biasa, pertanyaan, pengumuman tanpa daftar nama bernomor.
Balas HANYA JSON valid tanpa markdown: {"is_absen": true/false, "alasan": "singkat"}

Pesan:
"""
<<<TEXT>>>
"""`;

// Fallback lokal kalau Gemini error / kuota habis.
function heuristic(text) {
  const hasKeyword = /absen|daftar hadir/i.test(text);
  const numbered = text.split('\n').filter((l) => /^\s*>?\s*\d{1,2}[.\)\-:]/.test(l)).length;
  return { isAbsen: hasKeyword && numbered >= 3, reason: 'heuristic-fallback' };
}

async function isAbsenMessage(text) {
  try {
    const res = await getModel().generateContent(PROMPT.replace('<<<TEXT>>>', text.slice(0, 4000)));
    const raw = res.response.text().replace(/```json|```/g, '').trim();
    const json = JSON.parse(raw);
    return { isAbsen: !!json.is_absen, reason: json.alasan || '' };
  } catch (e) {
    console.error('Gemini error, pakai fallback:', e.message);
    return heuristic(text);
  }
}

module.exports = { isAbsenMessage, heuristic };
