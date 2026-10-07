/* =========================================================
   하주선퍼스널컬러교육원 — 홈페이지 만들기 (소식 글쓰기 자동화)
   실행: node build_site.js
   하는 일:
     1) homepage 폴더의 페이지·이미지·관리자 화면을 dist 폴더로 복사 (원본은 건드리지 않음)
     2) content/posts 의 글(.md)을 읽어 소식 목록(news.html)과 글 페이지(news-글이름.html) 만들기
     3) 모든 페이지 상단 메뉴·하단 바로가기에 '소식' 추가
     4) sitemap.xml 에 소식 목록과 글 주소 자동 추가
   ========================================================= */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

/* ▼ 홈페이지 공개 주소: 정해지면 여기 한 곳만 바꾸세요 (또는 Netlify 환경변수 SITE_URL) */
const SITE_URL = (process.env.SITE_URL || 'https://spiffy-fairy-03f63f.netlify.app').replace(/\/+$/, '');
const BRAND = '하주선퍼스널컬러교육원';

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
/* dist 로 복사하지 않을 것: 작업용 파일·원본 사진 */
const SKIP = new Set(['dist', 'node_modules', 'content', 'build_site.js', 'netlify.toml', 'package.json', 'package-lock.json', 'colors.html', '.git']);
const SKIP_IN_IMAGES = new Set(['원본', '사진넣는법.txt']);

/* ---------- 도우미 ---------- */
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const read = p => fs.readFileSync(p, 'utf8');
function copyDir(src, dst, skip) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (skip && skip.has(name)) continue;
    const s = path.join(src, name), d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d, name === 'images' ? SKIP_IN_IMAGES : null);
    else fs.copyFileSync(s, d);
  }
}

/* 글 맨 위 정보(front matter) 읽기: title, date, category, summary, image, draft */
function parsePost(file) {
  const raw = read(file).replace(/^﻿/, '');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const data = {};
  let body = raw;
  if (m) {
    body = m[2];
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z_]+)\s*:\s*(.*)$/);
      if (!kv) continue;
      let v = kv[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (v === 'true') v = true; else if (v === 'false') v = false;
      data[kv[1]] = v;
    }
  }
  const slug = path.basename(file, '.md');
  const date = String(data.date || '').slice(0, 10);
  return {
    slug,
    file: `news-${slug}.html`,
    title: data.title || slug,
    date,
    category: data.category || '소식',
    summary: data.summary || '',
    image: normImage(data.image),
    draft: data.draft === true,
    html: marked.parse(body)
  };
}
/* 대표이미지 경로 정리: "lecture-5.jpg" → images/lecture-5.jpg, "/images/uploads/a.jpg" → images/uploads/a.jpg */
function normImage(img) {
  if (!img || typeof img !== 'string') return '';
  if (/^https?:\/\//.test(img)) return img;
  const p = img.replace(/^\/+/, '');
  return p.includes('/') ? p : 'images/' + p;
}
const absUrl = p => /^https?:\/\//.test(p) ? p : `${SITE_URL}/${p}`;
const fmtDate = d => d ? d.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1. $2. $3.') : '';

/* 글 내용에 맞는 서비스 페이지 고르기 */
function relatedService(post) {
  const t = `${post.title} ${post.category} ${post.summary}`;
  if (/강사|자격|출강|수강/.test(t)) return { href: 'instructor-course.html', label: '퍼스널컬러 강사 자격증 교육' };
  if (/진단|체형|어울리는|컬러 찾/.test(t)) return { href: 'color-diagnosis.html', label: '퍼스널컬러 진단·컨설팅' };
  if (/기업|학교|기관|강의|연수|워크숍/.test(t)) return { href: 'lecture.html', label: '기업·학교·기관 퍼스널컬러 강의' };
  return { href: 'services.html', label: '교육·진단 서비스 한눈에 보기' };
}

/* ---------- 메뉴에 '소식' 추가 ---------- */
function addNewsMenu(html, current) {
  if (!/href="news\.html"/.test(html)) {
    html = html.replace(/(<a href="gallery\.html"[^>]*>갤러리<\/a>)/, '$1\n      <a href="news.html">소식</a>');
    html = html.replace(/(<a href="gallery\.html">수업·활동 갤러리<\/a>)/, '$1\n          <a href="news.html">소식</a>');
  }
  if (current) {
    html = html.replace(/ aria-current="page"/g, '');
    html = html.replace('<a href="news.html">소식</a>', '<a href="news.html" aria-current="page">소식</a>');
  }
  return html;
}
const fillSiteUrl = html => html.split('https://spiffy-fairy-03f63f.netlify.app').join(SITE_URL);

/* ---------- 공통 머리·메뉴·푸터 (faq.html 에서 가져옴: 지금 홈페이지와 똑같이) ---------- */
const shellSrc = read(path.join(ROOT, 'faq.html'));
const SHELL_TOP = shellSrc.slice(shellSrc.indexOf('<body>'), shellSrc.indexOf('<main id="main">'));
const SHELL_BOTTOM = shellSrc.slice(shellSrc.indexOf('</main>') + '</main>'.length);

function head({ title, description, canonical, ogType, ogImage, jsonld }) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="theme-color" content="#fafafa">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700&display=swap">
<link rel="stylesheet" href="style.css">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="favicon-32.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>
</head>
`;
}
const page = (headHtml, mainHtml) => fillSiteUrl(headHtml + addNewsMenu(SHELL_TOP, true) + mainHtml + addNewsMenu(SHELL_BOTTOM, false));

const CAMERA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
function thumb(post) {
  if (post.image) return `<figure class="ph r-3x2"><img src="${esc(post.image)}" alt="${esc(post.title)} 대표 이미지" loading="lazy" onerror="this.parentNode.classList.add('is-empty')"><span class="ph__empty" aria-hidden="true">${CAMERA}${BRAND}</span></figure>`;
  return `<figure class="ph r-3x2 is-empty"><span class="ph__empty" aria-hidden="true">${CAMERA}${BRAND}</span></figure>`;
}
const ctaBand = `
  <section class="cta-band" aria-labelledby="cta-title">
    <div class="wrap cta-band__inner reveal">
      <div>
        <h2 id="cta-title">궁금한 점, <span class="accent-word">편하게</span> 물어보세요</h2>
        <p>교육과 진단, 어느 쪽이 맞을지 모르겠다면 상담으로 함께 정해요. 영업시간은 09시~19시, 일요일은 쉽니다.</p>
      </div>
      <div class="btn-row">
        <a class="btn btn-primary" href="tel:01053640480">전화로 상담 문의하기</a>
        <a class="btn btn-kakao" href="https://pf.kakao.com/_XtKnxj/chat" target="_blank" rel="noopener">카카오톡으로 상담하기</a>
      </div>
    </div>
  </section>
`;

/* ---------- 1) dist 만들기 ---------- */
fs.rmSync(DIST, { recursive: true, force: true });
copyDir(ROOT, DIST, SKIP);

/* 복사한 페이지들: 메뉴에 '소식' 추가, 공개 주소 채우기 */
for (const name of fs.readdirSync(DIST)) {
  if (!name.endsWith('.html')) continue;
  const p = path.join(DIST, name);
  fs.writeFileSync(p, fillSiteUrl(addNewsMenu(read(p), false)));
}

/* ---------- 2) 글 읽기 ---------- */
fs.mkdirSync(POSTS_DIR, { recursive: true });
const posts = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'))
  .map(f => parsePost(path.join(POSTS_DIR, f)))
  .filter(p => !p.draft)
  .sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.slug.localeCompare(b.slug));

/* ---------- 3) 글 페이지 ---------- */
for (const post of posts) {
  const canonical = `${SITE_URL}/${post.file}`;
  const svc = relatedService(post);
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      Object.assign({
        '@type': 'Article',
        headline: post.title,
        datePublished: post.date || undefined,
        description: post.summary || undefined,
        publisher: { '@type': 'Organization', name: BRAND },
        mainEntityOfPage: canonical
      }, post.image ? { image: absUrl(post.image) } : {}),
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: '소식', item: `${SITE_URL}/news.html` },
        { '@type': 'ListItem', position: 3, name: post.title, item: canonical }
      ] }
    ]
  };
  const main = `
<main id="main">
  <section class="page-hero">
    <div class="wrap article-wrap">
      <nav class="crumbs" aria-label="현재 위치"><a href="index.html">홈</a><span aria-hidden="true">/</span><a href="news.html">소식</a><span aria-hidden="true">/</span><span>${esc(post.title)}</span></nav>
      <p class="article__meta reveal"><span class="article__cat">${esc(post.category)}</span>${post.date ? `<time datetime="${esc(post.date)}">${fmtDate(post.date)}</time>` : ''}</p>
      <h1 class="reveal">${esc(post.title)}</h1>
      ${post.summary ? `<p class="lead reveal">${esc(post.summary)}</p>` : ''}
    </div>
  </section>

  <section class="section article-section">
    <div class="wrap article-wrap">
      ${post.image ? `<figure class="ph article__cover"><img src="${esc(post.image)}" alt="${esc(post.title)} 대표 이미지" onerror="this.parentNode.remove()"></figure>` : ''}
      <article class="article__body">
${post.html}
      </article>

      <div class="article__related">
        <p class="overline">Related</p>
        <div class="next-links">
          <a href="${svc.href}"><span><small>관련 서비스</small>${esc(svc.label)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
          <a href="news.html"><span><small>소식</small>다른 소식 보기</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
          <a href="contact.html"><span><small>문의</small>오시는 길·연락처</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
        </div>
      </div>
    </div>
  </section>
${ctaBand}
</main>
`;
  const html = page(head({
    title: `${post.title} | ${BRAND}`,
    description: post.summary || `${BRAND} 소식: ${post.title}`,
    canonical, ogType: 'article',
    ogImage: post.image ? absUrl(post.image) : `${SITE_URL}/images/lecture-5.jpg`,
    jsonld
  }), main);
  fs.writeFileSync(path.join(DIST, post.file), html);
}

/* ---------- 4) 소식 목록 (news.html) ---------- */
const cards = posts.map(p => `
        <article class="news-card">
          <a href="${p.file}" class="news-card__link">
            ${thumb(p)}
            <div class="news-card__body">
              <p class="article__meta"><span class="article__cat">${esc(p.category)}</span>${p.date ? `<time datetime="${esc(p.date)}">${fmtDate(p.date)}</time>` : ''}</p>
              <h2>${esc(p.title)}</h2>
              ${p.summary ? `<p>${esc(p.summary)}</p>` : ''}
              <span class="news-card__more">읽어 보기 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </div>
          </a>
        </article>`).join('');
const newsMain = `
<main id="main">
  <section class="page-hero">
    <div class="wrap">
      <nav class="crumbs" aria-label="현재 위치"><a href="index.html">홈</a><span aria-hidden="true">/</span><span>소식</span></nav>
      <h1 class="reveal">원주 퍼스널컬러 교육원 <span class="accent-word">소식</span></h1>
      <p class="lead reveal">${BRAND}의 교육·진단·강의 소식을 전해 드려요.</p>
    </div>
  </section>

  <section class="section" aria-label="소식 목록">
    <div class="wrap">
      ${posts.length ? `<div class="news-grid" data-stagger>${cards}
      </div>` : `<p class="news-empty">곧 새로운 소식을 올리겠습니다.</p>`}
    </div>
  </section>
${ctaBand}
</main>
`;
fs.writeFileSync(path.join(DIST, 'news.html'), page(head({
  title: `소식 | 원주 퍼스널컬러 교육·진단 ${BRAND}`,
  description: `${BRAND}의 퍼스널컬러 교육·진단·강의 소식을 모았습니다.`,
  canonical: `${SITE_URL}/news.html`, ogType: 'website',
  ogImage: `${SITE_URL}/images/lecture-5.jpg`,
  jsonld: { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: '소식', item: `${SITE_URL}/news.html` }
  ] }
}), newsMain));

/* ---------- 5) sitemap.xml ---------- */
const today = new Date().toISOString().slice(0, 10);
const pages = fs.readdirSync(DIST).filter(f => f.endsWith('.html') && !f.startsWith('news-') && f !== 'news.html').sort((a, b) => a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b));
const urls = [
  ...pages.map(f => ({ loc: f === 'index.html' ? `${SITE_URL}/` : `${SITE_URL}/${f}`, lastmod: today })),
  { loc: `${SITE_URL}/news.html`, lastmod: posts[0] ? posts[0].date || today : today },
  ...posts.map(p => ({ loc: `${SITE_URL}/${p.file}`, lastmod: p.date || today }))
];
fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(DIST, 'robots.txt'), fillSiteUrl(read(path.join(DIST, 'robots.txt'))));

console.log(`완료: 소식 글 ${posts.length}개 (임시저장 제외), 페이지 ${pages.length + 1 + posts.length}개 → dist 폴더`);
console.log(`공개 주소: ${SITE_URL}`);
