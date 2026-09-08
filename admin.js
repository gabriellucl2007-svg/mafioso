// ===================================================================
// ADMIN.JS — login do administrador e gestão dos agendamentos.
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
const btnAtualizar = document.getElementById("btnAtualizar");

const NOMES_TURNO = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

function formatarDataBR(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function mostrarPainel() {
  loginScreen.style.display = "none";
  painel.style.display = "block";
  carregarAgendamentos();
}

function mostrarLogin() {
  painel.style.display = "none";
  loginScreen.style.display = "flex";
}

async function verificarSessao() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    mostrarPainel();
  } else {
    mostrarLogin();
  }
}

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = document.getElementById("adminEmail").value.trim().toLowerCase();
  const senha = document.getElementById("adminSenha").value;

  // O Supabase Auth exige um e-mail por baixo dos panos, então
  // transformamos o "usuário" digitado num e-mail interno fixo.
  const email = usuario.includes("@") ? usuario : `${usuario}@mafiabarbearia.local`;

  loginMsg.textContent = "Entrando...";
  loginMsg.classList.remove("success");

  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    loginMsg.textContent = "E-mail ou senha incorretos.";
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

async function carregarAgendamentos() {
  lista.innerHTML = `<p class="plano-vazio">Carregando agendamentos...</p>`;

  let query = supabase.from("agendamentos").select("*").order("data", { ascending: true });

  if (filtroStatus.value && filtroStatus.value !== "todos") {
    query = query.eq("status", filtroStatus.value);
  }
  if (filtroData.value) {
    query = query.eq("data", filtroData.value);
  }

  const { data: agendamentos, error } = await query;

  if (error) {
    lista.innerHTML = `<p class="plano-vazio">Erro ao carregar agendamentos.</p>`;
    console.error(error);
    return;
  }

  if (!agendamentos || !agendamentos.length) {
    lista.innerHTML = `<p class="plano-vazio">Nenhum agendamento encontrado.</p>`;
    return;
  }

  lista.innerHTML = agendamentos.map(item => `
    <div class="admin-item" data-id="${item.id}">
      <div class="admin-item-main">
        <strong>${item.nome}</strong>
        <span>${formatarDataBR(item.data)} · ${NOMES_TURNO[item.turno] || item.turno} · ${item.servico}</span>
      </div>
      <div class="admin-item-contato">
        <span>${item.telefone}</span>
        <span>${item.email}</span>
      </div>
      <div class="admin-item-actions">
        <select class="admin-status-select" data-id="${item.id}">
          <option value="pendente" ${item.status === "pendente" ? "selected" : ""}>Pendente</option>
          <option value="confirmado" ${item.status === "confirmado" ? "selected" : ""}>Confirmado</option>
          <option value="concluido" ${item.status === "concluido" ? "selected" : ""}>Concluído</option>
        </select>
        <button class="admin-del-btn" data-id="${item.id}">Excluir</button>
      </div>
    </div>
  `).join("");

  lista.querySelectorAll(".admin-status-select").forEach(sel => {
    sel.addEventListener("change", async () => {
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: sel.value })
        .eq("id", sel.dataset.id);
      if (error) console.error(error);
    });
  });

  lista.querySelectorAll(".admin-del-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir este agendamento?")) return;
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

btnAtualizar.addEventListener("click", carregarAgendamentos);
filtroStatus.addEventListener("change", carregarAgendamentos);
filtroData.addEventListener("change", carregarAgendamentos);

verificarSessao();
