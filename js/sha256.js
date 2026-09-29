/* Minimal synchronous SHA-256 (UTF-8 input, hex output).
   Used by Hash Harbour so hashes work offline and from file:// without crypto.subtle. */
(function (global) {
  'use strict';

  function primes(n) {
    const out = [];
    for (let c = 2; out.length < n; c++) {
      if (out.every(p => c % p !== 0)) out.push(c);
    }
    return out;
  }

  // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes.
  const P = primes(64);
  const frac = x => ((x - Math.floor(x)) * 0x100000000) >>> 0;
  const K = new Uint32Array(P.map(p => frac(Math.cbrt(p))));
  const H0 = P.slice(0, 8).map(p => frac(Math.sqrt(p)));

  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  function sha256(str) {
    const bytes = new TextEncoder().encode(String(str));
    const len = bytes.length;
    const padded = ((len + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(padded);
    buf.set(bytes);
    buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    const bits = len * 8;
    dv.setUint32(padded - 8, Math.floor(bits / 0x100000000));
    dv.setUint32(padded - 4, bits >>> 0);

    const h = H0.slice();
    const w = new Uint32Array(64);
    for (let off = 0; off < padded; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0;
      h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0;
      h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
    }
    return h.map(x => x.toString(16).padStart(8, '0')).join('');
  }

  global.sha256 = sha256;
  if (typeof module !== 'undefined') module.exports = sha256;
})(typeof window !== 'undefined' ? window : globalThis);
