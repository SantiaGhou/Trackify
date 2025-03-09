# Trackify - Sistema de Rastreamento de Pedidos

&#x20;

O **Trackify** é uma aplicação web desenvolvida para simular o rastreamento de pedidos. Ele permite gerar códigos de rastreamento, consultar o status atual de um pedido e automatizar a progressão dos status ao longo do tempo.

## 📄 Índice

- [✨ Funcionalidades](#funcionalidades)
- [🛠️ Pré-requisitos](#pré-requisitos)
- [📝 Instalação](#instalação)
- [🔍 Uso](#uso)
  - [🔢 Gerar Códigos de Rastreamento](#gerar-códigos-de-rastreamento)
  - [🔎 Consultar Status de um Código](#consultar-status-de-um-código)
- [🛠️ Administração](#administração)
- [🌐 Estrutura do Projeto](#estrutura-do-projeto)
- [📚 Licença](#licença)

---

## ✨ Funcionalidades

- **Geração de Códigos de Rastreamento**:

  - Gera códigos únicos para pedidos nacionais, expressos ou internacionais.
  - Associa os códigos a cidades específicas.
  - Inclui histórico inicial com status "CRIADO" e "POSTADO".

- **Consulta de Status**:

  - Permite consultar o status atual de um código de rastreamento.
  - Exibe o histórico completo do pedido, incluindo descrições detalhadas e timestamps.

- **Automatização de Status**:

  - O sistema avança automaticamente nos status com base no tempo decorrido desde a criação do código.
  - Simula falhas na entrega com base em probabilidades.

- **Interface de Administração**:

  - Acesso protegido por token para gerar códigos em massa via interface web.

---

## 🛠️ Pré-requisitos

Antes de executar o projeto, certifique-se de ter instalado:

- **Node.js** (versão 16 ou superior): [Download aqui](https://nodejs.org/)
- **npm** ou **yarn**: Gerenciadores de pacotes do Node.js.
- **Git** (opcional): Para clonar o repositório.

---

## 📝 Instalação

1. Clone o repositório:

   ```bash
   git clone https://github.com/SantiaGhou/Trackify
   cd trackify
   ```

2. Instale as dependências:

   ```bash
   npm install
   # ou
   yarn install
   ```

3. Inicie o servidor:

   ```bash
   npm start
   # ou
   yarn start
   ```

---

## 🔍 Uso

### 🔢 Gerar Códigos de Rastreamento

Para gerar um novo código de rastreamento, utilize a interface de administração ou a API:

```bash
POST /api/generate
{
  "tipo": "nacional",
  "cidade": "São Paulo"
}
```

### 🔎 Consultar Status de um Código

Para consultar o status de um pedido, envie uma requisição GET:

```bash
GET /api/status/{codigo}
```

A resposta incluirá o status atual e o histórico completo.

---

## 🛠️ Administração

- Para gerar um novo token de administração, utilize:

```bash
POST /api/admin/token
```

---

## 🌐 Estrutura do Projeto

```
trackify/
│-- server.js        # Servidor principal
│-- data.json        # Armazena os códigos de rastreamento
│-- public/          # Arquivos estáticos (frontend)
│-- routes/          # Definição das rotas da API
│-- utils/           # Funções auxiliares
```

---

## 📚 Licença

Este projeto é licenciado sob a [MIT License](LICENSE).

