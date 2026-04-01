import {
  Button, Icon, InLineAlert, provider as UI,
} from '@dropins/tools/components.js';
import { h } from '@dropins/tools/preact.js';
import { events } from '@dropins/tools/event-bus.js';
import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';
import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';

import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
import { WishlistAlert } from '@dropins/storefront-wishlist/containers/WishlistAlert.js';

import {
  fetchPlaceholders,
  getProductLink,
  getProductSku,
  isCorePdpFallbackMode,
  loadErrorPage,
  rootLink,
  setJsonLd,
} from '../../scripts/commerce.js';
import { IMAGES_SIZES } from '../../scripts/initializers/pdp.js';
import { fetchCoreProductDetails } from '../../scripts/core-product-details.js';

import '../../scripts/initializers/cart.js';
import '../../scripts/initializers/wishlist.js';

function isProductPrerendered() {
  const jsonLdScript = document.querySelector('script[type="application/ld+json"]');

  if (!jsonLdScript?.textContent) {
    return false;
  }

  try {
    const jsonLd = JSON.parse(jsonLdScript.textContent);
    return jsonLd?.['@type'] === 'Product';
  } catch (error) {
    console.debug('Failed to parse JSON-LD:', error);
    return false;
  }
}

function updateAddToCartButtonText(addToCartInstance, inCart, labels) {
  const buttonText = inCart
    ? labels.Global?.UpdateProductInCart
    : labels.Global?.AddProductToCart;

  if (addToCartInstance) {
    addToCartInstance.setProps((prev) => ({
      ...prev,
      children: buttonText,
    }));
  }
}

function getPriceAmount(price = {}) {
  const {
    minimumAmount,
    amount,
    value,
    currency,
  } = price;

  const resolvedValue = minimumAmount ?? amount ?? value;

  if (resolvedValue == null) {
    return null;
  }

  return { value: resolvedValue, currency };
}

function formatPrice(price = {}) {
  const amount = getPriceAmount(price);

  if (!amount) {
    return '';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: amount.currency || 'USD',
    }).format(amount.value);
  } catch (error) {
    return `${amount.currency || 'USD'} ${amount.value}`;
  }
}

function createMetaTag(property, content, type) {
  if (!property || !type) {
    return;
  }

  let meta = document.head.querySelector(`meta[${type}="${property}"]`);
  if (meta) {
    if (!content) {
      meta.remove();
      return;
    }

    meta.setAttribute(type, property);
    meta.setAttribute('content', content);
    return;
  }

  if (!content) {
    return;
  }

  meta = document.createElement('meta');
  meta.setAttribute(type, property);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
}

function setMetaTags(product) {
  if (!product?.sku) {
    return;
  }

  const price = getPriceAmount(product?.prices?.final);
  const mainImage = product?.images?.[0]?.url;

  createMetaTag('title', product.metaTitle || product.name, 'name');
  createMetaTag('description', product.metaDescription || product.shortDescription, 'name');
  createMetaTag('keywords', product.metaKeyword, 'name');

  createMetaTag('og:type', 'product', 'property');
  createMetaTag('og:description', product.shortDescription || product.metaDescription, 'property');
  createMetaTag('og:title', product.metaTitle || product.name, 'property');
  createMetaTag('og:url', window.location.href, 'property');
  createMetaTag('og:image', mainImage, 'property');
  createMetaTag('og:image:secure_url', mainImage, 'property');
  createMetaTag('product:price:amount', price?.value, 'property');
  createMetaTag('product:price:currency', price?.currency, 'property');
}

function setJsonLdProduct(product) {
  const price = getPriceAmount(product?.prices?.final);
  const brand = product?.attributes?.find((attr) => attr.name === 'brand');

  const ldJson = {
    '@context': 'http://schema.org',
    '@type': 'Product',
    '@id': new URL(getProductLink(product.urlKey, product.sku), window.location).toString(),
    name: product.name,
    description: product.description || product.shortDescription || product.metaDescription,
    image: product.images?.map((image) => image.url) || [],
    brand: brand?.value ? {
      '@type': 'Brand',
      name: brand.value,
    } : undefined,
    offers: {
      '@type': 'Offer',
      availability: product.inStock ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock',
      price: price?.value,
      priceCurrency: price?.currency,
      url: window.location.href,
    },
    productID: product.sku,
    sku: product.sku,
    url: new URL(getProductLink(product.urlKey, product.sku), window.location).toString(),
  };

  setJsonLd(ldJson, 'product');
}

function imageSlotConfig(ctx) {
  const {
    data,
    defaultImageProps,
  } = ctx;

  return {
    alias: data.sku,
    imageProps: defaultImageProps,
    params: {
      width: defaultImageProps.width,
      height: defaultImageProps.height,
    },
  };
}

function clampQuantity(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

function renderFallbackGallery(container, product) {
  const images = product?.images?.length ? product.images : [];

  if (!images.length) {
    return;
  }

  const mainImage = document.createElement('img');
  mainImage.className = 'product-details__fallback-main-image';
  mainImage.src = images[0].url;
  mainImage.alt = images[0].label || product.name;
  mainImage.loading = 'eager';

  const mainImageWrapper = document.createElement('div');
  mainImageWrapper.className = 'product-details__fallback-main-image-wrapper';
  mainImageWrapper.append(mainImage);
  container.append(mainImageWrapper);

  if (images.length < 2) {
    return;
  }

  const thumbnails = document.createElement('div');
  thumbnails.className = 'product-details__fallback-thumbnails';

  images.forEach((image) => {
    const thumbnail = document.createElement('button');
    thumbnail.type = 'button';
    thumbnail.className = 'product-details__fallback-thumbnail';
    thumbnail.setAttribute('aria-label', image.label || product.name);

    const thumbnailImage = document.createElement('img');
    thumbnailImage.src = image.url;
    thumbnailImage.alt = image.label || product.name;
    thumbnailImage.loading = 'lazy';

    thumbnail.addEventListener('click', () => {
      mainImage.src = image.url;
      mainImage.alt = image.label || product.name;
    });

    thumbnail.append(thumbnailImage);
    thumbnails.append(thumbnail);
  });

  container.append(thumbnails);
}

function renderFallbackPrice(container, product) {
  const regular = formatPrice(product?.prices?.regular);
  const final = formatPrice(product?.prices?.final);

  if (!regular && !final) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'product-details__fallback-price';

  if (final) {
    const finalPrice = document.createElement('span');
    finalPrice.className = 'product-details__fallback-price-final';
    finalPrice.textContent = final;
    wrapper.append(finalPrice);
  }

  if (regular && regular !== final) {
    const regularPrice = document.createElement('span');
    regularPrice.className = 'product-details__fallback-price-regular';
    regularPrice.textContent = regular;
    wrapper.append(regularPrice);
  }

  container.append(wrapper);
}

function renderFallbackAttributes(container, product) {
  const attributes = Array.isArray(product?.attributes) ? product.attributes : [];

  if (!attributes.length) {
    return;
  }

  const title = document.createElement('h3');
  title.className = 'product-details__fallback-section-title';
  title.textContent = 'Specifications';
  container.append(title);

  const list = document.createElement('dl');
  list.className = 'product-details__fallback-attributes';

  attributes.forEach((attribute) => {
    if (!attribute?.label || !attribute?.value) {
      return;
    }

    const term = document.createElement('dt');
    term.textContent = attribute.label;

    const definition = document.createElement('dd');
    definition.textContent = attribute.value;

    list.append(term, definition);
  });

  if (list.children.length) {
    container.append(list);
  }
}

async function renderFallbackProductDetails(block, labels) {
  let product = events.lastPayload('pdp/data') ?? null;

  if (!product?.sku) {
    product = await fetchCoreProductDetails(getProductSku());
  }

  if (!product?.sku) {
    return loadErrorPage();
  }

  const urlParams = new URLSearchParams(window.location.search);
  const itemUidFromUrl = urlParams.get('itemUid');
  let isUpdateMode = false;
  let inlineAlert = null;

  block.innerHTML = `
    <div class="product-details__alert"></div>
    <div class="product-details__wrapper product-details__wrapper--fallback">
      <div class="product-details__left-column">
        <div class="product-details__gallery product-details__gallery--fallback-desktop"></div>
      </div>
      <div class="product-details__right-column">
        <div class="product-details__header product-details__header--fallback">
          <p class="product-details__sku">${product.sku}</p>
          <h1 class="product-details__title">${product.name}</h1>
        </div>
        <div class="product-details__price"></div>
        <div class="product-details__gallery product-details__gallery--fallback-mobile"></div>
        <div class="product-details__short-description"></div>
        <div class="product-details__configuration">
          <div class="product-details__quantity product-details__quantity--fallback">
            <label class="product-details__quantity-label" for="product-details-quantity">
              ${labels.Global?.QuantityLabel || 'Quantity'}
            </label>
            <input
              id="product-details-quantity"
              class="product-details__quantity-input"
              type="number"
              min="1"
              step="1"
              value="1"
            >
          </div>
          <div class="product-details__buttons product-details__buttons--fallback">
            <div class="product-details__buttons__add-to-cart"></div>
          </div>
        </div>
        <div class="product-details__description"></div>
        <div class="product-details__attributes"></div>
      </div>
    </div>
  `;

  const $alert = block.querySelector('.product-details__alert');
  const $desktopGallery = block.querySelector('.product-details__gallery--fallback-desktop');
  const $mobileGallery = block.querySelector('.product-details__gallery--fallback-mobile');
  const $price = block.querySelector('.product-details__price');
  const $shortDescription = block.querySelector('.product-details__short-description');
  const $quantity = block.querySelector('.product-details__quantity-input');
  const $addToCart = block.querySelector('.product-details__buttons__add-to-cart');
  const $description = block.querySelector('.product-details__description');
  const $attributes = block.querySelector('.product-details__attributes');

  renderFallbackGallery($desktopGallery, product);
  renderFallbackGallery($mobileGallery, product);
  renderFallbackPrice($price, product);
  renderFallbackAttributes($attributes, product);

  if (product.shortDescription) {
    $shortDescription.innerHTML = product.shortDescription;
  }

  if (product.description) {
    $description.innerHTML = product.description;
  }

  const addToCart = await UI.render(Button, {
    children: labels.Global?.AddProductToCart || 'Add to Cart',
    icon: h(Icon, { source: 'Cart' }),
    onClick: async () => {
      const quantity = clampQuantity($quantity.value);
      const buttonText = isUpdateMode
        ? labels.Global?.UpdatingInCart
        : labels.Global?.AddingToCart;

      try {
        addToCart.setProps((prev) => ({
          ...prev,
          children: buttonText || prev.children,
          disabled: true,
        }));

        const cartApi = await import('@dropins/storefront-cart/api.js');

        if (isUpdateMode && itemUidFromUrl) {
          await cartApi.updateProductsFromCart([{
            uid: itemUidFromUrl,
            quantity,
          }]);

          const cartRedirectUrl = new URL(rootLink('/cart'), window.location.origin);
          cartRedirectUrl.searchParams.set('itemUid', itemUidFromUrl);
          window.location.href = cartRedirectUrl.toString();
          return;
        }

        await cartApi.addProductsToCart([{
          sku: product.sku,
          quantity,
        }]);

        inlineAlert?.remove();
      } catch (error) {
        inlineAlert?.remove();
        inlineAlert = await UI.render(InLineAlert, {
          heading: 'Error',
          description: error.message,
          icon: h(Icon, { source: 'Warning' }),
          'aria-live': 'assertive',
          role: 'alert',
          onDismiss: () => inlineAlert?.remove(),
        })($alert);

        $alert.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } finally {
        updateAddToCartButtonText(addToCart, isUpdateMode, labels);
        addToCart.setProps((prev) => ({
          ...prev,
          disabled: false,
        }));
      }
    },
  })($addToCart);

  events.on(
    'cart/data',
    (cartData) => {
      let itemIsInCart = false;

      if (itemUidFromUrl && cartData?.items) {
        itemIsInCart = cartData.items.some((item) => item.uid === itemUidFromUrl);
      }

      isUpdateMode = itemIsInCart;
      updateAddToCartButtonText(addToCart, itemIsInCart, labels);
    },
    { eager: true },
  );

  events.on('aem/lcp', () => {
    if (!isProductPrerendered()) {
      setJsonLdProduct(product);
      setMetaTags(product);
      document.title = product.name;
    }
  }, { eager: true });

  return Promise.resolve();
}

async function renderDropinProductDetails(block, labels) {
  const pdpApi = await import('@dropins/storefront-pdp/api.js');
  const { render: pdpRendered } = await import('@dropins/storefront-pdp/render.js');
  const [
    { default: ProductHeader },
    { default: ProductPrice },
    { default: ProductShortDescription },
    { default: ProductOptions },
    { default: ProductQuantity },
    { default: ProductDescription },
    { default: ProductAttributes },
    { default: ProductGallery },
    { default: ProductGiftCardOptions },
  ] = await Promise.all([
    import('@dropins/storefront-pdp/containers/ProductHeader.js'),
    import('@dropins/storefront-pdp/containers/ProductPrice.js'),
    import('@dropins/storefront-pdp/containers/ProductShortDescription.js'),
    import('@dropins/storefront-pdp/containers/ProductOptions.js'),
    import('@dropins/storefront-pdp/containers/ProductQuantity.js'),
    import('@dropins/storefront-pdp/containers/ProductDescription.js'),
    import('@dropins/storefront-pdp/containers/ProductAttributes.js'),
    import('@dropins/storefront-pdp/containers/ProductGallery.js'),
    import('@dropins/storefront-pdp/containers/ProductGiftCardOptions.js'),
  ]);

  const eventProduct = events.lastPayload('pdp/data') ?? null;
  const product = eventProduct?.sku ? eventProduct : null;
  const urlParams = new URLSearchParams(window.location.search);
  const itemUidFromUrl = urlParams.get('itemUid');

  let isUpdateMode = false;
  let inlineAlert = null;

  const fragment = document.createRange()
    .createContextualFragment(`
      <div class="product-details__alert"></div>
      <div class="product-details__wrapper">
        <div class="product-details__left-column">
          <div class="product-details__gallery"></div>
        </div>
        <div class="product-details__right-column">
          <div class="product-details__header"></div>
          <div class="product-details__price"></div>
          <div class="product-details__gallery"></div>
          <div class="product-details__short-description"></div>
          <div class="product-details__gift-card-options"></div>
          <div class="product-details__configuration">
            <div class="product-details__options"></div>
            <div class="product-details__quantity"></div>
            <div class="product-details__buttons">
              <div class="product-details__buttons__add-to-cart"></div>
              <div class="product-details__buttons__add-to-wishlist"></div>
              <div class="product-details__buttons__add-to-req-list"></div>
            </div>
          </div>
          <div class="product-details__description"></div>
          <div class="product-details__attributes"></div>
        </div>
      </div>
    `);

  const $alert = fragment.querySelector('.product-details__alert');
  const $gallery = fragment.querySelector('.product-details__gallery');
  const $header = fragment.querySelector('.product-details__header');
  const $price = fragment.querySelector('.product-details__price');
  const $galleryMobile = fragment.querySelector('.product-details__right-column .product-details__gallery');
  const $shortDescription = fragment.querySelector('.product-details__short-description');
  const $options = fragment.querySelector('.product-details__options');
  const $quantity = fragment.querySelector('.product-details__quantity');
  const $giftCardOptions = fragment.querySelector('.product-details__gift-card-options');
  const $addToCart = fragment.querySelector('.product-details__buttons__add-to-cart');
  const $wishlistToggleBtn = fragment.querySelector('.product-details__buttons__add-to-wishlist');
  const $requisitionListSelector = fragment.querySelector('.product-details__buttons__add-to-req-list');
  const $description = fragment.querySelector('.product-details__description');
  const $attributes = fragment.querySelector('.product-details__attributes');

  block.replaceChildren(fragment);

  const gallerySlots = {
    CarouselThumbnail: (ctx) => {
      tryRenderAemAssetsImage(ctx, {
        ...imageSlotConfig(ctx),
        wrapper: document.createElement('span'),
      });
    },
    CarouselMainImage: (ctx) => {
      tryRenderAemAssetsImage(ctx, imageSlotConfig(ctx));
    },
  };

  const routeToWishlist = '/wishlist';

  const [
    _galleryMobile,
    _gallery,
    _header,
    _price,
    _shortDescription,
    _options,
    _quantity,
    _giftCardOptions,
    _description,
    _attributes,
    wishlistToggleBtn,
  ] = await Promise.all([
    pdpRendered.render(ProductGallery, {
      controls: 'dots',
      arrows: true,
      peak: false,
      gap: 'small',
      loop: false,
      imageParams: { ...IMAGES_SIZES },
      slots: gallerySlots,
    })($galleryMobile),
    pdpRendered.render(ProductGallery, {
      controls: 'thumbnailsColumn',
      arrows: true,
      peak: true,
      gap: 'small',
      loop: false,
      imageParams: { ...IMAGES_SIZES },
      slots: gallerySlots,
    })($gallery),
    pdpRendered.render(ProductHeader, {})($header),
    pdpRendered.render(ProductPrice, {})($price),
    pdpRendered.render(ProductShortDescription, {})($shortDescription),
    pdpRendered.render(ProductOptions, {
      hideSelectedValue: false,
      slots: {
        SwatchImage: (ctx) => {
          tryRenderAemAssetsImage(ctx, {
            ...imageSlotConfig(ctx),
            wrapper: document.createElement('span'),
          });
        },
      },
    })($options),
    pdpRendered.render(ProductQuantity, {})($quantity),
    pdpRendered.render(ProductGiftCardOptions, {})($giftCardOptions),
    pdpRendered.render(ProductDescription, {})($description),
    pdpRendered.render(ProductAttributes, {})($attributes),
    wishlistRender.render(WishlistToggle, {
      product,
    })($wishlistToggleBtn),
  ]);

  const addToCart = await UI.render(Button, {
    children: labels.Global?.AddProductToCart,
    icon: h(Icon, { source: 'Cart' }),
    onClick: async () => {
      const buttonActionText = isUpdateMode
        ? labels.Global?.UpdatingInCart
        : labels.Global?.AddingToCart;

      try {
        addToCart.setProps((prev) => ({
          ...prev,
          children: buttonActionText,
          disabled: true,
        }));

        const values = pdpApi.getProductConfigurationValues();
        const valid = pdpApi.isProductConfigurationValid();

        if (valid) {
          if (isUpdateMode) {
            const { updateProductsFromCart } = await import('@dropins/storefront-cart/api.js');

            await updateProductsFromCart([{
              ...values,
              uid: itemUidFromUrl,
            }]);

            const updatedSku = values?.sku;

            if (updatedSku) {
              const cartRedirectUrl = new URL(rootLink('/cart'), window.location.origin);
              cartRedirectUrl.searchParams.set('itemUid', itemUidFromUrl);
              window.location.href = cartRedirectUrl.toString();
            } else {
              window.location.href = rootLink('/cart');
            }

            return;
          }

          const { addProductsToCart } = await import('@dropins/storefront-cart/api.js');
          await addProductsToCart([{ ...values }]);
        }

        inlineAlert?.remove();
      } catch (error) {
        inlineAlert = await UI.render(InLineAlert, {
          heading: 'Error',
          description: error.message,
          icon: h(Icon, { source: 'Warning' }),
          'aria-live': 'assertive',
          role: 'alert',
          onDismiss: () => {
            inlineAlert.remove();
          },
        })($alert);

        $alert.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } finally {
        updateAddToCartButtonText(addToCart, isUpdateMode, labels);
        addToCart.setProps((prev) => ({
          ...prev,
          disabled: false,
        }));
      }
    },
  })($addToCart);

  events.on('pdp/valid', (valid) => {
    addToCart.setProps((prev) => ({
      ...prev,
      disabled: !valid,
    }));
  }, { eager: true });

  events.on('pdp/values', async () => {
    const configValues = pdpApi.getProductConfigurationValues();
    const urlOptionsUIDs = urlParams.get('optionsUIDs');

    let optionUIDs = null;
    const hasConfigOptions = configValues?.optionsUIDs
      && Array.isArray(configValues.optionsUIDs)
      && configValues.optionsUIDs.length > 0;

    if (hasConfigOptions) {
      optionUIDs = configValues.optionsUIDs;
    } else if (urlOptionsUIDs === '') {
      optionUIDs = null;
    }

    if (wishlistToggleBtn) {
      wishlistToggleBtn.setProps((prev) => ({
        ...prev,
        product: {
          ...product,
          optionUIDs,
        },
      }));
    }
  }, { eager: true });

  events.on('wishlist/alert', ({
    action,
    item,
  }) => {
    wishlistRender.render(WishlistAlert, {
      action,
      item,
      routeToWishlist,
    })($alert);

    setTimeout(() => {
      $alert.innerHTML = '';
    }, 5000);

    setTimeout(() => {
      $alert.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 0);
  });

  try {
    const { initializeRequisitionList } = await import('./requisition-list.js');
    await initializeRequisitionList({
      $alert,
      $requisitionListSelector,
      product,
      labels,
      urlParams,
    });
  } catch (error) {
    console.warn('Requisition list module not available:', error);
  }

  events.on(
    'cart/data',
    (cartData) => {
      let itemIsInCart = false;

      if (itemUidFromUrl && cartData?.items) {
        itemIsInCart = cartData.items.some((item) => item.uid === itemUidFromUrl);
      }

      isUpdateMode = itemIsInCart;
      updateAddToCartButtonText(addToCart, itemIsInCart, labels);
    },
    { eager: true },
  );

  events.on('aem/lcp', () => {
    if (product && !isProductPrerendered()) {
      setJsonLdProduct(product);
      setMetaTags(product);
      document.title = product.name;
    }
  }, { eager: true });

  return Promise.resolve();
}

export default async function decorate(block) {
  const labels = await fetchPlaceholders();

  if (isCorePdpFallbackMode()) {
    return renderFallbackProductDetails(block, labels);
  }

  return renderDropinProductDetails(block, labels);
}
