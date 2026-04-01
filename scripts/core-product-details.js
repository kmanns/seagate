import { CORE_FETCH_GRAPHQL, getProductLink } from './commerce.js';

const CORE_PRODUCT_QUERY = `
  query CoreProductBySku($sku: String!) {
    products(filter: { sku: { eq: $sku } }) {
      items {
        id
        __typename
        sku
        name
        url_key
        meta_title
        meta_keyword
        meta_description
        stock_status
        short_description {
          html
        }
        description {
          html
        }
        image {
          url
          label
        }
        small_image {
          url
          label
        }
        thumbnail {
          url
          label
        }
        media_gallery {
          url
          label
          position
          disabled
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
        }
      }
    }
  }
`;

function normalizeCurrency(code) {
  if (typeof code !== 'string' || !code) return 'USD';

  if (typeof Intl?.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('currency').includes(code) ? code : 'USD';
  }

  return code;
}

function mapImages(product) {
  const galleryImages = (product?.media_gallery || [])
    .filter((image) => image?.url && !image.disabled)
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((image) => ({
      url: image.url.replace(/^https?:/, ''),
      label: image.label || product?.name || '',
      width: 960,
      height: 1191,
    }));

  if (galleryImages.length > 0) {
    return galleryImages;
  }

  const fallbackImages = [product?.image, product?.small_image, product?.thumbnail]
    .filter((image, index, images) => image?.url
      && images.findIndex((candidate) => candidate?.url === image.url) === index)
    .map((image) => ({
      url: image.url.replace(/^https?:/, ''),
      label: image.label || product?.name || '',
      width: 960,
      height: 1191,
    }));

  return fallbackImages;
}

function mapPrices(product) {
  const minimumPrice = product?.price_range?.minimum_price;
  const regularAmount = minimumPrice?.regular_price?.value;
  const finalAmount = minimumPrice?.final_price?.value;
  const currency = normalizeCurrency(
    minimumPrice?.final_price?.currency || minimumPrice?.regular_price?.currency,
  );
  const visible = regularAmount != null || finalAmount != null;
  const resolvedFinalAmount = finalAmount ?? regularAmount;
  const hasDiscountedPrice = regularAmount != null
    && resolvedFinalAmount != null
    && regularAmount !== resolvedFinalAmount;

  return {
    regular: {
      ...(regularAmount != null ? { amount: regularAmount } : {}),
      currency,
      variant: hasDiscountedPrice ? 'strikethrough' : 'default',
    },
    final: {
      ...(resolvedFinalAmount != null ? { amount: resolvedFinalAmount } : {}),
      currency,
      variant: 'default',
    },
    tiers: [],
    visible,
  };
}

function mapProduct(product) {
  if (!product?.sku) return null;

  return {
    name: product.name || '',
    sku: product.sku,
    isBundle: false,
    addToCartAllowed: true,
    inStock: product.stock_status === 'IN_STOCK',
    shortDescription: product.short_description?.html || '',
    metaDescription: product.meta_description || '',
    metaKeyword: product.meta_keyword || '',
    metaTitle: product.meta_title || '',
    description: product.description?.html || '',
    images: mapImages(product),
    prices: mapPrices(product),
    attributes: [],
    options: [],
    optionUIDs: [],
    url: getProductLink(product.url_key, product.sku),
    urlKey: product.url_key || '',
    externalId: product.id != null ? String(product.id) : '',
    productType: product.__typename === 'SimpleProduct' ? 'simple' : 'complex',
  };
}

export async function fetchCoreProductDetails(sku) {
  if (!sku) return null;

  const { data, errors } = await CORE_FETCH_GRAPHQL.fetchGraphQl(CORE_PRODUCT_QUERY, {
    method: 'POST',
    variables: { sku },
  });

  if (errors?.length) {
    throw new Error(errors[0].message || 'Error fetching product details');
  }

  return mapProduct(data?.products?.items?.[0]);
}
