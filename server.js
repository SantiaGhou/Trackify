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
    international: "INT",
  };

  const prefix = prefixMap[type] || "BR"; // Default para "normal" se o tipo não for reconhecido
  const number = Math.floor(100000000 + Math.random() * 900000000);
  const suffix = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}${number}${suffix}`;
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
    const code = generateTrackingCode(type); // Passa o tipo para a função
    const city = citiesList[i % citiesList.length];
    const now = Date.now();

    const createdAtDate = new Date(now);
    createdAtDate.setHours(9, 0, 0, 0);

    const history = [
      {
        status: "CRIADO",
        timestamp: createdAtDate.toLocaleString("pt-BR", { hour12: false }),
        description: "Pedido aprovado! Aguarde os demais status de rastreamento.",
      },
    ];

    data.trackingCodes.push({
      code,
      city,
      createdAt: now,
      currentStep: 0,
      hasFailed: false,
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

  // Limpa o código recebido (remove espaços e caracteres indesejados)
  const cleanedCode = code.replace(/\s*\(.*$/, "").trim();

  const data = readData();

  const trackingCode = data.trackingCodes.find(
    (item) => item.code === cleanedCode
  );

  if (!trackingCode) {
    return res.status(404).json({ error: "Código não encontrado." });
  }

  res.json({
    code: trackingCode.code,
    city: trackingCode.city,
    history: trackingCode.history,
  });
});

// Automação de status
setInterval(() => {
  const now = Date.now();

  // Steps para pedidos nacionais
  const nationalSteps = [
    { status: "POSTADO", days: 0, description: "O seu pedido foi postado com sucesso." },
    {
      status: "DESPACHADO",
      days: 1,
      description: "O produto foi despachado da unidade de origem.",
    },
    {
      status: "EM TRÂNSITO LOCAL",
      days: 2,
      description: "O produto está em trânsito local.",
    },
    {
      status: "ENTRADA NO CENTRO DE DISTRIBUIÇÃO",
      days: 3,
      description: "O produto chegou ao centro de distribuição.",
    },
    {
      status: "CLASSIFICAÇÃO DO PRODUTO",
      days: 4,
      description: "O produto está sendo classificado para envio.",
    },
    {
      status: "EM TRANSFERÊNCIA PARA FILIAL",
      days: 5,
      description: "O produto está sendo transferido para a filial de destino.",
    },
    {
      status: "ENTRADA NA FILIAL DESTINO",
      days: 7,
      description: "O produto chegou à filial de destino.",
    },
    {
      status: "PREPARAÇÃO PARA ENTREGA",
      days: 9,
      description: "O produto está sendo preparado para entrega.",
    },
    {
      status: "PRODUTO EM ROTA DE ENTREGA",
      days: 11,
      description: "O produto está em rota de entrega para a cidade de destino.",
    },
    {
      status: "CHEGADA NA CIDADE DE DESTINO",
      days: 13,
      description: "O produto chegou na cidade de destino.",
    },
    {
      status: "NA FILA DE ENTREGA",
      days: 15,
      description: "O produto está na fila de entrega.",
    },
    {
      status: "SAIU PARA ENTREGA",
      days: 17,
      description: "O produto saiu para entrega ao destinatário.",
    },
    {
      status: "FALHA NA ENTREGA",
      days: 18,
      description:
        "O entregador não localizou o endereço do destinatário. Nova tentativa será feita no próximo dia útil.",
    },
    {
      status: "NOVA TENTATIVA DE ENTREGA",
      days: 19,
      description: "Nova tentativa de entrega ao destinatário.",
    },
    {
      status: "ENTREGUE AO DESTINATÁRIO",
      days: 20,
      description: "O produto foi entregue ao destinatário.",
    },
  ];

  // Steps para pedidos internacionais
  const internationalSteps = [
    { status: "POSTADO", days: 0, description: "O seu pedido foi postado com sucesso." },
    {
      status: "DESPACHADO DA ORIGEM",
      days: 2,
      description: "O produto foi despachado da unidade de origem internacional.",
    },
    {
      status: "EM TRÂNSITO INTERNACIONAL",
      days: 5,
      description: "O produto está em trânsito internacional.",
    },
    {
      status: "CHEGADA NO PAÍS DE DESTINO",
      days: 10,
      description: "O produto chegou ao país de destino.",
    },
    {
      status: "EM TRÂNSITO PARA ALFÂNDEGA",
      days: 12,
      description: "O produto está em trânsito para a alfândega.",
    },
    {
      status: "ANÁLISE NA ALFÂNDEGA",
      days: 15,
      description: "O produto está em análise na alfândega.",
    },
    {
      status: "LIBERADO PELA ALFÂNDEGA",
      days: 18,
      description: "O produto foi liberado pela alfândega.",
    },
    {
      status: "EM TRANSFERÊNCIA PARA CENTRO DE DISTRIBUIÇÃO",
      days: 20,
      description: "O produto está sendo transferido para o centro de distribuição nacional.",
    },
    {
      status: "ENTRADA NO CENTRO DE DISTRIBUIÇÃO",
      days: 22,
      description: "O produto chegou ao centro de distribuição nacional.",
    },
    {
      status: "CLASSIFICAÇÃO DO PRODUTO",
      days: 24,
      description: "O produto está sendo classificado para envio.",
    },
    {
      status: "EM TRANSFERÊNCIA PARA FILIAL",
      days: 26,
      description: "O produto está sendo transferido para a filial de destino.",
    },
    {
      status: "ENTRADA NA FILIAL DESTINO",
      days: 28,
      description: "O produto chegou à filial de destino.",
    },
    {
      status: "PREPARAÇÃO PARA ENTREGA",
      days: 30,
      description: "O produto está sendo preparado para entrega.",
    },
    {
      status: "PRODUTO EM ROTA DE ENTREGA",
      days: 32,
      description: "O produto está em rota de entrega para a cidade de destino.",
    },
    {
      status: "CHEGADA NA CIDADE DE DESTINO",
      days: 34,
      description: "O produto chegou na cidade de destino.",
    },
    {
      status: "NA FILA DE ENTREGA",
      days: 36,
      description: "O produto está na fila de entrega.",
    },
    {
      status: "SAIU PARA ENTREGA",
      days: 38,
      description: "O produto saiu para entrega ao destinatário.",
    },
    {
      status: "FALHA NA ENTREGA",
      days: 39,
      description:
        "O entregador não localizou o endereço do destinatário. Nova tentativa será feita no próximo dia útil.",
    },
    {
      status: "NOVA TENTATIVA DE ENTREGA",
      days: 40,
      description: "Nova tentativa de entrega ao destinatário.",
    },
    {
      status: "ENTREGUE AO DESTINATÁRIO",
      days: 41,
      description: "O produto foi entregue ao destinatário.",
    },
  ];

  const data = readData();

  data.trackingCodes.forEach((trackingCode) => {
    const elapsedTime = (now - trackingCode.createdAt) / (1000 * 60 * 60 * 24);

    // Determina os steps com base no tipo de código
    const steps =
      trackingCode.code.startsWith("INT") ? internationalSteps : nationalSteps;

    // Falha na entrega
    if (
      elapsedTime >= steps[steps.length - 3].days &&
      elapsedTime < steps[steps.length - 2].days &&
      !trackingCode.hasFailed &&
      Math.random() < 0.5
    ) {
      const timestamp = new Date().toLocaleString("pt-BR", { hour12: false });

      trackingCode.history.push({
        status: "FALHA NA ENTREGA",
        timestamp,
        description:
          "O entregador não localizou o endereço do destinatário. Nova tentativa será feita no próximo dia útil.",
      });

      trackingCode.hasFailed = true;
      trackingCode.currentStep = steps.findIndex(
        (step) => step.status === "FALHA NA ENTREGA"
      );
    }

    // Avanço no status
    const nextStep = steps.find((step) => step.days > elapsedTime);

    if (
      nextStep &&
      trackingCode.currentStep < steps.indexOf(nextStep)
    ) {
      const step = steps[trackingCode.currentStep];
      const timestamp = new Date().toLocaleString("pt-BR", { hour12: false });

      trackingCode.history.push({
        status: step.status,
        timestamp,
        description: `${step.description} Destino: ${trackingCode.city}.`,
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