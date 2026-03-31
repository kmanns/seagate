import SearchResults from '@dropins/storefront-product-discovery/containers/SearchResults.js';
import { render as provider } from '@dropins/storefront-product-discovery/render.js';
import { Button, Icon, provider as UI } from '@dropins/tools/components.js';
import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';
import * as cartApi from '@dropins/storefront-cart/api.js';
import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';
import { events } from '@dropins/tools/event-bus.js';
import { readBlockConfig } from '../../scripts/aem.js';
import { fetchPlaceholders, getProductLink } from '../../scripts/commerce.js';
import { searchProducts } from '../../scripts/core-product-search.js';

import '../../scripts/initializers/search.js';
import '../../scripts/initializers/wishlist.js';

const PAGE_SIZE = 8;
const NON_USER_FILTERS = new Set(['visibility', 'categoryPath']);

function getSortFromParams(sortParam) {
  if (!sortParam) return [];

  return sortParam.split(',')
    .map((item) => {
      const [attribute, direction] = item.split('_');
      return {
        attribute,
        direction,
      };
    });
}

function getParamsFromSort(sort) {
  if (!Array.isArray(sort) || sort.length === 0) return '';

  return sort.map((item) => `${item.attribute}_${item.direction}`)
    .join(',');
}

function getFilterFromParams(filterParam) {
  if (!filterParam) return [];

  const decodedParam = decodeURIComponent(filterParam);
  const results = [];
  const filters = decodedParam.split('|');

  filters.forEach((filter) => {
    if (!filter.includes(':')) return;

    const [attribute, value] = filter.split(':');
    const commaRegex = /,(?!\s)/;

    if (commaRegex.test(value)) {
      results.push({
        attribute,
        in: value.split(commaRegex),
      });
    } else if (value.includes('-')) {
      const [from, to] = value.split('-');
      results.push({
        attribute,
        range: {
          from: Number(from),
          to: Number(to),
        },
      });
    } else {
      results.push({
        attribute,
        in: [value],
      });
    }
  });

  return results;
}

function getParamsFromFilter(filter) {
  if (!Array.isArray(filter) || filter.length === 0) return '';

  return filter.map(({
    attribute,
    in: inValues,
    range,
  }) => {
    if (inValues) {
      return `${attribute}:${inValues.join(',')}`;
    }

    if (range) {
      return `${attribute}:${range.from}-${range.to}`;
    }

    return null;
  })
    .filter(Boolean)
    .join('|');
}

function countUserFilters(filters = []) {
  return filters
    .filter((filter) => filter?.attribute && !NON_USER_FILTERS.has(filter.attribute))
    .length;
}

function getSelectedSortValue(searchState) {
  const [sort] = searchState.currentRequest.sort || [];

  if (sort?.attribute) {
    return `${sort.attribute}_${sort.direction || 'ASC'}`;
  }

  const defaultAttribute = searchState.currentResult?.metadata?.defaultSortAttribute;

  return defaultAttribute ? `${defaultAttribute}_DESC` : '';
}

function updateUrlFromPayload(payload) {
  const url = new URL(window.location.href);
  const userFilters = (payload.request?.filter || [])
    .filter((filter) => filter?.attribute && !NON_USER_FILTERS.has(filter.attribute));
  const filterParam = getParamsFromFilter(userFilters);
  const sortParam = getParamsFromSort(payload.request?.sort);

  if (payload.request?.phrase) {
    url.searchParams.set('q', payload.request.phrase);
  } else {
    url.searchParams.delete('q');
  }

  if (payload.request?.currentPage) {
    url.searchParams.set('page', payload.request.currentPage);
  } else {
    url.searchParams.delete('page');
  }

  if (sortParam) {
    url.searchParams.set('sort', sortParam);
  } else {
    url.searchParams.delete('sort');
  }

  if (filterParam) {
    url.searchParams.set('filter', filterParam);
  } else {
    url.searchParams.delete('filter');
  }

  window.history.pushState({}, '', url.toString());
}

function renderSortControl(container, searchState, onSortChange) {
  const sortOptions = searchState.currentResult?.metadata?.sortableAttributes || [];

  container.innerHTML = '';

  if (sortOptions.length === 0) return;

  const wrapper = document.createElement('label');
  wrapper.className = 'search__sort-control';

  const label = document.createElement('span');
  label.className = 'search__sort-label';
  label.textContent = 'Sort by';

  const select = document.createElement('select');
  select.className = 'search__sort-select';

  sortOptions.forEach((option) => {
    const directions = option.bidirectional ? ['ASC', 'DESC'] : ['DESC'];

    directions.forEach((direction) => {
      const element = document.createElement('option');
      let directionSuffix = '';

      if (option.bidirectional) {
        directionSuffix = direction === 'ASC' ? ': Low to High' : ': High to Low';
      }

      element.value = `${option.attribute}_${direction}`;
      element.textContent = `${option.label}${directionSuffix}`;
      select.appendChild(element);
    });
  });

  select.value = getSelectedSortValue(searchState);
  select.addEventListener('change', (event) => {
    const [attribute, direction] = event.target.value.split('_');

    onSortChange([{
      attribute,
      direction,
    }]);
  });

  wrapper.append(label, select);
  container.append(wrapper);
}

function createFacetInput(facet, bucket, onFacetToggle) {
  const wrapper = document.createElement('label');
  wrapper.className = 'search__facet-option';

  const input = document.createElement('input');
  input.type = bucket.__typename === 'RangeBucket' ? 'radio' : 'checkbox';
  input.name = `facet-${facet.attribute}`;
  input.checked = !!bucket.selected;

  const filterValue = bucket.__typename === 'RangeBucket'
    ? JSON.stringify({ from: bucket.from, to: bucket.to })
    : bucket.value;

  input.value = filterValue;
  input.addEventListener('change', () => {
    onFacetToggle(facet.attribute, bucket, input.checked);
  });

  const text = document.createElement('span');
  text.textContent = `${bucket.title} (${bucket.count})`;

  wrapper.append(input, text);
  return wrapper;
}

function renderFacets(container, searchState, onFacetToggle, onClearAll) {
  const facets = searchState.currentResult?.facets || [];
  const selectedCount = countUserFilters(searchState.currentRequest.filter);

  container.innerHTML = '';

  if (selectedCount > 0) {
    const clearAll = document.createElement('button');
    clearAll.type = 'button';
    clearAll.className = 'search__facets-clear';
    clearAll.textContent = 'Clear all filters';
    clearAll.addEventListener('click', onClearAll);
    container.append(clearAll);
  }

  facets.forEach((facet) => {
    if (!facet.buckets?.length) return;

    const section = document.createElement('section');
    section.className = 'search__facet-group';

    const heading = document.createElement('h3');
    heading.className = 'search__facet-title';
    heading.textContent = facet.title;

    const options = document.createElement('div');
    options.className = 'search__facet-options';

    facet.buckets.forEach((bucket) => {
      options.append(createFacetInput(facet, bucket, onFacetToggle));
    });

    section.append(heading, options);
    container.append(section);
  });
}

function renderPagination(container, searchState, onPageChange) {
  const pageInfo = searchState.currentResult?.pageInfo;

  container.innerHTML = '';

  if (!pageInfo || pageInfo.totalPages <= 1) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'search__pagination-controls';

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'search__pagination-button';
  previous.textContent = 'Previous';
  previous.disabled = pageInfo.currentPage <= 1;
  previous.addEventListener('click', () => onPageChange(pageInfo.currentPage - 1));

  const summary = document.createElement('span');
  summary.className = 'search__pagination-summary';
  summary.textContent = `Page ${pageInfo.currentPage} of ${pageInfo.totalPages}`;

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'search__pagination-button';
  next.textContent = 'Next';
  next.disabled = pageInfo.currentPage >= pageInfo.totalPages;
  next.addEventListener('click', () => onPageChange(pageInfo.currentPage + 1));

  wrapper.append(previous, summary, next);
  container.append(wrapper);
}

function buildInitialRequest(config, urlParams) {
  const request = {
    phrase: urlParams.q || '',
    currentPage: urlParams.page ? Number(urlParams.page) : 1,
    pageSize: PAGE_SIZE,
    sort: getSortFromParams(urlParams.sort),
    filter: [
      {
        attribute: 'visibility',
        in: ['Search', 'Catalog, Search'],
      },
      ...getFilterFromParams(urlParams.filter),
    ],
  };

  if (config.urlpath) {
    request.phrase = '';
    request.sort = request.sort.length > 0 ? request.sort : [{
      attribute: 'position',
      direction: 'DESC',
    }];
    request.filter.unshift({
      attribute: 'categoryPath',
      eq: config.urlpath,
    });
  }

  return request;
}

function buildUpdatedFilters(currentFilters, attribute, bucket, checked) {
  const preservedFilters = currentFilters.filter((filter) => (
    filter?.attribute
    && filter.attribute !== attribute
    && NON_USER_FILTERS.has(filter.attribute)
  ));

  const otherUserFilters = currentFilters.filter((filter) => (
    filter?.attribute
    && filter.attribute !== attribute
    && !NON_USER_FILTERS.has(filter.attribute)
  ));

  if (!checked) {
    return [...preservedFilters, ...otherUserFilters];
  }

  if (bucket.__typename === 'RangeBucket') {
    return [
      ...preservedFilters,
      ...otherUserFilters,
      {
        attribute,
        range: {
          from: bucket.from,
          to: bucket.to,
        },
      },
    ];
  }

  const currentFilter = currentFilters.find((filter) => filter.attribute === attribute);
  const values = new Set(currentFilter?.in || []);
  values.add(bucket.value);

  return [
    ...preservedFilters,
    ...otherUserFilters,
    {
      attribute,
      in: [...values],
    },
  ];
}

function blockRequestPayload(searchState, patch) {
  return {
    ...searchState.currentRequest,
    ...patch,
  };
}

export default async function decorate(block) {
  const labels = await fetchPlaceholders();
  const config = readBlockConfig(block);
  const searchState = {
    currentRequest: {
      phrase: '',
      currentPage: 1,
      pageSize: PAGE_SIZE,
      sort: [],
      filter: [],
    },
    currentResult: null,
  };

  const fragment = document.createRange()
    .createContextualFragment(`
      <div class="search__wrapper">
        <div class="search__result-info"></div>
        <div class="search__view-facets"></div>
        <div class="search__facets"></div>
        <div class="search__product-sort"></div>
        <div class="search__product-list"></div>
        <div class="search__pagination"></div>
      </div>
    `);

  const $resultInfo = fragment.querySelector('.search__result-info');
  const $viewFacets = fragment.querySelector('.search__view-facets');
  const $facets = fragment.querySelector('.search__facets');
  const $productSort = fragment.querySelector('.search__product-sort');
  const $productList = fragment.querySelector('.search__product-list');
  const $pagination = fragment.querySelector('.search__pagination');

  block.innerHTML = '';
  block.appendChild(fragment);

  if (config.urlpath) {
    block.dataset.urlpath = config.urlpath;
  }

  const getAddToCartButton = (product) => {
    if (product.typename === 'ComplexProductView') {
      const button = document.createElement('div');
      UI.render(Button, {
        children: labels.Global?.AddProductToCart,
        icon: Icon({ source: 'Cart' }),
        href: getProductLink(product.urlKey, product.sku),
        variant: 'primary',
      })(button);
      return button;
    }

    const button = document.createElement('div');
    UI.render(Button, {
      children: labels.Global?.AddProductToCart,
      icon: Icon({ source: 'Cart' }),
      onClick: () => cartApi.addProductsToCart([{
        sku: product.sku,
        quantity: 1,
      }]),
      variant: 'primary',
    })(button);
    return button;
  };

  const runSearch = async (request, options = {}) => {
    const nextRequest = {
      ...request,
      pageSize: PAGE_SIZE,
    };

    searchState.currentRequest = nextRequest;
    await searchProducts(nextRequest).catch((error) => {
      console.error('Error searching for products', error);
    });

    if (options.scrollToTop) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }

    if (options.closeFacets) {
      $facets.classList.remove('search__facets--visible');
    }
  };

  const handleSortChange = async (sort) => {
    await runSearch(blockRequestPayload(searchState, {
      sort,
      currentPage: 1,
    }), { scrollToTop: true });
  };

  const handleFacetToggle = async (attribute, bucket, checked) => {
    const nextFilters = checked
      ? buildUpdatedFilters(searchState.currentRequest.filter, attribute, bucket, checked)
      : searchState.currentRequest.filter.filter((filter) => {
        if (filter.attribute !== attribute) return true;

        if (bucket.__typename === 'RangeBucket') {
          return false;
        }

        const values = (filter.in || []).filter((value) => value !== bucket.value);
        if (values.length === 0) return false;

        filter.in = values;
        return true;
      });

    await runSearch(blockRequestPayload(searchState, {
      filter: nextFilters,
      currentPage: 1,
    }), { closeFacets: true });
  };

  const clearAllFilters = async () => {
    const preservedFilters = searchState.currentRequest.filter
      .filter((filter) => NON_USER_FILTERS.has(filter.attribute));

    await runSearch(blockRequestPayload(searchState, {
      filter: preservedFilters,
      currentPage: 1,
    }), { closeFacets: true });
  };

  const handlePageChange = async (page) => {
    await runSearch(blockRequestPayload(searchState, {
      currentPage: page,
    }), { scrollToTop: true });
  };

  await Promise.all([
    UI.render(Button, {
      children: labels.Global?.Filters,
      icon: Icon({ source: 'Burger' }),
      variant: 'secondary',
      onClick: () => {
        $facets.classList.toggle('search__facets--visible');
      },
    })($viewFacets),
    provider.render(SearchResults, {
      routeProduct: (product) => getProductLink(product.urlKey, product.sku),
      slots: {
        ProductImage: (ctx) => {
          const { product, defaultImageProps } = ctx;
          const anchorWrapper = document.createElement('a');
          anchorWrapper.href = getProductLink(product.urlKey, product.sku);

          tryRenderAemAssetsImage(ctx, {
            alias: product.sku,
            imageProps: defaultImageProps,
            wrapper: anchorWrapper,
            params: {
              width: defaultImageProps.width,
              height: defaultImageProps.height,
            },
          });
        },
        ProductActions: async (ctx) => {
          const actionsWrapper = document.createElement('div');
          actionsWrapper.className = 'product-discovery-product-actions';

          const addToCartBtn = getAddToCartButton(ctx.product);
          addToCartBtn.className = 'product-discovery-product-actions__add-to-cart';

          const $wishlistToggle = document.createElement('div');
          $wishlistToggle.classList.add('product-discovery-product-actions__wishlist-toggle');
          wishlistRender.render(WishlistToggle, {
            product: ctx.product,
            variant: 'tertiary',
          })($wishlistToggle);

          actionsWrapper.appendChild(addToCartBtn);
          actionsWrapper.appendChild($wishlistToggle);

          try {
            const { initializeRequisitionList } = await import('./requisition-list.js');
            const $reqListContainer = await initializeRequisitionList({
              product: ctx.product,
              labels,
            });

            actionsWrapper.appendChild($reqListContainer);
          } catch (error) {
            console.warn('Requisition list module not available:', error);
          }

          ctx.replaceWith(actionsWrapper);
        },
      },
    })($productList),
  ]);

  events.on('search/result', (payload) => {
    searchState.currentRequest = payload.request || searchState.currentRequest;
    searchState.currentResult = payload.result || searchState.currentResult;

    const totalCount = payload.result?.totalCount || 0;
    const userFilterCount = countUserFilters(payload.request?.filter || []);

    block.classList.toggle('product-list-page--empty', totalCount === 0);

    $resultInfo.innerHTML = payload.request?.phrase
      ? `${totalCount} results found for <strong>"${payload.request.phrase}"</strong>.`
      : `${totalCount} results found.`;

    if (userFilterCount > 0) {
      $viewFacets.querySelector('button')?.setAttribute('data-count', userFilterCount);
    } else {
      $viewFacets.querySelector('button')?.removeAttribute('data-count');
    }

    renderSortControl($productSort, searchState, handleSortChange);
    renderFacets($facets, searchState, handleFacetToggle, clearAllFilters);
    renderPagination($pagination, searchState, handlePageChange);
  }, { eager: true });

  events.on('search/result', updateUrlFromPayload, { eager: false });

  const urlParams = Object.fromEntries(new URLSearchParams(window.location.search).entries());
  await runSearch(buildInitialRequest(config, urlParams));
}
