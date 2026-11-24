// Corbo Digital, one script for the single page. Each block checks its element exists.
document.documentElement.classList.add('js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ad tracking: the utm_* tags of the ad that brought the visitor (Meta fills them from the ad's URL parameters).
// Kept for the visit so they survive in-page navigation, and sent with the form.
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid'];
const utm = (() => {
  const q = new URLSearchParams(location.search), got = {};
  UTM_KEYS.forEach(k => { const v = q.get(k); if (v) got[k] = v.trim().slice(0, 200); });
  try {
    if (Object.keys(got).length) sessionStorage.setItem('corbo_utm', JSON.stringify(got));
    else Object.assign(got, JSON.parse(sessionStorage.getItem('corbo_utm') || '{}'));
  } catch { /* storage blocked: keep what the URL gave */ }
  return got;
})();

// If FORM_ENDPOINT is emptied the form says it could not send and gives the phone and email.
// The webhook is public by nature (it sits in page code); the honeypot field filters basic bots.
const FORM_ENDPOINT = 'https://services.leadconnectorhq.com/hooks/4cBAkpl0rDDzH76hT51A/webhook-trigger/ZDehhcxhbNSGAPFY4j6c';   // LeadConnector webhook that receives the leads
const PIXEL_ID = '1697935301848137';   // Meta pixel; empty means no pixel loads

// Meta pixel: PageView on every load, Lead after a request really went through
if (PIXEL_ID) {
  !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', PIXEL_ID); fbq('track', 'PageView');
}

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

// motion, same language as the Jay Alvarrez page. Nothing hides without IntersectionObserver or with reduced motion.
if ('IntersectionObserver' in window && !reduce) {
  // headings: each word rises out of its own mask
  document.querySelectorAll('h1, main h2').forEach(h => {
    let n = 0;
    const split = el => [...el.childNodes].forEach(c => {
      if (c.nodeType !== 3) return split(c);
      const f = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach(t => {
        if (!t) return; if (!t.trim()) return f.append(t);
        const w = document.createElement('span'), i = document.createElement('span');
        w.className = 'w'; i.textContent = t; i.style.setProperty('--d', n++); w.append(i); f.append(w);
      });
      c.replaceWith(f);
    });
    split(h);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector('.hero-title')?.classList.add('in')));
  // blocks rise in as they arrive; siblings in a row stagger
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  const blocks = 'main h2, .sec-lead, .way, .ways-help, .plan, .gear-title, .gear-cards, .compare, .meta-explain, .vreel, .reel, .who-photo, .who-points > li, .who-end, .quotes, .faq-list > details, .contact-lines, main section .btn:not(.plan .btn):not(.way .btn):not(.meta-explain .btn):not(.hero .btn)';
  document.querySelectorAll(blocks).forEach(el => {
    el.classList.add('rv');
    const sibs = [...el.parentNode.children].filter(c => c.matches(blocks));
    el.style.setProperty('--i', Math.min(sibs.indexOf(el), 6));
    io.observe(el);
  });
  // buttons: one light streak the first time each comes into view
  const bio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('shine'), 500); bio.unobserve(e.target); } }), { threshold: 1 });
  document.querySelectorAll('main .btn').forEach(b => bio.observe(b));
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

// sideways rows (reviews, equipment): each arrow moves its row by one card
document.querySelectorAll('.qnav').forEach(b => b.addEventListener('click', () => {
  const row = document.querySelector(b.dataset.row), card = row.firstElementChild;
  row.scrollBy({ left: +b.dataset.dir * (card.offsetWidth + parseFloat(getComputedStyle(row).columnGap || 0)), behavior: reduce ? 'auto' : 'smooth' });
}));

// every "book a call" link opens the form over the page; a plan button arrives with its plan chosen
const modal = document.getElementById('leadModal');
let opener = null;
document.addEventListener('click', e => {
  const a = e.target.closest('a[href="#contact"]');
  if (!a || !modal) return;
  e.preventDefault();
  opener = a;
  const f = modal.querySelector('form');
  if (a.dataset.pick && f) { f.forfait.value = a.dataset.pick; f.plan.value = a.dataset.plan; }
  modal.showModal();
  (modal.querySelector('.step.is-active input:not([type=hidden]),.done:not([hidden]) h3') || modal.querySelector('[data-close]')).focus({ preventScroll: true });
});
modal?.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) modal.close(); });
modal?.addEventListener('close', () => { opener?.focus({ preventScroll: true }); opener = null; });

// three-step contact form
const form = document.getElementById('leadForm');
if (form) {
  const steps = [...form.querySelectorAll('.step')];
  const bar = form.querySelector('.progress span');
  let i = 0;
  const show = n => {
    steps[i].classList.remove('is-active'); i = n; steps[i].classList.add('is-active');
    bar.style.width = ((i + 1) / steps.length * 100) + '%';
    steps[i].querySelector('input:not([type=hidden])')?.focus({ preventScroll: true });
  };
  const valid = step => {
    const err = step.querySelector('.err'); err.textContent = '';
    for (const g of step.querySelectorAll('.choices')) {
      if (!g.querySelector('input:checked')) { err.textContent = g.dataset.min ? 'Choisissez au moins un objectif pour continuer.' : 'Choisissez une option pour continuer.'; g.querySelector('input').focus(); return false; }
    }
    for (const f of step.querySelectorAll('input[required]:not([type=radio]), input[data-precise]:not([hidden])')) {
      f.value = f.value.trim();
      if (!f.value || !f.checkValidity()) {
        err.textContent = f.type === 'email' ? 'Entrez un courriel valide, par exemple nom@entreprise.com.'
          : f.type === 'tel' ? 'Entrez un numéro de téléphone pour qu\'on puisse vous rappeler.'
          : 'Remplissez ce champ pour continuer.';
        f.focus(); return false;
      }
    }
    return true;
  };
  // "Autre" opens a précisez field inside its own option, then it is required
  const precise = form.querySelector('[data-precise]');
  form.addEventListener('change', e => {
    if (e.target.name !== 'domaine') return;
    precise.hidden = e.target.value !== 'Autre';
    if (!precise.hidden) precise.focus();
  });
  form.addEventListener('click', e => {
    if (e.target.closest('[data-next]') && valid(steps[i])) show(i + 1);
    if (e.target.closest('[data-prev]')) show(i - 1);
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!valid(steps[i])) return;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd);
    data.objectifs = fd.getAll('objectifs').join(', ');
    if (precise.hidden) delete data.domaine_precision;
    // the GoHighLevel workflow ([VSL] Opt-In) reads these keys; langue FR routes it to the opportunity branch
    const [first_name, ...rest] = (data.nom || '').split(/\s+/);
    Object.assign(data, { first_name, last_name: rest.join(' '), email: data.courriel, phone: data.tel, company_name: data.entreprise, langue: 'FR' });
    // the opportunity fields Campaign, Adset Name, Ad Name, Platform and Placement in the [VSL] Opt-In workflow read
    // campaign_name, adset_name, ad_name, platform and placement
    Object.assign(data, utm, {
      campaign: utm.utm_campaign || '', campaign_name: utm.utm_campaign || '', adset_name: utm.utm_term || '', ad_name: utm.utm_content || '',
      platform: utm.utm_source || '', placement: utm.utm_medium || '', page_url: location.href.split('#')[0].slice(0, 500),
    });
    if (data.site_web) return; // honeypot
    const btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Envoi…';
    try {
      if (!FORM_ENDPOINT) throw new Error('no endpoint');
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error(r.status);
      steps.forEach(s => s.remove()); form.querySelector('.progress').remove();
      form.querySelector('.done').hidden = false;
      window.fbq?.('track', 'Lead', { content_name: data.plan || data.forfait });
    } catch {
      steps[i].querySelector('.err').textContent = 'La demande n\'a pas pu être envoyée. Réessayez dans quelques instants.';
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
