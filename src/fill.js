// Isi baris absen milik sendiri TANPA menimpa nama teman.
// status: filled | already (sudah namaku) | occupied (ada nama orang lain -> skip)

function rowRegex(no) {
  return new RegExp(`^[\\s>]*${no}[\\.\\)\\-:]+\\s*(.*?)\\s*$`);
}

function isPlaceholder(content) {
  const c = content.replace(/[*_~]/g, '').trim(); // buang format WA (*bold* dsb)
  if (c === '') return true;
  return /^[\s.\-…_]+$/.test(c); // "...", ".", "-", "....." dst
}

function isMine(content, myName) {
  return content.toLowerCase().includes(myName.toLowerCase());
}

function fillMyRow(text, myNo = 19, myName = 'Muhammad Nabil') {
  const lines = text.split('\n');
  const re = rowRegex(myNo);

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const content = m[1];
    if (isMine(content, myName)) return { status: 'already', newText: text };
    if (!isPlaceholder(content)) return { status: 'occupied', newText: text }; // nama teman -> JANGAN TIMPA
    const prefix = lines[i].slice(0, lines[i].indexOf(m[1].length ? content : '')).trimEnd();
    lines[i] = `${prefix} ${myName}`.replace(/^\s+/, '');
    // Normalisasi awalan jadi "19. Nama" kalau format aneh
    if (!new RegExp(`^\\s*>?\\s*${myNo}\\.`).test(lines[i])) {
      lines[i] = lines[i].replace(new RegExp(`^(\\s*>?\\s*${myNo})[\\.\\)\\-:]+`), `$1.`);
      if (!new RegExp(`^\\s*>?\\s*${myNo}\\.\\s`).test(lines[i])) {
        lines[i] = `${myNo}. ${myName}`;
      }
    }
    return { status: 'filled', newText: lines.join('\n') };
  }

  // Baris 19 belum ada -> sisipkan setelah nomor terbesar di bawah 19,
  // slot kosong di antaranya diisi "...".
  const numRe = /^\s*>?\s*(\d{1,2})[\.\)\-:]/;
  let insertAt = lines.length;
  let maxBelow = 0;
  lines.forEach((l, i) => {
    const m = l.match(numRe);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n < myNo && n >= maxBelow) {
        maxBelow = n;
        insertAt = i + 1;
      }
    }
  });
  const add = [];
  for (let n = maxBelow + 1; n < myNo; n++) add.push(`${n}. ...`);
  add.push(`${myNo}. ${myName}`);
  lines.splice(insertAt, 0, ...add);
  return { status: 'filled', newText: lines.join('\n') };
}

module.exports = { fillMyRow };
