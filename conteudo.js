// ===================================================================
// CONTEUDO.JS — busca serviços, equipe e configurações no Supabase
// e preenche o site público. Qualquer alteração feita na ADM aparece
// aqui automaticamente, sem precisar mexer em código.
// ===================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function formatarPreco(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function soDigitos(str) {
  return (str || "").replace(/\D/g, "");
}

/* ---------- SERVIÇOS ---------- */
async function renderServicos() {
  const grid = document.getElementById("servicosGrid");
  const selectServico = document.getElementById("servico");
  if (!grid && !selectServico) return;

  const { data, error } = await supabase
    .from("servicos")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error || !data) {
    if (grid) grid.innerHTML = `<p class="plano-vazio">Não foi possível carregar os serviços agora.</p>`;
    return;
  }

  if (grid) {
    if (!data.length) {
      grid.innerHTML = `<p class="plano-vazio">Nenhum serviço disponível no momento.</p>`;
    } else {
      grid.innerHTML = data.map((s, i) => `
        <div class="servico-card">
          <span class="servico-num">${String(i + 1).padStart(2, "0")}</span>
          <h3>${escapeHTML(s.nome)}</h3>
          <p>${escapeHTML(s.descricao || "")}</p>
          <div class="servico-foot">
            <span class="servico-preco">${formatarPreco(s.preco)}</span>
            <a href="#agendamento" class="btn-mini">Agendar</a>
          </div>
        </div>
      `).join("");
    }
  }

  if (selectServico) {
    selectServico.innerHTML = data.length
      ? data.map(s => `<option value="${s.id}" data-nome="${escapeHTML(s.nome)}">${escapeHTML(s.nome)} — ${formatarPreco(s.preco)}</option>`).join("")
      : `<option value="">Nenhum serviço disponível</option>`;
  }
}

/* ---------- EQUIPE ---------- */
async function renderEquipe() {
  const grid = document.getElementById("equipeGrid");
  const selectBarbeiro = document.getElementById("barbeiroSelect");
  if (!grid && !selectBarbeiro) return;

  const { data, error } = await supabase
    .from("barbeiros")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error || !data) {
    if (grid) grid.innerHTML = `<p class="plano-vazio">Não foi possível carregar a equipe agora.</p>`;
    return;
  }

  if (grid) {
    grid.classList.toggle("equipe-grid--single", data.length === 1);
    if (!data.length) {
      grid.innerHTML = `<p class="plano-vazio">Equipe em atualização.</p>`;
    } else {
      grid.innerHTML = data.map(b => `
        <div class="barbeiro-card">
          <div class="barbeiro-foto">
            <img src="${b.foto_url || "favicon.svg"}" alt="${escapeHTML(b.nome)}, barbeiro da Máfia Barbearia" loading="lazy">
          </div>
          <div class="barbeiro-overlay"></div>
          <div class="barbeiro-info">
            <span class="barbeiro-especialidade">${escapeHTML(b.especialidade || "Barbeiro")}</span>
            <h3>${escapeHTML(b.nome)}</h3>
            <p class="barbeiro-frase">"${escapeHTML(b.frase || "")}"</p>
            <a href="barbeiro.html?slug=${encodeURIComponent(b.slug)}" class="btn btn-mini">Ver perfil de ${escapeHTML(b.nome)}</a>
          </div>
        </div>
      `).join("");
    }
  }

  if (selectBarbeiro) {
    selectBarbeiro.innerHTML = data.length
      ? data.map(b => `<option value="${b.id}">${escapeHTML(b.nome)}</option>`).join("")
      : `<option value="">Nenhum barbeiro disponível</option>`;
  }

  return data;
}

/* ---------- CONFIGURAÇÕES / CONTATO / HORÁRIOS / RODAPÉ ---------- */
async function renderConfig() {
  const { data, error } = await supabase.from("configuracoes").select("*").eq("id", 1).single();
  if (error || !data) return;

  const seg = `${(data.seg_sex_abre || "").slice(0,5).replace(":","h")} às ${(data.seg_sex_fecha || "").slice(0,5).replace(":","h")}`;
  const sab = `${(data.sabado_abre || "").slice(0,5).replace(":","h")} às ${(data.sabado_fecha || "").slice(0,5).replace(":","h")}`;
  const domTexto = data.domingo_funciona ? "Aberto" : "Fechado";
  const whatsDigitos = soDigitos(data.whatsapp);
  const enderecoUrl = encodeURIComponent(data.endereco || "");

  const set = (id, texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };
  const setHref = (id, href) => { const el = document.getElementById(id); if (el) el.href = href; };

  // Seção "Horários"
  set("hSegSex", seg);
  set("hSabado", sab);
  set("hDomingo", domTexto);
  const rowDomingo = document.getElementById("hDomingoRow");
  if (rowDomingo) rowDomingo.classList.toggle("fechado", !data.domingo_funciona);

  // Seção "Contato"
  set("ctEndereco", data.endereco || "—");
  set("ctTelefoneLink", data.telefone || "—");
  setHref("ctTelefoneLink", `tel:+${soDigitos(data.telefone)}`);
  set("ctInstagramLink", data.instagram || "—");
  if (data.instagram) setHref("ctInstagramLink", `https://instagram.com/${data.instagram.replace("@", "")}`);
  if (whatsDigitos) setHref("ctWhatsBtn", `https://wa.me/${whatsDigitos}`);
  setHref("ctMapaLink", `https://www.google.com/maps/search/?api=1&query=${enderecoUrl}`);
  const mapaFrame = document.getElementById("ctMapaFrame");
  if (mapaFrame) mapaFrame.src = `https://www.google.com/maps?q=${enderecoUrl}&output=embed`;

  // Rodapé
  set("ftTagline", `${data.nome_barbearia || "Máfia Barbearia"} — ${data.tagline || ""}`);
  set("ftTelefone", data.telefone || "—");
  set("ftEndereco", data.endereco || "—");
  set("ftInstagram", data.instagram || "—");
  if (data.instagram) setHref("ftInstagram", `https://instagram.com/${data.instagram.replace("@", "")}`);
  set("ftSegSex", `Seg—Sex · ${seg}`);
  set("ftSabado", `Sábado · ${sab}`);
  set("ftDomingo", `Domingo · ${domTexto}`);
  set("ftNome", data.nome_barbearia || "Máfia Barbearia");
  set("ftCidade", data.endereco ? data.endereco.split(",").slice(-1)[0].trim() : "");

  // Só ajusta o título na página inicial — outras páginas (como o
  // perfil do barbeiro) controlam o próprio título.
  if (document.getElementById("servicosGrid")) {
    document.title = `${data.nome_barbearia || "Máfia Barbearia"} — ${data.tagline || "Estilo, atitude e precisão"}`;
  }
}

/* ---------- GALERIA DE TRABALHOS ---------- */
async function renderGaleria() {
  const grid = document.getElementById("galeriaGrid");
  if (!grid) return;

  const { data, error } = await supabase
    .from("galeria")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  // Sem fotos reais ainda: mantém as ilustrações padrão que já estão no HTML.
  if (error || !data || !data.length) return;

  const tamanhos = ["g-big", "g-h1", "g-h1", "g-w2", "", ""];
  grid.innerHTML = data.map((g, i) => `
    <div class="g-item ${tamanhos[i % tamanhos.length]} galeria-tile">
      <img src="${g.foto_url}" alt="${escapeHTML(g.legenda || "Trabalho da Máfia Barbearia")}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">
      ${g.legenda ? `<div class="galeria-label"><span>${escapeHTML(g.legenda)}</span></div>` : ""}
    </div>
  `).join("");
}

/* ---------- DEPOIMENTOS ---------- */
async function renderDepoimentos() {
  const secao = document.getElementById("depoimentos");
  const grid = document.getElementById("depoimentosGrid");
  if (!secao || !grid) return { media: null, total: 0 };

  const { data, error } = await supabase
    .from("depoimentos")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error || !data || !data.length) {
    secao.style.display = "none";
    return { media: null, total: 0 };
  }

  secao.style.display = "";
  grid.innerHTML = data.map(d => `
    <div class="depoimento-card">
      <div class="depoimento-estrelas">${"★".repeat(d.nota)}${"☆".repeat(5 - d.nota)}</div>
      <p class="depoimento-texto">"${escapeHTML(d.texto)}"</p>
      <p class="depoimento-nome">${escapeHTML(d.nome_cliente)}</p>
    </div>
  `).join("");

  const media = data.reduce((soma, d) => soma + d.nota, 0) / data.length;
  return { media, total: data.length };
}

/* ---------- SEO LOCAL (dados estruturados para o Google) ---------- */
function renderSEO(config, avaliacoes) {
  if (!document.getElementById("servicosGrid")) return; // só na página inicial

  const schema = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    "name": config?.nome_barbearia || "Máfia Barbearia",
    "image": `${window.location.origin}${window.location.pathname.replace("index.html", "")}favicon.svg`,
    "telephone": config?.telefone || undefined,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": config?.endereco || undefined,
      "addressLocality": "Lagoa da Prata",
      "addressRegion": "MG",
      "addressCountry": "BR"
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
        "opens": (config?.seg_sex_abre || "08:00").slice(0,5),
        "closes": (config?.seg_sex_fecha || "20:00").slice(0,5)
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Saturday"],
        "opens": (config?.sabado_abre || "08:00").slice(0,5),
        "closes": (config?.sabado_fecha || "18:00").slice(0,5)
      }
    ]
  };

  if (avaliacoes && avaliacoes.media && avaliacoes.total > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": avaliacoes.media.toFixed(1),
      "reviewCount": avaliacoes.total
    };
  }

  let tag = document.getElementById("schemaOrgBarbearia");
  if (!tag) {
    tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.id = "schemaOrgBarbearia";
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(schema);
}

renderServicos();
renderEquipe();
renderGaleria();

Promise.all([
  supabase.from("configuracoes").select("*").eq("id", 1).single(),
]).then(async ([{ data: config }]) => {
  const avaliacoes = await renderDepoimentos();
  renderSEO(config, avaliacoes);
});

renderConfig();

export {}; // mantém como módulo isolado
