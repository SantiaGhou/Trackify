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
    console.error("Erro ao ler o arquivo data.json:", error);
    return { trackingCodes: [] };
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

// Função para gerar um horário aleatório dentro de um intervalo específico
function generateRandomTime(startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const randomTimestamp = Math.floor(Math.random() * (end - start + 1)) + start;
  return new Date(randomTimestamp);
}

// Rota para gerar códigos de rastreamento
app.post("/api/generate-codes", (req, res) => {
  const { cities, quantity, type } = req.body;
  if (!cities || !quantity || quantity < 1 || !type) {
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

    // Define a data de criação como o dia anterior ao momento atual
    const now = new Date();
    const createdAtDate = new Date(now);
    createdAtDate.setDate(createdAtDate.getDate() - 1);

    // Gera horários aleatórios para "CRIADO" e "POSTADO"
    const createdTime = generateRandomTime(
      new Date(createdAtDate.setHours(6, 0, 0, 0)),
      new Date(createdAtDate.setHours(12, 0, 0, 0))
    );

    const postedTime = generateRandomTime(
      new Date(createdAtDate.setHours(12, 0, 0, 0)),
      new Date(createdAtDate.setHours(18, 0, 0, 0))
    );

    const history = [
      {
        status: "CRIADO",
        timestamp: createdTime.toLocaleString("pt-BR", { hour12: false }),
        description: "Pedido aprovado! Aguarde os demais status de rastreamento.",
      },
      {
        status: "POSTADO",
        timestamp: postedTime.toLocaleString("pt-BR", { hour12: false }),
        description: "O seu pedido foi postado com sucesso.",
      },
    ];

    data.trackingCodes.push({
      code,
      city,
      createdAt: createdAtDate.getTime(),
      currentStep: 0,
      hasFailed: false,
      hasRandomEvent: false,
      history,
    });

    generatedCodes.push(`${code} (${city})`);
  }

  saveData(data);
  res.json({ generatedCodes });
});

// Rota para consultar o status de um código
app.get("/api/check-status/:code", (req, res) => {
  const { code } = req.params;
  const cleanedCode = code.replace(/\s*\(.*$/, "").trim();
  const data = readData();
  const trackingCode = data.trackingCodes.find((item) => item.code === cleanedCode);

  if (!trackingCode) {
    return res.status(404).json({ error: "Código não encontrado." });
  }

  res.json({
    code: trackingCode.code,
    city: trackingCode.city,
    history: trackingCode.history,
  });
});

// Passos nacionais atualizados
const nationalSteps = [
  { status: "📦 DESPACHADO", days: 0, description: "O produto foi despachado da unidade de origem." },
  { status: "🚚 EM TRÂNSITO LOCAL", days: 1, description: "O produto está em trânsito local." },
  { status: "🏢 CHEGOU NO CENTRO DE DISTRIBUIÇÃO", days: 2, description: "O produto chegou ao centro de distribuição." },
  { status: "🛠️ PREPARANDO PARA SAIR", days: 3, description: "O produto está sendo preparado para sair." },
  { status: "🚛 PACOTE EM TRÂNSITO", days: 4, description: "O pacote está em trânsito para a cidade de destino." },
  { status: "📍 PACOTE CHEGOU NA CIDADE Destino", days: 5, description: "O pacote chegou em " }, // cidade será concatenada
  { status: "📬 PACOTE PRONTO PARA ENTREGA", days: 6, description: "O pacote está pronto para entrega." },
  { status: "🏃‍♂️ SAIU PARA ENTREGA", days: 7, description: "O pacote saiu para entrega." },
  { status: "❌ FALHA NA ENTREGA", days: 8, description: "Falha na entrega (destinatário não encontrado)." },
  { status: "🔄 SAINDO PARA ENTREGA", days: 9, description: "O pacote está saindo para entrega novamente." },
  { status: "✅ ENTREGUE", days: 10, description: "O pacote foi entregue ao destinatário." },
];

// Automação de status
setInterval(() => {
  const now = Date.now();
  const data = readData();
  data.trackingCodes.forEach((trackingCode) => {
    const elapsedTime = (now - trackingCode.createdAt) / (1000 * 60 * 60 * 24);
    const steps = nationalSteps;

    // Falha na entrega
    if (
      elapsedTime >= steps[8].days &&
      elapsedTime < steps[9].days &&
      !trackingCode.hasFailed &&
      Math.random() < 0.5
    ) {
      const failTime = generateRandomTime(
        new Date(now - 1000 * 60 * 60 * 24),
        new Date(now)
      );
      trackingCode.history.push({
        status: "FALHA NA ENTREGA",
        timestamp: failTime.toLocaleString("pt-BR", { hour12: false }),
        description: "Falha na entrega (destinatário não encontrado).",
      });
      trackingCode.hasFailed = true;
      trackingCode.currentStep = 8;
    }

    // Avanço no status
    const nextStep = steps.find((step) => step.days > elapsedTime);
    if (nextStep && trackingCode.currentStep < steps.indexOf(nextStep)) {
      const step = steps[trackingCode.currentStep];
      const randomTime = generateRandomTime(
        new Date(now - 1000 * 60 * 60 * 24 * step.days),
        new Date(now)
      );
      let description = step.description;
      if (step.status === "PACOTE CHEGOU") {
        description += ` ${trackingCode.city}.`;
      } else if (
        step.status === "PACOTE EM TRÂNSITO" ||
        step.status === "SAIU PARA ENTREGA" ||
        step.status === "SAINDO PARA ENTREGA"
      ) {
        description += ` Destino: ${trackingCode.city}.`;
      }
      trackingCode.history.push({
        status: step.status,
        timestamp: randomTime.toLocaleString("pt-BR", { hour12: false }),
        description,
      });
      trackingCode.currentStep += 1;
    }
  });

  saveData(data);
}, 10000);

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
