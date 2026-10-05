// 복합 문서(CFB · OLE2) 읽기 — 옛 한글(HWP 5.0) · 옛 워드(DOC) 는 이 상자 안에 들어 있다
// 쓰는 법 : const c = 복합열기(arrayBuffer); c.이름들 · c.있나('BodyText/Section0') · c.바이트('FileHeader')
'use strict';

function 복합열기(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf);
  if (v.getUint32(0, true) !== 0xe011cfd0 || v.getUint32(4, true) !== 0xe11ab1a1) throw new Error('복합 문서가 아님');
  const 쪽크기 = 1 << v.getUint16(30, true);              // 보통 512
  const 작은쪽크기 = 1 << v.getUint16(32, true);           // 보통 64
  const 작은경계 = v.getUint32(56, true);                  // 이보다 작은 줄기는 작은 쪽에 (보통 4096)
  const 쪽자리 = n => (n + 1) * 쪽크기;
  const 끝 = n => n >= 0xfffffffa;

  // FAT — 머리의 109 칸 + DIFAT 쪽들
  const fat쪽들 = [];
  for (let i = 0; i < 109; i++) { const s = v.getUint32(76 + i * 4, true); if (!끝(s)) fat쪽들.push(s); }
  let d = v.getUint32(68, true), dn = v.getUint32(72, true);
  while (!끝(d) && dn-- > 0) {
    const o = 쪽자리(d), 칸 = 쪽크기 / 4 - 1;
    for (let i = 0; i < 칸; i++) { const s = v.getUint32(o + i * 4, true); if (!끝(s)) fat쪽들.push(s); }
    d = v.getUint32(o + 칸 * 4, true);
  }
  const fat = [];
  for (const s of fat쪽들) { const o = 쪽자리(s); for (let i = 0; i < 쪽크기 / 4; i++) fat.push(v.getUint32(o + i * 4, true)); }

  function 사슬(시작, 크기) {                               // 큰 쪽 사슬을 이어 붙임
    const out = new Uint8Array(크기); let p = 0, s = 시작, 보초 = 0;
    while (!끝(s) && p < 크기 && 보초++ < 1e6) {
      const n = Math.min(쪽크기, 크기 - p), o = 쪽자리(s);
      out.set(u8.subarray(o, o + n), p); p += n; s = fat[s];
    }
    return out;
  }
  // 목차
  const 목차바이트 = 사슬(v.getUint32(48, true), 1 << 30 > buf.byteLength ? buf.byteLength : 1 << 30);
  const 칸들 = [];
  const dv = new DataView(목차바이트.buffer);
  for (let o = 0; o + 128 <= 목차바이트.length; o += 128) {
    const 길이 = dv.getUint16(o + 64, true);
    if (!길이) { 칸들.push(null); continue; }
    let 이름 = ''; for (let i = 0; i < 길이 / 2 - 1; i++) 이름 += String.fromCharCode(dv.getUint16(o + i * 2, true));
    칸들.push({ 이름, 종류: 목차바이트[o + 66], 왼: dv.getUint32(o + 68, true), 오른: dv.getUint32(o + 72, true),
      아이: dv.getUint32(o + 76, true), 시작: dv.getUint32(o + 116, true), 크기: dv.getUint32(o + 120, true) });
  }
  const 뿌리 = 칸들[0];
  if (!뿌리 || 뿌리.종류 !== 5) throw new Error('복합 문서 목차가 깨짐');
  // 작은 쪽 (뿌리의 사슬이 작은 쪽 줄기)
  const 작은줄기 = 사슬(뿌리.시작, 뿌리.크기);
  const 작은fat = [];
  { let s = v.getUint32(60, true), n = v.getUint32(64, true), 보초 = 0;
    while (!끝(s) && n-- > 0 && 보초++ < 1e5) { const o = 쪽자리(s); for (let i = 0; i < 쪽크기 / 4; i++) 작은fat.push(v.getUint32(o + i * 4, true)); s = fat[s]; } }
  function 작은사슬(시작, 크기) {
    const out = new Uint8Array(크기); let p = 0, s = 시작, 보초 = 0;
    while (!끝(s) && p < 크기 && 보초++ < 1e6) {
      const n = Math.min(작은쪽크기, 크기 - p), o = s * 작은쪽크기;
      out.set(작은줄기.subarray(o, o + n), p); p += n; s = 작은fat[s];
    }
    return out;
  }
  // 이름 나무 펼치기 (형제는 왼 · 오른, 아이는 아이)
  const 길 = new Map();
  function 걷기(i, 앞, 보초) {
    if (i === 0xffffffff || !칸들[i] || 보초 > 10000) return;
    const c = 칸들[i];
    걷기(c.왼, 앞, 보초 + 1);
    const 이름 = 앞 ? 앞 + '/' + c.이름 : c.이름;
    if (c.종류 === 2) 길.set(이름, c);
    if (c.종류 === 1) 걷기(c.아이, 이름, 보초 + 1);
    걷기(c.오른, 앞, 보초 + 1);
  }
  걷기(뿌리.아이, '', 0);
  return {
    이름들: [...길.keys()],
    있나: 이름 => 길.has(이름),
    바이트(이름) {
      const c = 길.get(이름); if (!c) return null;
      return c.크기 < 작은경계 ? 작은사슬(c.시작, c.크기) : 사슬(c.시작, c.크기);
    },
  };
}
