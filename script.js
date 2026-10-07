/* 하주선퍼스널컬러교육원 — 공통 스크립트 */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 첫 화면 등장 */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.add('is-loaded'); });
  });

  /* 상단 메뉴: 스크롤하면 유리 배경 */
  var header = document.querySelector('.header');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* 모바일 메뉴 */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      header.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        header.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* 표: 휴대폰에서 칸마다 항목 이름이 보이도록 머리글을 붙여 둠 (colspan 고려) */
  document.querySelectorAll('.table').forEach(function (table) {
    var heads = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
    table.querySelectorAll('tbody tr').forEach(function (tr) {
      var col = 1;
      Array.prototype.forEach.call(tr.querySelectorAll('td'), function (td) {
        var span = parseInt(td.getAttribute('colspan') || '1', 10);
        if (span === 1 && heads[col]) td.setAttribute('data-label', heads[col]);
        col += span;
      });
    });
  });

  /* 사진 자리: 파일이 없으면 빈 자리 틀 표시 (onerror 보완) */
  document.querySelectorAll('.ph > img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) img.closest('.ph').classList.add('is-empty');
  });

  /* 첫 화면 사진·영상: 파일이 있으면 hero--media */
  var hero = document.querySelector('.hero');
  var frame = document.querySelector('.hero__frame');
  if (hero && frame) {
    var heroImg = frame.querySelector('img');
    var heroVid = frame.querySelector('video');
    if (heroImg) {
      if (heroImg.complete && heroImg.naturalWidth > 0) hero.classList.add('hero--media');
      heroImg.addEventListener('load', function () { hero.classList.add('hero--media'); });
    }
    if (heroVid) {
      heroVid.addEventListener('loadeddata', function () {
        hero.classList.add('hero--media');
        frame.classList.add('has-video');
        frame.classList.remove('is-empty');
        if (reduce) heroVid.pause();
      });
    }
  }

  /* 소개 영상 자리 */
  document.querySelectorAll('video[data-ph]').forEach(function (v) {
    var box = v.closest('.ph');
    v.addEventListener('loadeddata', function () { box.classList.remove('is-empty'); });
    v.addEventListener('error', function () { box.classList.add('is-empty'); }, true);
    var src = v.querySelector('source');
    if (src) src.addEventListener('error', function () { box.classList.add('is-empty'); });
  });

  /* 스크롤 등장 */
  var items = document.querySelectorAll('.reveal');
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.classList.add('reveal');
      child.style.setProperty('--d', (i * 0.08).toFixed(2) + 's');
    });
  });
  items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* 대형 이미지 띠: 천천히 다르게 움직임 (패럴랙스) */
  /* data-zoom: 사진을 크게 확대해 클로즈업으로 보여줄 배율 (기본 1.08) */
  var bands = document.querySelectorAll('.band > img, .split-bleed__media img:not([data-static])');
  if (bands.length && !reduce) {
    var ticking = false;
    function parallax() {
      bands.forEach(function (img) {
        var r = img.parentNode.getBoundingClientRect();
        var vh = window.innerHeight;
        if (r.bottom < 0 || r.top > vh) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh;
        var z = parseFloat(img.getAttribute('data-zoom') || '1.08');
        img.style.transform = 'scale(' + z + ') translateY(' + (p * -40).toFixed(1) + 'px)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(parallax); ticking = true; }
    }, { passive: true });
    parallax();
  }

  /* 곡선을 따라 흐르는 글자 띠 (React Bits CurvedLoop 방식) — 끌어서 움직일 수도 있음 */
  document.querySelectorAll('[data-curved-loop]').forEach(function (box, n) {
    var NS = 'http://www.w3.org/2000/svg';
    var text = box.getAttribute('data-text') || '';
    var speed = parseFloat(box.getAttribute('data-speed') || '2');
    var curve = parseFloat(box.getAttribute('data-curve') || '400');
    var dir = box.getAttribute('data-direction') === 'right' ? 'right' : 'left';
    var id = 'curve-' + n;

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'curved-loop-svg');
    svg.setAttribute('viewBox', '0 0 1440 120');
    var measure = document.createElementNS(NS, 'text');
    measure.setAttribute('xml:space', 'preserve');
    measure.style.visibility = 'hidden';
    measure.style.opacity = '0';
    measure.textContent = text;
    var defs = document.createElementNS(NS, 'defs');
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('id', id);
    path.setAttribute('d', 'M-100,40 Q500,' + (40 + curve) + ' 1540,40');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'transparent');
    defs.appendChild(path);
    var label = document.createElementNS(NS, 'text');
    label.setAttribute('xml:space', 'preserve');
    var tp = document.createElementNS(NS, 'textPath');
    tp.setAttribute('href', '#' + id);
    tp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + id);
    label.appendChild(tp);
    svg.appendChild(measure); svg.appendChild(defs); svg.appendChild(label);
    box.appendChild(svg);

    function build() {
      var spacing = measure.getComputedTextLength();
      if (!spacing) return 0;
      var count = Math.ceil(1800 / spacing) + 2;
      while (tp.firstChild) tp.removeChild(tp.firstChild);
      /* ✦ 기호만 포인트 색으로 */
      for (var i = 0; i < count; i++) {
        text.split('✦').forEach(function (part, j, arr) {
          var w = document.createElementNS(NS, 'tspan'); w.textContent = part; tp.appendChild(w);
          if (j < arr.length - 1) { var s = document.createElementNS(NS, 'tspan'); s.setAttribute('class', 'accent'); s.textContent = '✦'; tp.appendChild(s); }
        });
      }
      return spacing;
    }

    var spacing = 0, offset = 0, dragging = false, lastX = 0, vel = 0, curDir = dir;
    function wrap(v) { while (v <= -spacing) v += spacing; while (v > 0) v -= spacing; return v; }
    function start() {
      spacing = build();
      if (!spacing) { requestAnimationFrame(start); return; }
      offset = -spacing;
      tp.setAttribute('startOffset', offset + 'px');
      if (reduce) return;
      (function step() {
        if (!dragging) {
          var delta = curDir === 'right' ? speed : -speed;
          offset = wrap(offset + delta);
          tp.setAttribute('startOffset', offset + 'px');
        }
        requestAnimationFrame(step);
      })();
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();

    box.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; vel = 0;
      box.classList.add('is-dragging');
      box.setPointerCapture(e.pointerId);
    });
    box.addEventListener('pointermove', function (e) {
      if (!dragging || !spacing) return;
      var dx = e.clientX - lastX; lastX = e.clientX; vel = dx;
      offset = wrap(offset + dx * (1440 / box.clientWidth));
      tp.setAttribute('startOffset', offset + 'px');
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      box.classList.remove('is-dragging');
      if (vel) curDir = vel > 0 ? 'right' : 'left';
    }
    box.addEventListener('pointerup', end);
    box.addEventListener('pointerleave', end);
  });

  /* 갤러리: 사진을 누르면 화면 가득 크게 보기 (좌우 화살표, 밀기, 키보드, 닫기) */
  var galItems = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
  if (galItems.length) {
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '사진 크게 보기');
    lb.innerHTML =
      '<img class="lb__img" alt="">' +
      '<p class="lb__cap"></p>' +
      '<button class="lb__btn lb__close" type="button" aria-label="닫기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<button class="lb__btn lb__prev" type="button" aria-label="이전 사진"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>' +
      '<button class="lb__btn lb__next" type="button" aria-label="다음 사진"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('.lb__img'), lbCap = lb.querySelector('.lb__cap');
    var cur = 0, lastFocus = null;
    function show(i) {
      cur = (i + galItems.length) % galItems.length;
      var a = galItems[cur];
      lbImg.src = a.getAttribute('href');
      lbImg.alt = a.getAttribute('data-caption') || '';
      lbCap.innerHTML = '';
      lbCap.appendChild(document.createTextNode(a.getAttribute('data-caption') || ''));
      var n = document.createElement('span'); n.textContent = (cur + 1) + ' / ' + galItems.length; lbCap.appendChild(n);
    }
    function open(i) { lastFocus = document.activeElement; show(i); lb.classList.add('is-open'); document.body.style.overflow = 'hidden'; lb.querySelector('.lb__close').focus(); }
    function close() { lb.classList.remove('is-open'); document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
    galItems.forEach(function (a, i) {
      a.addEventListener('click', function (e) { e.preventDefault(); open(i); });
    });
    lb.querySelector('.lb__close').addEventListener('click', close);
    lb.querySelector('.lb__prev').addEventListener('click', function () { show(cur - 1); });
    lb.querySelector('.lb__next').addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'ArrowRight') show(cur + 1);
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 40) show(dx < 0 ? cur + 1 : cur - 1);
    });
  }

  /* 화면 오른쪽 아래 고정 "문의하기" 버튼 — 카카오톡 채널 채팅으로 연결 (모든 페이지 공통) */
  if (!document.querySelector('.fab')) {
    var fab = document.createElement('a');
    fab.className = 'fab';
    fab.href = 'https://pf.kakao.com/_XtKnxj/chat';
    fab.target = '_blank';
    fab.rel = 'noopener';
    fab.setAttribute('aria-label', '카카오톡으로 문의하기 (새 창)');
    fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#191919" d="M12 3.375c-5.385 0-9.75 3.442-9.75 7.688 0 2.744 1.825 5.153 4.57 6.513-.15.515-.96 3.313-.992 3.533 0 0-.02.165.087.228.107.063.233.014.233.014.307-.043 3.557-2.326 4.12-2.723.562.08 1.14.121 1.732.121 5.385 0 9.75-3.441 9.75-7.687S17.385 3.375 12 3.375z"/></svg><span>문의하기</span>';
    document.body.appendChild(fab);
  }

  /* 푸터 연도 */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
