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

  /* ---------- DATA MÍNIMA NO CAMPO DE AGENDAMENTO ---------- */
  const dataInput = document.getElementById('data');
  if (dataInput) {
    const hoje = new Date().toISOString().split('T')[0];
    dataInput.setAttribute('min', hoje);
  }

  /* ---------- FORMULÁRIO DE AGENDAMENTO -> WHATSAPP ---------- */
  const form = document.getElementById('formAgendamento');
  const formMsg = document.getElementById('formMsg');
  const NUMERO_WHATSAPP = '5537998619864';

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nome = document.getElementById('nome').value.trim();
      const telefone = document.getElementById('telefone').value.trim();
      const barbeiro = document.getElementById('barbeiro').value;
      const servico = document.getElementById('servico').value;
      const data = document.getElementById('data').value;
      const hora = document.getElementById('hora').value;

      if (!nome || !telefone || !data) {
        formMsg.textContent = 'Preencha nome, telefone e data para continuar.';
        formMsg.classList.remove('success');
        return;
      }

      const dataFormatada = data.split('-').reverse().join('/');

      const texto =
        `Olá! Quero agendar um horário na Máfia Barbearia.%0A%0A` +
        `*Nome:* ${nome}%0A` +
        `*Telefone:* ${telefone}%0A` +
        `*Barbeiro:* ${barbeiro}%0A` +
        `*Serviço:* ${servico}%0A` +
        `*Data:* ${dataFormatada}%0A` +
        `*Horário:* ${hora}`;

      const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${texto}`;

      formMsg.textContent = 'Agendamento pronto! Abrindo o WhatsApp...';
      formMsg.classList.add('success');

      window.open(url, '_blank');

      form.reset();
      if (dataInput) dataInput.setAttribute('min', new Date().toISOString().split('T')[0]);
    });
  }

});