(function() {
  "use strict";

  /* CONFIG */
  var WEBHOOK_URL = 'https://mooingnautilus-n8n.cloudfy.live/webhook/calculoEvasao-FormEtapasLPSE';
  var MODELO = 'PopUp-Etapasv02';
  var ORIGEM = 'LP SE FORM v02';
  var TOTAL_STEPS = 3;
  var TOTAL_ETAPAS_FUNIL = 4;

  /* UTMs */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  function getParam(name) {
    var n = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + n + '(=([^&#]*)|&|#|$)');
    var results = regex.exec(window.location.href);
    if (!results || !results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }
  function capturarUTMs() {
    UTM_KEYS.forEach(function(k) { var v = getParam(k); if (v) { try { localStorage.setItem(k, v); } catch (e) {} } });
  }
  function getUTMs() {
    var out = {};
    UTM_KEYS.forEach(function(k) { var v = ''; try { v = localStorage.getItem(k) || ''; } catch (e) {} out[k] = v; });
    return out;
  }
  capturarUTMs();

  /* REDIRECTS — Qualificado x Desqualificado
     Desqualificado = faturamento "Menos de 19 mil reais" OU especialidade "Outro". */
  var URL_QUALIFICADO     = 'https://nextlevelformed.com.br/pular-a-fila-ses-mql/';
  var URL_DESQUALIFICADO  = 'https://nextlevelformed.com.br/pular-a-fila-ses';
  var FATURAMENTO_DESQ = 'Menos de 19 mil reais';

  function definirDestino(faturamento, especialidade) {
    if (faturamento === FATURAMENTO_DESQ) return URL_DESQUALIFICADO;
    if (especialidade === 'Outro') return URL_DESQUALIFICADO;
    return URL_QUALIFICADO;
  }

  /* SESSION ID */
  function gerarUUID() {
    if (window.crypto && crypto.randomUUID) { return crypto.randomUUID(); }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0; var v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16);
    });
  }
  var SESSION_ID = gerarUUID();

  var overlay = document.getElementById('seFormOverlay');
  var fTel = document.getElementById('seTelefone');

  function abrirModal() { overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function fecharModal() { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  window.fecharFormularioWebinar = fecharModal;

  document.getElementById('seFormClose').addEventListener('click', fecharModal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) fecharModal(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && overlay.classList.contains('open')) fecharModal(); });

  /* ESPECIALIDADE "OUTRO" — mostra campo de texto */
  var selEsp = document.getElementById('seEspecialidade');
  var outroWrap = document.getElementById('seOutroWrap');
  selEsp.addEventListener('change', function() {
    if (selEsp.value === 'Outro') { outroWrap.style.display = 'block'; }
    else { outroWrap.style.display = 'none'; }
  });

  /* TELEFONE */
  fTel.addEventListener('focus', function() { if (!fTel.value) { fTel.value = '+55 '; } });
  fTel.addEventListener('input', function() {
    var raw = fTel.value; var temMais = raw.trim().indexOf('+55') === 0;
    var digits = raw.replace(/\D/g, ''); if (temMais && digits.indexOf('55') === 0) { digits = digits.slice(2); }
    digits = digits.slice(0, 11);
    var fmt = '';
    if (digits.length > 0) fmt += '(' + digits.slice(0, 2);
    if (digits.length >= 2) fmt += ') ';
    if (digits.length > 2 && digits.length <= 6) { fmt += digits.slice(2); }
    else if (digits.length > 6) { var corte = digits.length > 10 ? 7 : 6; fmt += digits.slice(2, corte) + '-' + digits.slice(corte); }
    fTel.value = (temMais ? '+55 ' : '') + fmt;
  });
  function telDigits() { return fTel.value.replace(/\D/g, ''); }
  function telE164() { var d = telDigits(); if (d.indexOf('55') === 0) { return '+' + d; } return '+55' + d; }

  /* OPÇÕES CLICÁVEIS */
  function ativarOpcoes(containerId, hiddenId) {
    var cards = document.querySelectorAll('#' + containerId + ' .se-option-card');
    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        cards.forEach(function(c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        document.getElementById(hiddenId).value = card.getAttribute('data-value');
      });
    });
  }
  ativarOpcoes('seOptsFaturamento', 'seFaturamento');

  /* ESTADO + NAVEGAÇÃO */
  var stepAtual = 1;
  var stepsVisualizados = {};

  function especialidadeFinal() {
    var v = selEsp.value;
    if (v === 'Outro') {
      var outro = document.getElementById('seEspecialidadeOutro').value.trim();
      return outro ? ('Outro: ' + outro) : 'Outro';
    }
    return v;
  }

  function getDadosAtuais() {
    return {
      nome: document.getElementById('seNome').value.trim(),
      telefone: telE164(),
      codigo_pais: '+55',
      telefone_local: document.getElementById('seTelefone').value.trim(),
      instagram: document.getElementById('seInstagram').value.trim(),
      especialidade: especialidadeFinal(),
      faturamento: document.getElementById('seFaturamento').value
    };
  }

  function enviarWebhook(evento, etapa, extra) {
    var payload = {
      session_id: SESSION_ID, modelo: MODELO, origem: ORIGEM,
      evento: evento, etapa: etapa, total_etapas: TOTAL_ETAPAS_FUNIL,
      respostas: getDadosAtuais(), utm: getUTMs(), timestamp: new Date().toISOString()
    };
    if (extra) { for (var k in extra) { if (extra.hasOwnProperty(k)) payload[k] = extra[k]; } }
    return fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
  }

  function registrarVisualizacao(etapa) {
    if (stepsVisualizados[etapa]) return;
    stepsVisualizados[etapa] = true;
    enviarWebhook('visualizou_etapa', etapa).catch(function() {});
  }

  function atualizarProgresso() {
    var pct = Math.round((stepAtual / TOTAL_STEPS) * 100);
    document.getElementById('seProgressFill').style.width = pct + '%';
  }

  function mostrarStep(n) {
    overlay.querySelectorAll('.se-step').forEach(function(s) { s.classList.toggle('active', parseInt(s.getAttribute('data-step'), 10) === n); });
    stepAtual = n; atualizarProgresso(); registrarVisualizacao(n);
  }

  /* VALIDAÇÃO */
  function limparErros() { overlay.querySelectorAll('.se-field-error').forEach(function(e) { e.classList.remove('show'); }); }
  function validarStep(n) {
    limparErros();
    if (n === 1) {
      if (!selEsp.value) { document.getElementById('seErrEspecialidade').classList.add('show'); return false; }
      if (selEsp.value === 'Outro') {
        var outro = document.getElementById('seEspecialidadeOutro').value.trim();
        if (!outro) { document.getElementById('seErrEspecialidadeOutro').classList.add('show'); return false; }
      }
      return true;
    }
    if (n === 2) { if (!document.getElementById('seFaturamento').value) { document.getElementById('seErrFaturamento').classList.add('show'); return false; } }
    if (n === 3) {
      var ok = true;
      var nome = document.getElementById('seNome').value.trim();
      var insta = document.getElementById('seInstagram').value.trim();
      var d = telDigits(); if (d.indexOf('55') === 0) { d = d.slice(2); }
      if (!nome) { document.getElementById('seErrNome').classList.add('show'); ok = false; }
      if (d.length < 10) { document.getElementById('seErrTelefone').classList.add('show'); ok = false; }
      if (!insta) { document.getElementById('seErrInstagram').classList.add('show'); ok = false; }
      return ok;
    }
    return true;
  }

  /* BOTÕES */
  overlay.querySelectorAll('[data-next]').forEach(function(btn) {
    btn.addEventListener('click', function() { if (!validarStep(stepAtual)) return; if (stepAtual < TOTAL_STEPS) mostrarStep(stepAtual + 1); });
  });
  overlay.querySelectorAll('[data-back]').forEach(function(btn) {
    btn.addEventListener('click', function() { if (stepAtual > 1) mostrarStep(stepAtual - 1); });
  });

  /* FINALIZAÇÃO */
  document.getElementById('seBtnFinal').addEventListener('click', function() {
    if (!validarStep(3)) return;
    var faturamento = document.getElementById('seFaturamento').value;
    var especialidade = selEsp.value;
    var destino = definirDestino(faturamento, especialidade);
    var qualificado = (destino === URL_QUALIFICADO);

    overlay.querySelectorAll('.se-step').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('seProgressArea').style.display = 'none';
    document.getElementById('seStatusMsg').classList.add('show');

    enviarWebhook('concluiu_formulario', 4, { destino: destino, qualificado: qualificado })
      .then(function() { window.location.href = destino; })
      .catch(function() { window.location.href = destino; });
  });

  /* INÍCIO */
  atualizarProgresso();
  var jaRegistrouEntrada = false;
  function abrirComRegistro() {
    abrirModal();
    if (!jaRegistrouEntrada) { jaRegistrouEntrada = true; registrarVisualizacao(1); }
  }
  window.abrirFormularioWebinar = abrirComRegistro;

  /* botões da página abrem o modal */
  var triggers = document.querySelectorAll('[data-open-form]');
  triggers.forEach(function(el) { el.addEventListener('click', function(e) { e.preventDefault(); abrirComRegistro(); }); });

  /* FADE-UP ON SCROLL */
  var faders = document.querySelectorAll('.fade-up');
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    faders.forEach(function(f) { obs.observe(f); });
  } else {
    faders.forEach(function(f) { f.classList.add('visible'); });
  }

})();