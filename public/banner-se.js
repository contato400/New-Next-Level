(function () {
  // ---------- CONFIG ----------
  var VAGAS_INICIAIS = 7;
  var VAGAS_MINIMAS = 2;
  var PRIMEIRA_NOTIF = 10000;  // primeira notificação 10s após carregar
  var INTERVALO_MIN = 12000;   // entre notificações: 12s ...
  var INTERVALO_MAX = 25000;   // ... até 25s
  var DURACAO_NOTIF = 3000;    // cada notificação fica 3s na tela

  var NOMES = [
    "Dra. Ana", "Dra. Camila", "Dra. Juliana", "Dra. Patrícia", "Dra. Fernanda",
    "Dra. Renata", "Dra. Mariana", "Dra. Beatriz", "Dra. Carolina", "Dra. Letícia",
    "Dra. Aline", "Dra. Vanessa", "Dra. Tatiane", "Dra. Priscila", "Dra. Daniela",
    "Dr. Rafael", "Dr. Bruno", "Dr. Marcelo", "Dr. Felipe", "Dr. Gustavo"
  ];

  var CIDADES_POR_UF = {
    "SP": ["São Paulo", "Campinas", "Ribeirão Preto", "Santos", "Sorocaba", "São José dos Campos"],
    "RJ": ["Rio de Janeiro", "Niterói", "Petrópolis", "Campos dos Goytacazes", "Nova Iguaçu"],
    "MG": ["Belo Horizonte", "Uberlândia", "Juiz de Fora", "Contagem", "Betim", "Sete Lagoas"],
    "GO": ["Goiânia", "Anápolis", "Aparecida de Goiânia", "Rio Verde"],
    "PR": ["Curitiba", "Londrina", "Maringá", "Cascavel", "Ponta Grossa"],
    "SC": ["Florianópolis", "Joinville", "Blumenau", "Itajaí", "Chapecó"],
    "RS": ["Porto Alegre", "Caxias do Sul", "Pelotas", "Santa Maria", "Canoas"],
    "BA": ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari"],
    "PE": ["Recife", "Olinda", "Caruaru", "Jaboatão dos Guararapes"],
    "CE": ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Sobral"],
    "ES": ["Vitória", "Vila Velha", "Serra", "Cariacica"],
    "DF": ["Brasília", "Taguatinga", "Ceilândia", "Águas Claras"],
    "PA": ["Belém", "Ananindeua", "Santarém", "Marabá"],
    "MT": ["Cuiabá", "Várzea Grande", "Rondonópolis"],
    "MS": ["Campo Grande", "Dourados", "Três Lagoas"]
  };
  var CIDADES_GENERICAS = [
    "São Paulo", "Goiânia", "Belo Horizonte", "Curitiba", "Ribeirão Preto",
    "Florianópolis", "Campinas", "Recife", "Vitória", "Maringá", "Belém"
  ];

  var elVagas   = document.getElementById("vagas-count");
  var elNotif   = document.getElementById("scarcity-notification");
  var elNome    = document.getElementById("notif-nome");
  var elNCidade = document.getElementById("notif-cidade");
  var elTime    = document.getElementById("notif-time");

  var ufLead = null;
  var vagasAtuais = VAGAS_INICIAIS;

  // ---------- GEOLOCALIZAÇÃO POR IP (só pra cidade da notificação) ----------
  fetch("https://ipwho.is/")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.success && d.region_code) ufLead = d.region_code;
    })
    .catch(function () {
      fetch("https://ipapi.co/json/")
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.region_code) ufLead = d.region_code; })
        .catch(function () {});
    });

  // ---------- HELPERS ----------
  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function cidadeParaNotif() {
    if (ufLead && CIDADES_POR_UF[ufLead]) return rand(CIDADES_POR_UF[ufLead]);
    return rand(CIDADES_GENERICAS);
  }
  function tempoRelativo() {
    return rand(["agora mesmo", "há 1 minuto", "há 2 minutos", "há instantes", "há 3 minutos"]);
  }

  // ---------- NOTIFICAÇÃO + QUEDA DE VAGA ----------
  function mostrarNotificacao() {
    elNome.textContent = rand(NOMES);
    elNCidade.textContent = cidadeParaNotif();
    elTime.textContent = tempoRelativo();

    elNotif.classList.add("show");
    diminuirVaga();

    setTimeout(function () {
      elNotif.classList.remove("show");
    }, DURACAO_NOTIF);
  }

  function diminuirVaga() {
    if (vagasAtuais > VAGAS_MINIMAS) {
      vagasAtuais--;
      elVagas.textContent = vagasAtuais;
    }
  }

  // ---------- LOOP ENCADEADO ----------
  function agendarProximo() {
    // Vagas travadas no mínimo (2): para de enviar as notificações verdes.
    if (vagasAtuais <= VAGAS_MINIMAS) return;
    var delay = randInt(INTERVALO_MIN, INTERVALO_MAX);
    setTimeout(function () {
      mostrarNotificacao();
      agendarProximo();
    }, delay);
  }

  setTimeout(function () {
    mostrarNotificacao();
    agendarProximo();
  }, PRIMEIRA_NOTIF);

})();