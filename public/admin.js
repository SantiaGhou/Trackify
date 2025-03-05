document.addEventListener('DOMContentLoaded', () => {
    const generateForm = document.getElementById('generateForm');
    const generatedCodesDiv = document.getElementById('generated-codes');
  
    generateForm.addEventListener('submit', async (event) => {
      event.preventDefault();
  
      const cities = document.getElementById('cities').value;
      const quantity = document.getElementById('quantity').value;
  
      try {
        const response = await fetch('/api/generate-codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cities, quantity }),
        });
  
        if (!response.ok) {
          throw new Error('Falha ao gerar códigos');
        }
  
        const data = await response.json();
        displayGeneratedCodes(data.generatedCodes);
      } catch (error) {
        console.error('Erro:', error);
        alert('Ocorreu um erro ao gerar os códigos. Por favor, tente novamente.');
      }
    });
  
    function displayGeneratedCodes(codes) {
      generatedCodesDiv.innerHTML = '<h2>Códigos Gerados:</h2>';
      codes.forEach(code => {
        const p = document.createElement('p');
        p.innerHTML = `<code>${code}</code>`;
        generatedCodesDiv.appendChild(p);
      });
    }
  });