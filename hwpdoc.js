// 옛 한글(HWP 5.0) · 옛 워드(DOC 97~2003) 그리기 (4단계 · 2026-10-03)
// 둘 다 복합 문서(cfb.js) 안에 있다
// 구역 지도 : ① 한글 — 머리 · 압축 · 꼬리표(레코드) 읽기 ② 한글 — 글자 모양 · 문단 모양 ③ 한글 — 문단 · 표 · 글상자 그리기
//             ④ 한글 — 배포용 · 암호 · 그리기 실패 때 미리보기 글자 ⑤ 워드 — 조각표(piece table)로 글자 뽑기 · 문단 · 표
'use strict';

// ① 한글 — 머리 · 압축 · 꼬리표 ────────────────────
async function 풀기raw(b) {
  // 한글 줄기는 압축 끝 뒤에 군더더기 바이트가 붙어 있다 → 브라우저가 「Junk found after end」 로 통째로 실패 (10-03 실측)
  // 조각을 받아 두고, 군더더기 오류만 넘긴다
  const rd = new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const 조각 = []; let n = 0;
  try { for (;;) { const { done, value } = await rd.read(); if (done) break; 조각.push(value); n += value.length; } }
  catch (e) { if (!n || !/junk/i.test(String(e))) throw e; }
  const out = new Uint8Array(n); let p = 0;
  for (const x of 조각) { out.set(x, p); p += x.length; }
  return out;
}
function 꼬리표들(b) {                       // [{태그, 깊이, 몸}] — 머리 4바이트 : 태그 10비트 · 깊이 10비트 · 크기 12비트
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength), out = [];
  let p = 0;
  while (p + 4 <= b.length) {
    const h = v.getUint32(p, true); p += 4;
    let n = h >>> 20;
    if (n === 0xfff) { n = v.getUint32(p, true); p += 4; }
    out.push({ 태그: h & 0x3ff, 깊이: (h >>> 10) & 0x3ff, 몸: b.subarray(p, p + n) });
    p += n;
  }
  return out;
}
const 몸보기 = 몸 => new DataView(몸.buffer, 몸.byteOffset, 몸.byteLength);
const 컨트롤이름 = 몸 => { if (몸.length < 4) return ''; const x = 몸보기(몸).getUint32(0, true); return String.fromCharCode((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255); };
const 태그 = { 글자모양: 21, 문단모양: 25, 문단머리: 66, 문단글: 67, 문단글자모양: 68, 컨트롤머리: 71, 목록머리: 72, 표: 77 };

문서.hwp = async function (buf) {
  const u8 = new Uint8Array(buf);
  const 앞글 = new TextDecoder('latin1').decode(u8.subarray(0, 32));
  if (앞글.startsWith('HWP Document File V')) throw new Error('한글 97 이전(3.0) 문서 — 못 엶 · 한글에서 HWPX 로 저장해 받기');
  const c = 복합열기(buf);
  const 머리 = c.바이트('FileHeader');
  if (!머리) throw new Error('FileHeader 없음 — 한글(HWP) 파일이 아님');
  const 성질 = 몸보기(머리).getUint32(36, true);
  const 압축 = !!(성질 & 1), 암호 = !!(성질 & 2), 배포용 = !!(성질 & 4);
  if (암호) throw 오류('암호 걸린 한글 문서 → 못 엶', c);
  if (배포용 || !c.있나('BodyText/Section0')) throw 오류('배포용 한글 문서 (복사 · 인쇄 막힘) → 모양은 못 그림', c);
  const 읽기 = async 이름 => { const b = c.바이트(이름); return b && 압축 ? 풀기raw(b) : b; };

  // ② 글자 모양 · 문단 모양 ─────────────────────────
  const 글자모양 = [], 문단모양 = [];
  const 정보 = await 읽기('DocInfo');
  if (정보) for (const r of 꼬리표들(정보)) {
    if (r.태그 === 태그.글자모양 && r.몸.length >= 56) {
      const v = 몸보기(r.몸);
      const 크기 = v.getInt32(42, true), 성 = v.getUint32(46, true), 색 = v.getUint32(52, true);
      글자모양.push({ pt: 크기 > 0 && 크기 < 100000 ? 크기 / 100 : 10, 기울임: !!(성 & 1), 굵게: !!(성 & 2), 밑줄: ((성 >>> 2) & 3) === 1,
        색: '#' + [색 & 255, (색 >>> 8) & 255, (색 >>> 16) & 255].map(x => x.toString(16).padStart(2, '0')).join('') });
    } else if (r.태그 === 태그.문단모양 && r.몸.length >= 4) {
      문단모양.push((몸보기(r.몸).getUint32(0, true) >>> 2) & 7);   // 0 양쪽 · 1 왼 · 2 오른 · 3 가운데 · 4 배분 · 5 나눔
    }
  }

  // ③ 문단 · 표 · 글상자 ────────────────────────────
  const 기본pt = 10;
  const 구역들 = c.이름들.filter(n => /^BodyText\/Section\d+$/.test(n)).sort((a, b) => parseInt(a.slice(16), 10) - parseInt(b.slice(16), 10));
  const 틀 = 만들기('div', 'hwp');
  let 그림수 = 0;
  for (const 구역 of 구역들) {
    const rs = 꼬리표들(await 읽기(구역));
    let i = 0;
    const 문단들 = (담을곳, 깊이, 개수) => {      // 깊이가 같은 문단머리를 개수만큼 (개수 없으면 깊이가 얕아질 때까지)
      let 몇 = 0;
      while (i < rs.length && rs[i].깊이 >= 깊이 && (개수 == null || 몇 < 개수)) {
        if (rs[i].태그 === 태그.문단머리 && rs[i].깊이 === 깊이) { 문단(담을곳, 깊이); 몇++; }
        else i++;
      }
    };
    const 문단 = (담을곳, 깊이) => {
      const 머리몸 = rs[i].몸; i++;
      const 모양번호 = 머리몸.length >= 10 ? 몸보기(머리몸).getUint16(8, true) : 0;
      let 글 = null, 모양표 = [];
      const 컨트롤 = [];
      while (i < rs.length && rs[i].깊이 > 깊이) {
        const r = rs[i];
        if (r.깊이 === 깊이 + 1 && r.태그 === 태그.문단글) { 글 = r.몸; i++; }
        else if (r.깊이 === 깊이 + 1 && r.태그 === 태그.문단글자모양) {
          const v = 몸보기(r.몸); for (let k = 0; k + 8 <= r.몸.length; k += 8) 모양표.push([v.getUint32(k, true), v.getUint32(k + 4, true)]); i++;
        } else if (r.깊이 === 깊이 + 1 && r.태그 === 태그.컨트롤머리) { 컨트롤.push(컨트롤읽기(깊이 + 1)); }
        else i++;
      }
      // 글 펼치기 — 글자 · 줄바꿈 · 탭, 덧붙은 컨트롤(표 · 그림)은 나온 자리에서 덩이로
      let p = 만들기('p'); 담을곳.append(p);
      const 줄 = { 2: 'right', 3: 'center' }[문단모양[모양번호]];   // 양쪽 · 배분은 좁은 폰에서 왼쪽
      if (줄) p.style.textAlign = 줄;
      let 컨트롤자리 = 0;
      if (글) {
        const v = 몸보기(글), n = 글.length / 2;
        let 조각 = '', 조각시작 = 0, 모양k = 0;
        const 지금모양 = pos => { while (모양k + 1 < 모양표.length && 모양표[모양k + 1][0] <= pos) 모양k++; return 글자모양[모양표[모양k]?.[1]] || {}; };
        const 붓기 = (끝pos) => {
          if (!조각) return;
          const m = 지금모양(조각시작), s = 만들기('span'); s.textContent = 조각;
          if (m.굵게) s.style.fontWeight = '700'; if (m.기울임) s.style.fontStyle = 'italic'; if (m.밑줄) s.style.textDecoration = 'underline';
          if (m.pt && Math.abs(m.pt - 기본pt) > 0.4) s.style.fontSize = 크기em(m.pt, 기본pt);
          if (m.색 && m.색 !== '#000000') s.style.color = m.색;
          p.append(s); 조각 = '';
        };
        for (let k = 0; k < n;) {
          const ch = v.getUint16(k * 2, true);
          if (ch >= 32) {
            if (!조각) 조각시작 = k;
            const 다음모양 = 모양k + 1 < 모양표.length && 모양표[모양k + 1][0] === k;
            if (다음모양 && 조각) { 붓기(k); 조각시작 = k; }
            조각 += String.fromCharCode(ch); k++; continue;
          }
          붓기(k);
          if (ch === 10) { p.append(document.createElement('br')); k++; }
          else if (ch === 13) { k++; }
          else if (ch === 9) { p.append(만들기('span', '탭', '\t')); k += 8; }
          else if (ch === 0 || (ch >= 24 && ch <= 31)) { if (ch >= 24) p.append(ch === 24 ? '-' : ' '); k++; }
          else if ([4, 5, 6, 7, 8, 19, 20].includes(ch)) { k += 8; }                  // 글 안 컨트롤 (필드 끝 등)
          else {                                                                   // 덧붙은 컨트롤 (1~3 · 11~12 · 14~18 · 21~23)
            const 덩이 = 컨트롤[컨트롤자리++];
            if (덩이) {
              if (덩이.인라인) p.append(덩이.el);
              else { 담을곳.append(덩이.el); p = 만들기('p'); if (줄) p.style.textAlign = 줄; 담을곳.append(p); }
            }
            k += 8;
          }
        }
        붓기(n);
      }
      while (컨트롤자리 < 컨트롤.length) { const 덩이 = 컨트롤[컨트롤자리++]; if (덩이) 담을곳.append(덩이.el); }
      if (!p.textContent.trim() && !p.querySelector('br,img,span.빈그림')) p.classList.add('빈줄');
    };
    const 컨트롤읽기 = 깊이 => {                    // rs[i] 가 컨트롤머리
      const 이름 = 컨트롤이름(rs[i].몸); i++;
      if (이름 === 'tbl ') return { el: 표(깊이) };
      if (이름 === 'gso ') {                         // 그리기 개체 — 글상자면 글을, 그림이면 [그림]
        const 상자 = 만들기('div', '글상자');
        let 그림 = false;
        while (i < rs.length && rs[i].깊이 > 깊이) {
          if (rs[i].태그 === 태그.목록머리) { const 수 = 몸보기(rs[i].몸).getInt16(0, true); const d = rs[i].깊이; i++; 문단들(상자, d, 수); }
          else { if (rs[i].태그 === 85) 그림 = true; i++; }
        }
        if (상자.textContent.trim()) return { el: 상자 };
        if (그림) { 그림수++; return { el: 만들기('span', '빈그림', '[그림]'), 인라인: true }; }
        return null;
      }
      // 머리말 · 꼬리말 · 각주 · 쪽 번호 · 책갈피 등 — 본문에 안 보임
      while (i < rs.length && rs[i].깊이 > 깊이) i++;
      return null;
    };
    const 표 = 깊이 => {
      let 행 = 0, 열 = 0;
      const 칸들 = [];
      while (i < rs.length && rs[i].깊이 > 깊이) {
        const r = rs[i];
        if (r.태그 === 태그.표 && r.몸.length >= 8) { const v = 몸보기(r.몸); 행 = v.getUint16(4, true); 열 = v.getUint16(6, true); i++; }
        else if (r.태그 === 태그.목록머리) {
          const v = 몸보기(r.몸), 수 = v.getInt16(0, true), d = r.깊이;
          const 칸 = r.몸.length >= 16 ? { 열: v.getUint16(8, true), 행: v.getUint16(10, true), 가로: v.getUint16(12, true) || 1, 세로: v.getUint16(14, true) || 1 } : { 열: 0, 행: 칸들.length, 가로: 1, 세로: 1 };
          const td = 만들기('td'); if (칸.가로 > 1) td.colSpan = 칸.가로; if (칸.세로 > 1) td.rowSpan = 칸.세로;
          i++; 문단들(td, d, 수);
          칸들.push({ ...칸, td });
        } else i++;
      }
      const t = 만들기('table');
      const 줄들 = [];
      for (const k of 칸들) { (줄들[k.행] ||= []).push(k); }
      for (const 줄 of 줄들) { if (!줄) continue; const tr = 만들기('tr'); 줄.sort((a, b) => a.열 - b.열).forEach(k => tr.append(k.td)); t.append(tr); }
      const w = 만들기('div', '표틀'); w.append(t); return w;
    };
    문단들(틀, 0);
  }
  return { 틀, 알림: 그림수 ? `그림 ${그림수}개는 아직 못 그림` : null };
};

// ④ 배포용 · 암호 · 실패 — 한글이 넣어 둔 미리보기 글자 (앞부분만일 수 있음)
function 오류(말, c) { const e = new Error(말); e.미리보기 = c; return e; }
문서.hwp미리보기 = function (buf) {
  try {
    const c = 복합열기(buf), b = c.바이트('PrvText');
    return b ? new TextDecoder('utf-16le').decode(b).replace(/<([^<>]*)>/g, '$1\t').replace(/\t\r?\n/g, '\n') : '';
  } catch (e) { return ''; }
};

// ⑤ 옛 워드 (DOC) ─────────────────────────────────
문서.doc = async function (buf) {
  const u8 = new Uint8Array(buf);
  const 앞 = new TextDecoder('latin1').decode(u8.subarray(0, 8));
  if (앞.startsWith('{\\rtf')) throw new Error('RTF 문서 (이름만 .doc) → 글자만');
  if (/^\s*</.test(new TextDecoder('utf-8').decode(u8.subarray(0, 64)))) throw new Error('HTML 문서 (이름만 .doc) → 글자만');
  const c = 복합열기(buf);
  const wd = c.바이트('WordDocument');
  if (!wd) throw new Error('WordDocument 없음 — 워드(DOC) 파일이 아님');
  const v = 몸보기(wd);
  if (v.getUint16(0, true) !== 0xa5ec) throw new Error('워드 97 이전 문서 — 못 엶');
  const 깃발 = v.getUint16(10, true);
  if (깃발 & 0x100) throw new Error('암호 걸린 워드 문서 → 못 엶');
  const 표줄기 = c.바이트(깃발 & 0x200 ? '1Table' : '0Table');
  if (!표줄기) throw new Error('Table 줄기 없음');
  // FIB : 32 바이트 뒤 csw · fibRgW · cslw · fibRgLw · cbRgFcLcb · fibRgFcLcb (fcClx 는 34번째 짝 · 번호 33)
  let o = 32; const csw = v.getUint16(o, true); o += 2 + csw * 2;
  const cslw = v.getUint16(o, true); o += 2 + cslw * 4;
  o += 2;
  const fcClx = v.getUint32(o + 33 * 8, true), lcbClx = v.getUint32(o + 33 * 8 + 4, true);   // fcClx 는 FibRgFcLcb97 의 34번째 짝
  const t = 몸보기(표줄기);
  let p = fcClx; const 끝 = fcClx + lcbClx;
  while (p < 끝 && 표줄기[p] === 1) p += 3 + t.getUint16(p + 1, true);     // Prc 건너뜀
  if (표줄기[p] !== 2) throw new Error('조각표(Pcdt)를 못 찾음');
  const lcb = t.getUint32(p + 1, true), 시작 = p + 5, n = (lcb - 4) / 12;
  let 글 = '';
  const w1252 = new TextDecoder('windows-1252'), u16 = new TextDecoder('utf-16le');
  for (let k = 0; k < n; k++) {
    const cp0 = t.getUint32(시작 + k * 4, true), cp1 = t.getUint32(시작 + (k + 1) * 4, true);
    const pcd = 시작 + (n + 1) * 4 + k * 8;
    const fc = t.getUint32(pcd + 2, true), 좁음 = !!(fc & 0x40000000), 자리 = fc & 0x3fffffff, 길이 = cp1 - cp0;
    글 += 좁음 ? w1252.decode(wd.subarray(자리 / 2, 자리 / 2 + 길이)) : u16.decode(wd.subarray(자리, 자리 + 길이 * 2));
  }
  // 필드 : 0x13 지시문 0x14 결과 0x15 → 결과만
  글 = 글.replace(/\x13[^\x13\x14\x15]*\x14([^\x13\x15]*)\x15/g, '$1').replace(/\x13[^\x13\x15]*\x15/g, '');
  // 표 : 칸 끝 0x07 · 줄 끝은 0x07 두 번 → 「칸 │ 칸」 한 줄로 (옛 워드는 글자 위주로 정함)
  글 = 글.replace(/\x07\x07/g, '').replace(/\x07/g, ' │ ').replace(/ │ /g, '').replace(//g, '\r');
  const 틀 = 만들기('div', 'docx');
  for (const 줄 of 글.split('\r')) {
    const 표줄 = 줄.includes('');
    const 정리 = 줄.replace(//g, '').replace(/[\x01\x08\x1f]/g, '').replace(/[\x0b\x0c]/g, '\n').replace(/\x1e/g, '-');
    const el = 만들기('p', 표줄 ? '표줄' : null, 정리);
    if (!정리.trim()) el.classList.add('빈줄');
    틀.append(el);
  }
  return { 틀, 알림: '옛 워드 — 글자 위주 (표는 칸만 · 그림 · 글꼴 모양 없음)' };
};
