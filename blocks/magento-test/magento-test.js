async function testMagentoConnection() {
  const graphqlEndpoint = 'https://artdev-7hjxg3i-awxnxowa5lur4.eu-4.magentosite.cloud/graphql';

  const query = `
    {
      products(search: " ", pageSize: 5) {
        items {
          id
          name
          sku
          price {
            regularPrice {
              amount {
                value
                currency
              }
            }
          }
        }
      }
    }
  `;

  try {
    console.log('🔄 Wysyłam zapytanie do Magento GraphQL...');
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Błąd HTTP! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ ODPOWIEDŹ Z MAGENTO:', data);
    
    // Sprawdź, czy są jakieś błędy w odpowiedzi GraphQL
    if (data.errors) {
      console.error('❌ Błędy GraphQL:', data.errors);
      return;
    }
    
    // Wyświetl produkty w konsoli
    if (data.data?.products?.items) {
      console.log('📦 Pobrane produkty:', data.data.products.items);
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas łączenia z Magento:', error);
  }
}

// Uruchom test przy załadowaniu strony
document.addEventListener('DOMContentLoaded', function() {
  // Możesz też wywołać tę funkcję ręcznie z konsoli przeglądarki
  window.testMagento = testMagentoConnection;
  console.log('🧪 Aby przetestować połączenie z Magento, wpisz w konsoli: testMagento()');
});