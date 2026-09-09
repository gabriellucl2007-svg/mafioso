// ===================================================================
// AGENDAMENTO.JS — calendário, horário exato, "já agendei?" e gravação
// dos agendamentos no Supabase.
// ===================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NOMES_MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const NOMES_TURNO = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };
const NUMERO_BARBEIRO = "5537998619864";

// Horário de funcionamento (bate com a seção "Horários" do site)
const INTERVALO_MINUTOS = 40; // duração média de cada atendimento
const HORARIO_SEMANA = { abre: "08:00", fecha: "20:00" }; // seg a sex
const HORARIO_SABADO = { abre: "08:00", fecha: "18:00" };

function linkAvisoBarbeiro({ nome, telefone, servico, data, hora }) {
  const texto =
    `Novo agendamento na Máfia Barbearia!\n\n` +
    `Nome: ${nome}\n` +
    `Telefone: ${telefone}\n` +
    `Serviço: ${servico}\n` +
    `Data: ${formatarDataBR(data)}\n` +
    `Horário: ${hora}`;
  return `https://wa.me/${NUMERO_BARBEIRO}?text=${encodeURIComponent(texto)}`;
}

let dataAtual = new Date();
let mesExibido = dataAtual.getMonth();
let anoExibido = dataAtual.getFullYear();
let dataSelecionada = null; // "YYYY-MM-DD"
let horaSelecionada = null; // "HH:MM"

const calGrid = document.getElementById("calGrid");
const calMonthLabel = document.getElementById("calMonthLabel");
const calPrev = document.getElementById("calPrev");
const calNext = document.getElementById("calNext");
const turnoSelect = document.getElementById("turnoSelect"); // agora é a grade de horários
const form = document.getElementById("formAgendamento");
const formMsg = document.getElementById("formMsg");

function pad(n) { return String(n).padStart(2, "0"); }

function minutosParaHora(min) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

function horaParaMinutos(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Gera a lista de horários possíveis pra uma data, já removendo
// horários no passado se a data escolhida for hoje.
function gerarHorariosDoDia(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const dataObj = new Date(ano, mes - 1, dia);
  const diaSemana = dataObj.getDay(); // 0 = domingo, 6 = sábado

  if (diaSemana === 0) return []; // fechado aos domingos

  const janela = diaSemana === 6 ? HORARIO_SABADO : HORARIO_SEMANA;
  const inicio = horaParaMinutos(janela.abre);
  const fim = horaParaMinutos(janela.fecha);

  const horarios = [];
  for (let m = inicio; m + INTERVALO_MINUTOS <= fim; m += INTERVALO_MINUTOS) {
    horarios.push(minutosParaHora(m));
  }

  const hoje = new Date();
  const ehHoje = dataObj.toDateString() === hoje.toDateString();
  if (ehHoje) {
    const agoraEmMinutos = hoje.getHours() * 60 + hoje.getMinutes();
    return horarios.filter(h => horaParaMinutos(h) > agoraEmMinutos);
  }

  return horarios;
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

    const ehDomingo = dataObj.getDay() === 0;
    const ehPassado = dataObj < hoje;

    if (ehDomingo || ehPassado) {
      btn.classList.add("cal-dia--desabilitado");
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => {
        dataSelecionada = iso;
        horaSelecionada = null;
        calGrid.querySelectorAll(".cal-dia").forEach(el => el.classList.remove("cal-dia--selecionado"));
        btn.classList.add("cal-dia--selecionado");
        atualizarHorariosDisponiveis(iso);
      });
    }

    if (iso === dataSelecionada) btn.classList.add("cal-dia--selecionado");

    calGrid.appendChild(btn);
  }
}

// Consulta os horários já ocupados naquele dia e desenha os botões
async function atualizarHorariosDisponiveis(iso) {
  if (!turnoSelect) return;

  turnoSelect.innerHTML = `<span class="horario-aviso">Carregando horários...</span>`;

  const todosHorarios = gerarHorariosDoDia(iso);

  if (!todosHorarios.length) {
    turnoSelect.innerHTML = `<span class="horario-aviso">Fechado nesse dia. Escolha outra data.</span>`;
    return;
  }

  const { data: ocupados, error } = await supabase.rpc("horarios_ocupados", { p_data: iso });
  const horariosOcupados = error ? [] : (ocupados || []).map(o => o.hora.slice(0, 5));

  turnoSelect.innerHTML = "";
  todosHorarios.forEach(hora => {
    const lotado = horariosOcupados.includes(hora);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "turno-btn";
    btn.textContent = lotado ? `${hora} · Ocupado` : hora;
    btn.disabled = lotado;
    if (lotado) btn.classList.add("turno-btn--lotado");

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
    if (!horaSelecionada) {
      mostrarMsg("Escolha um horário disponível.", false);
      return;
    }

    const btn = document.getElementById("btnAgendar");
    btn.disabled = true;
    mostrarMsg("Enviando...", true);

    const { error } = await supabase.from("agendamentos").insert([{
      nome, telefone, email, servico,
      barbeiro: "Rian",
      data: dataSelecionada,
      hora: `${horaSelecionada}:00`,
      status: "pendente"
    }]);

    if (error) {
      console.error(error);
      if (error.code === "23505") {
        mostrarMsg("Esse horário acabou de ser reservado por outra pessoa. Escolha outro.", false);
        atualizarHorariosDisponiveis(dataSelecionada);
      } else {
        mostrarMsg("Não deu pra enviar agora. Tenta de novo em instantes.", false);
      }
    } else {
      const linkAviso = linkAvisoBarbeiro({ nome, telefone, servico, data: dataSelecionada, hora: horaSelecionada });
      formMsg.innerHTML = `
        <p>Agendamento confirmado! Te esperamos por aqui. 💈</p>
        <a href="${linkAviso}" target="_blank" rel="noopener" class="btn-whats aviso-whats-btn">Avisar Rian no WhatsApp</a>
      `;
      formMsg.classList.add("success");
      form.reset();
      const dataConfirmada = dataSelecionada;
      dataSelecionada = null;
      horaSelecionada = null;
      renderCalendario();
      if (turnoSelect) {
        turnoSelect.innerHTML = `<span class="horario-aviso">Escolha uma data no calendário para ver os horários disponíveis.</span>`;
      }
    }

    btn.disabled = false;
  });
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
        <span>${item.hora ? item.hora.slice(0, 5) : (NOMES_TURNO[item.turno] || item.turno)}</span>
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
