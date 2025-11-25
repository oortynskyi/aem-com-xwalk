import { fetchPlaceholders, fetchProducts } from '../../scripts/commerce.js';

function updateActiveSlide(slide) {
  const block = slide.closest('.new-products-slider');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.new-products-slide');
  const indicators = block.querySelectorAll('.new-products-indicator');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
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

function parseConfiguration(block) {
  const config = {
    productsPerSlide: 4,
    totalProducts: 8
  };
  
  const textContent = block.textContent || '';
  
  // Format tabeli
  const tableMatch = textContent.match(/\|\s*Produkty na slajd\s*\|\s*(\d+)\s*\|/i);
  if (tableMatch) {
    config.productsPerSlide = parseInt(tableMatch[1]);
  }
  
  const totalTableMatch = textContent.match(/\|\s*Łączna liczba produktów\s*\|\s*(\d+)\s*\|/i);
  if (totalTableMatch) {
    config.totalProducts = parseInt(totalTableMatch[1]);
  }
  
  return config;
}

function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'new-products-card';
  
  // Image
  const imageContainer = document.createElement('div');
  imageContainer.className = 'new-products-image';
  
  const image = document.createElement('img');
  image.src = product.image;
  image.alt = product.name;
  image.loading = 'lazy';
  imageContainer.appendChild(image);
  
  // Badge for new products
  if (product.isNew) {
    const badge = document.createElement('span');
    badge.className = 'new-products-badge';
    badge.textContent = 'New';
    imageContainer.appendChild(badge);
  }
  
  // Stock status badge
  if (!product.inStock) {
    const outOfStockBadge = document.createElement('span');
    outOfStockBadge.className = 'new-products-badge out-of-stock';
    outOfStockBadge.textContent = 'Out of Stock';
    outOfStockBadge.style.backgroundColor = '#666';
    imageContainer.appendChild(outOfStockBadge);
  }
  
  card.appendChild(imageContainer);
  
  // Content
  const content = document.createElement('div');
  content.className = 'new-products-content';
  
  // Title
  const title = document.createElement('h3');
  title.className = 'new-products-title';
  title.textContent = product.name;
  content.appendChild(title);
  
  // Price
  const priceContainer = document.createElement('div');
  priceContainer.className = 'new-products-price';
  
  if (product.originalPrice) {
    const originalPrice = document.createElement('span');
    originalPrice.className = 'new-products-original-price';
    originalPrice.textContent = product.originalPrice;
    priceContainer.appendChild(originalPrice);
  }
  
  const currentPrice = document.createElement('span');
  currentPrice.className = 'new-products-current-price';
  currentPrice.textContent = product.formattedPrice || product.price;
  priceContainer.appendChild(currentPrice);
  
  content.appendChild(priceContainer);
  
  // Button
  const button = document.createElement('a');
  button.href = product.url;
  button.className = 'new-products-button';
  button.textContent = 'View Product';
  
  if (!product.inStock) {
    button.style.opacity = '0.6';
    button.style.pointerEvents = 'none';
  }
  
  content.appendChild(button);
  
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
  
  // Parse configuration from text content
  const config = parseConfiguration(block);
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

  // Create navigation
  const navigation = document.createElement('div');
  navigation.className = 'new-products-navigation';
  
  const prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.className = 'new-products-prev';
  prevButton.setAttribute('aria-label', placeholders.previousSlide || 'Previous Slide');
  
  const prevSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  prevSvg.setAttribute('width', '24');
  prevSvg.setAttribute('height', '24');
  prevSvg.setAttribute('viewBox', '0 0 24 24');
  prevSvg.setAttribute('fill', 'none');
  
  const prevPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  prevPath.setAttribute('d', 'M15 18L9 12L15 6');
  prevPath.setAttribute('stroke', 'currentColor');
  prevPath.setAttribute('stroke-width', '2');
  
  prevSvg.appendChild(prevPath);
  prevButton.appendChild(prevSvg);
  
  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'new-products-next';
  nextButton.setAttribute('aria-label', placeholders.nextSlide || 'Next Slide');
  
  const nextSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  nextSvg.setAttribute('width', '24');
  nextSvg.setAttribute('height', '24');
  nextSvg.setAttribute('viewBox', '0 0 24 24');
  nextSvg.setAttribute('fill', 'none');
  
  const nextPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  nextPath.setAttribute('d', 'M9 18L15 12L9 6');
  nextPath.setAttribute('stroke', 'currentColor');
  nextPath.setAttribute('stroke-width', '2');
  
  nextSvg.appendChild(nextPath);
  nextButton.appendChild(nextSvg);
  
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

  // Set CSS variable for products per slide
  slidesWrapper.style.setProperty('--products-per-slide', productsPerSlide);

  container.appendChild(slidesWrapper);
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