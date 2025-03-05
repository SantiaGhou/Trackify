document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM totalmente carregado!");

  const form = document.getElementById("trackingForm");
  const trackingResultsSection = document.getElementById("tracking-results");
  const trackingHistoryList = document.getElementById("tracking-history");

  if (!form || !trackingResultsSection || !trackingHistoryList) {
    console.error("Erro: Elementos do DOM não foram encontrados!");
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
      // Faz a requisição para a API
      const response = await fetch(`/api/check-status/${trackingCode}`);

      if (!response.ok) {
        throw new Error("Código não encontrado ou erro na requisição.");
      }

      const data = await response.json();

      // Exibe os resultados
      displayTrackingResults(data.history);
    } catch (error) {
      console.error("Erro ao consultar o status:", error);
      alert("Ocorreu um erro ao consultar o status. Tente novamente.");
    }
  });

  function displayTrackingResults(history) {
    if (!trackingHistoryList || !trackingResultsSection) {
      console.error("Erro: Elementos de rastreamento não foram carregados corretamente!");
      return;
    }

    // Limpa a lista anterior
    trackingHistoryList.innerHTML = "";

    // Adiciona cada item do histórico à lista
    history.forEach((item) => {
      const listItem = document.createElement("li");

      const statusSpan = document.createElement("span");
      statusSpan.classList.add("status");
      statusSpan.textContent = item.status || "Status desconhecido";

      const timestampSpan = document.createElement("span");
      timestampSpan.classList.add("timestamp");
      timestampSpan.textContent = item.timestamp || "Data/hora indisponível";

      const descriptionP = document.createElement("p");
      descriptionP.textContent = item.description || "Descrição indisponível";

      listItem.appendChild(statusSpan);
      listItem.appendChild(timestampSpan);
      listItem.appendChild(descriptionP);
      trackingHistoryList.appendChild(listItem);
    });

    // Remove a classe "hidden" para exibir a seção
    trackingResultsSection.classList.remove("hidden");
  }
});
