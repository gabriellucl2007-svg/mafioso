// ===================================================================
// BARBEIRO-PERFIL.JS — lê ?slug= da URL e monta a página de perfil
// com os dados reais do banco (funciona para qualquer barbeiro).
// ===================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function soDigitos(str) {
  return (str || "").replace(/\D/g, "");
}

async function montarPerfil() {
  const conteudo = document.getElementById("perfilConteudo");
  const slug = new URLSearchParams(window.location.search).get("slug");

  if (!slug) {
    conteudo.innerHTML = `<p class="plano-vazio">Barbeiro não especificado. <a href="index.html#equipe">Voltar para a equipe</a>.</p>`;
    return;
  }

  const { data: b, error } = await supabase
    .from("barbeiros")
    .select("*")
    .eq("slug", slug)
    .eq("ativo", true)
    .single();

  if (error || !b) {
    conteudo.innerHTML = `<p class="plano-vazio">Não encontramos esse barbeiro. <a href="index.html#equipe">Voltar para a equipe</a>.</p>`;
    return;
  }

  document.getElementById("pageTitle").textContent = `${b.nome} — Barbeiro | Máfia Barbearia`;
  document.getElementById("pageDescription").setAttribute("content", `Conheça ${b.nome}, ${(b.especialidade || "barbeiro").toLowerCase()} da Máfia Barbearia. Agende seu horário direto pelo site ou WhatsApp.`);

  const watermark = document.getElementById("perfilWatermark");
  if (watermark) watermark.textContent = b.nome.toUpperCase();

  const whatsDigitos = soDigitos(b.whatsapp);
  const textoWhats = encodeURIComponent(`Olá, ${b.nome}! Quero agendar um horário.`);
  const tags = (b.tags || []).map(t => `<span>${escapeHTML(t)}</span>`).join("");

  conteudo.innerHTML = `
    <div class="perfil-foto-col">
      <div class="perfil-foto-frame">
        <img src="${b.foto_url || "favicon.svg"}" alt="${escapeHTML(b.nome)}, ${escapeHTML(b.especialidade || "barbeiro")} da Máfia Barbearia" loading="lazy">
      </div>
      <span class="corner tl"></span>
      <span class="corner tr"></span>
      <span class="corner bl"></span>
      <span class="corner br"></span>
    </div>

    <div class="perfil-info-col">
      <span class="eyebrow">${escapeHTML(b.especialidade || "Barbeiro")}</span>
      <h1>${escapeHTML(b.nome)}</h1>
      ${b.frase ? `<p class="perfil-frase">"${escapeHTML(b.frase)}"</p>` : ""}
      ${b.bio ? `<p class="perfil-texto">${escapeHTML(b.bio)}</p>` : ""}

      ${tags ? `<div class="perfil-tags">${tags}</div>` : ""}

      <div class="perfil-btns">
        ${whatsDigitos ? `<a href="https://wa.me/${whatsDigitos}?text=${textoWhats}" target="_blank" rel="noopener" class="btn-whats">Chamar ${escapeHTML(b.nome)} no WhatsApp</a>` : ""}
        <a href="index.html#agendamento" class="btn btn-outline">Agendar pelo site</a>
      </div>
    </div>
  `;
}

montarPerfil();
