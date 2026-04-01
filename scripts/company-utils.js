import { getConfigValue } from '@dropins/tools/lib/aem/configs.js';
import {
  companyEnabled as dropinCompanyEnabled,
  checkCompanyCreditEnabled as dropinCheckCompanyCreditEnabled,
} from '@dropins/storefront-company-management/api.js';

function getFlag(name, defaultValue = true) {
  try {
    const value = getConfigValue(name);
    return value ?? defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

function isUnsupportedStoreConfigField(error, fieldName) {
  return error?.message?.includes(`Cannot query field "${fieldName}" on type "StoreConfig"`);
}

export async function companyFeatureEnabled() {
  if (getFlag('commerce-companies-enabled', true) === false) {
    return false;
  }

  try {
    return await dropinCompanyEnabled();
  } catch (error) {
    if (isUnsupportedStoreConfigField(error, 'company_enabled')) {
      return true;
    }

    throw error;
  }
}

export async function companyCreditFeatureEnabled() {
  if (!(await companyFeatureEnabled())) {
    return false;
  }

  try {
    const result = await dropinCheckCompanyCreditEnabled();

    if (typeof result === 'boolean') {
      return result;
    }

    if (typeof result?.creditEnabled === 'boolean') {
      if (
        result.creditEnabled === false
        && (
          result.error === 'Unable to check company credit configuration'
          || result.error === 'Company credit functionality not available'
        )
      ) {
        return true;
      }

      return result.creditEnabled;
    }

    return true;
  } catch (error) {
    if (isUnsupportedStoreConfigField(error, 'company_credit_enabled')) {
      return true;
    }

    throw error;
  }
}
