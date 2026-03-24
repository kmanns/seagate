/*! Copyright 2026 Adobe
All Rights Reserved. */
import {
  c as createCustomer,
  a as createCustomerAddress,
  g as getAttributesForm,
} from './__dropins__/storefront-auth/chunks/createCustomerAddress.js';
import {
  g as getCustomerData,
  a as getCustomerToken,
} from './__dropins__/storefront-auth/chunks/getCustomerToken.js';
import {
  _ as _resetCache,
  c as config,
  b as getAdobeCommerceOptimizerData,
  a as getCustomerRolePermissions,
  g as getStoreConfig,
  i as initialize,
  v as verifyToken,
} from './__dropins__/storefront-auth/chunks/getAdobeCommerceOptimizerData.js';
import { r as requestPasswordResetEmail } from './__dropins__/storefront-auth/chunks/requestPasswordResetEmail.js';
import { r as resetPassword } from './__dropins__/storefront-auth/chunks/resetPassword.js';
import { r as revokeCustomerToken } from './__dropins__/storefront-auth/chunks/revokeCustomerToken.js';
import { c as confirmEmail } from './__dropins__/storefront-auth/chunks/confirmEmail.js';
import { r as resendConfirmationEmail } from './__dropins__/storefront-auth/chunks/resendConfirmationEmail.js';
import {
  f as fetchGraphQl,
  g as getConfig,
  r as removeFetchGraphQlHeader,
  s as setEndpoint,
  a as setFetchGraphQlHeader,
  b as setFetchGraphQlHeaders,
} from './__dropins__/storefront-auth/chunks/network-error.js';
import './__dropins__/storefront-auth/fragments.js';
import './__dropins__/storefront-auth/chunks/setReCaptchaToken.js';
import '@dropins/tools/recaptcha.js';
import '@dropins/tools/event-bus.js';
import '@dropins/tools/lib.js';
import './__dropins__/storefront-auth/chunks/transform-attributes-form.js';
import './__dropins__/storefront-auth/chunks/acdl.js';
import '@dropins/tools/fetch-graphql.js';

export {
  _resetCache,
  config,
  confirmEmail,
  createCustomer,
  createCustomerAddress,
  fetchGraphQl,
  getAdobeCommerceOptimizerData,
  getAttributesForm,
  getConfig,
  getCustomerData,
  getCustomerRolePermissions,
  getCustomerToken,
  getStoreConfig,
  initialize,
  removeFetchGraphQlHeader,
  requestPasswordResetEmail,
  resendConfirmationEmail,
  resetPassword,
  revokeCustomerToken,
  setEndpoint,
  setFetchGraphQlHeader,
  setFetchGraphQlHeaders,
  verifyToken,
};
