const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs"); // Módulo para manipular arquivos

const app = express();
const PORT = 80;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // Serve arquivos estáticos (HTML, CSS, JS)

// Caminho para o arquivo data.json
const DATA_FILE = "./data.json";

// Função para ler os dados do arquivo
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      // Se o arquivo não existir, cria um novo com uma estrutura inicial
      fs.writeFileSync(DATA_FILE, JSON.stringify({ trackingCodes: [] }, null, 2));
    }
    const rawData = fs.readFileSync(DATA_FILE);
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Erro ao ler o arquivo data.json:", error);
    return { trackingCodes: [] }; // Retorna um array vazio em caso de erro
  }
}

// Função para salvar os dados no arquivo
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log("Dados salvos no arquivo data.json:", data);
  } catch (error) {
    console.error("Erro ao salvar o arquivo data.json:", error);
  }
}

// Rota para gerar códigos de rastreamento
app.post("/api/generate-codes", (req, res) => {
  const { cities, quantity } = req.body;

  // Validação dos parâmetros
  if (!cities || !quantity || quantity < 1) {
    return res.status(400).json({ error: "Parâmetros inválidos." });
  }

  const citiesList = cities.split(/[,;]/).map(city => city.trim()).filter(city => city !== "");
  if (!citiesList.length) {
    return res.status(400).json({ error: "Nenhuma cidade válida fornecida." });
  }

  const data = readData();
  const generatedCodes = [];

  for (let i = 0; i < quantity; i++) {
    const code = generateTrackingCode();
    const city = citiesList[i % citiesList.length];
    const now = Date.now();

    // Força o horário do status "CRIADO" para 9h da manhã
    const createdAtDate = new Date(now);
    createdAtDate.setHours(9, 0, 0, 0); // Define o horário para 9h da manhã

    // Adiciona o status "CRIADO" com o horário fixo de 9h da manhã
    const history = [
      {
        status: "CRIADO",
        timestamp: createdAtDate.toLocaleString("pt-BR", { hour12: false }),
        description: "A entrega foi criada com sucesso. Aguarde os demais status de rastreamento."
      }
    ];

    data.trackingCodes.push({
      code,
      city,
      createdAt: now,
      currentStep: 0,
      hasFailed: false, // Flag para indicar se houve falha na entrega
      history
    });

    generatedCodes.push(`${code} (${city})`);
  }

  saveData(data);
  res.json({ generatedCodes });
});

// Rota para consultar o status de um código
app.get("/api/check-status/:code", (req, res) => {
  const { code } = req.params;
  const data = readData();

  const trackingCode = data.trackingCodes.find(item => item.code === code);
  if (!trackingCode) {
    return res.status(404).json({ error: "Código não encontrado." });
  }

  res.json({
    code: trackingCode.code,
    city: trackingCode.city,
    history: trackingCode.history
  });
});

// Função para gerar um código de rastreamento
function generateTrackingCode() {
  const prefix = "BR"; // País de origem
  const number = Math.floor(100000000 + Math.random() * 900000000); // Número sequencial de 9 dígitos
  const suffix = Math.random().toString(36).substring(2, 4).toUpperCase(); // Sufixo aleatório de 2 letras
  return `${prefix}${number}${suffix}`;
}

// Automação de status
setInterval(() => {
  const now = Date.now();
  const steps = [
    { status: "DESPACHADO", days: 2, description: "O produto foi despachado na unidade de centro de distribuição." },
    { status: "EM TRANSFERÊNCIA", days: 4, description: "A carga está em processo de transferência entre filiais." },
    { status: "ENTRADA FILIAL DESTINO", days: 7, description: "A carga chegou na filial." },
    { status: "PRODUTO EM ANÁLISE", days: 10, description: "O seu produto está em processo de análise de liberação da alfândega." },
    { status: "PRODUTO LIBERADO", days: 12, description: "Seu produto foi analisado com sucesso, em breve estará disponível para entrega." },
    { status: "PRODUTO EM ROTA DE ENTREGA", days: 15, description: "Seu produto está em transferência para a cidade de destino." },
    { status: "PRODUTO CHEGOU NA CIDADE DE DESTINO", days: 20, description: "Objeto postado foi postado após o horário limite da unidade, sujeito encaminhamento no próximo dia útil." },
    { status: "PRODUTO NA FILA DE ENTREGA", days: 25, description: "Seu produto foi encaminhado para a fila de entrega, por conta da alta demanda de entregas feitas pela transportadora." },
    { status: "PRODUTO SAIU PARA ENTREGA", days: 28, description: "Seu produto saiu para entrega ao destinatário." },
    { status: "FALHA NA ENTREGA", days: 29, description: "O entregador não localizou o endereço do destinatário. Nova tentativa será feita no próximo dia útil." },
    { status: "PRODUTO SAIU PARA ENTREGA", days: 30, description: "Nova tentativa de entrega ao destinatário." },
    { status: "PRODUTO ENTREGUE AO DESTINATÁRIO", days: 30, description: "Produto entregue ao destinatário." }
  ];

  const data = readData();

  data.trackingCodes.forEach(trackingCode => {
    const elapsedTime = (now - trackingCode.createdAt) / (1000 * 60 * 60 * 24); // Dias desde a criação

    // Verifica se é hora de adicionar uma falha na entrega
    if (
      elapsedTime >= 28 && elapsedTime < 29 && // Entre o 28º e 29º dia
      !trackingCode.hasFailed && // Ainda não ocorreu falha
      Math.random() < 0.5 // 50% de chance de falhar
    ) {
      const timestamp = new Date().toLocaleString("pt-BR", { hour12: false });

      trackingCode.history.push({
        status: "FALHA NA ENTREGA",
        timestamp,
        description: "O entregador não localizou o endereço do destinatário. Nova tentativa será feita no próximo dia útil."
      });

      trackingCode.hasFailed = true; // Marca que houve falha
      trackingCode.currentStep = steps.findIndex(step => step.status === "FALHA NA ENTREGA");
    }

    // Encontra o próximo step com base no tempo decorrido
    const nextStep = steps.find(step => step.days > elapsedTime);

    if (nextStep && trackingCode.currentStep < steps.indexOf(nextStep)) {
      const step = steps[trackingCode.currentStep];
      const timestamp = new Date().toLocaleString("pt-BR", { hour12: false });

      trackingCode.history.push({
        status: step.status,
        timestamp,
        description: step.description
      });

      trackingCode.currentStep += 1;
    }
  });

  saveData(data);
}, 10000); // Verifica a cada 10 segundos (10000 ms)

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});