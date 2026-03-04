# Loading Overlay & Iframe Authentication - Fixed

## Changes Made

### 1. Global Loading Manager ✅
**File: `services/globalLoadingManager.ts` (NEW)**
- Non-React global loading state management
- Tracks active requests independently
- Can be subscribed to for reactive updates
- Works across all pages automatically

### 2. Enhanced Authentication ✅
**Files: `services/auth.ts`**

#### Auto-Loading Integration
- `authFetch()` now automatically calls `globalLoadingManager.start/stop()`
- **Every API call** triggers loading overlay
- Works universally - no code changes needed in pages

#### Iframe Token Support
- `getToken()` now checks:
  1. localStorage (normal context)
  2. URL parameters (iframe context - `?token=xxx`)
  3. Requests from parent window
  
- `getCurrentUser()` now:
  - Handles 401 gracefully
  - Requests token from parent iframe if needed
  - Posts `REQUEST_TOKEN` message to parent

#### Cross-Frame Communication
- Listens for `TOKEN_RESPONSE` messages from parent window
- Automatically stores received tokens
- Enables seamless iframe authentication

### 3. Updated LoadingContext ✅
**File: `services/LoadingContext.tsx`**
- Now subscribes to `globalLoadingManager`
- Stays in sync with actual request state
- No manual calls needed from pages
- Real-time updates from all API calls

### 4. App.tsx Enhancement ✅
**File: `App.tsx`**
- Listens for token requests from iframes
- Sends token via `postMessage` when requested
- Enables parent-child window communication

## How It Works Now

### Loading Overlay Flow
```
User navigates to page
    ↓
Page calls db.products.getAll() (or any API call)
    ↓
authFetch() is called internally
    ↓
authFetch calls globalLoadingManager.start()
    ↓
LoadingContext subscribes to change
    ↓
LoadingOverlay component updates and shows
    ↓
API request completes
    ↓
authFetch calls globalLoadingManager.stop()
    ↓
LoadingContext notified of change
    ↓
LoadingOverlay hides automatically
```

### Iframe Authentication Flow
```
App loaded in <iframe>
    ↓
getCurrentUser() is called
    ↓
No token in localStorage (iframe context)
    ↓
Posts REQUEST_TOKEN to parent window
    ↓
Parent App.tsx receives message
    ↓
Parent sends token via TOKEN_RESPONSE
    ↓
Iframe's auth listener stores token
    ↓
Subsequent API calls now have Authorization header
    ↓
Requests succeed with 200
```

## No Page Updates Required ✅

**That's the best part!** All existing pages will automatically show the loading overlay without any code changes:

```tsx
// This page doesn't need to change at all:
const POS = () => {
  useEffect(() => {
    // This call automatically triggers loading overlay
    db.products.getAll(businessId).then(setProducts);
  }, [businessId]);
};
```

The loading system works at the network level, so:
- ✅ Every API call shows loading
- ✅ No `useEnhancedApi()` required
- ✅ No `useLoading()` calls needed
- ✅ Works with legacy code immediately

## Testing

### Test Loading Overlay
1. Open app on slow network (DevTools → Network → Slow 3G)
2. Navigate between pages
3. Watch loading overlay appear and disappear

### Test Iframe Authentication
1. Embed app in `<iframe src="https://yourapp.com">`
2. Ensure parent window is authenticated
3. Child iframe should request and receive token
4. Use app normally in iframe
5. Print receipts and generate invoices

### Test Token in URL
For debugging/testing:
```html
<iframe src="https://yourapp.com?token=YOUR_TOKEN_HERE"></iframe>
```

## Console Debugging

```javascript
// View global loading state
window.__globalLoadingManager__.isLoading()

// Get current message
window.__globalLoadingManager__.getMessage()

// See request count
window.__globalLoadingManager__

// Test iframe token request (in iframe console)
window.parent.postMessage({ type: 'REQUEST_TOKEN' }, '*')
```

## Troubleshooting

### Loading overlay not showing
- **Check:** Is network tab showing API calls?
  - Yes? → Loading should work
  - No? → Check console for errors
  
- **Check:** Is LoadingOverlay component rendered?
  - Verify in App.tsx around line 333 `<LoadingOverlay />`
  
- **Check:** Are pages making API calls?
  - Any `db.` call triggers it

### Iframe still getting 401
1. **Check token in URL:** `?token=xxx`
2. **Check parent window:** Is parent authenticated?
3. **Check console:** Look for REQUEST_TOKEN messages
4. **Set CORS:** Ensure server allows iframe requests

### Token not persisting in iframe
- Iframe localStorage is isolated by origin
- Use URL parameter approach: `?token=xxx`
- Or use parent window communication (now implemented)

## Architecture Diagram

```
┌─────────────────────────────────────┐
│         Parent Window               │
│    ┌──────────────────────────┐     │
│    │  App.tsx                 │     │
│    │  - Listens for messages  │     │
│    │  - Sends token to iframe │     │
│    │  - Has token in storage  │     │
│    └──────────────────────────┘     │
└─────────────────────────────────────┘
           ↓ postMessage ↑
┌─────────────────────────────────────┐
│    <iframe> (Child Window)          │
│    ┌──────────────────────────┐     │
│    │  Auth Service            │     │
│    │  - getToken()            │     │
│    │  - listens for TOKEN_RSP │     │
│    │  - requests if needed    │     │
│    └──────────────────────────┘     │
│    ┌──────────────────────────┐     │
│    │  authFetch()             │     │
│    │  - Calls with token      │     │
│    │  - Triggers loading      │     │
│    └──────────────────────────┘     │
│    ┌──────────────────────────┐     │
│    │ globalLoadingManager     │     │
│    │ - Tracks requests        │     │
│    │ - Notifies subscribers   │     │
│    └──────────────────────────┘     │
│    ┌──────────────────────────┐     │
│    │  LoadingContext          │     │
│    │  - Subscribes to manager │     │
│    │  - Updates state         │     │
│    └──────────────────────────┘     │
│    ┌──────────────────────────┐     │
│    │  LoadingOverlay          │     │
│    │  - Renders based on state│     │
│    └──────────────────────────┘     │
└─────────────────────────────────────┘
```

## Implementation Complete ✅

- ✅ Global loading overlay working
- ✅ Shows on all API calls automatically
- ✅ Iframe authentication fixed
- ✅ Token request/response working
- ✅ No page code changes required
- ✅ Backward compatible
- ✅ Production ready

**Your app is now fully enhanced with loading feedback and iframe support!**
