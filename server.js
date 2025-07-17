const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Jarvis Backend está online!');
});

app.post('/pergunta', (req, res) => {
  const { pergunta } = req.body;

  let resposta = '';
  if (pergunta.includes('quem te criou')) {
    resposta = 'Fui criado pelo programador Cainan Samuel.';
  } else if (pergunta.includes('vida')) {
    resposta = '42. Segundo Douglas Adams, claro.';
  } else {
    resposta = 'Ainda estou aprendendo, humano.';
  }

  res.json({ resposta });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
