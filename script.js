document.addEventListener('DOMContentLoaded', () => {
  /* ── Header scroll ── */
  const header = document.querySelector('header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile menu ── */
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Hero slideshow ── */
  const slides = document.querySelectorAll('.hero-bg img');
  if (slides.length > 1) {
    let idx = 0;
    setInterval(() => {
      slides[idx].classList.remove('active');
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add('active');
    }, 5000);
  }

  /* ── Hero particles ── */
  const particleContainer = document.querySelector('.hero-particles');
  if (particleContainer) {
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.classList.add('particle');
      const size = Math.random() * 80 + 20;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = Math.random() * 15 + 10 + 's';
      p.style.animationDelay = Math.random() * 10 + 's';
      particleContainer.appendChild(p);
    }
  }

  /* ── Animated counters ── */
  const counters = document.querySelectorAll('[data-count]');
  let counted = false;
  const runCounters = () => {
    if (counted) return;
    counted = true;
    counters.forEach(el => {
      const target = parseInt(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const duration = 2000;
      const step = target / (duration / 16);
      let current = 0;
      const tick = () => {
        current += step;
        if (current >= target) {
          el.textContent = target + suffix;
        } else {
          el.textContent = Math.floor(current) + suffix;
          requestAnimationFrame(tick);
        }
      };
      tick();
    });
  };

  /* ── Scroll reveal ── */
  const reveals = document.querySelectorAll('.reveal');
  const statsSection = document.querySelector('.stats');

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        if (e.target === statsSection) runCounters();
      }
    });
  }, { threshold: 0.15 });

  reveals.forEach(el => io.observe(el));
  if (statsSection) io.observe(statsSection);
});
