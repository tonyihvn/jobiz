/**
 * Global Loading Manager
 * This is a non-React module that tracks active requests
 * and can be used by LoadingContext to manage the overlay
 * 
 * Features:
 * - Only shows overlay if request takes > 1 second
 * - Prevents flashing overlay for quick requests
 */

let activeRequests = new Set<string>();
let loadingMessage = 'Loading...';
let listeners: (() => void)[] = [];
let showTimeouts: Map<string, NodeJS.Timeout> = new Map();
let hideTimeouts: Map<string, NodeJS.Timeout> = new Map();
let isDisplayed = false;
let stuckCheckTimeout: NodeJS.Timeout | null = null;
const SHOW_DELAY = 1000; // 1 second before showing overlay
const HIDE_DELAY = 300; // Smooth hide delay
const STUCK_TIMEOUT = 30000; // Safety: hide overlay if stuck for 30 seconds

export const globalLoadingManager = {
  /**
   * Increment request counter and notify listeners
   * Only shows overlay if request takes > 1 second
   */
  start: (message = 'Loading...', requestId = Date.now().toString()) => {
    loadingMessage = message;
    activeRequests.add(requestId);

    // Clear any pending hide timeouts (new request started)
    hideTimeouts.forEach(timeout => clearTimeout(timeout));
    hideTimeouts.clear();

    // Clear any pending hide for this request
    const hideTimeout = hideTimeouts.get(requestId);
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeouts.delete(requestId);
    }

    // If not showing yet, schedule show after 1 second
    if (!isDisplayed && activeRequests.size > 0) {
      clearTimeout(showTimeouts.get(requestId));
      
      const timeout = setTimeout(() => {
        isDisplayed = true;
        
        // Start stuck check timeout
        if (stuckCheckTimeout) clearTimeout(stuckCheckTimeout);
        stuckCheckTimeout = setTimeout(() => {
          console.warn('[GlobalLoadingManager] Overlay stuck for 30 seconds, forcing hide');
          isDisplayed = false;
          activeRequests.clear();
          showTimeouts.clear();
          hideTimeouts.clear();
          notifyListeners();
        }, STUCK_TIMEOUT);
        
        notifyListeners();
        showTimeouts.delete(requestId);
      }, SHOW_DELAY);
      
      showTimeouts.set(requestId, timeout);
    }
  },

  /**
   * Decrement request counter and notify listeners
   * Hides overlay smoothly
   */
  stop: (requestId = Date.now().toString()) => {
    activeRequests.delete(requestId);

    // Clear pending show timeout
    const showTimeout = showTimeouts.get(requestId);
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeouts.delete(requestId);
    }

    // If no more requests, hide overlay after short delay
    if (activeRequests.size === 0 && isDisplayed) {
      clearTimeout(hideTimeouts.get(requestId));
      
      const timeout = setTimeout(() => {
        isDisplayed = false;
        
        // Clear stuck check timeout since we're hiding normally
        if (stuckCheckTimeout) {
          clearTimeout(stuckCheckTimeout);
          stuckCheckTimeout = null;
        }
        
        notifyListeners();
        hideTimeouts.delete(requestId);
      }, HIDE_DELAY);
      
      hideTimeouts.set(requestId, timeout);
    }
  },

  /**
   * Get current loading state
   */
  isLoading: () => isDisplayed,

  /**
   * Get current message
   */
  getMessage: () => loadingMessage,

  /**
   * Set message
   */
  setMessage: (message: string) => {
    loadingMessage = message;
    if (isDisplayed) {
      notifyListeners();
    }
  },

  /**
   * Subscribe to changes
   */
  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },

  /**
   * Reset state
   */
  reset: () => {
    activeRequests.clear();
    loadingMessage = 'Loading...';
    isDisplayed = false;
    
    // Clear all timeouts
    showTimeouts.forEach(timeout => clearTimeout(timeout));
    hideTimeouts.forEach(timeout => clearTimeout(timeout));
    showTimeouts.clear();
    hideTimeouts.clear();
    
    if (stuckCheckTimeout) {
      clearTimeout(stuckCheckTimeout);
      stuckCheckTimeout = null;
    }
    
    notifyListeners();
  },
};

/**
 * Notify all listeners of state change
 */
function notifyListeners() {
  listeners.forEach(listener => {
    try {
      listener();
    } catch (e) {
      console.error('[GlobalLoadingManager] Listener error:', e);
    }
  });
}

// For debugging in dev tools
if (typeof window !== 'undefined') {
  (window as any).__globalLoadingManager__ = globalLoadingManager;
}
