// ===================================================================
// MÁFIA BARBEARIA — SCRIPT.JS
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- MENU MOBILE ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      mainNav.classList.toggle('active');
    });

    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        mainNav.classList.remove('active');
      });
    });
  }

  /* ---------- HEADER AO ROLAR ---------- */
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 20 ? '0 1px 0 rgba(0,0,0,0.4)' : 'none';
    });
  }

  /* ---------- REVEAL ON SCROLL ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => observer.observe(el));
  }

  /* ---------- PARALLAX SUTIL NO HERO ---------- */
  const heroWatermark = document.getElementById('heroWatermark');
  const heroVisual = document.getElementById('heroVisual');
  if (heroWatermark || heroVisual) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (heroWatermark) heroWatermark.style.transform = `translate(-50%, calc(-50% + ${y * 0.08}px))`;
      if (heroVisual) heroVisual.style.transform = `translateY(${y * 0.04}px)`;
    }, { passive: true });
  }

});
