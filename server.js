const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Caminho para o arquivo data.json
const DATA_FILE = "./data.json";

// Função para ler os dados do arquivo
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ trackingCodes: [] }, null, 2));
    }
    const rawData = fs.readFileSync(DATA_FILE);
    return JSON.parse(rawData);
  } catch (error) {
    console.error(`[${new Date().toLocaleString("pt-BR")}] Erro ao ler o arquivo data.json:`, error);
    return { trackingCodes: [] };
  }
}

// Função para salvar os dados no arquivo
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`[${new Date().toLocaleString("pt-BR")}] Dados salvos no arquivo data.json`);
  } catch (error) {
    console.error(`[${new Date().toLocaleString("pt-BR")}] Erro ao salvar o arquivo data.json:`, error);
  }
}

// Função para gerar um código de rastreamento
function generateTrackingCode(type) {
  const prefixMap = {
    normal: "BR",
    express: "EX",
  };
  const prefix = prefixMap[type] || "BR";
  const number = Math.floor(100000000 + Math.random() * 900000000);
  const suffix = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}${number}${suffix}`;
}

// Função para gerar um horário aleatório em um dia específico
function generateRandomTimeOnDay(baseDate, startHour = 6, endHour = 18) {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0); // Zera o horário
  const start = date.getTime() + startHour * 60 * 60 * 1000;
  const end = Math.min(date.getTime() + endHour * 60 * 60 * 1000, Date.now());
  const randomTimestamp = Math.floor(Math.random() * (end - start + 1)) + start;
  const result = new Date(randomTimestamp);
  return result.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour12: false });
}

// Função para parsear timestamp do formato DD/MM/YYYY HH:MM:SS
function parseTimestamp(timestamp) {
  try {
    const [day, month, yearTime] = timestamp.split("/");
    const [year, time] = yearTime.split(" ");
    const [hour, minute, second] = time.split(":");
    return new Date(+year, +month - 1, +day, +hour, +minute, +second);
  } catch (error) {
    console.error(`[${new Date().toLocaleString("pt-BR")}] Erro ao parsear timestamp: ${timestamp}`, error);
    return null;
  }
}

// Função para exibir atualizações quando códigos são gerados
function logCodeGeneration(generatedCodes) {
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  console.log(`[${now}] Atualização: Novos códigos de rastreamento gerados:`);
  generatedCodes.forEach((code, index) => {
    console.log(`  ${index + 1}. ${code}`);
  });
}

// Rota para gerar códigos de rastreamento
app.post("/api/generate-codes", (req, res) => {
  const { cities, quantity, type } = req.body;
  if (!cities || !Number.isInteger(quantity) || quantity < 1 || !type) {
    return res.status(400).json({ error: "Parâmetros inválidos." });
  }

  const citiesList = cities
    .split(/[,;]/)
    .map((city) => city.trim())
    .filter((city) => city !== "");

  if (!citiesList.length) {
    return res.status(400).json({ error: "Nenhuma cidade válida fornecida." });
  }

  const data = readData();
  const generatedCodes = [];

  for (let i = 0; i < quantity; i++) {
    const code = generateTrackingCode(type);
    const city = citiesList[i % citiesList.length];

    const now = new Date();
    const createdAtDate = new Date(now);
    createdAtDate.setDate(createdAtDate.getDate() - 1);

    const postedAtDate = new Date(createdAtDate);
    postedAtDate.setDate(createdAtDate.getDate() - 1);

    const postedTime = generateRandomTimeOnDay(postedAtDate, 6, 18);
    const createdTime = generateRandomTimeOnDay(createdAtDate, 6, 18);

    const history = [
      {
        status: "POSTADO",
        timestamp: postedTime,
        description: "O seu pedido foi postado com sucesso.",
      },
      {
        status: "CRIADO",
        timestamp: createdTime,
        description: "Pedido aprovado! Aguarde os demais status de rastreamento.",
      },
    ];

    data.trackingCodes.push({
      code,
      city,
      createdAt: createdAtDate.getTime(),
      currentStep: 0,
      hasFailed: false,
      hasRandomEvent: false,
      history: history,
    });

    generatedCodes.push(`${code} (${city})`);
  }

  saveData(data);
  logCodeGeneration(generatedCodes);
  res.json({ generatedCodes });
});

// Passos nacionais
const nationalSteps = [
  { status: "📦 DESPACHADO", days: 0, description: "O produto foi despachado da unidade de origem." },
  { status: "🚚 EM TRÂNSITO LOCAL", days: 1, description: "O produto está em trânsito local." },
  { status: "🏢 CHEGOU NO CENTRO DE DISTRIBUIÇÃO", days: 2, description: "O produto chegou ao centro de distribuição." },
  { status: "🛠️ PREPARANDO PARA SAIR", days: 3, description: "O produto está sendo preparado para sair." },
  { status: "🚛 PACOTE EM TRÂNSITO PARA CIDADE", days: 4, description: "O pacote está em trânsito para " },
  { status: "📍 PACOTE CHEGOU EM CIDADE", days: 5, description: "O pacote chegou em " },
  { status: "📬 PACOTE PRONTO PARA ENTREGA", days: 6, description: "O pacote está pronto para entrega." },
  { status: "🏃‍♂️ SAIU PARA ENTREGA", days: 7, description: "O pacote saiu para entrega." },
  { status: "❌ FALHA NA ENTREGA", days: 8, description: "Falha na entrega (destinatário não encontrado)." },
  { status: "🔄 SAINDO PARA ENTREGA", days: 9, description: "O pacote está saindo para entrega novamente." },
  { status: "✅ ENTREGUE", days: 10, description: "O pacote foi entregue ao destinatário." },
];

// Rota para consultar o status de um código
app.get("/api/check-status/:code", (req, res) => {
  const { code } = req.params;
  const cleanedCode = code.replace(/\s*\(.*$/, "").trim();
  console.log(`[${new Date().toLocaleString("pt-BR")}] Consultando código: ${cleanedCode}`);
  
  const data = readData();
  const trackingCode = data.trackingCodes.find((item) => item.code === cleanedCode);

  if (!trackingCode) {
    console.log(`[${new Date().toLocaleString("pt-BR")}] Código não encontrado: ${cleanedCode}`);
    return res.status(404).json({ error: "Código não encontrado." });
  }

  const now = new Date();
  const filteredHistory = trackingCode.history.filter((event) => {
    try {
      const [day, month, yearTime] = event.timestamp.split("/");
      const [year, time] = yearTime.split(" ");
      const [hour, minute, second] = time.split(":");
      const eventTime = new Date(+year, +month - 1, +day, +hour, +minute, +second);
      return !isNaN(eventTime.getTime()) && eventTime <= now;
    } catch (error) {
      console.error(`[${new Date().toLocaleString("pt-BR")}] Erro ao parsear timestamp: ${event.timestamp}`, error);
      return false;
    }
  });

  const steps = nationalSteps.map((step, index) => {
    let description = step.description;
    if (step.status.includes("CHEGOU EM CIDADE")) {
      description += ` ${trackingCode.city}.`;
    } else if (
      step.status.includes("EM TRÂNSITO PARA CIDADE") ||
      step.status.includes("SAIU PARA ENTREGA") ||
      step.status.includes("SAINDO PARA ENTREGA")
    ) {
      description += ` Destino: ${trackingCode.city}.`;
    }

    const isCompleted = index <= trackingCode.currentStep;
    const historyEvent = filteredHistory.find((event) => event.status === step.status);
    return {
      status: step.status,
      description,
      completed: isCompleted,
      timestamp: historyEvent ? historyEvent.timestamp : null,
    };
  });

  const response = {
    code: trackingCode.code,
    city: trackingCode.city,
    history: filteredHistory,
    steps,
  };

  console.log(`[${new Date().toLocaleString("pt-BR")}] Resposta enviada para ${cleanedCode}:`, response);
  res.json(response);
});

// Automação de status
setInterval(() => {
  const now = new Date();
  const data = readData();

  data.trackingCodes.forEach((trackingCode) => {
    const steps = nationalSteps;

    if (trackingCode.currentStep < steps.length - 1) {
      const lastEvent = trackingCode.history[trackingCode.history.length - 1];
      const lastEventTime = lastEvent ? parseTimestamp(lastEvent.timestamp) : new Date(trackingCode.createdAt);

      if (!lastEventTime) {
        console.error(`[${new Date().toLocaleString("pt-BR")}] Erro: Não foi possível parsear o último timestamp para ${trackingCode.code}`);
        return;
      }

      // Próximo passo após 24 horas
      const nextStepTime = new Date(lastEventTime.getTime() + 24 * 60 * 60 * 1000);
      // Para testes: use 10 * 1000 (10 segundos) em vez de 24 * 60 * 60 * 1000
      // const nextStepTime = new Date(lastEventTime.getTime() + 10 * 1000);
      const nextStepTimestamp = generateRandomTimeOnDay(nextStepTime);

      if (new Date() >= nextStepTime) {
        const nextStepIndex = trackingCode.currentStep + 1;
        const step = steps[nextStepIndex];
        let description = step.description;

        if (step.status.includes("CHEGOU EM CIDADE")) {
          description += ` ${trackingCode.city}.`;
        } else if (
          step.status.includes("EM TRÂNSITO PARA CIDADE") ||
          step.status.includes("SAIU PARA ENTREGA") ||
          step.status.includes("SAINDO PARA ENTREGA")
        ) {
          description += ` Destino: ${trackingCode.city}.`;
        }

        if (nextStepIndex === 8 && !trackingCode.hasFailed && Math.random() < 0.5) {
          console.log(`[${new Date().toLocaleString("pt-BR")}] Adicionando FALHA NA ENTREGA para ${trackingCode.code} em ${nextStepTimestamp}`);
          trackingCode.history.push({
            status: "FALHA NA ENTREGA",
            timestamp: nextStepTimestamp,
            description: "Falha na entrega (destinatário não encontrado).",
          });
          trackingCode.hasFailed = true;
          trackingCode.currentStep = 8;
        } else {
          console.log(`[${new Date().toLocaleString("pt-BR")}] Adicionando ${step.status} para ${trackingCode.code} em ${nextStepTimestamp}`);
          trackingCode.history.push({
            status: step.status,
            timestamp: nextStepTimestamp,
            description,
          });
          trackingCode.currentStep = nextStepIndex;
        }
      } else {
        console.log(`[${new Date().toLocaleString("pt-BR")}] Status ${steps[nextStepIndex].status} para ${trackingCode.code} não adicionado: ${nextStepTimestamp} é futuro.`);
      }
    }
  });

  saveData(data);
}, 60 * 60 * 1000); // Executa a cada 1 hora

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});