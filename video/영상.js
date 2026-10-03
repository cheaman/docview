// 영상 → 장면판 · 내용 문서 (36번 화면캡처 · v0.1 · 2026-10-04)
// 하는 일 : 녹화한 영상을 받아 → 앞뒤 자르기 → 장면 뽑기 → 장면판(9칸 그림) + 함께 갈 글 → 공유
//           클로드가 써 준 «내용 문서»를 받아 → 글 파일(.md) · 워드(.docx)로 만들어 → 공유
// 34번 문서보기에 넣을 부품 — 화면(영상.html)과 떨어져도 돌게 «셈»만 여기 둔다. 인터넷을 쓰지 않는다.
// 구역 지도 : ① 영상 열기 · 찾아가기 ② 장면 뽑기 ③ 장면판 그리기 ④ 함께 갈 글 ⑤ 내용 문서 → md · docx ⑥ 보내기
'use strict';
const 영상 = {};

const 쉼 = ms => new Promise(r => setTimeout(r, ms));
영상.시각 = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// 이벤트 하나를 기다림 — 시간이 넘으면 오류
function 기다림(el, 이름, ms) {
  return new Promise((ok, no) => {
    const 끝 = () => { clearTimeout(t); el.removeEventListener(이름, 끝); ok(); };
    const t = setTimeout(() => { el.removeEventListener(이름, 끝); no(new Error(이름 + ' 기다림 시간 넘음')); }, ms);
    el.addEventListener(이름, 끝);
  });
}

// ① 영상 열기 — <video> 에 파일을 걸고 길이(초)를 돌려줌
영상.열기 = async function (v, 파일) {
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  if (v._주소) URL.revokeObjectURL(v._주소);
  v._주소 = v.src = URL.createObjectURL(파일);
  await 기다림(v, 'loadedmetadata', 15000);
  if (!isFinite(v.duration)) {                 // 브라우저가 녹화한 webm 은 길이가 비어 있음 → 끝으로 한 번 보내 알아냄
    v.currentTime = 1e7;
    for (let n = 0; n < 60 && !isFinite(v.duration); n++) await 쉼(100);
    v.currentTime = 0;
    await 기다림(v, 'seeked', 4000).catch(() => {});
  }
  if (!isFinite(v.duration) || !v.videoWidth) throw new Error('영상 길이 · 크기를 못 읽음');
  return v.duration;
};

// t 초로 찾아가기 — 다 찾아갈 때까지 기다림
영상.가기 = async function (v, t) {
  t = Math.min(Math.max(0, t), v.duration - 0.02);
  if (Math.abs(v.currentTime - t) < 0.001 && !v.seeking) return;
  const 됨 = 기다림(v, 'seeked', 5000);
  v.currentTime = t;
  await 됨;
};

// ② 장면 뽑기 ─────────────────────────────────────────────
// 지문 : 32×32 회색 그림 — 두 지문의 차이(0 같음 ~ 1 전혀 다름)로 «장면이 바뀌었나»를 잼
영상.지문 = function (v, c) {
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(v, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data, g = new Float32Array(c.width * c.height);
  for (let i = 0, k = 0; i < d.length; i += 4, k++) g[k] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
  return g;
};
영상.차이 = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };

// 지금 보이는 장면 한 장 (폭 540 — 장면판 칸보다 조금 크게 떠 둠)
영상.한장 = function (v, 폭 = 540) {
  const 높 = Math.round(폭 * v.videoHeight / v.videoWidth);
  const c = document.createElement('canvas'); c.width = 폭; c.height = 높;
  c.getContext('2d').drawImage(v, 0, 0, 폭, 높);
  return c;
};

// 방식 '바뀔때' : 앞에 뽑은 장면과 많이 다르면 한 장 + 오래 안 바뀌어도 «최대간격» 마다 한 장 (자막만 바뀌는 장면)
// 방식 '2초'   : 2초마다 한 장
// 돌려줌 : [{ t, 그림(canvas) }]
영상.뽑기 = async function (v, 설정 = {}) {
  const { 시작 = 0, 끝 = v.duration, 방식 = '바뀔때', 문턱 = 0.06, 최소간격 = 0.8, 최대간격 = 3, 최대장수 = 27, 알림 } = 설정;
  const 길이 = Math.max(0.1, 끝 - 시작), 장면들 = [];
  if (방식 === '2초') {
    for (let t = 시작; t < 끝 - 0.05; t += 2) {
      await 영상.가기(v, t); 장면들.push({ t, 그림: 영상.한장(v) });
      알림 && 알림((t - 시작) / 길이);
    }
  } else {
    const 걸음 = 길이 <= 30 ? 0.25 : 길이 <= 120 ? 0.5 : 1;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    let 앞 = null, 앞t = -1e9;
    for (let t = 시작; t < 끝 - 0.05; t += 걸음) {
      await 영상.가기(v, t);
      const g = 영상.지문(v, c);
      const 바뀜 = 앞 === null || 영상.차이(g, 앞) > 문턱;
      if ((바뀜 && t - 앞t >= 최소간격) || t - 앞t >= 최대간격) {
        장면들.push({ t, 그림: 영상.한장(v) }); 앞 = g; 앞t = t;
      }
      알림 && 알림((t - 시작) / 길이);
      if (장면들.length % 4 === 0) await 쉼(0);          // 화면이 멈춘 듯 보이지 않게 한 숨
    }
  }
  알림 && 알림(1);
  return 영상.솎기(장면들, 최대장수);
};

// 너무 많으면 고르게 솎음 (처음 · 끝은 남김)
영상.솎기 = function (장면들, 최대) {
  if (장면들.length <= 최대) return 장면들;
  const 남길 = [];
  for (let i = 0; i < 최대; i++) 남길.push(장면들[Math.round(i * (장면들.length - 1) / (최대 - 1))]);
  return 남길;
};

// ③ 장면판 그리기 ──────────────────────────────────────────
// 9칸(3×3)씩 한 장 · 검은 바탕 · 칸 왼쪽 위 주황 딱지에 «번호 · 시각» · 맨 위 머리글
function 둥근네모(x, 왼, 위, 폭, 높, r) {
  x.beginPath(); x.moveTo(왼 + r, 위); x.arcTo(왼 + 폭, 위, 왼 + 폭, 위 + 높, r); x.arcTo(왼 + 폭, 위 + 높, 왼, 위 + 높, r);
  x.arcTo(왼, 위 + 높, 왼, 위, r); x.arcTo(왼, 위, 왼 + 폭, 위, r); x.closePath();
}
영상.글꼴 = 'Pretendard, "Malgun Gothic", "Noto Sans KR", sans-serif';
영상.장면판들 = function (장면들, 설정 = {}) {
  const { 칸 = 3, 줄 = 3, 칸폭 = 360, 머리글 = '영상' } = 설정;
  if (!장면들.length) return [];
  const 한판 = 칸 * 줄, 모두 = Math.ceil(장면들.length / 한판), 판들 = [];
  const 칸높 = Math.round(칸폭 * 장면들[0].그림.height / 장면들[0].그림.width), 틈 = 8, 머리 = 48;
  for (let i = 0; i < 장면들.length; i += 한판) {
    const 묶음 = 장면들.slice(i, i + 한판), 줄수 = Math.ceil(묶음.length / 칸);
    const c = document.createElement('canvas');
    c.width = 칸 * 칸폭 + (칸 + 1) * 틈; c.height = 머리 + 줄수 * 칸높 + (줄수 + 1) * 틈;
    const x = c.getContext('2d');
    x.fillStyle = '#1d1d1f'; x.fillRect(0, 0, c.width, c.height);
    x.textBaseline = 'middle';
    x.fillStyle = '#ffffff'; x.font = `700 21px ${영상.글꼴}`;
    x.fillText(`${머리글} · 장면판 ${판들.length + 1}/${모두} · 장면 ${i + 1}~${i + 묶음.length}`, 틈 + 6, 머리 / 2 + 4);
    묶음.forEach((s, k) => {
      const 왼 = 틈 + (k % 칸) * (칸폭 + 틈), 위 = 머리 + 틈 + Math.floor(k / 칸) * (칸높 + 틈);
      x.drawImage(s.그림, 왼, 위, 칸폭, 칸높);
      const 글 = `${i + k + 1} · ${영상.시각(s.t)}`;
      x.font = `700 22px ${영상.글꼴}`;
      const 폭 = x.measureText(글).width + 20;
      x.fillStyle = '#e8743b'; 둥근네모(x, 왼 + 8, 위 + 8, 폭, 34, 9); x.fill();
      x.fillStyle = '#ffffff'; x.fillText(글, 왼 + 18, 위 + 26);
    });
    판들.push(c);
  }
  return 판들;
};

// 캔버스 → JPEG 파일
영상.파일로 = (c, 이름, 질 = 0.88) => new Promise((ok, no) =>
  c.toBlob(b => b ? ok(new File([b], 이름, { type: 'image/jpeg' })) : no(new Error('그림 파일을 못 만듦')), 'image/jpeg', 질));

// ④ 함께 갈 글 — 장면판과 함께 클로드에게 가는 글
영상.함께갈글 = function ({ 출처 = '영상', 길이 = 0, 장수 = 0, 낱장 = false, 물음 = '' }) {
  const 줄1 = `${출처} · ${영상.시각(길이)} · 장면 ${장수}`;
  const 줄2 = 낱장 ? '그림은 시간 순서 · 파일 이름에 번호와 시각 · 화면 아래 자막도 읽어 줘'
                   : '장면판은 시간 순서 · 칸 왼쪽 위에 번호와 시각 · 화면 아래 자막도 읽어 줘';
  return [줄1, 줄2, (물음 || '').trim()].filter(Boolean).join('\n');
};

// ⑤ 내용 문서 ─────────────────────────────────────────────
영상.오늘 = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// 글 파일(.md) — 맨 위에 제목 · 출처 한 줄
영상.마크다운 = function ({ 제목, 출처줄, 본문 }) {
  본문 = (본문 || '').replace(/\r\n?/g, '\n').trim();
  let 첫줄 = `# ${제목 || '내용 정리'}`;
  if (/^#\s/.test(본문)) {                       // 클로드 답이 「# 제목」 으로 시작하면 그 줄을 맨 위에 그대로 — 출처는 그 아래
    const n = 본문.indexOf('\n');
    첫줄 = n < 0 ? 본문 : 본문.slice(0, n); 본문 = n < 0 ? '' : 본문.slice(n + 1).trim();
  }
  return `${첫줄}\n\n> ${출처줄}\n\n${본문}\n`;
};

// 워드(.docx) — 마크다운 몇 가지(# 제목 · - 목록 · 1. 번호 · | 표 | · **굵게** · > 인용)만 옮김
const 엑스 = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function 글토막(글, 기본 = {}) {                  // **굵게** 를 나눠 w:r 여럿으로
  return 글.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(조각 => {
    const 굵게 = /^\*\*.*\*\*$/.test(조각) || 기본.굵게;
    const t = 조각.replace(/^\*\*|\*\*$/g, '');
    const 꼴 = `<w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="맑은 고딕"/>${굵게 ? '<w:b/>' : ''}${기본.크기 ? `<w:sz w:val="${기본.크기}"/><w:szCs w:val="${기본.크기}"/>` : ''}${기본.색 ? `<w:color w:val="${기본.색}"/>` : ''}</w:rPr>`;
    return `<w:r>${꼴}<w:t xml:space="preserve">${엑스(t)}</w:t></w:r>`;
  }).join('');
}
const 문단 = (글, 기본 = {}, 들여 = 0) =>
  `<w:p><w:pPr><w:spacing w:after="${기본.뒤 ?? 80}"/>${들여 ? `<w:ind w:left="${들여}" w:hanging="240"/>` : ''}</w:pPr>${글토막(글, 기본)}</w:p>`;
function 표(줄들) {
  const 칸들 = 줄들.filter(l => !/^\|?\s*:?-{2,}/.test(l.replace(/\s/g, '').replace(/^\|/, '')))
    .map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim()));
  const 선 = v => `<w:${v} w:val="single" w:sz="4" w:color="BFBFBF"/>`;
  const 줄xml = 칸들.map((r, i) => `<w:tr>${r.map(셀 => `<w:tc><w:tcPr>${i === 0 ? '<w:shd w:val="clear" w:fill="F2F2F2"/>' : ''}</w:tcPr>${문단(셀, { 굵게: i === 0, 뒤: 0 })}</w:tc>`).join('')}</w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(선).join('')}</w:tblBorders></w:tblPr>${줄xml}</w:tbl>${문단('', { 뒤: 0 })}`;
}
영상.워드본문 = function (md) {
  const 줄들 = md.replace(/\r\n?/g, '\n').split('\n'), 결과 = [];
  for (let i = 0; i < 줄들.length; i++) {
    const l = 줄들[i];
    if (/^\s*\|/.test(l)) { const 묶 = []; while (i < 줄들.length && /^\s*\|/.test(줄들[i])) 묶.push(줄들[i++]); i--; 결과.push(표(묶)); continue; }
    let m;
    if ((m = l.match(/^(#{1,3})\s+(.*)/))) 결과.push(문단(m[2], { 굵게: true, 크기: [0, 34, 28, 24][m[1].length], 뒤: 120 }));
    else if ((m = l.match(/^>\s?(.*)/))) 결과.push(문단(m[1], { 색: '6E6E73' }));
    else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) 결과.push(문단('• ' + m[1], {}, 360));
    else if ((m = l.match(/^\s*(\d+)[.)]\s+(.*)/))) 결과.push(문단(`${m[1]}. ${m[2]}`, {}, 360));
    else if (!l.trim()) 결과.push(문단('', { 뒤: 0 }));
    else 결과.push(문단(l));
  }
  return 결과.join('');
};
영상.워드 = function (md) {
  const 본 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${영상.워드본문(md)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1304" w:bottom="1418" w:left="1304" w:header="851" w:footer="851" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const 꼴표 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const 관계 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  return 영상.압축([['[Content_Types].xml', 꼴표], ['_rels/.rels', 관계], ['word/document.xml', 본]]);
};

// 압축(zip) — 누르지 않고 담기만 (워드 파일 껍데기용)
const CRC표 = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC표[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
영상.압축 = function (항목들) {
  const 인코더 = new TextEncoder(), 조각 = [], 목록 = [];
  let 자리 = 0;
  for (const [이름, 내용] of 항목들) {
    const n = 인코더.encode(이름), d = typeof 내용 === 'string' ? 인코더.encode(내용) : 내용, c = crc32(d);
    const 머리 = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, 0, 2], [12, 0x21, 2], [14, c, 4], [18, d.length, 4], [22, d.length, 4], [26, n.length, 2], [28, 0, 2]]
      .forEach(([o, v, s]) => s === 4 ? 머리.setUint32(o, v, true) : 머리.setUint16(o, v, true));
    조각.push(new Uint8Array(머리.buffer), n, d);
    목록.push({ n, c, 크기: d.length, 자리 });
    자리 += 30 + n.length + d.length;
  }
  const 목록시작 = 자리;
  for (const e of 목록) {
    const h = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, 0, 2], [14, 0x21, 2], [16, e.c, 4], [20, e.크기, 4], [24, e.크기, 4], [28, e.n.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, e.자리, 4]]
      .forEach(([o, v, s]) => s === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true));
    조각.push(new Uint8Array(h.buffer), e.n);
    자리 += 46 + e.n.length;
  }
  const 끝 = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [8, 목록.length, 2], [10, 목록.length, 2], [12, 자리 - 목록시작, 4], [16, 목록시작, 4]]
    .forEach(([o, v, s]) => s === 4 ? 끝.setUint32(o, v, true) : 끝.setUint16(o, v, true));
  조각.push(new Uint8Array(끝.buffer));
  return new Blob(조각, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
};

// ⑥ 보내기 ───────────────────────────────────────────────
// 폰 : 공유 창(카톡 · 클로드 · 메모 …) · PC : 내려받기 + 글은 복사해 둠
// 34번에 넣을 때 : 껍데기에 «여러 파일 공유» 다리(shareFiles)를 더하면 그 길을 먼저 탐
영상.보내기 = async function (파일들, 글) {
  if (window.다리 && 다리.shareFiles) { await 다리.shareFiles(파일들, 글 || ''); return '공유'; }
  if (navigator.canShare && navigator.canShare({ files: 파일들 })) {
    await navigator.share(글 ? { files: 파일들, text: 글 } : { files: 파일들 });
    return '공유';
  }
  for (const f of 파일들) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove();
    await 쉼(250);
  }
  if (글) { try { await navigator.clipboard.writeText(글); } catch (e) { /* 복사 못 해도 파일은 받음 */ } }
  return '내려받기';
};
