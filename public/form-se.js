(function() {
  "use strict";

  /* ───────── CONFIG ───────── */
  var WEBHOOK_URL = 'https://mooingnautilus-n8n.cloudfy.live/webhook/calculaEvasao-FormDireto';
  var MODELO = 'SemPopUpv01-Direto';
  var TOTAL_STEPS = 6;
  var TOTAL_ETAPAS_FUNIL = 7;

  /* ───────── REDIRECTS ─────────
     Lógica atual (conforme instrução): qualificado e desqualificado
     apontam para a MESMA página — se-fdcalend-mql. A estrutura por
     tipo/faturamento/plantão foi mantida para permitir diferenciar
     os destinos depois (basta trocar cada constante abaixo). */
  var URL_QUALIFICADO   = 'https://nextlevelformed.com.br/se-fdcalend-mql/';
  var URL_DESQUALIFICADO = 'https://nextlevelformed.com.br/se-fdcalend-mql/';

  var URL_MED_MQL     = URL_QUALIFICADO;
  var URL_MED_PLANTAO = URL_QUALIFICADO;
  var URL_MED_DESQ    = URL_DESQUALIFICADO;
  var URL_NM_MQL      = URL_QUALIFICADO;
  var URL_NM_DESQ     = URL_DESQUALIFICADO;

  /* ───────── UTMs DE TRACKEAMENTO ─────────
     Captura da URL, persiste no localStorage e envia no payload do webhook. */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  function getParam(name) {
    var n = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + n + '(=([^&#]*)|&|#|$)');
    var results = regex.exec(window.location.href);
    if (!results || !results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }
  function capturarUTMs() {
    UTM_KEYS.forEach(function(k) {
      var v = getParam(k);
      if (v) { try { localStorage.setItem(k, v); } catch (e) {} }
    });
  }
  function getUTMs() {
    var out = {};
    UTM_KEYS.forEach(function(k) {
      var v = '';
      try { v = localStorage.getItem(k) || ''; } catch (e) {}
      out[k] = v;
    });
    return out;
  }
  capturarUTMs();

  /* ───────── SESSION ID ───────── */
  function gerarUUID() {
    if (window.crypto && crypto.randomUUID) { return crypto.randomUUID(); }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  var SESSION_ID = gerarUUID();

  var overlay = document.getElementById('fnfOverlay');
  var wrap = document.querySelector('.fnf-form-wrap');
  var btnBack = document.getElementById('fnfBtnBack');

  /* ───────── ESTADO ───────── */
  var stepAtual = 1;
  var stepsVisualizados = {};
  var respostas = {
    ajuda: '', especialidade: '', area: '',
    desafio: '', faturamento: '', plantao: '',
    nome: '', telefone: '', email: '', instagram: ''
  };
  var tipoPorEspecialidade = ''; // medico | nm | outro
  var dqPorCampo = {};

  /* ───────── SEQUÊNCIA DINÂMICA DE ETAPAS ─────────
     Etapas físicas (data-step): 1 ajuda, 2 especialidade, 4 desafio, 5 faturamento,
     7 plantão (condicional), 6 contato. A etapa 3 (Hoje você é) foi removida.
     Plantão (7) entra entre faturamento (5) e contato (6) SÓ se médico e faturar <30k. */
  var FAT_ABAIXO_30 = ['Menos de 10 mil reais', 'Entre 10 e 30 mil reais mensais'];
  function ehMedico() { return tipoPorEspecialidade === 'medico'; }
  function mostraPlantao() {
    return ehMedico() && FAT_ABAIXO_30.indexOf(respostas.faturamento) !== -1;
  }
  function sequencia() {
    if (mostraPlantao()) return [1, 2, 4, 5, 7, 6];
    return [1, 2, 4, 5, 6];
  }
  function proximoStep(atual) {
    var seq = sequencia(); var i = seq.indexOf(atual);
    if (i === -1 || i === seq.length - 1) return null; return seq[i + 1];
  }
  function stepAnterior(atual) {
    var seq = sequencia(); var i = seq.indexOf(atual);
    if (i <= 0) return null; return seq[i - 1];
  }
  function ehUltimoStep(atual) {
    var seq = sequencia(); return seq.indexOf(atual) === seq.length - 1;
  }

  function getDadosAtuais() {
    return {
      ajuda: respostas.ajuda,
      especialidade: respostas.especialidade,
      area: respostas.area,
      desafio: respostas.desafio,
      faturamento: respostas.faturamento,
      plantao: respostas.plantao,
      nome: document.getElementById('fnfNome').value.trim(),
      telefone: telE164(),
      codigo_pais: '+55',
      telefone_local: document.getElementById('fnfTelefone').value.trim(),
      email: document.getElementById('fnfEmail').value.trim(),
      instagram: document.getElementById('fnfInstagram').value.trim()
    };
  }

  /* Roteamento por tipo x faturamento x plantão. Retorna { url, qualificado, empresa }.
       MÉDICO ≥30k               -> qualificado
       MÉDICO <30k + plantão Sim -> qualificado
       MÉDICO <30k + plantão Não -> desqualificado
       NÃO-MÉDICO ≥30k           -> DocScale (marcado não qualificado no funil NL)
       NÃO-MÉDICO <30k           -> desqualificado
     "Não tenho interesse" (ajuda) segue desqualificando direto. */
  function resolverDestino() {
    var faturamentoAbaixo30 = FAT_ABAIXO_30.indexOf(respostas.faturamento) !== -1;
    var ajudaDesq = (dqPorCampo.ajuda === true);

    if (ajudaDesq) {
      return { url: URL_MED_DESQ, qualificado: false, empresa: 'NextLevel' };
    }

    if (ehMedico()) {
      if (!faturamentoAbaixo30) return { url: URL_MED_MQL, qualificado: true, empresa: 'NextLevel' };
      if (respostas.plantao === 'Sim') return { url: URL_MED_PLANTAO, qualificado: true, empresa: 'NextLevel' };
      return { url: URL_MED_DESQ, qualificado: false, empresa: 'NextLevel' };
    }
    // não-médico (nm / outro)
    if (!faturamentoAbaixo30) return { url: URL_NM_MQL, qualificado: false, empresa: 'DocScale' };
    return { url: URL_NM_DESQ, qualificado: false, empresa: 'DocScale' };
  }

  /* ───────── TELEFONE: +55 + máscara (DDD) 99999-9999 ───────── */
  var fTel = document.getElementById('fnfTelefone');
  fTel.addEventListener('focus', function() {
    if (!fTel.value) { fTel.value = '+55 '; }
  });
  fTel.addEventListener('input', function() {
    var raw = fTel.value;
    var temMais = raw.trim().indexOf('+55') === 0;
    var digits = raw.replace(/\D/g, '');
    if (temMais && digits.indexOf('55') === 0) { digits = digits.slice(2); }
    digits = digits.slice(0, 11);
    var fmt = '';
    if (digits.length > 0) fmt += '(' + digits.slice(0, 2);
    if (digits.length >= 2) fmt += ') ';
    if (digits.length > 2 && digits.length <= 6) {
      fmt += digits.slice(2);
    } else if (digits.length > 6) {
      var corte = digits.length > 10 ? 7 : 6;
      fmt += digits.slice(2, corte) + '-' + digits.slice(corte);
    }
    fTel.value = (temMais ? '+55 ' : '') + fmt;
  });
  function telDigits() { return fTel.value.replace(/\D/g, ''); }
  function telE164() {
    var d = telDigits();
    if (d.indexOf('55') === 0) { return '+' + d; }
    return '+55' + d;
  }

  /* ───────── WEBHOOK ───────── */
  function enviarWebhook(evento, etapa, extra) {
    var payload = {
      session_id: SESSION_ID,
      modelo: MODELO,
      evento: evento,
      etapa: etapa,
      total_etapas: TOTAL_ETAPAS_FUNIL,
      respostas: getDadosAtuais(),
      utm: getUTMs(),
      timestamp: new Date().toISOString()
    };
    if (extra) {
      for (var k in extra) { if (extra.hasOwnProperty(k)) payload[k] = extra[k]; }
    }
    return fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    });
  }

  function registrarVisualizacao(etapa) {
    if (stepsVisualizados[etapa]) return;
    stepsVisualizados[etapa] = true;
    enviarWebhook('visualizou_etapa', etapa).catch(function() {});
  }

  /* ───────── NAVEGAÇÃO ───────── */
  function atualizarProgresso() {
    var seq = sequencia();
    var pos = seq.indexOf(stepAtual); if (pos === -1) pos = 0;
    var pct = Math.round(((pos + 1) / seq.length) * 100);
    document.getElementById('fnfProgressFill').style.width = pct + '%';
    btnBack.style.visibility = (pos > 0) ? 'visible' : 'hidden';
  }

  function mostrarStep(n) {
    wrap.querySelectorAll('.fnf-step').forEach(function(s) {
      s.classList.toggle('active', parseInt(s.getAttribute('data-step'), 10) === n);
    });
    stepAtual = n;
    atualizarProgresso();
    registrarVisualizacao(n);
  }

  /* ───────── FINALIZAÇÃO ───────── */
  function finalizar() {
    if (!mostraPlantao()) { respostas.plantao = ''; }
    var res = resolverDestino();

    /* Anexa os dados de contato na URL de destino, pra pré-popular o widget
       de agendamento (GHL) da página seguinte. Nome completo é dividido em
       first_name (primeiro nome) e last_name (resto). */
    var nomeCompleto = document.getElementById('fnfNome').value.trim();
    var partes = nomeCompleto.split(/\s+/);
    var firstName = partes.shift() || '';
    var lastName = partes.join(' ');
    var params = {
      first_name: firstName,
      last_name: lastName,
      full_name: nomeCompleto,
      email: document.getElementById('fnfEmail').value.trim(),
      phone: telE164()
    };
    var qs = Object.keys(params)
      .filter(function(k){ return params[k]; })
      .map(function(k){ return k + '=' + encodeURIComponent(params[k]); })
      .join('&');
    var sep = res.url.indexOf('?') === -1 ? '?' : '&';
    var destinoFinal = qs ? (res.url + sep + qs) : res.url;

    wrap.querySelectorAll('.fnf-step').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('fnfProgressArea').style.display = 'none';
    document.querySelector('.fnf-nav').style.display = 'none';
    document.getElementById('fnfStatusMsg').classList.add('show');

    enviarWebhook('concluiu_formulario', 7, { destino: res.url, qualificado: res.qualificado, empresa: res.empresa })
      .then(function() { window.location.href = destinoFinal; })
      .catch(function() { window.location.href = destinoFinal; });
  }

  /* ───────── SELEÇÃO + AVANÇO AUTOMÁTICO ───────── */
  var areaWrap = document.getElementById('fnfAreaWrap');
  wrap.querySelectorAll('.fnf-options').forEach(function(group) {
    var campo = group.getAttribute('data-field');
    var cards = group.querySelectorAll('.fnf-option-card');

    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        cards.forEach(function(c) { c.classList.remove('selected'); });
        card.classList.add('selected');

        var valor = card.getAttribute('data-value');
        var tipo = card.getAttribute('data-tipo') || '';

        /* Campo "especialidade": médico avança; "Outro" revela sub-área e NÃO avança. */
        if (campo === 'especialidade') {
          respostas.especialidade = valor;
          if (card.getAttribute('data-abre-area') === '1') {
            tipoPorEspecialidade = 'outro';
            respostas.area = '';
            areaWrap.style.display = 'block';
            // limpa seleção de sub-área anterior
            areaWrap.querySelectorAll('.fnf-option-card').forEach(function(c){ c.classList.remove('selected'); });
            return; // espera o lead escolher a área
          }
          tipoPorEspecialidade = tipo; // medico
          respostas.area = '';
          areaWrap.style.display = 'none';
          avancar();
          return;
        }

        /* Sub-campo "area" (não-médicos dentro de "Outro"). */
        if (campo === 'area') {
          respostas.area = valor;
          tipoPorEspecialidade = tipo; // nm | outro
          var errA = group.parentNode.querySelector('.fnf-field-error');
          if (errA) errA.classList.remove('show');
          avancar();
          return;
        }

        /* Demais campos. */
        respostas[campo] = valor;
        dqPorCampo[campo] = (card.getAttribute('data-dq') === '1');
        var err = group.parentNode.querySelector('.fnf-field-error');
        if (err) err.classList.remove('show');
        avancar();
      });
    });
  });

  function avancar() {
    setTimeout(function() {
      if (ehUltimoStep(stepAtual)) { finalizar(); return; }
      var prox = proximoStep(stepAtual);
      if (prox !== null) mostrarStep(prox);
    }, 280);
  }

  btnBack.addEventListener('click', function() {
    var ant = stepAnterior(stepAtual);
    if (ant !== null) mostrarStep(ant);
  });

  /* ───────── ENVIO (etapa de contato) ───────── */
  function validarContato() {
    var nome = document.getElementById('fnfNome').value.trim();
    var email = document.getElementById('fnfEmail').value.trim();
    var insta = document.getElementById('fnfInstagram').value.trim();
    var d = telDigits();
    if (d.indexOf('55') === 0) { d = d.slice(2); }
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var ok = !!nome && d.length >= 10 && emailOk && !!insta;
    document.getElementById('fnfErrContato').classList.toggle('show', !ok);
    return ok;
  }
  document.getElementById('fnfBtnEnviar').addEventListener('click', function() {
    if (!validarContato()) return;
    finalizar();
  });

  /* ───────── ABRIR / FECHAR MODAL ───────── */
  var jaRegistrouEntrada = false;
  function abrirModal() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (!jaRegistrouEntrada) { jaRegistrouEntrada = true; registrarVisualizacao(1); }
  }
  function fecharModal() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  window.abrirFormularioWebinar = abrirModal;
  window.fecharFormularioWebinar = fecharModal;

  var btnClose = document.getElementById('fnfClose');
  if (btnClose) btnClose.addEventListener('click', fecharModal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) fecharModal(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) fecharModal();
  });

  /* Botões marcados na página também abrem o modal. */
  document.querySelectorAll('[data-open-form]').forEach(function(el) {
    el.addEventListener('click', function(e) { e.preventDefault(); abrirModal(); });
  });

  /* ───────── INÍCIO ───────── */
  atualizarProgresso();

})();
