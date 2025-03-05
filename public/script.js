document.getElementById("generateForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  // Obtém os valores do formulário
  const cities = document.getElementById("cities").value.trim();
  const quantity = parseInt(document.getElementById("quantity").value, 10);

  // Validação básica
  if (!cities || quantity < 1) {
    alert("Por favor, insira as cidades e a quantidade de códigos.");
    return;
  }

  try {
    // Faz a requisição para a API
    const response = await fetch("/api/generate-codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cities, quantity })
    });

    // Verifica se a resposta foi bem-sucedida
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "Ocorreu um erro ao gerar os códigos.");
      return;
    }

    // Converte a resposta em JSON
    const data = await response.json();

    // Exibe os códigos gerados
    displayGeneratedCodes(data.generatedCodes);
  } catch (error) {
    console.error("Erro ao gerar os códigos:", error);
    alert("Ocorreu um erro ao gerar os códigos. Tente novamente.");
  }
});

function displayGeneratedCodes(codes) {
  const generatedCodesSection = document.getElementById("generated-codes");
  generatedCodesSection.innerHTML = ""; // Limpa a seção anterior

  codes.forEach((code) => {
    const paragraph = document.createElement("p");
    paragraph.innerHTML = `<code>${code}</code>`;
    generatedCodesSection.appendChild(paragraph);
  });
}