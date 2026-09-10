// ===================================================================
// ADMIN.JS — login, agendamentos, serviços, equipe e configurações.
// ===================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------- Elementos: login / painel ---------- */
const loginScreen = document.getElementById("adminLogin");
const painel = document.getElementById("adminPainel");
const formLogin = document.getElementById("formLogin");
const loginMsg = document.getElementById("loginMsg");
const btnLogout = document.getElementById("btnLogout");

/* ---------- Elementos: abas ---------- */
const abas = document.querySelectorAll(".admin-tab");
const paineisAbas = document.querySelectorAll(".admin-tab-painel");

/* ---------- Elementos: agendamentos ---------- */
const lista = document.getElementById("adminLista");
const filtroStatus = document.getElementById("filtroStatus");
const filtroData = document.getElementById("filtroData");
const filtroBarbeiro = document.getElementById("filtroBarbeiro");
const buscaTexto = document.getElementById("buscaTexto");
const btnAtualizar = document.getElementById("btnAtualizar");
const btnHoje = document.getElementById("btnHoje");

const statHoje = document.getElementById("statHoje");
const statPendentes = document.getElementById("statPendentes");
const statConfirmados = document.getElementById("statConfirmados");
const statMes = document.getElementById("statMes");

/* ---------- Elementos: serviços ---------- */
const listaServicos = document.getElementById("listaServicos");
const btnNovoServico = document.getElementById("btnNovoServico");

/* ---------- Elementos: equipe ---------- */
const listaBarbeiros = document.getElementById("listaBarbeiros");
const btnNovoBarbeiro = document.getElementById("btnNovoBarbeiro");

/* ---------- Elementos: galeria ---------- */
const listaGaleria = document.getElementById("listaGaleria");
const inputNovaFoto = document.getElementById("inputNovaFoto");

/* ---------- Elementos: depoimentos ---------- */
const listaDepoimentos = document.getElementById("listaDepoimentos");
const btnNovoDepoimento = document.getElementById("btnNovoDepoimento");

/* ---------- Elementos: configurações ---------- */
const formConfig = document.getElementById("formConfig");
const configMsg = document.getElementById("configMsg");

const NOMES_STATUS = { pendente: "Pendente", confirmado: "Confirmado", concluido: "Concluído", cancelado: "Cancelado" };
const DIAS_SEMANA = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

let agendamentosCache = [];
let barbeirosCache = [];
let servicosCache = [];

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
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

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ===================================================================
   LOGIN / LOGOUT
   =================================================================== */

function mostrarPainel() {
  loginScreen.style.display = "none";
  painel.style.display = "block";
  filtroData.value = "";
  carregarTudo();
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

async function carregarTudo() {
  await Promise.all([carregarServicos(), carregarBarbeiros(), carregarGaleria(), carregarDepoimentos()]);
  await carregarAgendamentos();
  await carregarConfig();
}

/* ===================================================================
   ABAS
   =================================================================== */

abas.forEach(btn => {
  btn.addEventListener("click", () => {
    abas.forEach(b => b.classList.remove("admin-tab--ativo"));
    btn.classList.add("admin-tab--ativo");
    const alvo = btn.dataset.tab;
    paineisAbas.forEach(p => p.classList.toggle("admin-tab-painel--ativo", p.dataset.tabPainel === alvo));
  });
});

/* ===================================================================
   AGENDAMENTOS
   =================================================================== */

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

function itemHTML(item) {
  const whats = linkWhats(item.telefone);
  const status = item.status || "pendente";

  return `
    <div class="admin-item" data-id="${item.id}">
      <div class="admin-item-main">
        <strong>${escapeHTML(item.nome)}</strong>
        <span>${item.hora ? item.hora.slice(0,5) : "—"} · ${escapeHTML(item.servico)}${item.barbeiro ? " · " + escapeHTML(item.barbeiro) : ""}</span>
        <span class="status-pill status-pill--${status}">${NOMES_STATUS[status] || status}</span>
      </div>
      <div class="admin-item-contato">
        <span>${escapeHTML(item.telefone) || "—"}</span>
        <span>${escapeHTML(item.email) || "—"}</span>
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

  lista.querySelectorAll(".action-btn[data-acao]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { error } = await supabase.from("agendamentos").update({ status: btn.dataset.acao }).eq("id", btn.dataset.id);
      if (error) { console.error(error); alert("Não foi possível atualizar o status."); }
      else carregarAgendamentos();
    });
  });

  lista.querySelectorAll(".admin-del-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir este agendamento? Essa ação não pode ser desfeita.")) return;
      const { error } = await supabase.from("agendamentos").delete().eq("id", btn.dataset.id);
      if (error) { console.error(error); alert("Não foi possível excluir."); }
      else carregarAgendamentos();
    });
  });
}

function aplicarFiltrosLocais(agendamentos) {
  let resultado = agendamentos;

  const status = filtroStatus.value;
  if (status && status !== "todos") resultado = resultado.filter(a => (a.status || "pendente") === status);

  const barbeiroId = filtroBarbeiro.value;
  if (barbeiroId && barbeiroId !== "todos") resultado = resultado.filter(a => a.barbeiro_id === barbeiroId);

  const data = filtroData.value;
  if (data) resultado = resultado.filter(a => a.data === data);

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
    .order("data", { ascending: true })
    .order("hora", { ascending: true });

  if (error) {
    lista.innerHTML = `<p class="plano-vazio">Erro ao carregar agendamentos.</p>`;
    console.error(error);
    return;
  }

  agendamentosCache = agendamentos || [];
  atualizarResumo(agendamentosCache);
  renderLista(aplicarFiltrosLocais(agendamentosCache));
}

filtroStatus.addEventListener("change", () => renderLista(aplicarFiltrosLocais(agendamentosCache)));
filtroBarbeiro.addEventListener("change", () => renderLista(aplicarFiltrosLocais(agendamentosCache)));
filtroData.addEventListener("change", () => renderLista(aplicarFiltrosLocais(agendamentosCache)));
buscaTexto.addEventListener("input", () => renderLista(aplicarFiltrosLocais(agendamentosCache)));
btnAtualizar.addEventListener("click", carregarAgendamentos);
btnHoje.addEventListener("click", () => {
  filtroData.value = hojeISO();
  renderLista(aplicarFiltrosLocais(agendamentosCache));
});

/* ===================================================================
   SERVIÇOS
   =================================================================== */

function servicoCardHTML(s) {
  return `
    <div class="crud-card" data-id="${s.id}">
      <div class="crud-card-topo">
        <span class="crud-card-nome">
          ${escapeHTML(s.nome)}
          <span class="crud-badge ${s.ativo ? "crud-badge--ativo" : "crud-badge--inativo"}">${s.ativo ? "Ativo" : "Inativo"}</span>
        </span>
        <div class="crud-card-acoes">
          <button class="btn-xs btn-editar">Editar</button>
          <button class="btn-xs btn-xs--perigo btn-excluir">Excluir</button>
        </div>
      </div>

      <form class="crud-form" style="display:none;">
        <div class="form-group">
          <label>Nome</label>
          <input type="text" class="f-nome" value="${escapeHTML(s.nome)}" required>
        </div>
        <div class="form-group">
          <label>Preço (R$)</label>
          <input type="number" step="0.01" min="0" class="f-preco" value="${s.preco}" required>
        </div>
        <div class="form-group">
          <label>Duração (minutos)</label>
          <input type="number" step="5" min="5" class="f-duracao" value="${s.duracao_minutos}" required>
        </div>
        <div class="form-group form-group--check">
          <label><input type="checkbox" class="f-ativo" ${s.ativo ? "checked" : ""}> Serviço ativo</label>
        </div>
        <div class="form-group crud-form-full">
          <label>Descrição (aparece no site)</label>
          <textarea class="f-descricao">${escapeHTML(s.descricao || "")}</textarea>
        </div>
        <div class="crud-form-full" style="display:flex;gap:10px;align-items:center;">
          <button type="submit" class="btn-submit" style="max-width:160px;">Salvar</button>
          <span class="admin-msg f-msg"></span>
        </div>
      </form>
    </div>`;
}

async function carregarServicos() {
  listaServicos.innerHTML = `<p class="plano-vazio">Carregando serviços...</p>`;
  const { data, error } = await supabase.from("servicos").select("*").order("ordem", { ascending: true });
  if (error) { console.error(error); listaServicos.innerHTML = `<p class="plano-vazio">Erro ao carregar serviços.</p>`; return; }

  servicosCache = data || [];

  if (!servicosCache.length) {
    listaServicos.innerHTML = `<p class="plano-vazio">Nenhum serviço cadastrado ainda.</p>`;
    return;
  }

  listaServicos.innerHTML = servicosCache.map(servicoCardHTML).join("");
  ligarEventosServicos();
}

function ligarEventosServicos() {
  listaServicos.querySelectorAll(".crud-card").forEach(card => {
    const id = card.dataset.id;
    const form = card.querySelector(".crud-form");

    card.querySelector(".btn-editar").addEventListener("click", () => {
      form.style.display = form.style.display === "none" ? "grid" : "none";
    });

    card.querySelector(".btn-excluir").addEventListener("click", async () => {
      if (!confirm("Excluir este serviço? Agendamentos antigos não são afetados.")) return;
      const { error } = await supabase.from("servicos").delete().eq("id", id);
      if (error) { console.error(error); alert("Não foi possível excluir. Pode haver agendamentos usando esse serviço."); }
      else carregarServicos();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = form.querySelector(".f-msg");
      msg.textContent = "Salvando...";

      const { error } = await supabase.from("servicos").update({
        nome: form.querySelector(".f-nome").value.trim(),
        preco: parseFloat(form.querySelector(".f-preco").value),
        duracao_minutos: parseInt(form.querySelector(".f-duracao").value, 10),
        ativo: form.querySelector(".f-ativo").checked,
        descricao: form.querySelector(".f-descricao").value.trim()
      }).eq("id", id);

      if (error) { console.error(error); msg.textContent = "Erro ao salvar."; return; }
      msg.textContent = "Salvo!";
      setTimeout(() => carregarServicos(), 500);
    });
  });
}

btnNovoServico.addEventListener("click", async () => {
  const { error } = await supabase.from("servicos").insert([{
    nome: "Novo serviço", preco: 0, duracao_minutos: 40, ativo: false, ordem: servicosCache.length + 1
  }]);
  if (error) { console.error(error); alert("Não foi possível criar o serviço."); return; }
  await carregarServicos();
});

/* ===================================================================
   EQUIPE (barbeiros + horários + folgas)
   =================================================================== */

function barbeiroCardHTML(b) {
  const tags = (b.tags || []).join(", ");
  return `
    <div class="crud-card" data-id="${b.id}">
      <div class="crud-card-topo">
        <span class="crud-card-nome">
          <img class="crud-foto-preview" src="${b.foto_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23201a15'/%3E%3C/svg%3E"}" alt="">
          ${escapeHTML(b.nome)}
          <span class="crud-badge ${b.ativo ? "crud-badge--ativo" : "crud-badge--inativo"}">${b.ativo ? "Ativo" : "Inativo"}</span>
        </span>
        <div class="crud-card-acoes">
          <button class="btn-xs btn-editar">Editar</button>
          <button class="btn-xs btn-xs--perigo btn-excluir">Excluir</button>
        </div>
      </div>

      <form class="crud-form" style="display:none;">
        <div class="form-group"><label>Nome</label><input type="text" class="f-nome" value="${escapeHTML(b.nome)}" required></div>
        <div class="form-group"><label>Identificador na URL (slug)</label><input type="text" class="f-slug" value="${escapeHTML(b.slug)}" required></div>
        <div class="form-group"><label>Especialidade / cargo</label><input type="text" class="f-especialidade" value="${escapeHTML(b.especialidade || "")}"></div>
        <div class="form-group"><label>WhatsApp (só números, com DDD e país)</label><input type="text" class="f-whatsapp" value="${escapeHTML(b.whatsapp || "")}" placeholder="5537999999999"></div>
        <div class="form-group crud-form-full"><label>Frase de efeito</label><input type="text" class="f-frase" value="${escapeHTML(b.frase || "")}"></div>
        <div class="form-group crud-form-full"><label>Biografia (texto do perfil)</label><textarea class="f-bio">${escapeHTML(b.bio || "")}</textarea></div>
        <div class="form-group crud-form-full"><label>Especialidades (separadas por vírgula)</label><input type="text" class="f-tags" value="${escapeHTML(tags)}" placeholder="Degradê, Barba, Pigmentação"></div>
        <div class="form-group crud-form-full">
          <label>Foto</label>
          <input type="file" class="f-foto" accept="image/*">
        </div>
        <div class="form-group form-group--check"><label><input type="checkbox" class="f-ativo" ${b.ativo ? "checked" : ""}> Barbeiro ativo (aparece no site)</label></div>
        <div class="crud-form-full" style="display:flex;gap:10px;align-items:center;">
          <button type="submit" class="btn-submit" style="max-width:160px;">Salvar</button>
          <span class="admin-msg f-msg"></span>
        </div>

        <div class="crud-form-full crud-subsecao">
          <h4>Horário semanal de trabalho</h4>
          <div class="horarios-semana-wrap"></div>
        </div>

        <div class="crud-form-full crud-subsecao">
          <h4>Folgas e férias</h4>
          <div class="indisp-lista"></div>
          <div class="indisp-form">
            <input type="date" class="ind-inicio">
            <input type="date" class="ind-fim">
            <input type="text" class="ind-motivo" placeholder="Motivo (opcional)">
            <button type="button" class="btn-xs ind-add">+ Adicionar</button>
          </div>
        </div>
      </form>
    </div>`;
}

async function carregarBarbeiros() {
  listaBarbeiros.innerHTML = `<p class="plano-vazio">Carregando equipe...</p>`;
  const { data, error } = await supabase.from("barbeiros").select("*").order("ordem", { ascending: true });
  if (error) { console.error(error); listaBarbeiros.innerHTML = `<p class="plano-vazio">Erro ao carregar equipe.</p>`; return; }

  barbeirosCache = data || [];

  // Popula o filtro de barbeiro na aba de agendamentos
  filtroBarbeiro.innerHTML = `<option value="todos">Todos os barbeiros</option>` +
    barbeirosCache.map(b => `<option value="${b.id}">${escapeHTML(b.nome)}</option>`).join("");

  if (!barbeirosCache.length) {
    listaBarbeiros.innerHTML = `<p class="plano-vazio">Nenhum barbeiro cadastrado ainda.</p>`;
    return;
  }

  listaBarbeiros.innerHTML = barbeirosCache.map(barbeiroCardHTML).join("");
  ligarEventosBarbeiros();
}

function ligarEventosBarbeiros() {
  listaBarbeiros.querySelectorAll(".crud-card").forEach(card => {
    const id = card.dataset.id;
    const form = card.querySelector(".crud-form");
    let carregouSub = false;

    card.querySelector(".btn-editar").addEventListener("click", async () => {
      const abrindo = form.style.display === "none";
      form.style.display = abrindo ? "grid" : "none";
      if (abrindo && !carregouSub) {
        carregouSub = true;
        await carregarHorariosBarbeiro(id, form);
        await carregarIndisponibilidades(id, form);
      }
    });

    card.querySelector(".btn-excluir").addEventListener("click", async () => {
      if (!confirm("Excluir este barbeiro? Agendamentos antigos não são afetados.")) return;
      const { error } = await supabase.from("barbeiros").delete().eq("id", id);
      if (error) { console.error(error); alert("Não foi possível excluir."); }
      else carregarBarbeiros();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = form.querySelector(".f-msg");
      msg.textContent = "Salvando...";

      let foto_url;
      const arquivo = form.querySelector(".f-foto").files[0];
      if (arquivo) {
        const caminho = `${id}-${Date.now()}-${arquivo.name}`;
        const { error: erroUpload } = await supabase.storage.from("barbeiros").upload(caminho, arquivo, { upsert: true });
        if (erroUpload) {
          console.error(erroUpload);
          msg.textContent = "Erro ao enviar foto.";
          return;
        }
        const { data: pub } = supabase.storage.from("barbeiros").getPublicUrl(caminho);
        foto_url = pub.publicUrl;
      }

      const tags = form.querySelector(".f-tags").value.split(",").map(t => t.trim()).filter(Boolean);

      const payload = {
        nome: form.querySelector(".f-nome").value.trim(),
        slug: form.querySelector(".f-slug").value.trim().toLowerCase().replace(/\s+/g, "-"),
        especialidade: form.querySelector(".f-especialidade").value.trim(),
        whatsapp: form.querySelector(".f-whatsapp").value.trim(),
        frase: form.querySelector(".f-frase").value.trim(),
        bio: form.querySelector(".f-bio").value.trim(),
        tags,
        ativo: form.querySelector(".f-ativo").checked
      };
      if (foto_url) payload.foto_url = foto_url;

      const { error } = await supabase.from("barbeiros").update(payload).eq("id", id);
      if (error) { console.error(error); msg.textContent = "Erro ao salvar."; return; }
      msg.textContent = "Salvo!";
      setTimeout(() => carregarBarbeiros(), 500);
    });
  });
}

btnNovoBarbeiro.addEventListener("click", async () => {
  const nome = prompt("Nome do novo barbeiro:");
  if (!nome) return;
  const slug = nome.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");

  const { data, error } = await supabase.from("barbeiros").insert([{
    nome: nome.trim(), slug, ativo: false, ordem: barbeirosCache.length + 1
  }]).select().single();

  if (error) { console.error(error); alert("Não foi possível criar. Talvez já exista um barbeiro com esse nome."); return; }

  // Cria uma semana padrão (fechado todos os dias, o admin ajusta depois)
  const linhas = [0,1,2,3,4,5,6].map(dia => ({ barbeiro_id: data.id, dia_semana: dia, trabalha: dia >= 1 && dia <= 6, abre: "08:00", fecha: "18:00" }));
  await supabase.from("barbeiro_horarios").insert(linhas);

  await carregarBarbeiros();
});

/* ---------- Horário semanal por barbeiro ---------- */

async function carregarHorariosBarbeiro(barbeiroId, form) {
  const wrap = form.querySelector(".horarios-semana-wrap");
  wrap.innerHTML = "Carregando...";

  const { data, error } = await supabase
    .from("barbeiro_horarios")
    .select("*")
    .eq("barbeiro_id", barbeiroId)
    .order("dia_semana", { ascending: true });

  if (error) { console.error(error); wrap.innerHTML = "Erro ao carregar horários."; return; }

  const porDia = {};
  (data || []).forEach(h => { porDia[h.dia_semana] = h; });

  wrap.innerHTML = DIAS_SEMANA.map((nome, dia) => {
    const h = porDia[dia] || { trabalha: false, abre: "08:00", fecha: "18:00" };
    return `
      <div class="horario-semana-row" data-dia="${dia}">
        <label><input type="checkbox" class="h-trabalha" ${h.trabalha ? "checked" : ""}> ${nome}</label>
        <span></span>
        <input type="time" class="h-abre" value="${h.abre || "08:00"}" ${h.trabalha ? "" : "disabled"}>
        <input type="time" class="h-fecha" value="${h.fecha || "18:00"}" ${h.trabalha ? "" : "disabled"}>
      </div>`;
  }).join("") + `
      <div style="display:flex;gap:10px;align-items:center;margin-top:10px;">
        <button type="button" class="btn-xs btn-salvar-horarios">Salvar horários</button>
        <span class="admin-msg horarios-msg"></span>
      </div>`;

  wrap.querySelectorAll(".h-trabalha").forEach(chk => {
    chk.addEventListener("change", () => {
      const row = chk.closest(".horario-semana-row");
      row.querySelector(".h-abre").disabled = !chk.checked;
      row.querySelector(".h-fecha").disabled = !chk.checked;
    });
  });

  wrap.querySelector(".btn-salvar-horarios").addEventListener("click", async () => {
    const msg = wrap.querySelector(".horarios-msg");
    msg.textContent = "Salvando...";

    const linhas = Array.from(wrap.querySelectorAll(".horario-semana-row")).map(row => ({
      barbeiro_id: barbeiroId,
      dia_semana: parseInt(row.dataset.dia, 10),
      trabalha: row.querySelector(".h-trabalha").checked,
      abre: row.querySelector(".h-abre").value,
      fecha: row.querySelector(".h-fecha").value
    }));

    const { error: erroUpsert } = await supabase
      .from("barbeiro_horarios")
      .upsert(linhas, { onConflict: "barbeiro_id,dia_semana" });

    msg.textContent = erroUpsert ? "Erro ao salvar." : "Salvo!";
    if (erroUpsert) console.error(erroUpsert);
  });
}

/* ---------- Folgas / férias por barbeiro ---------- */

async function carregarIndisponibilidades(barbeiroId, form) {
  const listaEl = form.querySelector(".indisp-lista");
  listaEl.innerHTML = "Carregando...";

  const { data, error } = await supabase
    .from("barbeiro_indisponibilidades")
    .select("*")
    .eq("barbeiro_id", barbeiroId)
    .order("data_inicio", { ascending: true });

  if (error) { console.error(error); listaEl.innerHTML = "Erro ao carregar."; return; }

  if (!data || !data.length) {
    listaEl.innerHTML = `<p class="plano-vazio" style="padding:20px;">Nenhuma folga ou férias marcada.</p>`;
  } else {
    listaEl.innerHTML = data.map(ind => `
      <div class="indisp-item" data-id="${ind.id}">
        <span>${formatarDataBR(ind.data_inicio)} até ${formatarDataBR(ind.data_fim)}${ind.motivo ? " — " + escapeHTML(ind.motivo) : ""}</span>
        <button type="button" class="btn-xs btn-xs--perigo ind-del">Remover</button>
      </div>
    `).join("");

    listaEl.querySelectorAll(".ind-del").forEach(btn => {
      btn.addEventListener("click", async () => {
        const { error: erroDel } = await supabase.from("barbeiro_indisponibilidades").delete().eq("id", btn.closest(".indisp-item").dataset.id);
        if (erroDel) { console.error(erroDel); alert("Não foi possível remover."); }
        else carregarIndisponibilidades(barbeiroId, form);
      });
    });
  }

  form.querySelector(".ind-add").onclick = async () => {
    const inicio = form.querySelector(".ind-inicio").value;
    const fim = form.querySelector(".ind-fim").value;
    const motivo = form.querySelector(".ind-motivo").value.trim();

    if (!inicio || !fim) { alert("Escolha data de início e fim."); return; }

    const { error: erroIns } = await supabase.from("barbeiro_indisponibilidades").insert([{
      barbeiro_id: barbeiroId, data_inicio: inicio, data_fim: fim, motivo: motivo || null
    }]);

    if (erroIns) { console.error(erroIns); alert("Não foi possível adicionar."); return; }

    form.querySelector(".ind-inicio").value = "";
    form.querySelector(".ind-fim").value = "";
    form.querySelector(".ind-motivo").value = "";
    carregarIndisponibilidades(barbeiroId, form);
  };
}

/* ===================================================================
   GALERIA DE TRABALHOS
   =================================================================== */

function galeriaCardHTML(g) {
  return `
    <div class="galeria-card" data-id="${g.id}">
      <img src="${g.foto_url}" alt="${escapeHTML(g.legenda || "")}">
      <div class="galeria-card-corpo">
        <input type="text" class="f-legenda" value="${escapeHTML(g.legenda || "")}" placeholder="Legenda (opcional)">
        <div class="galeria-card-acoes">
          <label style="font-size:12px;color:var(--gray-500);display:flex;gap:6px;align-items:center;">
            <input type="checkbox" class="f-ativo" ${g.ativo ? "checked" : ""}> Ativa
          </label>
          <div style="display:flex;gap:6px;">
            <button class="btn-xs btn-salvar">Salvar</button>
            <button class="btn-xs btn-xs--perigo btn-excluir">Excluir</button>
          </div>
        </div>
      </div>
    </div>`;
}

async function carregarGaleria() {
  listaGaleria.innerHTML = `<p class="plano-vazio">Carregando galeria...</p>`;
  const { data, error } = await supabase.from("galeria").select("*").order("ordem", { ascending: true });
  if (error) { console.error(error); listaGaleria.innerHTML = `<p class="plano-vazio">Erro ao carregar galeria.</p>`; return; }

  if (!data || !data.length) {
    listaGaleria.innerHTML = `<p class="plano-vazio">Nenhuma foto ainda. O site mostra as ilustrações padrão até você adicionar fotos reais.</p>`;
    return;
  }

  listaGaleria.innerHTML = data.map(galeriaCardHTML).join("");

  listaGaleria.querySelectorAll(".galeria-card").forEach(card => {
    const id = card.dataset.id;

    card.querySelector(".btn-salvar").addEventListener("click", async () => {
      const { error: erroUpd } = await supabase.from("galeria").update({
        legenda: card.querySelector(".f-legenda").value.trim(),
        ativo: card.querySelector(".f-ativo").checked
      }).eq("id", id);
      if (erroUpd) { console.error(erroUpd); alert("Não foi possível salvar."); }
    });

    card.querySelector(".btn-excluir").addEventListener("click", async () => {
      if (!confirm("Excluir esta foto?")) return;
      const { error: erroDel } = await supabase.from("galeria").delete().eq("id", id);
      if (erroDel) { console.error(erroDel); alert("Não foi possível excluir."); }
      else carregarGaleria();
    });
  });
}

inputNovaFoto.addEventListener("change", async () => {
  const arquivo = inputNovaFoto.files[0];
  if (!arquivo) return;

  const caminho = `${Date.now()}-${arquivo.name}`;
  const { error: erroUpload } = await supabase.storage.from("galeria").upload(caminho, arquivo);
  if (erroUpload) { console.error(erroUpload); alert("Não foi possível enviar a foto."); return; }

  const { data: pub } = supabase.storage.from("galeria").getPublicUrl(caminho);

  const { error: erroInsert } = await supabase.from("galeria").insert([{
    foto_url: pub.publicUrl, ativo: true, ordem: 0
  }]);
  if (erroInsert) { console.error(erroInsert); alert("Não foi possível salvar a foto."); return; }

  inputNovaFoto.value = "";
  carregarGaleria();
});

/* ===================================================================
   DEPOIMENTOS
   =================================================================== */

function depoimentoCardHTML(d) {
  const estrelasView = "★".repeat(d.nota) + "☆".repeat(5 - d.nota);
  return `
    <div class="crud-card depoimento-card" data-id="${d.id}">
      <div class="crud-card-topo">
        <span class="crud-card-nome">
          ${escapeHTML(d.nome_cliente)}
          <span style="color:#d8c07a;font-size:13px;">${estrelasView}</span>
          <span class="crud-badge ${d.ativo ? "crud-badge--ativo" : "crud-badge--inativo"}">${d.ativo ? "Ativo" : "Inativo"}</span>
        </span>
        <div class="crud-card-acoes">
          <button class="btn-xs btn-editar">Editar</button>
          <button class="btn-xs btn-xs--perigo btn-excluir">Excluir</button>
        </div>
      </div>

      <form class="crud-form" style="display:none;">
        <div class="form-group"><label>Nome do cliente</label><input type="text" class="f-nome" value="${escapeHTML(d.nome_cliente)}" required></div>
        <div class="form-group">
          <label>Nota</label>
          <div class="estrelas-input" data-valor="${d.nota}">
            ${[1,2,3,4,5].map(n => `<span data-n="${n}" class="${n <= d.nota ? "ativa" : ""}">★</span>`).join("")}
          </div>
        </div>
        <div class="form-group crud-form-full"><label>Depoimento</label><textarea class="f-texto" required>${escapeHTML(d.texto)}</textarea></div>
        <div class="form-group form-group--check"><label><input type="checkbox" class="f-ativo" ${d.ativo ? "checked" : ""}> Depoimento ativo (aparece no site)</label></div>
        <div class="crud-form-full" style="display:flex;gap:10px;align-items:center;">
          <button type="submit" class="btn-submit" style="max-width:160px;">Salvar</button>
          <span class="admin-msg f-msg"></span>
        </div>
      </form>
    </div>`;
}

async function carregarDepoimentos() {
  listaDepoimentos.innerHTML = `<p class="plano-vazio">Carregando depoimentos...</p>`;
  const { data, error } = await supabase.from("depoimentos").select("*").order("ordem", { ascending: true });
  if (error) { console.error(error); listaDepoimentos.innerHTML = `<p class="plano-vazio">Erro ao carregar depoimentos.</p>`; return; }

  if (!data || !data.length) {
    listaDepoimentos.innerHTML = `<p class="plano-vazio">Nenhum depoimento cadastrado ainda.</p>`;
    return;
  }

  listaDepoimentos.innerHTML = data.map(depoimentoCardHTML).join("");

  listaDepoimentos.querySelectorAll(".depoimento-card").forEach(card => {
    const id = card.dataset.id;
    const form = card.querySelector(".crud-form");
    const estrelas = form.querySelector(".estrelas-input");

    card.querySelector(".btn-editar").addEventListener("click", () => {
      form.style.display = form.style.display === "none" ? "grid" : "none";
    });

    card.querySelector(".btn-excluir").addEventListener("click", async () => {
      if (!confirm("Excluir este depoimento?")) return;
      const { error: erroDel } = await supabase.from("depoimentos").delete().eq("id", id);
      if (erroDel) { console.error(erroDel); alert("Não foi possível excluir."); }
      else carregarDepoimentos();
    });

    estrelas.querySelectorAll("span").forEach(s => {
      s.addEventListener("click", () => {
        const n = parseInt(s.dataset.n, 10);
        estrelas.dataset.valor = n;
        estrelas.querySelectorAll("span").forEach(s2 => s2.classList.toggle("ativa", parseInt(s2.dataset.n, 10) <= n));
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = form.querySelector(".f-msg");
      msg.textContent = "Salvando...";

      const { error: erroUpd } = await supabase.from("depoimentos").update({
        nome_cliente: form.querySelector(".f-nome").value.trim(),
        texto: form.querySelector(".f-texto").value.trim(),
        nota: parseInt(estrelas.dataset.valor, 10),
        ativo: form.querySelector(".f-ativo").checked
      }).eq("id", id);

      if (erroUpd) { console.error(erroUpd); msg.textContent = "Erro ao salvar."; return; }
      msg.textContent = "Salvo!";
      setTimeout(() => carregarDepoimentos(), 500);
    });
  });
}

btnNovoDepoimento.addEventListener("click", async () => {
  const { error } = await supabase.from("depoimentos").insert([{
    nome_cliente: "Novo cliente", texto: "Escreva aqui o depoimento.", nota: 5, ativo: false
  }]);
  if (error) { console.error(error); alert("Não foi possível criar."); return; }
  carregarDepoimentos();
});

/* ===================================================================
   CONFIGURAÇÕES GERAIS
   =================================================================== */

async function carregarConfig() {
  const { data, error } = await supabase.from("configuracoes").select("*").eq("id", 1).single();
  if (error) { console.error(error); return; }

  document.getElementById("cfgNome").value = data.nome_barbearia || "";
  document.getElementById("cfgTagline").value = data.tagline || "";
  document.getElementById("cfgEndereco").value = data.endereco || "";
  document.getElementById("cfgTelefone").value = data.telefone || "";
  document.getElementById("cfgWhatsapp").value = data.whatsapp || "";
  document.getElementById("cfgInstagram").value = data.instagram || "";
  document.getElementById("cfgEmail").value = data.email || "";
  document.getElementById("cfgIntervalo").value = data.intervalo_agendamento_minutos || 40;
  document.getElementById("cfgSegSexAbre").value = (data.seg_sex_abre || "08:00").slice(0,5);
  document.getElementById("cfgSegSexFecha").value = (data.seg_sex_fecha || "20:00").slice(0,5);
  document.getElementById("cfgSabadoAbre").value = (data.sabado_abre || "08:00").slice(0,5);
  document.getElementById("cfgSabadoFecha").value = (data.sabado_fecha || "18:00").slice(0,5);
  document.getElementById("cfgDomingo").checked = !!data.domingo_funciona;
}

formConfig.addEventListener("submit", async (e) => {
  e.preventDefault();
  configMsg.textContent = "Salvando...";
  configMsg.classList.remove("success");

  const { error } = await supabase.from("configuracoes").update({
    nome_barbearia: document.getElementById("cfgNome").value.trim(),
    tagline: document.getElementById("cfgTagline").value.trim(),
    endereco: document.getElementById("cfgEndereco").value.trim(),
    telefone: document.getElementById("cfgTelefone").value.trim(),
    whatsapp: document.getElementById("cfgWhatsapp").value.trim(),
    instagram: document.getElementById("cfgInstagram").value.trim(),
    email: document.getElementById("cfgEmail").value.trim(),
    intervalo_agendamento_minutos: parseInt(document.getElementById("cfgIntervalo").value, 10) || 40,
    seg_sex_abre: document.getElementById("cfgSegSexAbre").value,
    seg_sex_fecha: document.getElementById("cfgSegSexFecha").value,
    sabado_abre: document.getElementById("cfgSabadoAbre").value,
    sabado_fecha: document.getElementById("cfgSabadoFecha").value,
    domingo_funciona: document.getElementById("cfgDomingo").checked
  }).eq("id", 1);

  if (error) { console.error(error); configMsg.textContent = "Erro ao salvar."; return; }
  configMsg.textContent = "Configurações salvas!";
  configMsg.classList.add("success");
});

verificarSessao();
