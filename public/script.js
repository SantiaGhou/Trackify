document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM totalmente carregado!");

  const form = document.getElementById("trackingForm");

  if (!form) {
    console.error("Formulário não encontrado!");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // Impede o recarregamento da página

    // Obtém o código digitado pelo usuário
    const trackingCode = document.getElementById("tracking-code").value.trim();

    // Validação básica
    if (!trackingCode) {
      alert("Por favor, insira um código de rastreamento.");
      return;
    }

    console.log("Código inserido:", trackingCode);

    try {
      // Faz a requisição para a API (simulação)
      const response = await fetch(`/api/check-status/${trackingCode}`);
      const data = await response.json();

      // Verifica se o código foi encontrado
      if (response.status === 404) {
        alert(data.error || "Código não encontrado.");
        return;
      }

      // Exibe os resultados
      displayTrackingResults(data.history);
    } catch (error) {
      console.error("Erro ao consultar o status:", error);
      alert("Ocorreu um erro ao consultar o status. Tente novamente.");
    }
  });

  function displayTrackingResults(history) {
    const trackingResultsSection = document.getElementById("tracking-results");
    const trackingHistoryList = document.getElementById("tracking-history");

    if (!trackingResultsSection || !trackingHistoryList) {
      console.error("Elementos de resultado não encontrados!");
      return;
    }

    // Limpa a lista anterior
    trackingHistoryList.innerHTML = "";

    // Adiciona cada item do histórico à lista
    history.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `
        <span class="status">${item.status || "Status desconhecido"}</span>
        <span class="timestamp">${item.timestamp || "Data/hora indisponível"}</span>
        <p>${item.description || "Descrição indisponível"}</p>
      `;
      trackingHistoryList.appendChild(listItem);
    });

    // Remove a classe "hidden" para exibir a seção
    trackingResultsSection.classList.remove("hidden");
  }
});
