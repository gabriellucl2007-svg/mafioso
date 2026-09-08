// ===================================================================
// ADMIN.JS — login e painel de gestão dos agendamentos.
// ===================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginScreen = document.getElementById("adminLogin");
const painel = document.getElementById("adminPainel");
const formLogin = document.getElementById("formLogin");
const loginMsg = document.getElementById("loginMsg");
const btnLogout = document.getElementById("btnLogout");

const lista = document.getElementById("adminLista");
const filtroStatus = document.getElementById("filtroStatus");
const filtroData = document.getElementById("filtroData");
const buscaTexto = document.getElementById("buscaTexto");
const btnAtualizar = document.getElementById("btnAtualizar");
const btnHoje = document.getElementById("btnHoje");

const statHoje = document.getElementById("statHoje");
const statPendentes = document.getElementById("statPendentes");
const statConfirmados = document.getElementById("statConfirmados");
const statMes = document.getElementById("statMes");

const NOMES_TURNO = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };
const NOMES_STATUS = { pendente: "Pendente", confirmado: "Confirmado", concluido: "Concluído", cancelado: "Cancelado" };

let agendamentosCache = [];

function hojeISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatarDataBR(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function nomeDia(iso) {
  const hoje = hojeISO();
  if (iso === hoje) return "Hoje";
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  if (iso === amanha.toISOString().slice(0, 10)) return "Amanhã";
  return formatarDataBR(iso);
}

function linkWhats(telefone) {
  const digitos = (telefone || "").replace(/\D/g, "");
  if (!digitos) return null;
  const numero = digitos.length <= 11 ? `55${digitos}` : digitos;
  return `https://wa.me/${numero}`;
}

// ---------- Login ----------

function mostrarPainel() {
  loginScreen.style.display = "none";
  painel.style.display = "block";
  filtroData.value = "";
  carregarAgendamentos();
}

function mostrarLogin() {
  painel.style.display = "none";
  loginScreen.style.display = "flex";
}

async function verificarSessao() {
  const { data } = await supabase.auth.getSession();
  if (data.session) mostrarPainel();
  else mostrarLogin();
}

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = document.getElementById("adminEmail").value.trim().toLowerCase();
  const senha = document.getElementById("adminSenha").value;
  const email = usuario.includes("@") ? usuario : `${usuario}@mafiabarbearia.local`;

  loginMsg.textContent = "Entrando...";
  loginMsg.classList.remove("success");

  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    loginMsg.textContent = "Usuário ou senha incorretos.";
  } else {
    loginMsg.textContent = "";
    formLogin.reset();
    mostrarPainel();
  }
});

btnLogout.addEventListener("click", async () => {
  await supabase.auth.signOut();
  mostrarLogin();
});

// ---------- Resumo ----------

function atualizarResumo(todos) {
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);

  const doDia = todos.filter(a => a.data === hoje);
  const pendentes = todos.filter(a => a.status === "pendente");
  const confirmadosHoje = doDia.filter(a => a.status === "confirmado");
  const doMes = todos.filter(a => a.data.slice(0, 7) === mesAtual);

  statHoje.textContent = doDia.length;
  statPendentes.textContent = pendentes.length;
  statConfirmados.textContent = confirmadosHoje.length;
  statMes.textContent = doMes.length;
}

// ---------- Lista ----------

function itemHTML(item) {
  const whats = linkWhats(item.telefone);
  const status = item.status || "pendente";

  return `
    <div class="admin-item" data-id="${item.id}">
      <div class="admin-item-main">
        <strong>${item.nome}</strong>
        <span>${NOMES_TURNO[item.turno] || item.turno} · ${item.servico}</span>
        <span class="status-pill status-pill--${status}">${NOMES_STATUS[status] || status}</span>
      </div>
      <div class="admin-item-contato">
        <span>${item.telefone || "—"}</span>
        <span>${item.email || "—"}</span>
        ${whats ? `<a class="whats-link" href="${whats}" target="_blank" rel="noopener">WhatsApp →</a>` : ""}
      </div>
      <div class="admin-item-actions">
        <div class="admin-actions-row">
          <button class="action-btn action-btn--confirmar ${status === "confirmado" ? "action-btn--ativo" : ""}" data-acao="confirmado" data-id="${item.id}">Confirmar</button>
          <button class="action-btn action-btn--concluir ${status === "concluido" ? "action-btn--ativo" : ""}" data-acao="concluido" data-id="${item.id}">Concluir</button>
          <button class="action-btn action-btn--cancelar ${status === "cancelado" ? "action-btn--ativo" : ""}" data-acao="cancelado" data-id="${item.id}">Cancelar</button>
          <button class="admin-del-btn" data-id="${item.id}" title="Excluir">✕</button>
        </div>
      </div>
    </div>`;
}

function renderLista(agendamentos) {
  if (!agendamentos.length) {
    lista.innerHTML = `<p class="plano-vazio">Nenhum agendamento encontrado com esses filtros.</p>`;
    return;
  }

  // Agrupa por data mantendo a ordem
  const grupos = {};
  agendamentos.forEach(item => {
    if (!grupos[item.data]) grupos[item.data] = [];
    grupos[item.data].push(item);
  });

  lista.innerHTML = Object.keys(grupos).sort().map(data => `
    <div class="dia-grupo">
      <div class="dia-grupo-titulo"><span>${nomeDia(data)}</span> — ${formatarDataBR(data)}</div>
      ${grupos[data].map(itemHTML).join("")}
    </div>
  `).join("");

  // Ações de status
  lista.querySelectorAll(".action-btn[data-acao]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: btn.dataset.acao })
        .eq("id", btn.dataset.id);
      if (error) {
        console.error(error);
        alert("Não foi possível atualizar o status.");
      } else {
        carregarAgendamentos();
      }
    });
  });

  // Excluir
  lista.querySelectorAll(".admin-del-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir este agendamento? Essa ação não pode ser desfeita.")) return;
      const { error } = await supabase
        .from("agendamentos")
        .delete()
        .eq("id", btn.dataset.id);
      if (error) {
        console.error(error);
        alert("Não foi possível excluir.");
      } else {
        carregarAgendamentos();
      }
    });
  });
}

function aplicarFiltrosLocais(agendamentos) {
  let resultado = agendamentos;

  const status = filtroStatus.value;
  if (status && status !== "todos") {
    resultado = resultado.filter(a => (a.status || "pendente") === status);
  }

  const data = filtroData.value;
  if (data) {
    resultado = resultado.filter(a => a.data === data);
  }

  const termo = buscaTexto.value.trim().toLowerCase();
  if (termo) {
    resultado = resultado.filter(a =>
      (a.nome || "").toLowerCase().includes(termo) ||
      (a.telefone || "").toLowerCase().includes(termo) ||
      (a.email || "").toLowerCase().includes(termo)
    );
  }

  return resultado;
}

async function carregarAgendamentos() {
  lista.innerHTML = `<p class="plano-vazio">Carregando agendamentos...</p>`;

  const { data: agendamentos, error } = await supabase
    .from("agendamentos")
    .select("*")
    .order("data", { ascending: true });

  if (error) {
    lista.innerHTML = `<p class="plano-vazio">Erro ao carregar agendamentos.</p>`;
    console.error(error);
    return;
  }

  agendamentosCache = agendamentos || [];
  atualizarResumo(agendamentosCache);
  renderLista(aplicarFiltrosLocais(agendamentosCache));
}

// ---------- Filtros ----------

filtroStatus.addEventListener("change", () => renderLista(aplicarFiltrosLocais(agendamentosCache)));
filtroData.addEventListener("change", () => renderLista(aplicarFiltrosLocais(agendamentosCache)));
buscaTexto.addEventListener("input", () => renderLista(aplicarFiltrosLocais(agendamentosCache)));
btnAtualizar.addEventListener("click", carregarAgendamentos);
btnHoje.addEventListener("click", () => {
  filtroData.value = hojeISO();
  renderLista(aplicarFiltrosLocais(agendamentosCache));
});

verificarSessao();
