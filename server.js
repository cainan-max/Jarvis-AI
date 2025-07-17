const express = require('express');
const cors = require('cors');
const axios = require('axios'); // <== Adicionado para chamadas HTTP

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Jarvis Backend está online!');
});

app.post('/pergunta', async (req, res) => {
  const { pergunta } = req.body;

  let resposta = '';

  if (!pergunta) {
    return res.status(400).json({ resposta: 'Pergunta inválida.' });
  }

  const perguntaLower = pergunta.toLowerCase();

  // Respostas diretas
  if (perguntaLower.includes('quem te criou')) {
    resposta = 'Fui criado pelo programador Cainan Samuel.';
  } else if (perguntaLower.includes('vida')) {
    resposta = '42. Segundo Douglas Adams, claro.';
  } else {
    // Se não encontrou resposta, busca em uma API externa
    try {
      const resp = await axios.post('https://api-inteligencia-externa.com/responder', {
        pergunta: pergunta
      });

      if (resp.data && resp.data.resposta) {
        resposta = resp.data.resposta;
      } else {
        resposta = 'Desculpe, não encontrei uma resposta adequada.';
      }
    } catch (error) {
      console.error('Erro ao consultar API externa:', error.message);
      resposta = 'Não consegui buscar a resposta agora. Tente novamente mais tarde.';
    }
  }

  res.json({ resposta });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
