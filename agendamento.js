// ===================================================================
// AGENDAMENTO.JS — calendário, horário exato (por barbeiro), "já
// agendei?" e gravação dos agendamentos no Supabase.
// ===================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NOMES_MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

let dataAtual = new Date();
let mesExibido = dataAtual.getMonth();
let anoExibido = dataAtual.getFullYear();
let dataSelecionada = null; // "YYYY-MM-DD"
let horaSelecionada = null; // "HH:MM"

const calGrid = document.getElementById("calGrid");
const calMonthLabel = document.getElementById("calMonthLabel");
const calPrev = document.getElementById("calPrev");
const calNext = document.getElementById("calNext");
const turnoSelect = document.getElementById("turnoSelect"); // grade de horários
const barbeiroSelect = document.getElementById("barbeiroSelect");
const servicoSelect = document.getElementById("servico");
const form = document.getElementById("formAgendamento");
const formMsg = document.getElementById("formMsg");

function pad(n) { return String(n).padStart(2, "0"); }

function linkAvisoBarbeiro({ nome, telefone, servico, data, hora, whatsappBarbeiro, nomeBarbeiro }) {
  const texto =
    `Novo agendamento na Máfia Barbearia!\n\n` +
    `Nome: ${nome}\n` +
    `Telefone: ${telefone}\n` +
    `Serviço: ${servico}\n` +
    `Barbeiro: ${nomeBarbeiro || ""}\n` +
    `Data: ${formatarDataBR(data)}\n` +
    `Horário: ${hora}`;
  return `https://wa.me/${whatsappBarbeiro}?text=${encodeURIComponent(texto)}`;
}

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

    const ehPassado = dataObj < hoje;

    if (ehPassado) {
      btn.classList.add("cal-dia--desabilitado");
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => {
        dataSelecionada = iso;
        horaSelecionada = null;
        calGrid.querySelectorAll(".cal-dia").forEach(el => el.classList.remove("cal-dia--selecionado"));
        btn.classList.add("cal-dia--selecionado");
        atualizarHorariosDisponiveis();
      });
    }

    if (iso === dataSelecionada) btn.classList.add("cal-dia--selecionado");

    calGrid.appendChild(btn);
  }
}

// Consulta a disponibilidade real do barbeiro escolhido (horário de
// trabalho + folgas/férias + agendamentos já feitos) direto no banco.
async function atualizarHorariosDisponiveis() {
  if (!turnoSelect || !dataSelecionada) return;

  const barbeiroId = barbeiroSelect ? barbeiroSelect.value : null;
  if (!barbeiroId) {
    turnoSelect.innerHTML = `<span class="horario-aviso">Escolha um barbeiro primeiro.</span>`;
    return;
  }

  turnoSelect.innerHTML = `<span class="horario-aviso">Carregando horários...</span>`;

  const { data: horarios, error } = await supabase.rpc("horarios_disponiveis", {
    p_barbeiro_id: barbeiroId,
    p_data: dataSelecionada
  });

  if (error) {
    console.error(error);
    turnoSelect.innerHTML = `<span class="horario-aviso">Não deu pra carregar os horários. Tenta de novo.</span>`;
    return;
  }

  if (!horarios || !horarios.length) {
    turnoSelect.innerHTML = `<span class="horario-aviso">Sem horários disponíveis nesse dia. Escolha outra data.</span>`;
    return;
  }

  turnoSelect.innerHTML = "";
  horarios.forEach(hora => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "turno-btn";
    btn.textContent = hora;

    btn.addEventListener("click", () => {
      turnoSelect.querySelectorAll(".turno-btn").forEach(b => b.classList.remove("turno-btn--ativo"));
      btn.classList.add("turno-btn--ativo");
      horaSelecionada = hora;
    });

    turnoSelect.appendChild(btn);
  });
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

// Se trocar de barbeiro com uma data já escolhida, atualiza os horários
if (barbeiroSelect) {
  barbeiroSelect.addEventListener("change", () => {
    horaSelecionada = null;
    if (dataSelecionada) atualizarHorariosDisponiveis();
  });
}

/* ---------- ENVIAR AGENDAMENTO ---------- */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const servicoId = servicoSelect.value;
    const servicoNome = servicoSelect.selectedOptions[0]?.dataset.nome || servicoSelect.selectedOptions[0]?.textContent || "";
    const barbeiroId = barbeiroSelect ? barbeiroSelect.value : null;
    const barbeiroNome = barbeiroSelect ? barbeiroSelect.selectedOptions[0]?.textContent : "";

    if (!nome || !telefone || !email) {
      mostrarMsg("Preencha nome, telefone e e-mail.", false);
      return;
    }
    if (!barbeiroId) {
      mostrarMsg("Escolha um barbeiro.", false);
      return;
    }
    if (!servicoId) {
      mostrarMsg("Escolha um serviço.", false);
      return;
    }
    if (!dataSelecionada) {
      mostrarMsg("Escolha uma data no calendário.", false);
      return;
    }
    if (!horaSelecionada) {
      mostrarMsg("Escolha um horário disponível.", false);
      return;
    }

    const btn = document.getElementById("btnAgendar");
    btn.disabled = true;
    mostrarMsg("Enviando...", true);

    const { error } = await supabase.from("agendamentos").insert([{
      nome, telefone, email,
      servico: servicoNome,
      servico_id: servicoId,
      barbeiro: barbeiroNome,
      barbeiro_id: barbeiroId,
      data: dataSelecionada,
      hora: `${horaSelecionada}:00`,
      status: "pendente"
    }]);

    if (error) {
      console.error(error);
      if (error.code === "23505") {
        mostrarMsg("Esse horário acabou de ser reservado por outra pessoa. Escolha outro.", false);
        atualizarHorariosDisponiveis();
      } else {
        mostrarMsg("Não deu pra enviar agora. Tenta de novo em instantes.", false);
      }
      btn.disabled = false;
      return;
    }

    // Busca o WhatsApp do barbeiro escolhido pra montar o link de aviso
    const { data: barbeiroInfo } = await supabase
      .from("barbeiros")
      .select("whatsapp, nome")
      .eq("id", barbeiroId)
      .single();

    const numeroWhats = barbeiroInfo?.whatsapp;
    const nomeBarbeiroConfirmado = barbeiroInfo?.nome || barbeiroNome;

    let avisoHTML = "";
    if (numeroWhats) {
      const linkAviso = linkAvisoBarbeiro({
        nome, telefone, servico: servicoNome, data: dataSelecionada, hora: horaSelecionada,
        whatsappBarbeiro: numeroWhats, nomeBarbeiro: nomeBarbeiroConfirmado
      });
      avisoHTML = `<a href="${linkAviso}" target="_blank" rel="noopener" class="btn-whats aviso-whats-btn">Avisar ${escapeHTMLLeve(nomeBarbeiroConfirmado)} no WhatsApp</a>`;
    }

    formMsg.innerHTML = `<p>Agendamento confirmado! Te esperamos por aqui. 💈</p>${avisoHTML}`;
    formMsg.classList.add("success");
    form.reset();
    dataSelecionada = null;
    horaSelecionada = null;
    renderCalendario();
    if (turnoSelect) {
      turnoSelect.innerHTML = `<span class="horario-aviso">Escolha uma data no calendário para ver os horários disponíveis.</span>`;
    }

    btn.disabled = false;
  });
}

function escapeHTMLLeve(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function mostrarMsg(texto, sucesso) {
  if (!formMsg) return;
  formMsg.textContent = texto;
  formMsg.classList.toggle("success", !!sucesso);
}

/* ---------- VOCÊ JÁ AGENDOU? (BUSCA POR E-MAIL) ---------- */
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
        <span>${item.hora ? item.hora.slice(0, 5) : "—"}</span>
      </div>
      <div class="plano-item-info">
        <span>${item.servico}${item.barbeiro ? " · " + item.barbeiro : ""}</span>
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
