// Corbo Digital, one script for the single page. Each block checks its element exists.
document.documentElement.classList.add('js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ponytail: no backend yet. Set this to the real lead endpoint (the live site's form handler) before launch.
const FORM_ENDPOINT = '';

// header turns solid once the page scrolls
const header = document.getElementById('top');
const heroVideo = document.querySelector('.hero-video');
const onScroll = () => {
  header.classList.toggle('scrolled', scrollY > 40);
  // the hero footage trails the page a little while it scrolls away
  if (heroVideo && !reduce && scrollY < innerHeight) heroVideo.style.transform = `translateY(${scrollY * 0.18}px)`;
};
['scroll', 'load', 'pageshow', 'hashchange', 'resize'].forEach(ev => addEventListener(ev, onScroll, { passive: true })); onScroll();

// phone menu
const menuBtn = document.getElementById('menuBtn'), nav = document.getElementById('nav');
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
  document.body.style.overflow = open ? 'hidden' : '';
});
nav.addEventListener('click', e => { if (e.target.closest('a') && nav.classList.contains('open')) menuBtn.click(); });

// logo band: duplicate once so the loop is seamless
const track = document.querySelector('.logos-track');
if (track) track.append(...[...track.children].map(n => { const c = n.cloneNode(true); c.alt = ''; c.setAttribute('aria-hidden', 'true'); return c; }));

// section reveal, all at once when the section arrives
const sections = document.querySelectorAll('main > section:not(.hero)');
if ('IntersectionObserver' in window && !reduce) {
  sections.forEach(s => s.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  sections.forEach(s => io.observe(s));
}

// clips load and play only while on screen
const clips = document.querySelectorAll('video[data-src]');
const desk = matchMedia('(min-width: 901px)');
const start = v => { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); };
if (!reduce && 'IntersectionObserver' in window) {
  const vo = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    // on desktop the reel stacks its clips; only the chosen one plays
    if (desk.matches && v.closest('.clip:not(.is-active)')) return v.pause();
    if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); }
    else v.pause();
  }), { threshold: 0.35 });
  clips.forEach(v => vo.observe(v));
}
if (reduce) heroVideo?.pause();

// work reel: the list picks which clip fills the screen
const reelFigs = [...document.querySelectorAll('.reel .clip')], reelBtns = [...document.querySelectorAll('.reel-btn')];
const pick = n => {
  reelFigs.forEach((f, k) => {
    f.classList.toggle('is-active', k === n);
    const v = f.querySelector('video');
    if (k !== n) v.pause(); else if (!reduce) start(v);
  });
  reelBtns.forEach((b, k) => { b.classList.toggle('is-active', k === n); b.setAttribute('aria-pressed', k === n); });
};
reelBtns.forEach((b, k) => ['click', 'mouseenter', 'focus'].forEach(ev => b.addEventListener(ev, () => pick(k))));

// Meta management toggle updates the Pubs prices
const meta = document.getElementById('metaToggle');
if (meta) meta.addEventListener('change', () => {
  const key = meta.checked ? 'meta' : 'base';
  document.getElementById('pubs').classList.toggle('meta-on', meta.checked);
  document.querySelectorAll('#pubs [data-base]').forEach(el => {
    if (el.classList.contains('amount') && !reduce) {
      el.classList.add('swap');
      setTimeout(() => { el.textContent = el.dataset[key]; el.classList.remove('swap'); }, 180);
    } else el.textContent = el.dataset[key];
  });
});

// a plan button carries its choice into the contact form
document.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
  const f = document.getElementById('leadForm'); if (!f || !f.forfait) return;
  f.querySelector(`input[name=forfait][value=${b.dataset.pick}]`).checked = true;
  f.plan.value = b.dataset.plan + (b.dataset.pick === 'pubs' && meta?.checked ? ' avec gestion Meta' : '');
}));

// three-step contact form
const form = document.getElementById('leadForm');
if (form) {
  const steps = [...form.querySelectorAll('.step')];
  const bar = form.querySelector('.progress span');
  let i = 0;
  const show = n => {
    steps[i].classList.remove('is-active'); i = n; steps[i].classList.add('is-active');
    bar.style.width = ((i + 1) / steps.length * 100) + '%';
    steps[i].querySelector('input:not([type=radio]),textarea')?.focus({ preventScroll: true });
  };
  const valid = step => {
    const err = step.querySelector('.err'); err.textContent = '';
    if (step.querySelector('input[type=radio]') && !step.querySelector('input:checked')) { err.textContent = 'Choisissez une option pour continuer.'; return false; }
    for (const f of step.querySelectorAll('[required]:not([type=radio])')) {
      f.value = f.value.trim();
      if (!f.checkValidity()) {
        err.textContent = f.type === 'email' ? 'Entrez un courriel valide, par exemple nom@entreprise.com.'
          : f.type === 'tel' ? 'Entrez un numéro de téléphone pour qu\'on puisse vous rappeler.'
          : 'Remplissez ce champ pour continuer.';
        f.focus(); return false;
      }
    }
    return true;
  };
  form.addEventListener('click', e => {
    if (e.target.closest('[data-next]') && valid(steps[i])) show(i + 1);
    if (e.target.closest('[data-prev]')) show(i - 1);
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!valid(steps[i])) return;
    const data = Object.fromEntries(new FormData(form));
    if (data.site_web) return; // honeypot
    const btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Envoi…';
    try {
      if (FORM_ENDPOINT) {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 10000);
        const r = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) throw new Error(r.status);
      }
      steps.forEach(s => s.remove()); form.querySelector('.progress').remove();
      form.querySelector('.done').hidden = false;
    } catch {
      steps[i].querySelector('.err').textContent = 'La demande n\'a pas pu être envoyée. Écrivez-nous à info@corbodigital.com ou appelez au 438 529-9384.';
      btn.disabled = false; btn.textContent = 'Envoyer ma demande';
    }
  });
}

// the logo always brings the page back to the very top (the header is fixed, so #top alone does nothing)
document.querySelector('.brand')?.addEventListener('click', e => {
  e.preventDefault();
  scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  history.replaceState(null, '', location.pathname + location.search);
});
