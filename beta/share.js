// 보내기 — 표시 입힌 사본 만들기 (v0.7 · 2026-10-03 전무님 「보던 문서를 저장한 후 다시 공유」 → 「표시 입힌 사본 공유」 고르심)
// 원본은 안 고친다. 보이는 그대로(돌린 방향 · 펜 표시 · 첫 쪽에 쪽지)를 그림으로 떠서
//   PDF 는 쪽마다 JPEG 를 붙인 새 PDF 로, 그림 · 도면은 그림 파일 하나로 → 껍데기(shareBegin · Chunk · End)가 카톡 · 메일 고르는 창을 띄움
// 구역 지도 : ① 쪽 하나 → 캔버스 ② 쪽지 상자 ③ PDF 묶기 ④ 껍데기로 넘기기
'use strict';
const 보내기 = {};

보내기.그림받기 = src => new Promise((ok, no) => {
  const im = new Image(); im.decoding = 'async';
  im.onload = () => ok(im); im.onerror = () => no(new Error('쪽 그림을 못 받음')); im.src = src;
});

// ① 쪽 하나 — 안 돌린 원래 쪽(그림)에 펜 획(0~1 좌표)을 긋고, 보이는 방향으로 돌린 캔버스
보내기.쪽캔버스 = function (im, 돌, 획들, 쪽지) {
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
  const c = document.createElement('canvas');
  c.width = 돌 & 1 ? h : w; c.height = 돌 & 1 ? w : h;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
  x.save();
  x.translate(c.width / 2, c.height / 2); x.rotate(돌 * Math.PI / 2); x.translate(-w / 2, -h / 2);
  x.drawImage(im, 0, 0, w, h);
  const 긋기 = (g, 획) => {
    const p = 획.p; if (!p.length) return;
    if (도장인가(획)) { const a = 획.a; return 도장캔버스(g, 획, a[0] * w, a[1] * h, a[2] * w, a[3] * h); }   // 도장 · 서명 (0.9.6)
    if (획.t != null) {                              // 글 (0.9.4) — 쓸 때의 방향으로 · 흰 테두리
      const fs = 획.w * w; g.save(); g.translate(p[0] * w, p[1] * h); g.rotate(-(획.r || 0) * Math.PI / 2);
      g.font = `700 ${fs}px Pretendard, system-ui, sans-serif`; g.textBaseline = 'top'; g.lineJoin = 'round';
      g.lineWidth = fs * 0.14; g.strokeStyle = '#ffffff'; g.strokeText(획.t, 0, 0); g.fillStyle = 색값(획.c); g.fillText(획.t, 0, 0);
      return g.restore();
    }
    g.strokeStyle = 색값(획.c); g.lineWidth = Math.max(1, 획.w * w); g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(p[0] * w, p[1] * h);
    if (p.length === 2) g.lineTo(p[0] * w + 0.01, p[1] * h);
    for (let k = 2; k < p.length; k += 2) g.lineTo(p[k] * w, p[k + 1] * h);
    g.stroke();
  };
  const 형광 = (획들 || []).filter(획 => 형광인가(획.c));
  if (형광.length) {                                // 화면과 같게 — 형광은 한 층에 칠해 곱하기로 (겹쳐도 안 진해짐)
    const 층 = document.createElement('canvas'); 층.width = w; 층.height = h;
    const g = 층.getContext('2d'); 형광.forEach(획 => 긋기(g, 획));
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.8; x.drawImage(층, 0, 0);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; 층.width = 층.height = 0;
  }
  (획들 || []).filter(획 => !형광인가(획.c)).forEach(획 => 긋기(x, 획));
  x.restore();
  if (쪽지) 보내기.쪽지상자(x, c.width, 쪽지);
  return c;
};

// ② 쪽지 — 왼쪽 위에 노란 상자 (열두 줄까지)
보내기.쪽지상자 = function (x, W, 글) {
  const 크기 = Math.max(14, Math.round(W * 0.02)), 여백 = Math.round(크기 * 0.8), 폭 = Math.round(W * 0.62);
  x.save();
  x.font = `${크기}px system-ui, 'Noto Sans KR', sans-serif`; x.textBaseline = 'top';
  const 줄들 = [];
  for (const 문단 of ('📝 ' + 글).split('\n')) {
    let 줄 = '';
    for (const 자 of 문단) {
      if (x.measureText(줄 + 자).width > 폭 - 여백 * 2 && 줄) { 줄들.push(줄); 줄 = 자; } else 줄 += 자;
    }
    줄들.push(줄);
    if (줄들.length >= 12) break;
  }
  if (줄들.length > 12) { 줄들.length = 12; 줄들[11] += ' …'; }
  const 높 = 줄들.length * 크기 * 1.45 + 여백 * 2, 왼 = Math.round(W * 0.03), 위 = 왼;
  x.fillStyle = 'rgba(255,244,194,0.96)'; x.strokeStyle = '#e6c95a'; x.lineWidth = Math.max(1, 크기 / 12);
  x.beginPath(); x.roundRect ? x.roundRect(왼, 위, 폭, 높, 크기 * 0.5) : x.rect(왼, 위, 폭, 높); x.fill(); x.stroke();
  x.fillStyle = '#3d3200';
  줄들.forEach((s, k) => x.fillText(s, 왼 + 여백, 위 + 여백 + k * 크기 * 1.45));
  x.restore();
};

보내기.바이트 = (c, 꼴, 질) => new Promise((ok, no) => c.toBlob(b => b ? b.arrayBuffer().then(a => ok(new Uint8Array(a))) : no(new Error('그림 만들기 실패 (메모리)')), 꼴, 질));

// ③ PDF 묶기 — 쪽마다 JPEG 한 장 (DCTDecode). 쪽 크기는 원래 PDF 의 pt 크기(돌린 방향)
보내기.PDF = function (쪽들) {
  const 조각 = []; let 길이 = 0; const 자리 = [];
  const 인코더 = new TextEncoder();
  const 글 = s => { const b = 인코더.encode(s); 조각.push(b); 길이 += b.length; };
  const 날 = b => { 조각.push(b); 길이 += b.length; };
  const 수 = v => (+v).toFixed(2).replace(/\.?0+$/, '');
  const 물 = (k, f) => { 자리[k] = 길이; 글(`${k} 0 obj\n`); f(); 글('\nendobj\n'); };
  const n = 쪽들.length;
  글('%PDF-1.4\n%âãÏÓ\n');
  물(1, () => 글('<</Type/Catalog/Pages 2 0 R>>'));
  물(2, () => 글(`<</Type/Pages/Count ${n}/Kids[${쪽들.map((_, k) => `${3 + 3 * k} 0 R`).join(' ')}]>>`));
  쪽들.forEach((p, k) => {
    const 쪽 = 3 + 3 * k, 그 = 4 + 3 * k, 속 = 5 + 3 * k;
    물(쪽, () => 글(`<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${수(p.pw)} ${수(p.ph)}]/Resources<</XObject<</Im0 ${그} 0 R>>>>/Contents ${속} 0 R>>`));
    물(그, () => { 글(`<</Type/XObject/Subtype/Image/Width ${p.w}/Height ${p.h}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${p.jpg.length}>>\nstream\n`); 날(p.jpg); 글('\nendstream'); });
    const s = `q ${수(p.pw)} 0 0 ${수(p.ph)} 0 0 cm /Im0 Do Q`;
    물(속, () => 글(`<</Length ${s.length}>>\nstream\n${s}\nendstream`));
  });
  const xref = 길이, 개수 = 3 + 3 * n;
  let 표 = `xref\n0 ${개수}\n0000000000 65535 f \n`;
  for (let k = 1; k < 개수; k++) 표 += String(자리[k]).padStart(10, '0') + ' 00000 n \n';
  글(표 + `trailer\n<</Size ${개수}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`);
  const 모두 = new Uint8Array(길이); let o = 0;
  for (const b of 조각) { 모두.set(b, o); o += b.length; }
  return 모두;
};

// ④ 껍데기로 넘기기 — 다리로는 글자만 오가므로 base64 조각(384KB)으로
보내기.넘기기 = async function (이름, 꼴, 바이트) {
  if (다리.shareBytes) return 다리.shareBytes(이름, 꼴, 바이트);   // 아이폰 웹앱 — 조각 없이 바로 (web.js)
  if (!다리.shareBegin(이름)) throw new Error('보낼 파일을 못 만듦');
  const 크기 = 393216;
  for (let i = 0; i < 바이트.length; i += 크기) {
    const 덩 = 바이트.subarray(i, i + 크기); let s = '';
    for (let k = 0; k < 덩.length; k += 8192) s += String.fromCharCode.apply(null, 덩.subarray(k, k + 8192));
    if (!다리.shareChunk(btoa(s))) throw new Error('쓰기 실패 (폰 저장 공간?)');
    if (i % (크기 * 8) === 0) await new Promise(r => setTimeout(r));
  }
  다리.shareEnd(꼴);
};

// ⑤ 위치 메모 (v0.7.1) — 받는 사람은 앱이 없으므로 그림에 찍어 보냄
//   보이게 메모 → 그 자리에 노란 쪽지 상자 · 숨김 메모 → 그 자리에 ①② 번호표 + 끝에 「메모 목록」(PDF 는 쪽 · 그림은 아래 띠)
보내기.줄나누기 = function (x, 글, 폭, 최대) {
  const 줄들 = [];
  for (const 문단 of 글.split('\n')) {
    let 줄 = '';
    for (const 자 of 문단) { if (x.measureText(줄 + 자).width > 폭 && 줄) { 줄들.push(줄); 줄 = 자; } else 줄 += 자; }
    줄들.push(줄);
    if (줄들.length > 최대) break;
  }
  if (줄들.length > 최대) { 줄들.length = 최대; 줄들[최대 - 1] += ' …'; }
  return 줄들;
};
const 동그라미수 = n => (n <= 20 ? String.fromCharCode(0x245f + n) : `(${n})`);
보내기.메모그리기 = function (c, 메모들, o) {
  if (!메모들.length) return;
  const x = c.getContext('2d'), W = c.width, H = c.height;
  const 자리 = m => {
    if (o.도면) return o.도면(m.x, m.y);
    const 돌 = o.돌 || 0, a = m.x, b = m.y;
    const [u, v] = 돌 === 0 ? [a, b] : 돌 === 1 ? [1 - b, a] : 돌 === 2 ? [1 - a, 1 - b] : [b, 1 - a];
    return [u * W, v * H];
  };
  for (const m of 메모들) {
    const [px, py] = 자리(m);
    const 글씨 = Math.max(12, o.도면 ? m.f * o.배율 : m.f * W);
    x.save();
    x.font = `${글씨}px system-ui, 'Noto Sans KR', sans-serif`; x.textBaseline = 'top';
    if (m.숨김) {                                       // 번호표
      const n = ++o.번호표.n, r = 글씨 * 0.95;
      o.번호표.목록.push({ n, 쪽: o.쪽, 글: m.글 });
      x.fillStyle = '#f59f00'; x.strokeStyle = '#ffffff'; x.lineWidth = Math.max(2, r / 6);
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#ffffff'; x.font = `700 ${r * 1.1}px system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(String(n), px, py + r * 0.04);
    } else {                                            // 노란 쪽지 상자 — 화면과 같은 자리 · 너비
      const 폭 = Math.min(W, o.도면 ? m.w * o.배율 : m.w * W), 여백 = 글씨 * 0.5;
      const 줄들 = 보내기.줄나누기(x, m.글, 폭 - 여백 * 2, 30);
      const 높 = 줄들.length * 글씨 * 1.4 + 여백 * 2;
      const 왼 = Math.max(0, Math.min(px, W - 폭)), 위 = Math.max(0, Math.min(py, H - 높));
      x.fillStyle = 'rgba(255,244,194,0.95)'; x.strokeStyle = '#e0bf3e'; x.lineWidth = Math.max(1, 글씨 / 14);
      x.beginPath(); x.roundRect ? x.roundRect(왼, 위, 폭, 높, 글씨 * 0.35) : x.rect(왼, 위, 폭, 높); x.fill(); x.stroke();
      x.fillStyle = '#3d3200';
      줄들.forEach((s, k) => x.fillText(s, 왼 + 여백, 위 + 여백 + k * 글씨 * 1.4));
    }
    x.restore();
  }
};
// 숨김 메모 목록 — 줄들을 만들어 둠 (쪽 · 띠가 같이 씀)
보내기.목록줄 = function (x, 목록, 폭) {
  const 줄 = [];
  for (const it of 목록) {
    const 머리 = `${동그라미수(it.n)} ${it.쪽 ? `(${it.쪽}쪽) ` : ''}`;
    보내기.줄나누기(x, 머리 + it.글, 폭, 40).forEach((s, k) => 줄.push({ s, 첫: k === 0 }));
    줄.push({ s: '', 첫: false });
  }
  return 줄;
};
보내기.메모목록쪽 = function (목록, 이름, W, H) {
  const 쪽들 = [], 글씨 = Math.round(W * 0.026), 여백 = Math.round(W * 0.08), 사이 = 글씨 * 1.55;
  const 새쪽 = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.textBaseline = 'top'; 쪽들.push(c); return x; };
  let x = 새쪽();
  x.font = `700 ${글씨 * 1.3}px system-ui, 'Noto Sans KR', sans-serif`; x.fillStyle = '#191f28';
  x.fillText('📝 메모 목록', 여백, 여백);
  x.font = `${글씨 * 0.8}px system-ui, 'Noto Sans KR', sans-serif`; x.fillStyle = '#6b7684';
  x.fillText(이름, 여백, 여백 + 글씨 * 1.9);
  let y = 여백 + 글씨 * 3.6;
  x.font = `${글씨}px system-ui, 'Noto Sans KR', sans-serif`;
  for (const 줄 of 보내기.목록줄(x, 목록, W - 여백 * 2)) {
    if (y + 사이 > H - 여백) { x = 새쪽(); x.font = `${글씨}px system-ui, 'Noto Sans KR', sans-serif`; y = 여백; }
    x.fillStyle = 줄.첫 ? '#191f28' : '#3a4250'; x.fillText(줄.s, 여백, y); y += 줄.s ? 사이 : 사이 * 0.5;
  }
  return 쪽들;
};
보내기.아래목록 = function (그림, 목록) {              // 그림 · 도면 — 아래로 늘려 목록 띠를 붙임
  const W = 그림.naturalWidth || 그림.width, H0 = 그림.naturalHeight || 그림.height;
  const 글씨 = Math.max(16, Math.round(W * 0.032)), 여백 = 글씨, 사이 = 글씨 * 1.5;
  const 잼 = document.createElement('canvas').getContext('2d'); 잼.font = `${글씨}px system-ui, 'Noto Sans KR', sans-serif`;
  const 줄들 = 보내기.목록줄(잼, 목록, W - 여백 * 2);
  const c = document.createElement('canvas'); c.width = W; c.height = Math.round(H0 + 여백 * 2 + 글씨 * 1.8 + 줄들.length * 사이);
  const x = c.getContext('2d');
  x.fillStyle = '#fffbea'; x.fillRect(0, 0, W, c.height); x.drawImage(그림, 0, 0, W, H0);
  x.fillStyle = '#e0bf3e'; x.fillRect(0, H0, W, Math.max(2, 글씨 / 8));
  x.textBaseline = 'top'; x.fillStyle = '#191f28'; x.font = `700 ${글씨 * 1.1}px system-ui, 'Noto Sans KR', sans-serif`;
  x.fillText('📝 메모', 여백, H0 + 여백);
  x.font = `${글씨}px system-ui, 'Noto Sans KR', sans-serif`;
  let y = H0 + 여백 + 글씨 * 1.8;
  for (const 줄 of 줄들) { x.fillStyle = 줄.첫 ? '#191f28' : '#3a4250'; x.fillText(줄.s, 여백, y); y += 사이; }
  return c;
};
