import { useEffect } from 'react';
import { useLoading } from './LoadingContext';
import db from './apiClient';
import { cacheManager, requestDeduplicator } from './cacheManager';
import { useBusinessContext } from './BusinessContext';

/**
 * Enhanced API wrapper that integrates loading state, caching, and request deduplication
 * This hook should only be used in components, not at module level
 */
export const useEnhancedApi = () => {
  const { startLoading, stopLoading, setLoadingMessage } = useLoading();
  const { selectedBusinessId } = useBusinessContext();

  // Invalidate business-specific cache when business changes to ensure data isolation
  useEffect(() => {
    if (selectedBusinessId) {
      // Clear all caches for this business when switching
      cacheManager.invalidateBusinessData(selectedBusinessId);
    }
  }, [selectedBusinessId]);

  /**
   * Wrap any async function with loading state management
   */
  const withLoading = <T,>(
    fn: () => Promise<T>,
    message: string = 'Loading...'
  ): Promise<T> => {
    startLoading(message);
    return fn()
      .finally(() => {
        stopLoading();
      });
  };

  /**
   * Fetch with caching and deduplication for GET-like operations
   * Properly scopes cache by businessId to prevent multi-tenant data mixing
   */
  const cachedFetch = <T,>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    message: string = 'Loading data...',
    customTTL?: number
  ): Promise<T> => {
    // Scope cache key properly with businessId to prevent cross-tenant pollution
    const scopedKey = selectedBusinessId ? cacheKey.replace(/_all/, `_b${selectedBusinessId}_all`) : cacheKey;
    
    // Check cache first
    const cached = cacheManager.get(scopedKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    // Use deduplicator to avoid simultaneous duplicate requests
    return requestDeduplicator.deduplicate(scopedKey, () => {
      startLoading(message);
      return fetcher()
        .then((data) => {
          cacheManager.set(scopedKey, data, customTTL);
          return data;
        })
        .finally(() => {
          stopLoading();
        });
    });
  };

  /**
   * Get all products with caching and deduplication
   */
  const products = {
    getAll: (businessId?: string) =>
      cachedFetch(
        `products_${businessId || 'all'}`,
        () => db.products.getAll(businessId),
        'Loading products...'
      ),
    add: (p: any) => withLoading(() => db.products.add(p), 'Adding product...'),
    update: (idOrObj: any, p?: any) =>
      withLoading(
        () => db.products.update(idOrObj, p),
        'Updating product...'
      ).then((result) => {
        cacheManager.clearPattern(`products_`);
        return result;
      }),
    delete: (id: string) =>
      withLoading(() => db.products.delete(id), 'Deleting product...').then(
        (result) => {
          cacheManager.clearPattern(`products_`);
          return result;
        }
      ),
    save: (items: any[]) =>
      withLoading(() => db.products.save(items), 'Saving products...').then(
        (result) => {
          cacheManager.clearPattern(`products_`);
          return result;
        }
      ),
  };

  const sales = {
    getAll: (businessId?: string) =>
      cachedFetch(
        `sales_${businessId || 'all'}`,
        () => db.sales.getAll(businessId),
        'Loading sales...'
      ),
    add: (sale: any) =>
      withLoading(() => db.sales.add(sale), 'Recording sale...').then(
        (result) => {
          cacheManager.clearPattern(`sales_`);
          return result;
        }
      ),
    update: (id: string, sale: any) =>
      withLoading(() => db.sales.update(id, sale), 'Updating sale...').then(
        (result) => {
          cacheManager.clearPattern(`sales_`);
          return result;
        }
      ),
    delete: (id: string) =>
      withLoading(() => db.sales.delete(id), 'Deleting sale...').then(
        (result) => {
          cacheManager.clearPattern(`sales_`);
          return result;
        }
      ),
    processReturn: (saleId: string, reason: string, products?: any[]) =>
      withLoading(
        () => db.sales.processReturn(saleId, reason, products),
        'Processing return...'
      ).then((result) => {
        cacheManager.clearPattern(`sales_`);
        return result;
      }),
  };

  const customers = {
    getAll: (businessId?: string) =>
      cachedFetch(
        `customers_${businessId || 'all'}`,
        () => db.customers.getAll(businessId),
        'Loading customers...'
      ),
    add: (c: any) =>
      withLoading(() => db.customers.add(c), 'Adding customer...').then(
        (result) => {
          cacheManager.clearPattern(`customers_`);
          return result;
        }
      ),
  };

  const services = {
    getAll: (businessId?: string) =>
      cachedFetch(
        `services_${businessId || 'all'}`,
        () => db.services.getAll(businessId),
        'Loading services...'
      ),
    add: (s: any) =>
      withLoading(() => db.services.add(s), 'Adding service...').then(
        (result) => {
          cacheManager.clearPattern(`services_`);
          return result;
        }
      ),
    update: (id: string, s: any) =>
      withLoading(() => db.services.update(id, s), 'Updating service...').then(
        (result) => {
          cacheManager.clearPattern(`services_`);
          return result;
        }
      ),
    delete: (id: string) =>
      withLoading(() => db.services.delete(id), 'Deleting service...').then(
        (result) => {
          cacheManager.clearPattern(`services_`);
          return result;
        }
      ),
  };

  const suppliers = {
    getAll: (businessId?: string) =>
      cachedFetch(
        `suppliers_${businessId || 'all'}`,
        () => db.suppliers.getAll(businessId),
        'Loading suppliers...'
      ),
    add: (s: any) =>
      withLoading(() => db.suppliers.add(s), 'Adding supplier...').then(
        (result) => {
          cacheManager.clearPattern(`suppliers_`);
          return result;
        }
      ),
    update: (id: string, s: any) =>
      withLoading(() => db.suppliers.update(id, s), 'Updating supplier...').then(
        (result) => {
          cacheManager.clearPattern(`suppliers_`);
          return result;
        }
      ),
    delete: (id: string) =>
      withLoading(() => db.suppliers.delete(id), 'Deleting supplier...').then(
        (result) => {
          cacheManager.clearPattern(`suppliers_`);
          return result;
        }
      ),
    save: (items: any[]) =>
      withLoading(() => db.suppliers.save(items), 'Saving suppliers...').then(
        (result) => {
          cacheManager.clearPattern(`suppliers_`);
          return result;
        }
      ),
  };

  const transactions = {
    getAll: (businessId?: string) =>
      cachedFetch(
        `transactions_${businessId || 'all'}`,
        () => db.transactions.getAll(businessId),
        'Loading transactions...'
      ),
    add: (t: any) =>
      withLoading(() => db.transactions.add(t), 'Recording transaction...').then(
        (result) => {
          cacheManager.clearPattern(`transactions_`);
          return result;
        }
      ),
  };

  const stock = {
    getForProduct: (productId: string, businessId?: string) =>
      cachedFetch(
        `stock_${productId}_${businessId || 'all'}`,
        () => db.stock.getForProduct(productId, businessId),
        'Loading stock...'
      ),
    history: (productId: string, businessId?: string) =>
      cachedFetch(
        `stock_history_${productId}_${businessId || 'all'}`,
        () => db.stock.history(productId, businessId),
        'Loading stock history...'
      ),
    historyAll: (businessId?: string) =>
      cachedFetch(
        `stock_history_all_${businessId || 'all'}`,
        () => db.stock.historyAll(businessId),
        'Loading all stock history...'
      ),
    increase: (
      productId: string,
      locationId: string,
      qty: number,
      supplierId?: string,
      batchNumber?: string,
      referenceId?: string,
      notes?: string
    ) =>
      withLoading(
        () =>
          db.stock.increase(
            productId,
            locationId,
            qty,
            supplierId,
            batchNumber,
            referenceId,
            notes
          ),
        'Increasing stock...'
      ).then((result) => {
        cacheManager.clearPattern(`stock_`);
        return result;
      }),
    decrease: (
      productId: string,
      locationId: string,
      qty: number,
      supplierId?: string,
      batchNumber?: string,
      referenceId?: string
    ) =>
      withLoading(
        () => db.stock.decrease(productId, locationId, qty, supplierId, batchNumber, referenceId),
        'Decreasing stock...'
      ).then((result) => {
        cacheManager.clearPattern(`stock_`);
        return result;
      }),
    move: (
      productId: string,
      fromLocationId: string,
      toLocationId: string,
      qty: number,
      supplierId?: string,
      batchNumber?: string,
      referenceId?: string
    ) =>
      withLoading(
        () => db.stock.move(productId, fromLocationId, toLocationId, qty, supplierId, batchNumber, referenceId),
        'Moving stock...'
      ).then((result) => {
        cacheManager.clearPattern(`stock_`);
        return result;
      }),
  };

  const categories = {
    getAll: (businessId?: string) =>
      cachedFetch(
        `categories_${businessId || 'all'}`,
        () => db.categories.getAll(businessId),
        'Loading categories...'
      ),
    add: (c: any) =>
      withLoading(() => db.categories.add(c), 'Adding category...').then(
        (result) => {
          cacheManager.clearPattern(`categories_`);
          return result;
        }
      ),
    update: (id: string, c: any) =>
      withLoading(() => db.categories.update(id, c), 'Updating category...').then(
        (result) => {
          cacheManager.clearPattern(`categories_`);
          return result;
        }
      ),
    delete: (id: string) =>
      withLoading(() => db.categories.delete(id), 'Deleting category...').then(
        (result) => {
          cacheManager.clearPattern(`categories_`);
          return result;
        }
      ),
    save: (items: any[]) =>
      withLoading(() => db.categories.save(items), 'Saving categories...').then(
        (result) => {
          cacheManager.clearPattern(`categories_`);
          return result;
        }
      ),
  };

  const tasks = {
    getAll: (businessId?: string) =>
      cachedFetch(
        `tasks_${businessId || 'all'}`,
        () => db.tasks.getAll(businessId),
        'Loading tasks...'
      ),
    add: (t: any) =>
      withLoading(() => db.tasks.add(t), 'Adding task...').then((result) => {
        cacheManager.clearPattern(`tasks_`);
        return result;
      }),
    update: (id: string, t: any) =>
      withLoading(() => db.tasks.update(id, t), 'Updating task...').then(
        (result) => {
          cacheManager.clearPattern(`tasks_`);
          return result;
        }
      ),
    delete: (id: string) =>
      withLoading(() => db.tasks.delete(id), 'Deleting task...').then(
        (result) => {
          cacheManager.clearPattern(`tasks_`);
          return result;
        }
      ),
    save: (items: any[]) =>
      withLoading(() => db.tasks.save(items), 'Saving tasks...').then(
        (result) => {
          cacheManager.clearPattern(`tasks_`);
          return result;
        }
      ),
  };

  const audit = {
    getAll: (businessId?: string) =>
      cachedFetch(
        `audit_${businessId || 'all'}`,
        () => db.audit.getAll(businessId),
        'Loading audit logs...'
      ),
    log: (data: any) => db.audit.log(data),
  };

  const roles = {
    getAll: (businessId?: string) =>
      cachedFetch(
        `roles_${businessId || 'all'}`,
        () => db.roles.getAll(businessId),
        'Loading roles...'
      ),
    add: (r: any) =>
      withLoading(() => db.roles.add(r), 'Adding role...').then((result) => {
        cacheManager.clearPattern(`roles_`);
        return result;
      }),
    update: (id: string, r: any) =>
      withLoading(() => db.roles.update(id, r), 'Updating role...').then(
        (result) => {
          cacheManager.clearPattern(`roles_`);
          return result;
        }
      ),
    delete: (id: string) =>
      withLoading(() => db.roles.delete(id), 'Deleting role...').then(
        (result) => {
          cacheManager.clearPattern(`roles_`);
          return result;
        }
      ),
    save: (items: any[]) =>
      withLoading(() => db.roles.save(items), 'Saving roles...').then(
        (result) => {
          cacheManager.clearPattern(`roles_`);
          return result;
        }
      ),
  };

  const settings = {
    get: (businessId?: string) =>
      cachedFetch(
        `settings_${businessId || 'all'}`,
        () => db.settings.get(businessId),
        'Loading settings...'
      ),
    save: (s: any) =>
      withLoading(() => db.settings.save(s), 'Saving settings...').then(
        (result) => {
          cacheManager.clearPattern(`settings_`);
          return result;
        }
      ),
  };

  const auth = {
    login: (email: string, password: string) =>
      withLoading(() => db.auth.login(email, password), 'Logging in...'),
    register: (companyName: string, adminName: string, email: string, password: string) =>
      withLoading(() => db.auth.register(companyName, adminName, email, password), 'Registering...'),
    logout: () => db.auth.logout(),
    getCurrentUser: () =>
      cachedFetch(`current_user`, () => db.auth.getCurrentUser(), 'Loading user info...'),
  };

  return {
    withLoading,
    cachedFetch,
    products,
    sales,
    customers,
    services,
    suppliers,
    transactions,
    stock,
    categories,
    tasks,
    audit,
    roles,
    settings,
    auth,
    setLoadingMessage,
  };
};
