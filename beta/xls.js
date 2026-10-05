// 엑셀 보기 — XLSX (zip.js) · XLS (cfb.js · BIFF8) (2026-10-03 · DXF 뒤)
// 구역 지도 : ① 숫자 모양 (날짜 · 쉼표 · 소수 · 백분율) ② XLSX 읽기 ③ XLS 읽기 (SST · CONTINUE · RK · 계산식 값)
//             ④ 표 그리기 (시트 탭 · 열 이름 · 행 번호 · 합친 칸)
// 계산식은 다시 계산하지 않고 엑셀이 저장해 둔 값을 보여 줌
'use strict';

const 엑셀 = {};
const 칸한도 = { 행: 3000, 열: 120 };

// ① 숫자 모양 ─────────────────────────────────────
엑셀.날짜형식 = (번호, 글) => (번호 >= 14 && 번호 <= 22) || (번호 >= 45 && 번호 <= 47) || (번호 >= 27 && 번호 <= 36) || (번호 >= 50 && 번호 <= 58)
  || (!!글 && /[ymdhs년월일]/i.test(글.replace(/"[^"]*"|\[[^\]]*\]|\\./g, '')) && !/^[#0.,%\s]+$/.test(글));
엑셀.날짜글 = (일련, 글) => {
  const ms = Math.round((일련 - 25569) * 86400000);
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  const 날 = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  const 시 = 일련 % 1 ? ` ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}` : '';
  if (글 && /^\s*h/i.test(글)) return 시.trim() || 날;
  return 날 + 시;
};
엑셀.숫자글 = (v, 번호, 글) => {
  if (!isFinite(v)) return String(v);
  if (엑셀.날짜형식(번호, 글)) return 엑셀.날짜글(v, 글);
  const 형 = (글 || ({ 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 9: '0%', 10: '0.00%', 37: '#,##0', 38: '#,##0', 39: '#,##0.00', 40: '#,##0.00' })[번호] || '').split(';')[0];
  if (!형 || /general/i.test(형)) { const s = String(+v.toPrecision(11)); return s; }
  const 백분 = 형.includes('%'), 쉼표 = 형.includes(','), 소수 = (/\.([0#]+)/.exec(형)?.[1].length) || 0;
  const n = 백분 ? v * 100 : v;
  return n.toLocaleString('ko-KR', { minimumFractionDigits: 소수, maximumFractionDigits: 소수, useGrouping: 쉼표 }) + (백분 ? '%' : '');
};
const 열이름 = c => { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
const 주소풀기 = a => { const m = /^([A-Z]+)(\d+)$/.exec(a); if (!m) return null; let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return [+m[2] - 1, c - 1]; };

// ② XLSX ──────────────────────────────────────────
문서.xlsx = async function (buf) {
  const z = await 압축열기(buf);
  const 책 = xml읽기(await z.글('xl/workbook.xml') || '<x/>');
  const 연결 = {};
  const rels = await z.글('xl/_rels/workbook.xml.rels');
  if (rels) for (const r of 후손(xml읽기(rels), 'Relationship')) 연결[r.getAttribute('Id')] = r.getAttribute('Target');
  const 공유 = [];
  const ss = await z.글('xl/sharedStrings.xml');
  if (ss) for (const si of 후손(xml읽기(ss), 'si')) { let s = ''; for (const t of 후손(si, 't')) if (t.parentNode.localName !== 'rPh') s += t.textContent; 공유.push(s); }
  const 모양 = [], 형식 = {};
  const st = await z.글('xl/styles.xml');
  if (st) {
    const d = xml읽기(st);
    for (const f of 후손(d, 'numFmt')) 형식[f.getAttribute('numFmtId')] = f.getAttribute('formatCode');
    const xfs = 후손(d, 'cellXfs')[0];
    if (xfs) for (const xf of 자식들(xfs, 'xf')) { const id = +xf.getAttribute('numFmtId') || 0; 모양.push({ 번호: id, 글: 형식[id] }); }
  }
  const 시트들 = [];
  for (const s of 후손(책, 'sheet')) {
    const 이름 = s.getAttribute('name');
    if (s.getAttribute('state') === 'hidden' || s.getAttribute('state') === 'veryHidden') continue;
    let 자리 = 연결[값(s, 'id')] || ''; 자리 = 자리.startsWith('/') ? 자리.slice(1) : 'xl/' + 자리.replace(/^\.\//, '');
    const 글 = await z.글(자리); if (!글) continue;
    const d = xml읽기(글), 칸 = new Map(); let 최대행 = 0, 최대열 = 0, 잘림 = false;
    for (const c of 후손(d, 'c')) {
      const rc = 주소풀기(c.getAttribute('r') || ''); if (!rc) continue;
      if (rc[0] >= 칸한도.행 || rc[1] >= 칸한도.열) { 잘림 = true; continue; }
      const t = c.getAttribute('t'), v = 자식(c, 'v')?.textContent ?? null, m = 모양[+c.getAttribute('s') || 0] || {};
      let 보일 = '', 수 = false;
      if (t === 's') 보일 = 공유[+v] ?? '';
      else if (t === 'inlineStr') 보일 = [...후손(c, 't')].map(x => x.textContent).join('');
      else if (t === 'str' || t === 'e') 보일 = v ?? '';
      else if (t === 'b') 보일 = v === '1' ? 'TRUE' : 'FALSE';
      else if (v != null && v !== '') { 보일 = 엑셀.숫자글(+v, m.번호, m.글); 수 = !엑셀.날짜형식(m.번호, m.글); }
      if (보일 === '') continue;
      칸.set(rc[0] * 100000 + rc[1], { 글: 보일, 수 });
      if (rc[0] > 최대행) 최대행 = rc[0]; if (rc[1] > 최대열) 최대열 = rc[1];
    }
    const 합침 = [];
    for (const m of 후손(d, 'mergeCell')) { const [a, b] = (m.getAttribute('ref') || '').split(':').map(주소풀기); if (a && b) 합침.push([a[0], a[1], b[0], b[1]]); }
    시트들.push({ 이름, 칸, 합침, 최대행, 최대열, 잘림 });
  }
  if (!시트들.length) throw new Error('보이는 시트가 없음');
  return 엑셀.그리기(시트들);
};

// ③ XLS (BIFF8) ───────────────────────────────────
문서.xls = async function (buf) {
  const 앞 = new Uint8Array(buf, 0, Math.min(buf.byteLength, 2048));
  if (!(앞[0] === 0xd0 && 앞[1] === 0xcf)) {                 // 이름만 .xls — 회사 ERP 가 내리는 HTML 표 · XLSX 인 경우
    if (앞[0] === 0x50 && 앞[1] === 0x4b) return 문서.xlsx(buf);
    const 머리 = new TextDecoder('latin1').decode(앞);
    if (/<(html|table|meta)/i.test(머리)) return 엑셀.HTML표(buf, 머리);
    throw new Error('엑셀(XLS) 파일이 아님');
  }
  const c = 복합열기(buf);
  const 책 = c.바이트('Workbook') || c.바이트('Book');
  if (!책) throw new Error('Workbook 줄기 없음 — 엑셀(XLS) 파일이 아님');
  if (c.있나('EncryptionInfo')) throw new Error('암호 걸린 엑셀 → 못 엶');
  const v = new DataView(책.buffer, 책.byteOffset, 책.byteLength);
  const 기록들 = []; let p = 0;
  while (p + 4 <= 책.length) { const 종류 = v.getUint16(p, true), 길이 = v.getUint16(p + 2, true); 기록들.push({ 종류, 자리: p + 4, 길이 }); p += 4 + 길이; }
  const u16 = new TextDecoder('utf-16le'), l1 = new TextDecoder('windows-1252');
  const 글풀기 = (자리, 글자수, 넓음) => 넓음 ? u16.decode(책.subarray(자리, 자리 + 글자수 * 2)) : l1.decode(책.subarray(자리, 자리 + 글자수));
  // 공유 문자열 (SST + CONTINUE — 문자열이 CONTINUE 경계를 넘으면 경계 뒤 첫 바이트가 새 «넓음» 표시)
  const 공유 = [], 형식 = {}, 모양 = [], 시트목록 = [];
  let 암호 = false;
  for (let k = 0; k < 기록들.length; k++) {
    const r = 기록들[k];
    if (r.종류 === 0x002f) 암호 = true;
    else if (r.종류 === 0x041e) { const id = v.getUint16(r.자리, true), n = v.getUint16(r.자리 + 2, true), 넓 = 책[r.자리 + 4] & 1; 형식[id] = 글풀기(r.자리 + 5, n, 넓); }
    else if (r.종류 === 0x00e0) 모양.push(v.getUint16(r.자리 + 2, true));
    else if (r.종류 === 0x0085) { const n = 책[r.자리 + 6], 넓 = 책[r.자리 + 7] & 1; 시트목록.push({ 위치: v.getUint32(r.자리, true), 숨김: 책[r.자리 + 4] & 3, 종류: 책[r.자리 + 5], 이름: 글풀기(r.자리 + 8, n, 넓) }); }
    else if (r.종류 === 0x00fc) {
      const 조각 = [r]; while (기록들[k + 1]?.종류 === 0x003c) 조각.push(기록들[++k]);
      let ci = 0, q = r.자리 + 8, 끝 = r.자리 + r.길이;
      const 다음조각 = () => { ci++; q = 조각[ci].자리; 끝 = q + 조각[ci].길이; };
      const 총 = v.getUint32(r.자리 + 4, true);
      for (let s = 0; s < 총 && ci < 조각.length; s++) {
        if (q >= 끝) { if (ci + 1 >= 조각.length) break; 다음조각(); }
        const n = v.getUint16(q, true); let 깃 = 책[q + 2]; q += 3;
        let 서식수 = 0, 동아시아 = 0;
        if (깃 & 8) { 서식수 = v.getUint16(q, true); q += 2; }
        if (깃 & 4) { 동아시아 = v.getUint32(q, true); q += 4; }
        let 글 = '', 남음 = n;
        while (남음 > 0) {
          if (q >= 끝) { 다음조각(); 깃 = 책[q]; q += 1; }
          const 넓 = 깃 & 1, 들어감 = Math.min(남음, Math.floor((끝 - q) / (넓 ? 2 : 1)));
          글 += 글풀기(q, 들어감, 넓); q += 들어감 * (넓 ? 2 : 1); 남음 -= 들어감;
        }
        let 건너뜀 = 서식수 * 4 + 동아시아;
        while (건너뜀 > 0) { if (q >= 끝) 다음조각(); const 한 = Math.min(건너뜀, 끝 - q); q += 한; 건너뜀 -= 한; }
        공유.push(글);
      }
    }
  }
  if (암호) throw new Error('암호 걸린 엑셀 → 못 엶');
  const 숫자 = (xf, n) => { const id = 모양[xf] ?? 0; return { 글: 엑셀.숫자글(n, id, 형식[id]), 수: !엑셀.날짜형식(id, 형식[id]) }; };
  const RK = x => { let n; if (x & 2) n = x >> 2; else { const b = new DataView(new ArrayBuffer(8)); b.setUint32(4, x & 0xfffffffc, true); n = b.getFloat64(0, true); } return x & 1 ? n / 100 : n; };
  const 시트들 = [];
  for (const 시 of 시트목록) {
    if (시.숨김 || 시.종류 !== 0) continue;                    // 숨긴 시트 · 차트 시트 빼고
    let k = 기록들.findIndex(r => r.자리 - 4 === 시.위치); if (k < 0) continue;
    const 칸 = new Map(), 합침 = []; let 최대행 = 0, 최대열 = 0, 잘림 = false, 계산글칸 = null;
    const 넣기 = (행, 열, 값) => {
      if (행 >= 칸한도.행 || 열 >= 칸한도.열) { 잘림 = true; return; }
      if (값.글 === '') return;
      칸.set(행 * 100000 + 열, 값); if (행 > 최대행) 최대행 = 행; if (열 > 최대열) 최대열 = 열;
    };
    for (k++; k < 기록들.length; k++) {
      const r = 기록들[k], a = r.자리; if (r.종류 === 0x000a) break;
      const 행 = () => v.getUint16(a, true), 열 = () => v.getUint16(a + 2, true), xf = () => v.getUint16(a + 4, true);
      if (r.종류 === 0x00fd) 넣기(행(), 열(), { 글: 공유[v.getUint32(a + 6, true)] ?? '', 수: false });
      else if (r.종류 === 0x0203) 넣기(행(), 열(), 숫자(xf(), v.getFloat64(a + 6, true)));
      else if (r.종류 === 0x027e) 넣기(행(), 열(), 숫자(xf(), RK(v.getInt32(a + 6, true))));
      else if (r.종류 === 0x00bd) { const 끝열 = v.getUint16(a + r.길이 - 2, true); for (let c = 열(), q = a + 4; c <= 끝열; c++, q += 6) 넣기(행(), c, 숫자(v.getUint16(q, true), RK(v.getInt32(q + 2, true)))); }
      else if (r.종류 === 0x0204) { const n = v.getUint16(a + 6, true), 넓 = 책[a + 8] & 1; 넣기(행(), 열(), { 글: 글풀기(a + 9, n, 넓), 수: false }); }
      else if (r.종류 === 0x0205) { const 값 = 책[a + 6], 오류 = 책[a + 7]; 넣기(행(), 열(), { 글: 오류 ? '#오류' : 값 ? 'TRUE' : 'FALSE', 수: false }); }
      else if (r.종류 === 0x0006) {                             // 계산식 — 저장된 값
        if (v.getUint16(a + 12, true) === 0xffff) {
          const 형 = 책[a + 6];
          if (형 === 0) 계산글칸 = [행(), 열()];
          else if (형 === 1) 넣기(행(), 열(), { 글: 책[a + 8] ? 'TRUE' : 'FALSE', 수: false });
          else if (형 === 2) 넣기(행(), 열(), { 글: '#오류', 수: false });
        } else 넣기(행(), 열(), 숫자(xf(), v.getFloat64(a + 6, true)));
      } else if (r.종류 === 0x0207 && 계산글칸) { const n = v.getUint16(a, true), 넓 = 책[a + 2] & 1; 넣기(계산글칸[0], 계산글칸[1], { 글: 글풀기(a + 3, n, 넓), 수: false }); 계산글칸 = null; }
      else if (r.종류 === 0x00e5) { const n = v.getUint16(a, true); for (let m = 0; m < n; m++) { const q = a + 2 + m * 8; 합침.push([v.getUint16(q, true), v.getUint16(q + 4, true), v.getUint16(q + 2, true), v.getUint16(q + 6, true)]); } }
    }
    시트들.push({ 이름: 시.이름, 칸, 합침, 최대행, 최대열, 잘림 });
  }
  if (!시트들.length) throw new Error('보이는 시트가 없음');
  return 엑셀.그리기(시트들);
};

// HTML 표 (이름만 .xls) — 프로그램 · 바깥 그림은 버리고 표의 글자 · 합친 칸만
엑셀.HTML표 = function (buf, 머리) {
  const 판 = /charset\s*=\s*["']?(euc-kr|ks_c_5601-1987|cp949|utf-8)/i.exec(머리)?.[1]?.toLowerCase();
  let 글 = new TextDecoder(판 && 판 !== 'utf-8' ? 'euc-kr' : 'utf-8').decode(buf);
  if (!판 && 글.includes('\uFFFD')) 글 = new TextDecoder('euc-kr').decode(buf);
  const d = new DOMParser().parseFromString(글, 'text/html');
  const 시트들 = [];
  [...d.querySelectorAll('table')].filter(tb => !tb.querySelector('table')).forEach((tb, k) => {
    const 칸 = new Map(), 합침 = [], 찬 = new Set(); let 최대행 = 0, 최대열 = 0, 잘림 = false;
    [...tb.rows].forEach((tr, r) => {
      let c = 0;
      for (const td of tr.cells) {
        while (찬.has(r * 100000 + c)) c++;
        const rs = Math.max(1, td.rowSpan || 1), cs = Math.max(1, td.colSpan || 1);
        if (r < 칸한도.행 && c < 칸한도.열) {
          const 값 = td.textContent.replace(/\s+/g, ' ').trim();
          if (값) { 칸.set(r * 100000 + c, { 글: 값, 수: /^-?[\d,]+(\.\d+)?%?$/.test(값) }); if (r > 최대행) 최대행 = r; if (c > 최대열) 최대열 = c; }
          if (rs > 1 || cs > 1) 합침.push([r, c, r + rs - 1, c + cs - 1]);
        } else 잘림 = true;
        for (let a = 0; a < rs; a++) for (let b = 0; b < cs; b++) 찬.add((r + a) * 100000 + c + b);
        c += cs;
      }
    });
    if (칸.size) 시트들.push({ 이름: `표 ${k + 1}`, 칸, 합침, 최대행, 최대열, 잘림 });
  });
  if (!시트들.length) throw new Error('HTML 안에 표가 없음');
  const 결과 = 엑셀.그리기(시트들); 결과.덧 = 'HTML 표 (이름만 .xls)'; return 결과;
};

// ④ 표 그리기 ─────────────────────────────────────
엑셀.그리기 = function (시트들) {
  const 틀 = 만들기('div', '엑셀');
  const 탭 = 만들기('div', '시트탭'), 판 = 만들기('div', '시트판');
  틀.append(탭, 판);
  const 보이기 = k => {
    탭.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === k));
    판.innerHTML = '';
    const s = 시트들[k];
    const 덮임 = new Set(), 시작 = new Map();
    for (const [r0, c0, r1, c1] of s.합침) {
      시작.set(r0 * 100000 + c0, [r1 - r0 + 1, c1 - c0 + 1]);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (r !== r0 || c !== c0) 덮임.add(r * 100000 + c);
    }
    const t = 만들기('table', '시트');
    const 머리 = 만들기('tr'); 머리.append(만들기('th', '모서리'));
    for (let c = 0; c <= s.최대열; c++) 머리.append(만들기('th', null, 열이름(c)));
    t.append(머리);
    for (let r = 0; r <= s.최대행; r++) {
      const tr = 만들기('tr'); tr.append(만들기('th', null, String(r + 1)));
      for (let c = 0; c <= s.최대열; c++) {
        const 열쇠 = r * 100000 + c; if (덮임.has(열쇠)) continue;
        const 값 = s.칸.get(열쇠), td = 만들기('td', 값?.수 ? '수' : null, 값?.글 ?? '');
        const 합 = 시작.get(열쇠); if (합) { if (합[0] > 1) td.rowSpan = 합[0]; if (합[1] > 1) td.colSpan = 합[1]; }
        tr.append(td);
      }
      t.append(tr);
    }
    const 감싸기 = 만들기('div', '표틀'); 감싸기.append(t); 판.append(감싸기);
    if (s.잘림) 판.prepend(만들기('p', '시트알림', `큰 시트 → 앞 ${칸한도.행.toLocaleString()}행 · ${칸한도.열}열까지만`));
    if (!s.칸.size) 판.append(만들기('p', '시트알림', '빈 시트'));
  };
  시트들.forEach((s, k) => { const b = 만들기('button', null, s.이름); b.onclick = () => 보이기(k); 탭.append(b); });
  보이기(0);
  return { 틀, 덧: `시트 ${시트들.length}` };
};
