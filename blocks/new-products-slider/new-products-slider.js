import { fetchPlaceholders, fetchProducts, getProductLink } from '../../scripts/commerce.js';

function updateActiveSlide(slide) {
  const block = slide.closest('.new-products-slider');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.new-products-slide');
  const indicators = block.querySelectorAll('.new-products-indicator');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
  });

  indicators.forEach((indicator, idx) => {
    const button = indicator.querySelector('button');
    if (idx !== slideIndex) {
      button.removeAttribute('disabled');
    } else {
      button.setAttribute('disabled', 'true');
    }
  });
}

function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.new-products-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  
  const slidesContainer = block.querySelector('.new-products-slides');
  const activeSlide = slides[realSlideIndex];

  slidesContainer.scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  const indicatorsContainer = block.querySelector('.new-products-indicators');
  if (indicatorsContainer) {
    indicatorsContainer.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', (e) => {
        const indicator = e.currentTarget.parentElement;
        showSlide(block, parseInt(indicator.dataset.targetSlide, 10));
      });
    });
  }

  const prevBtn = block.querySelector('.new-products-prev');
  const nextBtn = block.querySelector('.new-products-next');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
    });
  }

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(entry.target);
    });
  }, { threshold: 0.5 });
  
  block.querySelectorAll('.new-products-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
}

/**
 * NOWA FUNKCJA - Parsowanie konfiguracji z Google Docs przez AEM
 */
async function parseConfigurationFromGoogleDocs(block) {
  const config = {
    productsPerSlide: 4,
    totalProducts: 8
  };
  
  try {
    // Szukamy linku do Google Docs w bloku
    const googleDocsLink = block.querySelector('a[href*="docs.google.com"]');
    
    if (googleDocsLink) {
      const docsUrl = googleDocsLink.href;
      console.log('📊 Found Google Docs link:', docsUrl);
      
      // Konwersja URL Google Docs na URL do pobrania jako JSON
      const sheetId = extractGoogleSheetId(docsUrl);
      if (sheetId) {
        const parameters = await fetchGoogleSheetParameters(sheetId);
        console.log('📋 Parameters from Google Sheet:', parameters);
        
        // Mapowanie parametrów na konfigurację
        parameters.forEach(param => {
          if (param.parameter === 'productsPerSlide') {
            config.productsPerSlide = parseInt(param.quantity) || 4;
          } else if (param.parameter === 'totalProducts') {
            config.totalProducts = parseInt(param.quantity) || 8;
          }
        });
      }
    }
  } catch (error) {
    console.warn('❌ Could not fetch from Google Docs, using defaults:', error);
  }
  
  // Fallback: parsowanie z tekstu w bloku
  if (config.productsPerSlide === 4) {
    const textContent = block.textContent;
    const productsPerSlideMatch = textContent.match(/Produkty na slajd\s*:\s*(\d+)/i);
    if (productsPerSlideMatch) {
      config.productsPerSlide = parseInt(productsPerSlideMatch[1]);
    }
  }
  
  console.log('🎯 Final configuration:', config);
  return config;
}

/**
 * Ekstrakcja ID z URL Google Sheets
 */
function extractGoogleSheetId(url) {
  const matches = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return matches ? matches[1] : null;
}

/**
 * Pobieranie parametrów z Google Sheets przez AEM proxy
 */
async function fetchGoogleSheetParameters(sheetId) {
  try {
    // Używamy AEM jako proxy do Google Sheets
    const aemEndpoint = `/content/dam/google-sheets-import/${sheetId}.json`;
    const response = await fetch(aemEndpoint);
    
    if (response.ok) {
      const data = await response.json();
      return parseSheetData(data);
    }
  } catch (error) {
    console.warn('AEM proxy failed, trying direct approach:', error);
    
    // Fallback: bezpośrednie pobieranie jako CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    const csvResponse = await fetch(csvUrl);
    if (csvResponse.ok) {
      const csvText = await csvResponse.text();
      return parseCSVData(csvText);
    }
  }
  
  return [];
}

/**
 * Parsowanie danych z JSON (AEM)
 */
function parseSheetData(data) {
  const parameters = [];
  
  if (data && data.sheets && data.sheets[0]) {
    const sheet = data.sheets[0];
    const rows = sheet.data[0].rowData;
    
    // Pomijamy nagłówek, zaczynamy od wiersza 1
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.values && row.values.length >= 2) {
        const parameter = row.values[0].formattedValue;
        const quantity = row.values[1].formattedValue;
        
        if (parameter && quantity) {
          parameters.push({
            parameter: parameter.trim(),
            quantity: quantity.trim()
          });
        }
      }
    }
  }
  
  return parameters;
}

/**
 * Parsowanie danych CSV
 */
function parseCSVData(csvText) {
  const parameters = [];
  const lines = csvText.split('\n');
  
  // Pomijamy nagłówek, zaczynamy od linii 1
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const [parameter, quantity] = line.split(',').map(item => item.trim().replace(/"/g, ''));
      
      if (parameter && quantity) {
        parameters.push({
          parameter: parameter,
          quantity: quantity
        });
      }
    }
  }
  
  return parameters;
}
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'new-products-card';
  
  const productLink = document.createElement('a');
  productLink.href = getProductLink(product.urlKey, product.sku);
  productLink.className = 'product-link';
  
  if (product.isNew) {
    const newBadge = document.createElement('span');
    newBadge.className = 'new-products-badge';
    newBadge.textContent = 'NOWOŚĆ';
    productLink.appendChild(newBadge);
  }
  
  const imageContainer = document.createElement('div');
  imageContainer.className = 'new-products-image';
  
  const image = document.createElement('img');
  image.src = product.image;
  image.alt = product.name;
  image.loading = 'lazy';
  imageContainer.appendChild(image);
  
  productLink.appendChild(imageContainer);
  
  const content = document.createElement('div');
  content.className = 'new-products-content';
  
  const title = document.createElement('h3');
  title.className = 'new-products-title';
  title.textContent = product.name;
  content.appendChild(title);
  
  const priceContainer = document.createElement('div');
  priceContainer.className = 'new-products-price-container';
  
  const netPrice = document.createElement('div');
  netPrice.className = 'new-products-net-price';
  
  if (product.price && product.price.final) {
    netPrice.textContent = `£${product.price.final.amount.value}`;
  } else {
    netPrice.textContent = product.formattedPrice || '£25.99';
  }
  
  priceContainer.appendChild(netPrice);
  
  const grossPrice = document.createElement('div');
  grossPrice.className = 'new-products-gross-price';
  
  if (product.price && product.price.final) {
    const nettoValue = product.price.final.amount.value;
    const bruttoValue = (nettoValue * 1.23).toFixed(2);
    grossPrice.textContent = `£${bruttoValue} brutto`;
  } else {
    grossPrice.textContent = 'Do modyfikacji - brak danych brutto';
  }
  
  priceContainer.appendChild(grossPrice);
  content.appendChild(priceContainer);
  
  // PANEL DODAWANIA - BEZ PRZERW
  const addToCartPanel = document.createElement('div');
  addToCartPanel.className = 'add-to-cart-panel';
  
  const quantityControls = document.createElement('div');
  quantityControls.className = 'quantity-controls';
  
  const inputContainer = document.createElement('div');
  inputContainer.className = 'quantity-input-container';
  
  const quantityInput = document.createElement('input');
  quantityInput.type = 'number';
  quantityInput.className = 'quantity-input';
  quantityInput.value = '1';
  quantityInput.min = '1';
  quantityInput.max = '10';
  
  inputContainer.appendChild(quantityInput);
  
  const arrowsContainer = document.createElement('div');
  arrowsContainer.className = 'quantity-arrows';
  
  const increaseBtn = document.createElement('button');
  increaseBtn.type = 'button';
  increaseBtn.className = 'quantity-arrow increase';
  increaseBtn.innerHTML = '▲';
  increaseBtn.setAttribute('aria-label', 'Zwiększ ilość');
  
  const decreaseBtn = document.createElement('button');
  decreaseBtn.type = 'button';
  decreaseBtn.className = 'quantity-arrow decrease';
  decreaseBtn.innerHTML = '▼';
  decreaseBtn.setAttribute('aria-label', 'Zmniejsz ilość');
  
  arrowsContainer.appendChild(increaseBtn);
  arrowsContainer.appendChild(decreaseBtn);
  
  quantityControls.appendChild(inputContainer);
  quantityControls.appendChild(arrowsContainer);
  
  const addToCartButton = document.createElement('button');
  addToCartButton.type = 'button';
  addToCartButton.className = 'add-to-cart-button';
  addToCartButton.textContent = 'Dodaj do koszyka';
  
  addToCartPanel.appendChild(quantityControls);
  addToCartPanel.appendChild(addToCartButton);
  content.appendChild(addToCartPanel);
  
  decreaseBtn.addEventListener('click', () => {
    const currentValue = parseInt(quantityInput.value) || 1;
    if (currentValue > 1) {
      quantityInput.value = currentValue - 1;
    }
  });
  
  increaseBtn.addEventListener('click', () => {
    const currentValue = parseInt(quantityInput.value) || 1;
    if (currentValue < 10) {
      quantityInput.value = currentValue + 1;
    }
  });
  
  card.appendChild(productLink);
  card.appendChild(content);
  
  return card;
}



function createSlide(products, slideIndex, sliderId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `new-products-${sliderId}-slide-${slideIndex}`);
  slide.className = 'new-products-slide';
  slide.setAttribute('role', 'tabpanel');
  slide.setAttribute('aria-roledescription', 'slide');

  // Add products to slide
  products.forEach(product => {
    const productCard = createProductCard(product);
    slide.appendChild(productCard);
  });

  return slide;
}

let sliderId = 0;
export default async function decorate(block) {
  console.log('🎯 New Products Slider - Starting decoration');
  
  sliderId += 1;
  block.setAttribute('id', `new-products-${sliderId}`);
  
  const placeholders = await fetchPlaceholders();
  
  // Parse configuration from Google Docs
  const config = await parseConfigurationFromGoogleDocs(block);
  const productsPerSlide = config.productsPerSlide;
  const totalProducts = config.totalProducts;
  
  console.log(`🛍️ New Products Slider: ${productsPerSlide} products per slide, ${totalProducts} total products`);
  
  let products = [];
  
  try {
    // Fetch real products from Magento
    console.log('🔄 Fetching products from Magento...');
    products = await fetchProducts({
      sort: 'newest',
      limit: totalProducts
    });
    
    if (!products || products.length === 0) {
      throw new Error('No products received from Magento');
    }
    
    console.log(`✅ Loaded ${products.length} real products from Magento`);
    
  } catch (error) {
    console.error('❌ Could not fetch products from Magento:', error);
    
    // Professional error handling
    const errorMessage = document.createElement('div');
    errorMessage.className = 'new-products-error';
    errorMessage.innerHTML = `
      <p>Unable to load products at the moment. Please try again later.</p>
      <small>Technical details: ${error.message}</small>
    `;
    block.appendChild(errorMessage);
    return;
  }
  
  // Clear the block content (remove configuration text)
  block.innerHTML = '';
  
  if (!products || products.length === 0) {
    const message = document.createElement('p');
    message.textContent = 'No new products available at this time.';
    block.appendChild(message);
    return;
  }

  // Accessibility setup
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.newProductsSlider || 'New Products Slider');
  block.setAttribute('aria-label', placeholders.newProducts || 'New Products');

  // Create slider structure
  const container = document.createElement('div');
  container.className = 'new-products-container';

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.className = 'new-products-slides';
  slidesWrapper.setAttribute('role', 'tablist');

  // Ustawienie zmiennej CSS dla liczby produktów na slajd
  slidesWrapper.style.setProperty('--products-per-slide', productsPerSlide);

  // Create navigation - ZAWSZE WIDOCZNE
  const navigation = document.createElement('div');
  navigation.className = 'new-products-navigation';
  
  const prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.className = 'new-products-prev';
  prevButton.setAttribute('aria-label', placeholders.previousSlide || 'Previous Slide');
  prevButton.innerHTML = '‹';
  
  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'new-products-next';
  nextButton.setAttribute('aria-label', placeholders.nextSlide || 'Next Slide');
  nextButton.innerHTML = '›';
  
  navigation.appendChild(prevButton);
  navigation.appendChild(nextButton);

  // Split products into slides
  const slides = [];
  for (let i = 0; i < products.length; i += productsPerSlide) {
    const slideProducts = products.slice(i, i + productsPerSlide);
    slides.push(slideProducts);
  }

  const isSingleSlide = slides.length < 2;

  // Create indicators if multiple slides
  let indicatorsContainer = null;
  if (!isSingleSlide) {
    indicatorsContainer = document.createElement('ol');
    indicatorsContainer.className = 'new-products-indicators';
    indicatorsContainer.setAttribute('role', 'tablist');
    indicatorsContainer.setAttribute('aria-label', placeholders.slideControls || 'Slide controls');
  }

  // Create slides from products
  slides.forEach((slideProducts, idx) => {
    const slide = createSlide(slideProducts, idx, sliderId);
    slidesWrapper.appendChild(slide);

    if (indicatorsContainer) {
      const indicator = document.createElement('li');
      indicator.className = 'new-products-indicator';
      indicator.dataset.targetSlide = idx;
      indicator.setAttribute('role', 'tab');
      
      const indicatorButton = document.createElement('button');
      indicatorButton.type = 'button';
      indicatorButton.setAttribute('aria-label', `${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${slides.length}`);
      
      if (idx === 0) {
        indicatorButton.setAttribute('disabled', 'true');
      }
      
      indicator.appendChild(indicatorButton);
      indicatorsContainer.appendChild(indicator);
    }
  });

  container.appendChild(slidesWrapper);
  
  // ZAWSZE DODAJEMY NAWIGACJĘ (nawet dla pojedynczego slajdu)
  container.appendChild(navigation);
  
  block.appendChild(container);
  
  if (indicatorsContainer) {
    block.appendChild(indicatorsContainer);
  }

  // Initialize first slide
  block.dataset.activeSlide = '0';
  
  if (!isSingleSlide) {
    bindEvents(block);
  }
  
  console.log(`✅ New Products Slider successfully initialized with ${slides.length} slides`);
}