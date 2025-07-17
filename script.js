async function fazerPergunta() {
  const pergunta = document.getElementById('pergunta').value;
  const respostaEl = document.getElementById('resposta');

  const resposta = await fetch('https://jarvis-backend.onrender.com/pergunta', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pergunta })
  });

  const data = await resposta.json();
  respostaEl.innerText = data.resposta;
}
