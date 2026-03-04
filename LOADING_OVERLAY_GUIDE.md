# Loading Overlay & Performance Optimization Implementation Guide

## Overview
Your application now has:
1. **Global Loading Overlay** - Automatically displays when data is being fetched
2. **Request Caching** - Prevents redundant API calls within 5 minutes
3. **Request Deduplication** - Prevents multiple simultaneous requests for the same data
4. **Performance Optimizations** - Faster page loads and data updates

## Architecture

### New Components
- **LoadingContext** (`services/LoadingContext.tsx`) - Global loading state management
- **LoadingOverlay** (`components/Shared/LoadingOverlay.tsx`) - Visual loading indicator
- **cacheManager** (`services/cacheManager.ts`) - Cache and deduplication logic
- **useEnhancedApi** (`services/useEnhancedApi.ts`) - Enhanced API wrapper with optimizations

## How to Update Your Pages

### Option 1: Recommended - Use Enhanced API Hook

Instead of using `db` directly, use the `useEnhancedApi` hook in your pages:

```tsx
import React, { useEffect, useState } from 'react';
import { useEnhancedApi } from '../services/useEnhancedApi';
import { useBusinessContext } from '../services/BusinessContext';

const Dashboard = () => {
  const api = useEnhancedApi(); // Use enhanced API
  const { selectedBusinessId } = useBusinessContext();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // The api methods handle loading state automatically
        const salesData = await api.sales.getAll(selectedBusinessId);
        
        if (mounted) {
          setSales(salesData || []);
        }
      } catch (error) {
        console.error('Failed to load sales:', error);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedBusinessId, api]);

  return (
    <div>
      {/* Your component */}
    </div>
  );
};
```

### Option 2: Use Original API with Manual Loading

If you prefer to keep using `db` directly, manually control the loading state:

```tsx
import React, { useEffect, useState } from 'react';
import db from '../services/apiClient';
import { useLoading } from '../services/LoadingContext';
import { useBusinessContext } from '../services/BusinessContext';

const Dashboard = () => {
  const { startLoading, stopLoading } = useLoading();
  const { selectedBusinessId } = useBusinessContext();
  const [sales, setSales] = useState([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        startLoading('Loading sales data...');
        const salesData = await db.sales.getAll(selectedBusinessId);
        
        if (mounted) {
          setSales(salesData || []);
        }
      } catch (error) {
        console.error('Failed to load sales:', error);
      } finally {
        stopLoading();
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedBusinessId, startLoading, stopLoading]);

  return (
    <div>
      {/* Your component */}
    </div>
  );
};
```

## Performance Optimization Features

### 1. Automatic Caching
GET requests are cached for 5 minutes. Identical requests within this window return cached data instantly:

```tsx
// First call - fetches from API
const products1 = await api.products.getAll(businessId);

// Second call within 5 minutes - returns cached data instantly
const products2 = await api.products.getAll(businessId);
```

### 2. Request Deduplication
Multiple simultaneous requests for the same data are deduplicated:

```tsx
// These will execute as one request
Promise.all([
  api.products.getAll(businessId),
  api.products.getAll(businessId),
  api.products.getAll(businessId),
]);
// Only 1 API call is made, others wait for the result
```

### 3. Automatic Cache Invalidation
When you modify data (add, update, delete), the cache is automatically cleared:

```tsx
// Add new product - automatically clears product cache
await api.products.add(newProduct);

// Cache is cleared, next getAll() will fetch fresh data
const products = await api.products.getAll(businessId);
```

### 4. Custom Loading Messages
Set custom messages during long operations:

```tsx
const { api, setLoadingMessage } = useEnhancedApi();

await api.withLoading(
  async () => {
    await someExpensiveOperation();
  },
  'Processing your request...'
);
```

## API Methods Available

All enhanced API methods are available through `useEnhancedApi()`:

### Products
- `getAll(businessId?)` - Get all products
- `add(product)` - Add new product
- `update(idOrObj, data?)` - Update product
- `delete(id)` - Delete product
- `save(items)` - Batch save products

### Sales
- `getAll(businessId?)` - Get all sales
- `add(sale)` - Add new sale
- `update(id, sale)` - Update sale
- `delete(id)` - Delete sale
- `processReturn(saleId, reason, products?)` - Process sale return

### Services, Customers, Suppliers
Similar methods to Products

### Stock Management
- `getForProduct(productId, businessId?)`
- `history(productId, businessId?)`
- `historyAll(businessId?)`
- `increase(...)`, `decrease(...)`, `move(...)`

### Categories, Tasks, Roles
Similar CRUD methods as Products

### Authentication
- `login(email, password)`
- `register(companyName, adminName, email, password)`
- `logout()`
- `getCurrentUser()`

## Progress Indicator Details

The loading overlay shows:
- **Animated spinner** - Indicates active data loading
- **Custom message** - What operation is in progress
- **Progress bar** - Visual feedback of loading progress
- **Backdrop** - Prevents interaction with page during loading

## Best Practices

### 1. Always Use Cleanup
```tsx
useEffect(() => {
  let mounted = true;
  
  (async () => {
    // fetch data
    if (mounted) {
      setData(result);
    }
  })();
  
  return () => {
    mounted = false; // Prevent state updates after unmount
  };
}, [dependencies]);
```

### 2. Functional Dependencies
```tsx
// Include api in dependencies if using enhanced API
useEffect(() => {
  loadData();
}, [api, businessId]);

// Or use callback dependency
const loadData = useCallback(async () => {
  const data = await api.products.getAll(businessId);
  setProducts(data);
}, [api, businessId]);
```

### 3. Error Handling
```tsx
try {
  const data = await api.products.getAll(businessId);
  setProducts(data);
} catch (error) {
  console.error('Failed to load products:', error);
  setError(error.message);
}
```

### 4. Parallel Requests
```tsx
// Fetch multiple data sets in parallel
const [sales, customers, products] = await Promise.all([
  api.sales.getAll(businessId),
  api.customers.getAll(businessId),
  api.products.getAll(businessId),
]);
```

## Performance Impact

### Before Optimization
- No visual feedback during loading
- Redundant API calls
- Duplicate requests when navigating

### After Optimization
- **Visual feedback** - User knows data is loading
- **5-minute cache** - Repeated navigation is instant
- **Request deduplication** - Parallel requests execute once
- **Automatic invalidation** - Fresh data after modifications

## Troubleshooting

### Cache Not Clearing
If you update data but still see old values:

```tsx
import { cacheManager } from '../services/cacheManager';

// Manually clear cache
cacheManager.clear('products_all');

// Or clear pattern
cacheManager.clearPattern('products_');

// Or clear all
cacheManager.clearAll();
```

### Loading Overlay Not Showing
1. Verify `LoadingProvider` wraps your app in `App.tsx` ✓
2. Verify `LoadingOverlay` component is rendered ✓
3. Check that your page uses either `useEnhancedApi()` or manual `useLoading()` calls

### Stale Data Issues
If you see outdated data:
- Cache duration is 5 minutes by default
- Modify `CACHE_DURATION` in `services/cacheManager.ts` if needed
- Clear cache before critical operations

## Next Steps

1. **Update Dashboard.tsx** - See example below
2. **Update other high-traffic pages** (Inventory, POS, Customers)
3. **Test cache behavior** - Verify fast navigation between pages
4. **Monitor performance** - Check network tab for reduced API calls

## Example: Updated Dashboard

Here's how to update Dashboard.tsx for optimal performance:

```tsx
import React, { useEffect, useState } from 'react';
import { useEnhancedApi } from '../services/useEnhancedApi';
import { useBusinessContext } from '../services/BusinessContext';
import { useCurrency } from '../services/CurrencyContext';

const Dashboard = () => {
  const api = useEnhancedApi(); // Get enhanced API
  const { selectedBusinessId } = useBusinessContext();
  const { symbol } = useCurrency();
  const [sales, setSales] = useState([]);
  const [services, setServices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Parallel requests - loading overlay shows until all complete
        const [salesData, servicesData, transactionsData] = await Promise.all([
          api.sales.getAll(selectedBusinessId),
          api.services.getAll(selectedBusinessId),
          api.transactions.getAll(selectedBusinessId),
        ]);

        if (mounted) {
          setSales(Array.isArray(salesData) ? salesData : []);
          setServices(Array.isArray(servicesData) ? servicesData : []);
          setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedBusinessId, api]);

  return (
    <div>
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-32 bg-slate-100 rounded animate-pulse"></div>
          <div className="h-32 bg-slate-100 rounded animate-pulse"></div>
        </div>
      ) : (
        // Your dashboard content
        <div>
          {/* Content here */}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
```
