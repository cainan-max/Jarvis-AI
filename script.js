// Jarvis com armazenamento local, destaque de sintaxe e suporte a código

let conhecimentoJarvis = JSON.parse(localStorage.getItem("conhecimentoJarvis")) || {};
const jarvisMessages = document.getElementById("jarvis-messages");
let escutando = false;

function salvarLocalmente(pergunta, resposta) {
  conhecimentoJarvis[normalizarTexto(pergunta)] = resposta;
  localStorage.setItem("conhecimentoJarvis", JSON.stringify(conhecimentoJarvis));
}

function adicionarMensagem(remetente, texto) {
  const div = document.createElement("div");

  // Detectar se é código (HTML, JS, Python)
  const ehCodigo = /<[^>]+>|function|=>|console|def |import |let |const |var /.test(texto);

  if (ehCodigo) {
    div.innerHTML = `<strong>${remetente}:</strong><pre><code class="language-javascript">${escapeHtml(texto)}</code></pre>`;
    // Se quiser usar highlight.js
    if (window.hljs) hljs.highlightAll();
  } else {
    div.innerHTML = `<strong>${remetente}:</strong> ${texto}`;
  }

  jarvisMessages.appendChild(div);
  jarvisMessages.scrollTop = jarvisMessages.scrollHeight;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function falar(texto) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  const vozes = speechSynthesis.getVoices();
  const vozPreferida = vozes.find(v => v.name.toLowerCase().includes("luciana") || v.name.toLowerCase().includes("camila") || v.lang === "pt-BR");
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

function responderJarvis(texto) {
  adicionarMensagem("🤖 Jarvis", texto);
  falar(texto);
}

async function processarComandoJarvis(texto) {
  const pergunta = texto.toLowerCase().trim();
  const normal = normalizarTexto(pergunta);

  if (pergunta === "dispensar jarvis") {
    escutando = false;
    responderJarvis("Tudo bem! Estarei por aqui se precisar.");
    return;
  }

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
    const partes = pergunta.split("=");
    if (partes.length === 2) {
      const perguntaParaSalvar = partes[0].trim();
      const respostaParaSalvar = partes[1].trim();
      salvarLocalmente(perguntaParaSalvar, respostaParaSalvar);
      responderJarvis(`Entendi! Quando me perguntarem "${perguntaParaSalvar}", direi: "${respostaParaSalvar}".`);
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
<!-- Botão para ensinar em massa -->
<button id="botao-ensinar-massa">Ensinar várias perguntas</button>

<script>
  // Função para ensinar várias perguntas e respostas de uma vez
  async function ensinarEmMassa() {
    const texto = prompt("Cole aqui várias perguntas e respostas, cada uma no formato:\npergunta = resposta\n\nExemplo:\nqual é a capital do brasil = Brasília\nquem descobriu o brasil = Pedro Álvares Cabral");
    if (!texto) return;

    const linhas = texto.split('\n');
    let contador = 0;

    for (let linha of linhas) {
      if (linha.includes('=')) {
        const partes = linha.split('=');
        if (partes.length === 2) {
          const pergunta = partes[0].trim();
          const resposta = partes[1].trim();
          salvarLocalmente(pergunta, resposta);
          contador++;
        }
      }
    }

    responderJarvis(`✅ Aprendi ${contador} novos conhecimentos!`);
  }

  // Adicionar evento ao botão
  document.getElementById("botao-ensinar-massa").addEventListener("click", ensinarEmMassa);
</script>
