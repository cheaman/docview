// 압축(zip) 읽기 — 한글(HWPX) · 워드(DOCX) 는 속이 zip 이다
// 부품을 받지 않고 폰 브라우저에 든 DecompressionStream('deflate-raw') 로 푼다
// 쓰는 법 : const z = await 압축열기(arrayBuffer); z.이름들 · await z.글(이름) · await z.바이트(이름)
'use strict';

async function 압축열기(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf);
  let e = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
  }
  if (e < 0) throw new Error('압축 파일이 아님 (끝 표시 없음)');
  const 개수 = v.getUint16(e + 10, true);
  let p = v.getUint32(e + 16, true);
  const 목록 = new Map();
  const utf8 = new TextDecoder('utf-8');
  for (let k = 0; k < 개수; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('압축 목차가 깨짐');
    const 방식 = v.getUint16(p + 10, true), 압축크기 = v.getUint32(p + 20, true);
    const n = v.getUint16(p + 28, true), x = v.getUint16(p + 30, true), c = v.getUint16(p + 32, true);
    const 자리 = v.getUint32(p + 42, true);
    const 이름 = utf8.decode(u8.subarray(p + 46, p + 46 + n)).replace(/\\/g, '/');
    목록.set(이름, { 방식, 압축크기, 자리 });
    p += 46 + n + x + c;
  }
  async function 바이트(이름) {
    const f = 목록.get(이름);
    if (!f) return null;
    const n = v.getUint16(f.자리 + 26, true), x = v.getUint16(f.자리 + 28, true);
    const 몸 = u8.subarray(f.자리 + 30 + n + x, f.자리 + 30 + n + x + f.압축크기);
    if (f.방식 === 0) return 몸.slice();
    if (f.방식 !== 8) throw new Error('모르는 압축 방식 ' + f.방식);
    const s = new Blob([몸]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  return {
    이름들: [...목록.keys()],
    있나: 이름 => 목록.has(이름),
    바이트,
    async 글(이름) { const b = await 바이트(이름); return b ? utf8.decode(b) : null; },
    async 그림주소(이름) {
      const b = await 바이트(이름); if (!b) return null;
      const ext = (이름.split('.').pop() || '').toLowerCase();
      const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', webp: 'image/webp' }[ext];
      return mime ? URL.createObjectURL(new Blob([b], { type: mime })) : null;   // emf · wmf 는 브라우저가 못 그림 → null
    },
  };
}
