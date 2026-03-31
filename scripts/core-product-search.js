import { events } from '@dropins/tools/event-bus.js';
import { CORE_FETCH_GRAPHQL } from './commerce.js';

const SEARCH_RESULT_TEMPLATE = {
  facets: [],
  items: [],
  pageInfo: {
    currentPage: 0,
    totalPages: 0,
    totalItems: 0,
    pageSize: 0,
  },
  suggestions: [],
  totalCount: 0,
  metadata: {
    filterableAttributes: [],
    sortableAttributes: [],
  },
};

const PRODUCTS_QUERY = `
  query CoreProducts(
    $search: String
    $filter: ProductAttributeFilterInput
    $pageSize: Int
    $currentPage: Int
    $sort: ProductAttributeSortInput
  ) {
    products(
      search: $search
      filter: $filter
      pageSize: $pageSize
      currentPage: $currentPage
      sort: $sort
    ) {
      total_count
      aggregations {
        attribute_code
        label
        count
        options {
          label
          value
          count
        }
      }
      items {
        __typename
        name
        sku
        url_key
        short_description {
          html
        }
        small_image {
          url
          label
        }
        price_range {
          minimum_price {
            regular_price {
              value
              currency
            }
            final_price {
              value
              currency
            }
          }
          maximum_price {
            regular_price {
              value
              currency
            }
            final_price {
              value
              currency
            }
          }
        }
      }
      page_info {
        current_page
        page_size
        total_pages
      }
      sort_fields {
        default
        options {
          label
          value
        }
      }
    }
  }
`;

const CATEGORY_BY_PATH_QUERY = `
  query CategoryByPath($filters: CategoryFilterInput) {
    categoryList(filters: $filters) {
      id
      url_path
      url_key
    }
  }
`;

const categoryPathCache = new Map();

function getScope(options = {}) {
  return options.scope === 'search' ? undefined : options.scope;
}

function cloneResultTemplate() {
  return {
    ...SEARCH_RESULT_TEMPLATE,
    pageInfo: { ...SEARCH_RESULT_TEMPLATE.pageInfo },
    metadata: {
      ...SEARCH_RESULT_TEMPLATE.metadata,
    },
  };
}

function toPriceValue(price) {
  return {
    amount: {
      value: price?.value ?? 0,
      currency: price?.currency || 'USD',
    },
  };
}

function mapProduct(product) {
  const minPrice = product?.price_range?.minimum_price;
  const maxPrice = product?.price_range?.maximum_price;
  const isComplexProduct = product?.__typename && product.__typename !== 'SimpleProduct';

  return {
    id: product?.sku || '',
    name: product?.name || '',
    sku: product?.sku || '',
    shortDescription: product?.short_description?.html || '',
    urlKey: product?.url_key || '',
    url: '',
    images: product?.small_image?.url ? [{
      label: product.small_image.label || product.name || '',
      roles: [],
      url: product.small_image.url,
    }] : [],
    price: {
      final: toPriceValue(minPrice?.final_price),
      regular: toPriceValue(minPrice?.regular_price),
      roles: [],
    },
    priceRange: {
      minimum: {
        final: toPriceValue(minPrice?.final_price),
        regular: toPriceValue(minPrice?.regular_price),
      },
      maximum: {
        final: toPriceValue(maxPrice?.final_price),
        regular: toPriceValue(maxPrice?.regular_price),
      },
    },
    inStock: product?.stock_status === 'IN_STOCK',
    typename: isComplexProduct ? 'ComplexProductView' : 'SimpleProductView',
  };
}

function isRangeBucket(attribute, optionValue) {
  return attribute === 'price' && /^\d+(\.\d+)?_\d+(\.\d+)?$/.test(optionValue);
}

function parseBucket(attribute, option) {
  if (isRangeBucket(attribute, option.value)) {
    const [from, to] = option.value.split('_').map(Number);
    return {
      __typename: 'RangeBucket',
      title: option.label || `${from}-${to}`,
      value: option.value,
      from,
      to,
      count: option.count || 0,
    };
  }

  return {
    __typename: 'ScalarBucket',
    title: option.label,
    value: option.value,
    count: option.count || 0,
  };
}

function normalizeSelectedState(facets, requestFilters = []) {
  const selectedFilters = requestFilters.filter((filter) => (
    filter?.attribute
    && filter.attribute !== 'visibility'
    && filter.attribute !== 'categoryPath'
  ));

  return facets.map((facet) => ({
    ...facet,
    buckets: facet.buckets.map((bucket) => {
      const match = selectedFilters.find((filter) => filter.attribute === facet.attribute);

      if (!match) {
        return { ...bucket, selected: false };
      }

      if (bucket.__typename === 'RangeBucket' && match.range) {
        return {
          ...bucket,
          selected: bucket.from === match.range.from && bucket.to === match.range.to,
        };
      }

      return {
        ...bucket,
        selected: Array.isArray(match.in) && match.in.includes(bucket.value),
      };
    }),
  }));
}

function mapAggregations(aggregations = [], requestFilters = []) {
  const facets = aggregations
    .filter((aggregation) => aggregation?.options?.length)
    .map((aggregation) => ({
      title: aggregation.label,
      attribute: aggregation.attribute_code,
      buckets: aggregation.options.map((option) => parseBucket(aggregation.attribute_code, option)),
    }));

  return normalizeSelectedState(facets, requestFilters);
}

function mapSortOptions(sortFields) {
  return (sortFields?.options || []).map((option) => ({
    label: option.label,
    attribute: option.value,
    numeric: option.value === 'price',
    bidirectional: option.value !== 'position',
  }));
}

async function resolveCategoryPathToId(path) {
  const normalizedPath = String(path || '').replace(/^\/|\/$/g, '');

  if (!normalizedPath) return null;
  if (/^\d+$/.test(normalizedPath)) return normalizedPath;
  if (categoryPathCache.has(normalizedPath)) return categoryPathCache.get(normalizedPath);

  const lookups = [
    { url_path: { eq: normalizedPath } },
    { url_key: { eq: normalizedPath.split('/').pop() } },
  ];

  const responses = await Promise.all(lookups.map((filters) => CORE_FETCH_GRAPHQL.fetchGraphQl(
    CATEGORY_BY_PATH_QUERY,
    {
      method: 'POST',
      variables: { filters },
    },
  ).catch(() => null)));

  const categoryMatch = responses.find((response) => (
    response
    && !response.errors?.length
    && response.data?.categoryList?.[0]?.id
  ));

  if (categoryMatch) {
    const categoryId = String(categoryMatch.data.categoryList[0].id);
    categoryPathCache.set(normalizedPath, categoryId);
    return categoryId;
  }

  categoryPathCache.set(normalizedPath, null);
  return null;
}

function mergeFilterClause(filterInput, attribute, clause) {
  const currentValue = filterInput[attribute] || {};
  filterInput[attribute] = {
    ...currentValue,
    ...clause,
  };
}

async function buildCoreVariables(request = {}) {
  const requestFilters = Array.isArray(request.filter) ? request.filter : [];
  const filterInput = {};

  const resolvedFilters = await Promise.all(requestFilters.map(async (filter) => {
    if (!filter?.attribute || filter.attribute === 'visibility') {
      return null;
    }

    if (filter.attribute === 'categoryPath') {
      const categoryPath = filter.eq || filter.in?.[0];
      const categoryId = await resolveCategoryPathToId(categoryPath);

      if (categoryId) {
        return {
          attribute: 'category_id',
          clause: { eq: categoryId },
        };
      }

      if (!request.phrase) {
        return {
          fallbackPhrase: String(categoryPath || '')
            .split('/')
            .pop()
            .replace(/-/g, ' '),
        };
      }

      return null;
    }

    if (filter.range) {
      return {
        attribute: filter.attribute,
        clause: {
          from: String(filter.range.from),
          to: String(filter.range.to),
        },
      };
    }

    if (filter.eq) {
      return {
        attribute: filter.attribute,
        clause: { eq: String(filter.eq) },
      };
    }

    if (Array.isArray(filter.in) && filter.in.length > 0) {
      return {
        attribute: filter.attribute,
        clause: {
          in: filter.in.map(String),
        },
      };
    }

    return null;
  }));

  const fallbackPhrase = resolvedFilters.find((entry) => entry?.fallbackPhrase)?.fallbackPhrase || '';

  resolvedFilters
    .filter((entry) => entry?.attribute && entry?.clause)
    .forEach((entry) => {
      mergeFilterClause(filterInput, entry.attribute, entry.clause);
    });

  const sortInput = {};
  const [primarySort] = Array.isArray(request.sort) ? request.sort : [];

  if (primarySort?.attribute && primarySort.attribute !== 'position') {
    sortInput[primarySort.attribute] = primarySort.direction || 'ASC';
  }

  return {
    search: request.phrase || fallbackPhrase || undefined,
    filter: Object.keys(filterInput).length ? filterInput : undefined,
    pageSize: request.pageSize || 8,
    currentPage: request.currentPage || 1,
    sort: Object.keys(sortInput).length ? sortInput : undefined,
  };
}

function mapProductsResponse(data, request) {
  const products = data?.products;

  return {
    facets: mapAggregations(products?.aggregations || [], request.filter),
    items: (products?.items || []).map(mapProduct),
    pageInfo: {
      currentPage: products?.page_info?.current_page || request.currentPage || 1,
      totalPages: products?.page_info?.total_pages || 0,
      totalItems: products?.total_count || 0,
      pageSize: products?.page_info?.page_size || request.pageSize || 0,
    },
    suggestions: [],
    totalCount: products?.total_count || 0,
    metadata: {
      filterableAttributes: [],
      sortableAttributes: mapSortOptions(products?.sort_fields),
      defaultSortAttribute: products?.sort_fields?.default || 'position',
    },
  };
}

export async function searchProducts(request = null, options = {}) {
  const scope = getScope(options);
  const emptyResult = cloneResultTemplate();
  const baseRequest = request || {};

  if (request === null) {
    events.emit('search/result', {
      request: baseRequest,
      result: emptyResult,
    }, { scope });
    return emptyResult;
  }

  events.emit('search/loading', true, { scope });

  try {
    const variables = await buildCoreVariables(baseRequest);
    const effectiveRequest = {
      ...baseRequest,
      phrase: baseRequest.phrase || '',
      currentPage: variables.currentPage,
      pageSize: variables.pageSize,
      sort: Array.isArray(baseRequest.sort) ? baseRequest.sort : [],
      filter: Array.isArray(baseRequest.filter) ? baseRequest.filter : [],
    };

    if (!variables.search && !variables.filter) {
      events.emit('search/result', {
        request: effectiveRequest,
        result: emptyResult,
      }, { scope });
      return emptyResult;
    }

    const { data, errors } = await CORE_FETCH_GRAPHQL.fetchGraphQl(PRODUCTS_QUERY, {
      method: 'POST',
      variables,
    });

    if (errors?.length) {
      throw new Error(errors[0].message || 'Error fetching products');
    }

    const result = mapProductsResponse(data, effectiveRequest);

    events.emit('search/result', {
      request: effectiveRequest,
      result,
    }, { scope });

    return result;
  } catch (error) {
    const message = error?.message || 'Error fetching products';

    events.emit('search/error', message, { scope });
    events.emit('search/result', {
      request: baseRequest,
      result: emptyResult,
    }, { scope });

    throw error;
  } finally {
    events.emit('search/loading', false, { scope });
  }
}
