(function(){
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- data prep ---------- */
const ALL = [...ARTSTATION, ...BEHANCE];
const byId = Object.fromEntries(ALL.map(p => [p.id, p]));
const groups = {
  '3d': ARTSTATION.filter(p => p.group === '3d'),
  mixed: ARTSTATION.filter(p => p.group === 'mixed'),
  '2d': BEHANCE.filter(p => p.group === '2d').sort((a, b) => {
    const ia = FEATURED_2D.indexOf(a.id), ib = FEATURED_2D.indexOf(b.id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  }),
  film: BEHANCE.filter(p => p.group === 'film')
};
const BE_SIZES = ['max_1200','hd','1400','disp','max_632','fs_webp'];

function beUrl(file, size){ return BE + size + '/' + file; }
function imgSrc(item){
  const [t, p] = item;
  if (t === 'i') return ASI(p);
  if (t === 'b') return beUrl(p, BE_SIZES[0]);
  if (t === 'r') return BE + p;
  return '';
}
function coverOf(p){
  if (p.cover) return p.cover;
  const first = p.items.find(i => i[0] === 'b' || i[0] === 'r');
  if (!first) return '';
  /* Cards only need a small file; full 1400px PNGs make slots load slowly or not at all. */
  if (first[0] === 'b') return beUrl(first[1], p.group === '2d' ? 'max_632' : 'max_1200');
  return imgSrc(first);
}
/* Behance sizes differ per image and some fail or stall; move to the next size on an error or after a timeout, then retry once. */
function fallback(img){
  const step = () => {
    const m = img.src.match(/project_modules\/([^/]+)\/([^?]+)/);
    if (!m) return;
    const i = BE_SIZES.indexOf(m[1]);
    if (i > -1 && i < BE_SIZES.length - 1){ img.src = beUrl(m[2], BE_SIZES[i+1]); watch(); }
    else if (!img.dataset.retried){ img.dataset.retried = 1; setTimeout(() => { img.src = beUrl(m[2], BE_SIZES[0]) + '?r=1'; watch(); }, 1500); }
  };
  const watch = () => { const s = img.src; setTimeout(() => { if (img.src === s && !(img.complete && img.naturalWidth)) step(); }, 6000); };
  img.addEventListener('error', step);
  /* only start the stall timer once the image is near the screen, so lazy images aren't swapped before they load */
  new IntersectionObserver((es, ob) => { if (es.some(e => e.isIntersecting)){ ob.disconnect(); watch(); } }, {rootMargin:'300px'}).observe(img);
}

/* ---------- home ---------- */
function card(p){
  const a = document.createElement('a');
  a.className = 'card'; a.href = '#/p/' + p.id;
  if (p.external){ a.href = p.external; a.target = '_blank'; a.rel = 'noopener'; a.classList.add('ext'); }
  const tools = (p.tools || []).slice(0,3).map(t => '<span>' + esc(t) + '</span>').join('') + (p.external ? '<span>Play on itch.io ↗</span>' : '');
  a.innerHTML =
    '<div class="thumb"><img loading="lazy" decoding="async" alt="' + esc(p.title) + '" src="' + esc(coverOf(p)) + '">' +
    (p.badge ? '<span class="badge">' + esc(p.badge) + '</span>' : '') + '</div>' +
    '<h3>' + esc(p.title) + '</h3>' +
    '<p class="meta"><span>' + p.year + '</span>' + tools + '</p>' +
    (p.summary ? '<p class="sum">' + esc(p.summary) + '</p>' : '');
  fallback(a.querySelector('img'));
  return a;
}
function fill(sel, list){ const el = $(sel); list.forEach(p => el.appendChild(card(p))); }
fill('#grid3d', groups['3d']); fill('#gridMixed', groups.mixed); fill('#grid2d', groups['2d']); fill('#gridFilm', groups.film);

/* illustration: show featured only, expand on click */
(function(){
  const grid = $('#grid2d'), cards = [...grid.children], n = FEATURED_2D.length;
  if (cards.length <= n) return;
  cards.slice(n).forEach(c => c.classList.add('is-extra'));
  const row = document.createElement('div'); row.className = 'more-row';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn ghost';
  const label = () => btn.textContent = grid.classList.contains('open') ? 'Show fewer' : 'Show all ' + cards.length + ' illustrations';
  btn.addEventListener('click', () => { grid.classList.toggle('open'); label(); });
  label(); row.appendChild(btn); grid.after(row);
})();

/* hero slideshow */
const slides = [
  {id:'gravity-machine', src:ASI('103/231/885/large/ankitha-ys-1-hero-render.webp?1792024760')},
  {id:'sunken-city', src:ASI('094/817/517/large/ankitha-y-s-frame-26.webp?1766538894'), banner:true},
  {id:'duskscape', src:ASI('090/338/881/large/ankitha-y-s-highresscreenshot00021.jpg?1753644086')},
  {id:'wolf-saga', src:ASI('094/896/463/large/ankitha-y-s-highresscreenshot00003.webp?1766894159')}
];
const stage = $('#heroStage'), heroLink = $('#heroProject');
slides.forEach((s,i) => { const im = new Image(); im.alt=''; im.decoding='async'; if(i>0) im.loading='lazy'; im.src = s.src;
  /* these frames carry a title strip along the bottom (about 19% of the image); crop it off the image itself, then favour the lower part so the street stays in view */
  if (s.banner){ im.style.objectViewBox = 'inset(0 0 19.04% 0)'; im.style.objectPosition = '50% 70%'; }
  stage.appendChild(im); });
let cur = 0;
function showSlide(i){
  cur = i;
  [...stage.children].forEach((im,k) => im.classList.toggle('on', k === i));
  heroLink.href = '#/p/' + slides[i].id;
  heroLink.textContent = 'Now showing: ' + byId[slides[i].id].title.split(':')[0];
}
showSlide(0);
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => showSlide((cur+1) % slides.length), 6500);

/* about + contact */
(function(){
  const P = PROFILE;
  $('#aboutMain').innerHTML = P.summary.map(t => '<p>' + esc(t) + '</p>').join('') +
    '<img class="portrait" loading="lazy" decoding="async" src="ankitha.jpg" alt="Portrait of Ankitha Y.S.">';
  $('#aboutSide').innerHTML =
    '<section><h3>Skills</h3>' + P.skills.map(s => '<p><b>' + esc(s[0]) + '</b>' + esc(s[1]) + '</p>').join('') + '</section>' +
    '<section><h3>Education</h3>' + P.education.map(e => '<p><b>' + esc(e.deg) + '</b>' + esc(e.org) + ', ' + esc(e.when) + '</p>').join('') + '</section>' +
    '<section><h3>Certifications</h3><ul>' + P.certs.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul></section>';
  $('#xp').innerHTML = '<h3>Experience</h3>' + P.experience.map(j =>
    '<div class="job"><div class="when">' + esc(j.when) + '</div><div><h4>' + esc(j.role) + '</h4><p class="org">' + esc(j.org) + '</p><p>' + esc(j.text) + '</p></div></div>').join('');
  $('#mailText').firstChild || ($('#mailText').textContent = P.email);
  $('#contactLinks').innerHTML =
    '<a class="btn" href="' + P.links.artstation + '" target="_blank" rel="noopener">ArtStation</a>' +
    '<a class="btn ghost" href="' + P.links.behance + '" target="_blank" rel="noopener">Behance</a>' +
    '<a class="btn ghost" href="' + P.links.linkedin + '" target="_blank" rel="noopener">LinkedIn</a>';
  $('#copyMail').addEventListener('click', async e => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(P.email); b.textContent = 'Copied'; }
    catch(_){ const r = document.createRange(); r.selectNodeContents($('#mailText')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Press Ctrl+C'; }
    setTimeout(() => b.textContent = 'Copy', 1800);
  });
})();

/* ---------- project view ---------- */
const embedUrl = (t,id) => t==='y' ? 'https://www.youtube-nocookie.com/embed/'+id
  : t==='v' ? 'https://player.vimeo.com/video/'+id
  : t==='a' ? 'https://www-ccv.adobe.io/v1/player/ccv/'+id+'/embed?api_key=behance1&bgcolor=%23191919' : id;

function bodyHTML(p){
  const out = []; let i = 0; const it = p.items;
  while (i < it.length){
    const x = it[i], t = x[0];
    if (t === 'b' || t === 'i'){
      out.push('<figure><img loading="lazy" decoding="async" data-zoom alt="' + esc(x[2] || p.title) + '" src="' + esc(imgSrc(x)) + '">' + (t==='i' && x[2] ? '<figcaption>' + esc(x[2]) + '</figcaption>' : '') + '</figure>'); i++;
    } else if (t === 'r'){
      let run = []; while (i < it.length && it[i][0] === 'r'){ run.push(it[i]); i++; }
      const imgs = run.map(r => '<img loading="lazy" decoding="async" data-zoom alt="' + esc(p.title) + '" src="' + esc(imgSrc(r)) + '">').join('');
      out.push(run.length > 1 ? '<div class="pair">' + imgs + '</div>' : '<figure>' + imgs + '</figure>');
    } else if (t === 't'){ out.push('<p class="para">' + esc(x[1]) + '</p>'); i++; }
    else if (t === 'h'){ out.push('<h3 class="sub">' + esc(x[1]) + '</h3>'); i++; }
    else if (t === 'link'){ out.push('<div class="linkrow">' + esc(x[1]) + ': <a href="https://www.artstation.com/artwork/' + p.hash + '" target="_blank" rel="noopener">open on ArtStation</a></div>'); i++; }
    else { // y, v, a, f
      const src = t === 'f' ? x[1] : embedUrl(t, x[1]);
      const title = t === 'f' ? x[2] : x[2];
      out.push('<figure><div class="video"><iframe loading="lazy" src="' + esc(src) + '" title="' + esc(title || p.title) + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>' + (title && t!=='f' ? '<figcaption>' + esc(title) + '</figcaption>' : '') + '</figure>'); i++;
    }
  }
  return out.join('');
}
function descHTML(p){
  if (!p.desc || !p.desc.length) return '';
  return p.desc.map(d => d[0]==='#' ? '<h3>' + esc(d.slice(1)) + '</h3>' : '<p>' + esc(d) + '</p>').join('');
}
function renderProject(id){
  const p = byId[id]; const el = $('#project');
  if (!p || p.external){ location.hash = '#top'; return; }
  const list = groups[p.group].filter(x => !x.external), k = list.indexOf(p);
  const prev = list[(k-1+list.length)%list.length], next = list[(k+1)%list.length];
  const isAS = !!p.hash;
  const srcUrl = isAS ? 'https://www.artstation.com/artwork/' + p.hash : bh(p.bid, p.slug);
  const chips = (p.tools||[]).map(t => '<li class="tool">' + esc(t) + '</li>').join('') + [...(p.cats||[]), ...(p.mediums||[]), ...(p.tags||[])].filter((v,i,s)=>s.findIndex(w=>w.toLowerCase()===v.toLowerCase())===i).slice(0,8).map(t => '<li>' + esc(t) + '</li>').join('');
  const home = {'3d':'#work', mixed:'#mixed', '2d':'#illustration', film:'#film'}[p.group];
  const links = (p.links||[]).map(l => '<a href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.label) + '</a>').join('');
  el.innerHTML =
    '<div class="wrap p-head"><a class="back" href="' + home + '" data-home>← All work</a>' +
    '<p class="eyebrow">' + (isAS ? 'ArtStation' : 'Behance') + ' · ' + p.year + (p.badge ? ' · ' + esc(p.badge) : '') + '</p>' +
    '<h1>' + esc(p.title) + '</h1><ul class="chips">' + chips + '</ul></div>' +
    '<div class="wrap p-text"><div class="p-facts">' +
      (p.tools && p.tools.length ? '<div>Software<b>' + p.tools.map(esc).join('<br>') + '</b></div>' : '') +
      '<div>Year<b>' + p.year + '</b></div></div>' +
    '<div class="p-body">' + descHTML(p) + '<div class="src"><a href="' + srcUrl + '" target="_blank" rel="noopener">View on ' + (isAS ? 'ArtStation' : 'Behance') + ' ↗</a>' + links + '</div></div></div>' +
    '<div class="wrap stack">' + bodyHTML(p) + '</div>' +
    '<div class="wrap"><nav class="pn" aria-label="More projects"><a href="#/p/' + prev.id + '"><small>← Previous</small><span>' + esc(prev.title) + '</span></a><a href="#/p/' + next.id + '"><small>Next →</small><span>' + esc(next.title) + '</span></a></nav></div>';
  el.querySelectorAll('img').forEach(fallback);
  document.title = p.title + ' | Ankitha Y.S.';
}

/* ---------- routing ---------- */
function route(){
  const h = location.hash, m = h.match(/^#\/p\/([\w-]+)/);
  if (m){
    $('#home').hidden = true; $('#project').hidden = false; renderProject(m[1]); window.scrollTo(0,0);
  } else {
    const wasProject = !$('#project').hidden;
    $('#project').hidden = true; $('#home').hidden = false; document.title = 'Ankitha Y.S. | 3D Environment Artist';
    const t = h.length > 1 ? document.getElementById(h.slice(1)) : null;
    if (t) t.scrollIntoView(); else if (wasProject || !h) window.scrollTo(0,0);
  }
}
addEventListener('hashchange', route); route();

/* header border */
const bar = $('#bar');
addEventListener('scroll', () => bar.classList.toggle('scrolled', scrollY > 20), {passive:true});

/* ---------- lightbox ---------- */
const lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
let zoomList = [], zi = 0;
function openLb(i){ zi = (i+zoomList.length)%zoomList.length; lbImg.src = zoomList[zi].src; lbCap.textContent = (zi+1) + ' / ' + zoomList.length; lb.hidden = false; }
function closeLb(){ lb.hidden = true; lbImg.removeAttribute('src'); }
document.addEventListener('click', e => {
  const im = e.target.closest('img[data-zoom]');
  if (im){ zoomList = [...$('#project').querySelectorAll('img[data-zoom]')]; openLb(zoomList.indexOf(im)); }
});
$('#lbX').onclick = closeLb; $('#lbPrev').onclick = () => openLb(zi-1); $('#lbNext').onclick = () => openLb(zi+1);
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
addEventListener('keydown', e => {
  if (lb.hidden) return;
  if (e.key === 'Escape') closeLb(); else if (e.key === 'ArrowLeft') openLb(zi-1); else if (e.key === 'ArrowRight') openLb(zi+1);
});
})();
