// ===================================================================
// AGENDAMENTO.JS — calendário, turno, "você tem plano?" e gravação
// dos agendamentos no Supabase.
// ===================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NOMES_MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const NOMES_TURNO = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

let dataAtual = new Date();
let mesExibido = dataAtual.getMonth();
let anoExibido = dataAtual.getFullYear();
let dataSelecionada = null; // "YYYY-MM-DD"
let turnoSelecionado = null;

const calGrid = document.getElementById("calGrid");
const calMonthLabel = document.getElementById("calMonthLabel");
const calPrev = document.getElementById("calPrev");
const calNext = document.getElementById("calNext");
const turnoSelect = document.getElementById("turnoSelect");
const form = document.getElementById("formAgendamento");
const formMsg = document.getElementById("formMsg");

function pad(n) { return String(n).padStart(2, "0"); }

function renderCalendario() {
  if (!calGrid) return;

  calMonthLabel.textContent = `${NOMES_MESES[mesExibido]} ${anoExibido}`;
  calGrid.innerHTML = "";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const primeiroDia = new Date(anoExibido, mesExibido, 1);
  const totalDias = new Date(anoExibido, mesExibido + 1, 0).getDate();
  const offset = primeiroDia.getDay();

  for (let i = 0; i < offset; i++) {
    const vazio = document.createElement("span");
    vazio.className = "cal-dia cal-dia--vazio";
    calGrid.appendChild(vazio);
  }

  for (let dia = 1; dia <= totalDias; dia++) {
    const dataObj = new Date(anoExibido, mesExibido, dia);
    const iso = `${anoExibido}-${pad(mesExibido + 1)}-${pad(dia)}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal-dia";
    btn.textContent = dia;

    const ehDomingo = dataObj.getDay() === 0;
    const ehPassado = dataObj < hoje;

    if (ehDomingo || ehPassado) {
      btn.classList.add("cal-dia--desabilitado");
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => {
        dataSelecionada = iso;
        calGrid.querySelectorAll(".cal-dia").forEach(el => el.classList.remove("cal-dia--selecionado"));
        btn.classList.add("cal-dia--selecionado");
      });
    }

    if (iso === dataSelecionada) btn.classList.add("cal-dia--selecionado");

    calGrid.appendChild(btn);
  }
}

if (calPrev && calNext) {
  calPrev.addEventListener("click", () => {
    mesExibido--;
    if (mesExibido < 0) { mesExibido = 11; anoExibido--; }
    renderCalendario();
  });
  calNext.addEventListener("click", () => {
    mesExibido++;
    if (mesExibido > 11) { mesExibido = 0; anoExibido++; }
    renderCalendario();
  });
  renderCalendario();
}

if (turnoSelect) {
  turnoSelect.querySelectorAll(".turno-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      turnoSelect.querySelectorAll(".turno-btn").forEach(b => b.classList.remove("turno-btn--ativo"));
      btn.classList.add("turno-btn--ativo");
      turnoSelecionado = btn.dataset.turno;
    });
  });
}

/* ---------- ENVIAR AGENDAMENTO ---------- */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const servico = document.getElementById("servico").value;

    if (!nome || !telefone || !email) {
      mostrarMsg("Preencha nome, telefone e e-mail.", false);
      return;
    }
    if (!dataSelecionada) {
      mostrarMsg("Escolha uma data no calendário.", false);
      return;
    }
    if (!turnoSelecionado) {
      mostrarMsg("Escolha um turno (manhã, tarde ou noite).", false);
      return;
    }

    const btn = document.getElementById("btnAgendar");
    btn.disabled = true;
    mostrarMsg("Enviando...", true);

    const { error } = await supabase.from("agendamentos").insert([{
      nome, telefone, email, servico,
      barbeiro: "Rian",
      data: dataSelecionada,
      turno: turnoSelecionado,
      status: "pendente"
    }]);

    if (error) {
      console.error(error);
      mostrarMsg("Não deu pra enviar agora. Tenta de novo em instantes.", false);
    } else {
      mostrarMsg("Agendamento confirmado! Te esperamos por aqui. 💈", true);
      form.reset();
      dataSelecionada = null;
      turnoSelecionado = null;
      renderCalendario();
      if (turnoSelect) turnoSelect.querySelectorAll(".turno-btn").forEach(b => b.classList.remove("turno-btn--ativo"));
    }

    btn.disabled = false;
  });
}

function mostrarMsg(texto, sucesso) {
  if (!formMsg) return;
  formMsg.textContent = texto;
  formMsg.classList.toggle("success", !!sucesso);
}

/* ---------- VOCÊ TEM PLANO? (BUSCA POR E-MAIL) ---------- */
const planoBuscar = document.getElementById("planoBuscar");
const planoEmail = document.getElementById("planoEmail");
const planoResultados = document.getElementById("planoResultados");

async function buscarPorEmail() {
  const email = planoEmail.value.trim().toLowerCase();
  if (!email) {
    planoResultados.innerHTML = `<p class="plano-vazio">Digite um e-mail válido.</p>`;
    return;
  }

  planoResultados.innerHTML = `<p class="plano-vazio">Buscando...</p>`;

  const { data, error } = await supabase
    .rpc("buscar_agendamentos_por_email", { p_email: email });

  if (error) {
    console.error(error);
    planoResultados.innerHTML = `<p class="plano-vazio">Erro ao buscar. Tenta novamente.</p>`;
    return;
  }

  if (!data || !data.length) {
    planoResultados.innerHTML = `<p class="plano-vazio">Nenhum agendamento encontrado pra esse e-mail.</p>`;
    return;
  }

  planoResultados.innerHTML = data.map(item => `
    <div class="plano-item">
      <div class="plano-item-data">
        <strong>${formatarDataBR(item.data)}</strong>
        <span>${NOMES_TURNO[item.turno] || item.turno}</span>
      </div>
      <div class="plano-item-info">
        <span>${item.servico}</span>
        <span class="plano-status plano-status--${item.status || "pendente"}">${item.status || "pendente"}</span>
      </div>
    </div>
  `).join("");
}

function formatarDataBR(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

if (planoBuscar) {
  planoBuscar.addEventListener("click", buscarPorEmail);
  planoEmail.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); buscarPorEmail(); } });
}
