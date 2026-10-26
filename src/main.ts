import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const $ = <T extends Element>(sel: string): T[] => Array.from(document.querySelectorAll<T>(sel));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;

// 1. Split headlines into masked words; split the pull-quote into scrub words
$<HTMLElement>('[data-split]').forEach((el) => {
  const text = el.textContent!.trim();
  el.setAttribute('aria-label', text);
  el.innerHTML = text.split(/\s+/).map((w) => `<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
});
const quote = document.querySelector<HTMLElement>('.big');
if (quote) quote.innerHTML = quote.textContent!.split(' ').map((w) => `<span class="bw">${w}</span>`).join(' ');

// 2. Lenis smooth scroll, driven by GSAP's ticker so both share one clock
const lenis = new Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: !reduce });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
$<HTMLAnchorElement>('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href')!;
  const target = id.length > 1 ? document.querySelector<HTMLElement>(id) : null;
  if (!target) return;
  e.preventDefault();
  lenis.scrollTo(target, { offset: -88, duration: 1.6 });
}));

// 3. Intro timeline: draw tooth, lift curtain, then hero choreography
const heroWords = $<HTMLElement>('.hero [data-split] .w>span');
const curtain = document.querySelector<HTMLElement>('.curtain')!;
const reveal = (targets: HTMLElement[]): void => {
  gsap.fromTo(targets, { clipPath: 'inset(0% 0% 100% 0%)', y: 30 }, {
    clipPath: 'inset(-10% -10% -10% -10%)', y: 0, duration: 1.3, stagger: 0.12, ease: 'expo.out',
    onComplete: () => targets.forEach((t) => { t.classList.remove('rv'); gsap.set(t, { clearProps: 'clipPath,transform' }); }),
  });
};
if (reduce) {
  curtain.remove();
  gsap.set(heroWords, { yPercent: 0 });
  $<HTMLElement>('.rv').forEach((t) => t.classList.remove('rv'));
} else {
  lenis.stop();
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(() => {
    gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { curtain.remove(); lenis.start(); ScrollTrigger.refresh(); } })
      .to('.curtain path', { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' })
      .to(curtain, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '+=0.15')
      .fromTo(heroWords, { yPercent: 110 }, { yPercent: 0, duration: 1.2, stagger: 0.07 }, '-=0.6')
      .from('.hero .chip,.hero .lead,.hero .cta,.hero .trust', { y: 24, opacity: 0, stagger: 0.1, duration: 1 }, '-=0.9')
      .fromTo('.arch', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, clearProps: 'clipPath' }, '-=1.3');
  });

  // 4. Scroll-driven moments (ScrollTrigger)
  gsap.to('.par', { yPercent: -18, rotate: 7, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  $<HTMLElement>('[data-split]').filter((el) => !el.closest('.hero')).forEach((el) => {
    gsap.fromTo(el.querySelectorAll('.w>span'), { yPercent: 110 }, { yPercent: 0, duration: 1.2, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
  ScrollTrigger.batch('.rv', { start: 'top 88%', once: true, onEnter: (b) => reveal(b as HTMLElement[]) });
  gsap.fromTo('.bw', { opacity: 0.2 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.big', start: 'top 85%', end: 'bottom 50%', scrub: true } });
  $<HTMLElement>('.pt').forEach((pt) => gsap.from(pt, { opacity: 0.25, x: 28, ease: 'none', scrollTrigger: { trigger: pt, start: 'top 92%', end: 'top 55%', scrub: true } }));

  // 5. Scroll-velocity marquee: speeds up, skews and reverses with your scroll
  const trk = document.querySelector<HTMLElement>('.trk')!;
  let x = 0; let dir = -1;
  gsap.ticker.add((_t, dt) => {
    const v = lenis.velocity;
    if (Math.abs(v) > 0.3) dir = v > 0 ? -1 : 1;
    x += dir * (60 + Math.abs(v) * 55) * (dt / 1000);
    const half = trk.scrollWidth / 2;
    if (x <= -half) x += half; else if (x > 0) x -= half;
    gsap.set(trk, { x, skewX: gsap.utils.clamp(-8, 8, -v * 0.6) });
  });

  // 6. Magnetic buttons with elastic return, plus a cursor follower
  if (fine) {
    $<HTMLElement>('.mag').forEach((b) => {
      const qx = gsap.quickTo(b, 'x', { duration: 0.9, ease: 'elastic.out(1,0.4)' });
      const qy = gsap.quickTo(b, 'y', { duration: 0.9, ease: 'elastic.out(1,0.4)' });
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * 0.3); qy((e.clientY - r.top - r.height / 2) * 0.4); });
      b.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
    const cur = document.createElement('div');
    cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true'); gsap.set(cur, { opacity: 0 }); document.body.append(cur);
    const cx = gsap.quickTo(cur, 'x', { duration: 0.45, ease: 'power3' });
    const cy = gsap.quickTo(cur, 'y', { duration: 0.45, ease: 'power3' });
    addEventListener('pointermove', (e) => { gsap.to(cur, { opacity: 1, duration: 0.3 }); cx(e.clientX); cy(e.clientY); });
    document.addEventListener('pointerover', (e) => { gsap.to(cur, { scale: (e.target as HTMLElement).closest('a,button,input,select,textarea') ? 1.8 : 1, duration: 0.4 }); });
  }
}

// Cursor spotlight on cards
$<HTMLElement>('.card').forEach((c) => c.addEventListener('pointermove', (e) => {
  const r = c.getBoundingClientRect();
  c.style.setProperty('--x', `${e.clientX - r.left}px`);
  c.style.setProperty('--y', `${e.clientY - r.top}px`);
}));

// 6. Mobile menu
const burger = document.querySelector<HTMLButtonElement>('.burger')!;
const menu = document.getElementById('menu')!;
const setMenu = (open: boolean): void => { menu.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open)); };
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', (e) => { if ((e.target as HTMLElement).tagName === 'A') setMenu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

// 7. Treatment links preselect the form dropdown
const select = document.getElementById('treatment') as HTMLSelectElement;
$<HTMLAnchorElement>('[data-treat]').forEach((a) => a.addEventListener('click', () => { select.value = a.dataset.treat ?? 'Not sure yet'; }));

// 8. Form: client-side validation only (nothing is transmitted or stored)
const form = document.getElementById('form') as HTMLFormElement;
const ok = document.getElementById('ok') as HTMLElement;
const dateEl = form.elements.namedItem('date') as HTMLInputElement;
const today = new Date(); today.setHours(0, 0, 0, 0);
dateEl.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

const rules: Record<string, (v: string) => string> = {
  name: (v) => (v.trim().length < 2 ? 'Enter your full name.' : ''),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Enter a valid email, like name@example.com.'),
  date: (v) => (!v ? 'Choose a preferred date.' : new Date(`${v}T00:00`) < today ? 'Choose today or a later date.' : ''),
};
const check = (id: string): boolean => {
  const field = form.elements.namedItem(id) as HTMLInputElement;
  const msg = rules[id](field.value);
  (document.getElementById(`${id}-err`) as HTMLElement).textContent = msg;
  field.setAttribute('aria-invalid', String(Boolean(msg)));
  return !msg;
};
Object.keys(rules).forEach((id) => (form.elements.namedItem(id) as HTMLElement).addEventListener('blur', () => check(id)));

const submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const valid = Object.keys(rules).map(check).every(Boolean);
  if (!valid) { form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return; }
  submit.disabled = true; submit.textContent = 'Checking…';
  setTimeout(() => { form.hidden = true; ok.hidden = false; ok.focus(); }, 900);
});
document.getElementById('again')!.addEventListener('click', () => {
  form.reset(); form.hidden = false; ok.hidden = true;
  submit.disabled = false; submit.textContent = 'Send inquiry';
  $('.f [aria-invalid]').forEach((f) => f.removeAttribute('aria-invalid'));
  (form.elements.namedItem('name') as HTMLElement).focus();
});
