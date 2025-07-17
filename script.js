const BASE_URL = 'https://jarvis-backend-cisn.onrender.com';

let conhecimentoJarvis = {};
const jarvisMessages = document.getElementById('jarvis-messages');
let escutando = false;

function adicionarMensagem(remetente, texto) {
  const div = document.createElement('div');
  div.innerHTML = `<strong>${remetente}:</strong> ${texto}`;
  jarvisMessages.appendChild(div);
  jarvisMessages.scrollTop = jarvisMessages.scrollHeight;
}

function falar(texto) {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = 'pt-BR';

  const vozes = speechSynthesis.getVoices();
  const vozPreferida = vozes.find(v =>
    v.name.toLowerCase().includes("luciana") ||
    v.name.toLowerCase().includes("camila") ||
    v.lang === "pt-BR"
  );

  fala.voice = vozPreferida || vozes.find(v => v.lang.includes("pt")) || null;
  fala.rate = 1;
  fala.pitch = 1;
  fala.volume = 1;

  if (!fala.voice && vozes.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => falar(texto);
    return;
  }

  window.speechSynthesis.speak(fala);
}

async function carregarConhecimento() {
  try {
    const res = await fetch(`${BASE_URL}/conhecimento`);
    if (!res.ok) throw new Error('Falha ao carregar conhecimento');
    conhecimentoJarvis = await res.json();
  } catch (err) {
    console.error('Erro ao carregar conhecimento:', err);
    conhecimentoJarvis = {};
  }
}

async function salvarConhecimento(pergunta, resposta) {
  try {
    const res = await fetch(`${BASE_URL}/conhecimento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pergunta, resposta })
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || 'Erro ao salvar conhecimento');
    }
    return true;
  } catch (err) {
    console.error(err);
    responderJarvis('Erro ao salvar o conhecimento no servidor.');
    return false;
  }
}

function responderJarvis(texto) {
  adicionarMensagem("🤖 Jarvis", texto);
  falar(texto);
}

function normalizarTexto(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function calcularDistanciaLevenshtein(a, b) {
  const matriz = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + custo
      );
    }
  }

  return matriz[a.length][b.length];
}

function encontrarPerguntaMaisParecida(texto) {
  const entrada = normalizarTexto(texto);
  let melhor = null;
  let melhorPontuacao = Infinity;

  for (const chave of Object.keys(conhecimentoJarvis)) {
    const pergunta = normalizarTexto(chave);
    const distancia = calcularDistanciaLevenshtein(entrada, pergunta);
    if (distancia < melhorPontuacao) {
      melhorPontuacao = distancia;
      melhor = chave;
    }
  }

  return melhorPontuacao <= 4 ? melhor : null;
}

async function processarComandoJarvis(texto) {
  const pergunta = texto.toLowerCase().trim();

  if (pergunta === "dispensar jarvis") {
    escutando = false;
    responderJarvis("Tudo bem! Estarei por aqui se precisar.");
    return;
  }

  const normal = normalizarTexto(pergunta);

  if (conhecimentoJarvis[normal]) {
    responderJarvis(conhecimentoJarvis[normal]);
    return;
  }

  const parecida = encontrarPerguntaMaisParecida(normal);
  if (parecida) {
    responderJarvis(conhecimentoJarvis[parecida]);
    return;
  }

  if (normal.includes("tudo bem") || normal.includes("como voce esta")) {
    responderJarvis("Estou ótimo! E você, tudo certo por aí?");
    return;
  }

  if (normal.includes("obrigado") || normal.includes("valeu")) {
    responderJarvis("De nada! Estou aqui sempre que precisar.");
    return;
  }

  if (normal.includes("oi") || normal.includes("ola") || normal.includes("eae")) {
    responderJarvis("Olá! Como posso te ajudar hoje?");
    return;
  }

  if (pergunta.includes("=")) {
    const partes = pergunta.split('=');
    if (partes.length === 2) {
      const perguntaParaSalvar = partes[0].trim();
      const respostaParaSalvar = partes[1].trim();

      const sucesso = await salvarConhecimento(perguntaParaSalvar, respostaParaSalvar);
      if (sucesso) {
        conhecimentoJarvis[normalizarTexto(perguntaParaSalvar)] = respostaParaSalvar;
        responderJarvis(`Entendi! Quando me perguntarem "${perguntaParaSalvar}", direi: "${respostaParaSalvar}".`);
      }
    } else {
      responderJarvis("Use o formato: pergunta = resposta");
    }
    return;
  }

  responderJarvis("Hmm, ainda não aprendi isso. Quer me ensinar? Use: pergunta = resposta");
}

document.getElementById("jarvis-input").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    const comando = e.target.value.trim();
    if (comando) {
      adicionarMensagem("👤 Você", comando);
      processarComandoJarvis(comando);
      e.target.value = "";
    }
  }
});

if ('webkitSpeechRecognition' in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = event => {
    const texto = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    adicionarMensagem("🎤 Você (voz)", texto);

    if (!escutando && texto.includes("jarvis")) {
      escutando = true;
      responderJarvis("Sim? Estou ouvindo.");
    } else if (escutando) {
      if (texto.startsWith("jarvis aprenda:") && texto.includes("=")) {
        const partes = texto.split("jarvis aprenda:")[1].split("=");
        if (partes.length === 2) {
          aprenderComando(partes[0], partes[1]);
        } else {
          responderJarvis("Formato incorreto. Diga: Jarvis, aprenda: pergunta = resposta");
        }
      } else {
        processarComandoJarvis(texto);
      }
    }
  };

  recognition.onerror = () => responderJarvis("Erro no reconhecimento de voz.");
  recognition.start();
}

function limparMensagens() {
  jarvisMessages.innerHTML = "";
}

async function ensinarEmMassa() {
  const texto = document.getElementById("ensinar-massa").value.trim();
  const linhas = texto.split('\n');
  let contador = 0;

  for (let linha of linhas) {
    if (linha.includes('=')) {
      const partes = linha.split('=');
      if (partes.length === 2) {
        const pergunta = partes[0].trim();
        const resposta = partes[1].trim();

        const sucesso = await salvarConhecimento(pergunta, resposta);
        if (sucesso) {
          conhecimentoJarvis[normalizarTexto(pergunta)] = resposta;
          contador++;
        }
      }
    }
  }

  responderJarvis(`✅ Aprendi ${contador} novos conhecimentos!`);
}

function mostrarConhecimentoJarvis() {
  const chaves = Object.keys(conhecimentoJarvis);
  const total = chaves.length;
  if (total === 0) return responderJarvis("Ainda não aprendi nada.");
  responderJarvis(`Eu sei responder ${total} perguntas.`);
  setTimeout(() => {
    alert(`📚 Jarvis conhece:\n\n${chaves.slice(0, 10).join('\n')}\n${total > 10 ? '...\n(E mais!)' : ''}`);
  }, 800);
}

function alternarTema() {
  document.body.classList.toggle("claro");
  const modoAtual = document.body.classList.contains("claro") ? "claro" : "escuro";
  responderJarvis(`Tema alterado para ${modoAtual}`);
}

let reconhecimentoVoz;
let escutandoMicrofone = false;

function alternarEscuta() {
  const botao = document.getElementById("botao-microfone");

  if (!('webkitSpeechRecognition' in window)) {
    responderJarvis("Seu navegador não suporta reconhecimento de voz.");
    return;
  }

  if (!reconhecimentoVoz) {
    reconhecimentoVoz = new webkitSpeechRecognition();
    reconhecimentoVoz.lang = 'pt-BR';
    reconhecimentoVoz.continuous = true;
    reconhecimentoVoz.interimResults = false;

    reconhecimentoVoz.onresult = event => {
      const texto = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      adicionarMensagem("🎤 Você (voz)", texto);
      processarComandoJarvis(texto);
    };

    reconhecimentoVoz.onerror = () => {
      responderJarvis("Erro no reconhecimento de voz.");
      botao.classList.remove("escutando");
      botao.innerText = "🎙️ Ativar Microfone";
      escutandoMicrofone = false;
    };
  }

  if (escutandoMicrofone) {
    reconhecimentoVoz.stop();
    botao.classList.remove("escutando");
    botao.innerText = "🎙️ Ativar Microfone";
    escutandoMicrofone = false;
    responderJarvis("Microfone desativado.");
  } else {
    reconhecimentoVoz.start();
    botao.classList.add("escutando");
    botao.innerText = "🔴 Escutando...";
    escutandoMicrofone = true;
    responderJarvis("Microfone ativado. Estou ouvindo.");
  }
}

carregarConhecimento();
