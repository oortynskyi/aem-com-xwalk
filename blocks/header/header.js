import { events } from '@dropins/tools/event-bus.js';
import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { getProductLink, rootLink } from '../../scripts/commerce.js';

import { renderAuthDropdown } from './renderAuthDropdown.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

const overlay = document.createElement('div');
overlay.classList.add('overlay');
document.querySelector('header').insertAdjacentElement('afterbegin', overlay);

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = expanded || isDesktop.matches ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const headerMeta = getMetadata('header');
  const headerPath = headerMeta ? new URL(headerMeta, window.location).pathname : '/header';
  const fragment = await loadFragment(headerPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'search-bar', 'important-links', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  /** Logo */
  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  /** Search Bar */
  const navSearchBar = nav.querySelector('.nav-search-bar');

  const searchPlaceholder = navSearchBar.querySelector('.default-content-wrapper > p').textContent ?? 'Search...';
  navSearchBar.innerHTML = `
  <div class="search-bar-wrapper">
    <form class="search-bar-form">
      <button class="search-bar-button" type="submit"></button>
      <input class="search-bar-input" placeholder="${searchPlaceholder}" name="search"/>
    </form>
    <div class="search-bar-result-panel" style="display: none;"></div>
  </div>
  `;

  const searchWrapper = navSearchBar.querySelector('.search-bar-wrapper');
  const searchForm = searchWrapper.querySelector('.search-bar-form');
  const searchInput = searchWrapper.querySelector('.search-bar-input');
  const searchResultPanel = searchWrapper.querySelector('.search-bar-result-panel');

  // variables for Search Bar and Search Result Panel
  let searchModulesLoaded = false;
  let searchApi;
  let searchRender;
  let SearchResults;
  const minPhraseLen = 3;
  const searchProductsCount = 4;

  async function loadSearchModules() {
    if (searchModulesLoaded) return;

    await import('../../scripts/initializers/search.js');

    [
      { search: searchApi },
      { render: searchRender },
      { SearchResults },
    ] = await Promise.all([
      import('@dropins/storefront-product-discovery/api.js'),
      import('@dropins/storefront-product-discovery/render.js'),
      import('@dropins/storefront-product-discovery/containers/SearchResults.js'),
    ]);

    searchModulesLoaded = true;
  }

  async function initSearchResults() {
    await loadSearchModules();

    searchRender.render(SearchResults, {
      skeletonCount: searchProductsCount,
      scope: 'popover',
      routeProduct: ({ urlKey, sku }) => getProductLink(urlKey, sku),
      onSearchResult: (results) => {
        searchResultPanel.style.display = results.length > 0 ? 'block' : 'none';
      },
    })(searchResultPanel);
  }

  searchInput.addEventListener('input', async (e) => {
    const phrase = e.target.value.trim();

    await initSearchResults();

    if (!phrase) {
      searchApi(null, { scope: 'popover' });
      searchResultPanel.style.display = 'none';
      return;
    }

    if (phrase.length < minPhraseLen) return;

    searchApi({ phrase, pageSize: searchProductsCount }, { scope: 'popover' });
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const phrase = searchInput.value.trim();
    if (!phrase) return;

    window.location.href = `${rootLink('/search')}?q=${encodeURIComponent(phrase)}`;
  });

  /** Important Links */
  const navImportantLinks = nav.querySelector('.nav-important-links');
  if (navImportantLinks) {
    const importantLinksIcons = ['cloud-download-blue', 'map-pin-blue'];
    const navImportantLinksUl = navImportantLinks.querySelector(':scope .default-content-wrapper > ul');

    navImportantLinksUl
      .querySelectorAll(':scope li')
      .forEach((navImportantLink, idx) => {
        const iconImg = document.createElement('img');
        iconImg.src = `../../icons/${importantLinksIcons[idx]}.svg`;
        iconImg.alt = 'icon';

        const linkNode = navImportantLink.querySelector('a');
        if (linkNode) {
          linkNode.prepend(iconImg);
        } else {
          navImportantLink.prepend(iconImg);
        }
      });

    const authLi = document.createElement('li');
    navImportantLinksUl.append(authLi);
    renderAuthDropdown(authLi);
  }

  /** Mini Cart */
  const navTools = nav.querySelector('.nav-tools');

  const minicart = document.createRange().createContextualFragment(`
    <div class="minicart-wrapper nav-tools-wrapper">
      <button type="button" class="nav-cart-button" aria-label="Cart">
        <div class="nav-cart-icon">
          <img src="../../icons/cart.svg" alt="icon" />
        </div>
        <div class="nav-cart-value">
          <span id="mini-cart-total-value">0.00 zł</span>
          <span>netto</span>
        </div>
      </button>
      <div class="minicart-panel nav-tools-panel"></div>
    </div>
  `);

  navTools.append(minicart);

  const minicartWrapper = navTools.querySelector('.minicart-wrapper');
  const minicartPanel = navTools.querySelector('.minicart-panel');
  const cartButton = navTools.querySelector('.nav-cart-button');

  // cart price update (and initializing when loading the page)
  events.on('cart/data', (cart) => {
    const minicartValueSpan = minicartWrapper.querySelector('#mini-cart-total-value');
    const updatedValue = cart?.subtotal?.excludingTax?.value;
    const updatedCurrency = cart?.subtotal?.excludingTax?.currency;
    if (minicartValueSpan && updatedValue && updatedCurrency) minicartValueSpan.textContent = `${updatedValue} ${updatedCurrency}`;
  });

  /**
   * Handles loading states for navigation panels with state management
   *
   * @param {HTMLElement} panel - The panel element to manage loading state for
   * @param {HTMLElement} button - The button that triggers the panel
   * @param {Function} loader - Async function to execute during loading
   */
  async function withLoadingState(panel, button, loader) {
    if (panel.dataset.loaded === 'true' || panel.dataset.loading === 'true') return;

    button.setAttribute('aria-busy', 'true');
    panel.dataset.loading = 'true';

    try {
      await loader();
      panel.dataset.loaded = 'true';
    } finally {
      panel.dataset.loading = 'false';
      button.removeAttribute('aria-busy');

      // Execute pending toggle if exists
      if (panel.dataset.pendingToggle === 'true') {
        // eslint-disable-next-line no-nested-ternary
        const pendingState = panel.dataset.pendingState === 'true' ? true : (panel.dataset.pendingState === 'false' ? false : undefined);

        // Clear pending flags
        panel.removeAttribute('data-pending-toggle');
        panel.removeAttribute('data-pending-state');

        // Execute the pending toggle
        const show = pendingState ?? !panel.classList.contains('nav-tools-panel--show');
        panel.classList.toggle('nav-tools-panel--show', show);
      }
    }
  }

  function togglePanel(panel, state) {
    // If loading is in progress, queue the toggle action
    if (panel.dataset.loading === 'true') {
      // Store the pending toggle action
      panel.dataset.pendingToggle = 'true';
      panel.dataset.pendingState = state !== undefined ? state.toString() : '';
      return;
    }

    const show = state ?? !panel.classList.contains('nav-tools-panel--show');
    panel.classList.toggle('nav-tools-panel--show', show);
  }

  // Lazy loading for mini cart fragment
  async function loadMiniCartFragment() {
    await withLoadingState(minicartPanel, cartButton, async () => {
      const miniCartMeta = getMetadata('mini-cart');
      const miniCartPath = miniCartMeta ? new URL(miniCartMeta, window.location).pathname : '/mini-cart';
      const miniCartFragment = await loadFragment(miniCartPath);
      minicartPanel.append(miniCartFragment.firstElementChild);
    });
  }

  async function toggleMiniCart(state) {
    if (state) {
      await loadMiniCartFragment();
      const { publishShoppingCartViewEvent } = await import('@dropins/storefront-cart/api.js');
      publishShoppingCartViewEvent();
    }

    togglePanel(minicartPanel, state);
  }

  cartButton.addEventListener('click', () => toggleMiniCart(!minicartPanel.classList.contains('nav-tools-panel--show')));

  // Close panels when clicking outside
  document.addEventListener('click', (e) => {
    // Check if undo is enabled for mini cart
    const miniCartElement = document.querySelector(
      '[data-block-name="commerce-mini-cart"]',
    );
    const undoEnabled = miniCartElement
      && (miniCartElement.textContent?.includes('undo-remove-item')
        || miniCartElement.innerHTML?.includes('undo-remove-item'));

    // For mini cart: if undo is enabled, be more restrictive about when to close
    const shouldCloseMiniCart = undoEnabled
      ? !minicartPanel.contains(e.target)
      && !cartButton.contains(e.target)
      && !e.target.closest('header')
      : !minicartPanel.contains(e.target) && !cartButton.contains(e.target);

    if (shouldCloseMiniCart) {
      toggleMiniCart(false);
    }

    if (!searchWrapper.contains(e.target)) {
      searchResultPanel.style.display = 'none';
    }
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  window.addEventListener('resize', () => {
    navWrapper.classList.remove('active');
    overlay.classList.remove('show');
    toggleMenu(nav, false);
  });

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => {
    navWrapper.classList.toggle('active');
    overlay.classList.toggle('show');
    toggleMenu(nav);
  });
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, isDesktop.matches));
}
