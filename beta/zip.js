// 압축(zip) 읽기 — 한글(HWPX) · 워드(DOCX) 는 속이 zip 이다 · ZIP 파일 보기(zipview.js)도 이것을 씀
// 부품을 받지 않고 폰 브라우저에 든 DecompressionStream('deflate-raw') 로 푼다
// 쓰는 법 : const z = await 압축열기(arrayBuffer); z.이름들 · z.항목들 · await z.글(이름) · await z.바이트(이름, 암호)
// 10-04 · ZIP 파일 보기 — ① 윈도우에서 만든 한글 이름(CP949 · UTF-8 표시 없음) ② 옛 방식 암호(ZipCrypto) ③ ZIP64 ④ CRC 로 깨짐 · 틀린 암호 가름
//   바이트() 가 내는 오류에는 .코드 : '암호필요' · '암호틀림' · 'AES' · '방식' · '깨짐'
'use strict';

const 압축CRC표 = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function 압축CRC(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = 압축CRC표[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const 압축오류 = (코드, 말) => Object.assign(new Error(말), { 코드 });

async function 압축열기(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf);
  let e = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
  }
  if (e < 0) throw new Error('압축 파일이 아님 (끝 표시 없음)');
  let 개수 = v.getUint16(e + 10, true), p = v.getUint32(e + 16, true);
  if ((개수 === 0xffff || p === 0xffffffff) && e >= 20 && v.getUint32(e - 20, true) === 0x07064b50) {   // ZIP64 — 큰 압축
    const e64 = Number(v.getBigUint64(e - 12, true));
    if (v.getUint32(e64, true) === 0x06064b50) { 개수 = Number(v.getBigUint64(e64 + 32, true)); p = Number(v.getBigUint64(e64 + 48, true)); }
  }
  const 목록 = new Map(), 항목들 = [];
  const utf8 = new TextDecoder('utf-8'), 엄한utf8 = new TextDecoder('utf-8', { fatal: true });
  let 옛한글 = null; try { 옛한글 = new TextDecoder('euc-kr'); } catch (x) {}
  const 이름풀기 = (b, 표시) => {
    if (표시 & 0x800) return utf8.decode(b);
    try { return 엄한utf8.decode(b); } catch (x) {}              // 표시는 없지만 UTF-8 (맥 · 7-Zip 일부)
    return 옛한글 ? 옛한글.decode(b) : utf8.decode(b);          // 윈도우 탐색기 · 알집이 만든 ZIP — CP949
  };
  for (let k = 0; k < 개수; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('압축 목차가 깨짐');
    const 표시 = v.getUint16(p + 8, true), 방식 = v.getUint16(p + 10, true);
    const 시각 = v.getUint16(p + 12, true), 날 = v.getUint16(p + 14, true), crc = v.getUint32(p + 16, true);
    let 압축크기 = v.getUint32(p + 20, true), 크기 = v.getUint32(p + 24, true);
    const n = v.getUint16(p + 28, true), x = v.getUint16(p + 30, true), c = v.getUint16(p + 32, true);
    let 자리 = v.getUint32(p + 42, true);
    let 이름 = 이름풀기(u8.subarray(p + 46, p + 46 + n), 표시);
    for (let q = p + 46 + n; q + 4 <= p + 46 + n + x;) {        // 덧붙임 칸
      const 꼬리표 = v.getUint16(q, true), 길이 = v.getUint16(q + 2, true), 몸 = q + 4;
      if (꼬리표 === 0x0001) {                                    // ZIP64 크기 · 자리
        let r = 몸;
        if (크기 === 0xffffffff) { 크기 = Number(v.getBigUint64(r, true)); r += 8; }
        if (압축크기 === 0xffffffff) { 압축크기 = Number(v.getBigUint64(r, true)); r += 8; }
        if (자리 === 0xffffffff) { 자리 = Number(v.getBigUint64(r, true)); }
      } else if (꼬리표 === 0x7075 && 길이 > 5) {                 // 유니코드 이름 (Info-ZIP) — 있으면 이것이 맞음
        이름 = utf8.decode(u8.subarray(몸 + 5, 몸 + 길이));
      }
      q = 몸 + 길이;
    }
    이름 = 이름.replace(/\\/g, '/');
    const 것 = { 이름, 방식, 압축크기, 크기, 자리, 표시, crc, 시각, 날, 암호: !!(표시 & 1), 폴더: 이름.endsWith('/') };
    목록.set(이름, 것); 항목들.push(것);
    p += 46 + n + x + c;
  }
  // 옛 방식 암호 (PKWARE · ZipCrypto) — 열쇠 셋을 글자마다 굴림
  function 풀쇠(암호) {
    const k = new Uint32Array([0x12345678, 0x23456789, 0x34567890]);
    const 굴림 = b => {
      k[0] = 압축CRC표[(k[0] ^ b) & 255] ^ (k[0] >>> 8);
      k[1] = Math.imul(k[1] + (k[0] & 255), 134775813) + 1;
      k[2] = 압축CRC표[(k[2] ^ (k[1] >>> 24)) & 255] ^ (k[2] >>> 8);
    };
    for (const b of new TextEncoder().encode(암호)) 굴림(b);
    return src => {
      const out = new Uint8Array(src.length);
      for (let i = 0; i < src.length; i++) {
        const t = (k[2] | 2) & 0xffff, b = src[i] ^ ((Math.imul(t, t ^ 1) >>> 8) & 255);
        out[i] = b; 굴림(b);
      }
      return out;
    };
  }
  async function 바이트(이름, 암호) {
    const f = 목록.get(이름);
    if (!f) return null;
    if (v.getUint32(f.자리, true) !== 0x04034b50) throw 압축오류('깨짐', '압축 안 파일 자리가 깨짐');
    const n = v.getUint16(f.자리 + 26, true), x = v.getUint16(f.자리 + 28, true);
    let 몸 = u8.subarray(f.자리 + 30 + n + x, f.자리 + 30 + n + x + f.압축크기);
    if (f.방식 === 99) throw 압축오류('AES', '새 방식(AES) 암호');
    if (f.암호) {
      if (!암호) throw 압축오류('암호필요', '암호 걸린 압축');
      const 풀 = 풀쇠(암호), 머리 = 풀(몸.subarray(0, 12));
      const 맞을값 = f.표시 & 8 ? (f.시각 >>> 8) & 255 : f.crc >>> 24;
      if (머리[11] !== 맞을값) throw 압축오류('암호틀림', '암호가 틀림');
      몸 = 풀(몸.subarray(12));
    }
    let 결과;
    if (f.방식 === 0) 결과 = 몸.slice();
    else if (f.방식 === 8) {
      try {
        const s = new Blob([몸]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        결과 = new Uint8Array(await new Response(s).arrayBuffer());
      } catch (x) { throw 압축오류(f.암호 ? '암호틀림' : '깨짐', f.암호 ? '암호가 틀림' : '압축이 깨짐'); }
    }
    else throw 압축오류('방식', ({ 9: 'Deflate64', 12: 'BZIP2', 14: 'LZMA', 93: 'Zstandard', 95: 'XZ', 98: 'PPMd' }[f.방식] || '번호 ' + f.방식) + ' 방식');
    if (f.암호 && 압축CRC(결과) !== f.crc) throw 압축오류('암호틀림', '암호가 틀림');   // 머리 한 바이트는 256번에 한 번 우연히 맞음
    return 결과;
  }
  return {
    이름들: [...목록.keys()],
    항목들,
    있나: 이름 => 목록.has(이름),
    바이트,
    CRC: 압축CRC,
    async 글(이름) { const b = await 바이트(이름); return b ? utf8.decode(b) : null; },
    async 그림주소(이름) {
      const b = await 바이트(이름); if (!b) return null;
      const ext = (이름.split('.').pop() || '').toLowerCase();
      const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', webp: 'image/webp' }[ext];
      if (!mime && (ext === 'wmf' || ext === 'emf') && typeof 메타그림 !== 'undefined') { try { return await 메타그림.주소(b); } catch (e) { return null; } }   // emf · wmf → meta.js 가 PNG 로 (0.9.6)
      return mime ? URL.createObjectURL(new Blob([b], { type: mime })) : null;
    },
  };
}
