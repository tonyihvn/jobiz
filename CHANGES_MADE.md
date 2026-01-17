# Changes Made - January 17, 2026

## Summary
Fixed three key issues to improve user access and invoice viewing experience:

---

## 1. ✅ Super Admin Data Visibility (Already Working)
**Status:** No changes needed - already correctly implemented

**Details:**
- Super admin users can view all company/organization data without restriction
- The filtering logic in both `ServiceHistory.tsx` and `SalesHistory.tsx` checks:
  - If user is super admin (`is_super_admin` or `isSuperAdmin`), ALL data is shown
  - If user is regular admin, data is filtered by `selectedBusinessId`
- Example from code:
  ```typescript
  const isSuperAdmin = u && (u.is_super_admin || u.isSuperAdmin);
  if (!isSuperAdmin && selectedBusinessId) {
      // Filter by business
      s = s.filter((sale: any) => sale.business_id === selectedBusinessId);
  } else if (isSuperAdmin) {
      // Show ALL data from all companies
  }
  ```

---

## 2. ✅ View Invoice Opens in New Window
**Status:** FIXED

**Files Modified:**
- `pages/ServiceHistory.tsx`

**Changes:**
- Replaced the modal dialog that appeared when clicking "View Invoice" button
- Now opens invoice in a new browser window instead (similar to `SalesHistory.tsx`)
- Window displays A4-formatted invoice with print functionality
- User can print or close the window as needed

**Implementation:**
- Removed state variables: `showDocModal`, `docType`, `viewingSale`
- Removed 100+ lines of modal JSX and CSS
- Refactored `handleViewDocument()` to use `window.open()` with formatted HTML
- Invoice opens in window named 'ServiceInvoice' with dimensions 900x700

---

## 3. ✅ Delete Invoice Button Visibility
**Status:** FIXED

**Files Modified:**
- `pages/ServiceHistory.tsx` (line 557)
- `pages/SalesHistory.tsx` (line 505)

**Changes:**
- Delete button now visible to both Super Admin AND regular Admin users
- Previous condition: Only `is_super_admin`
- New condition: `is_super_admin` OR has `roleId` (indicating regular admin)

**Before:**
```typescript
{currentUser && currentUser.is_super_admin && (
    <button onClick={() => handleDeleteSale(s.id)}>
        <Trash2 size={16} /> Delete
    </button>
)}
```

**After:**
```typescript
{currentUser && (currentUser.is_super_admin || currentUser.roleId) && (
    <button onClick={() => handleDeleteSale(s.id)}>
        <Trash2 size={16} /> Delete
    </button>
)}
```

---

## Testing Recommendations
1. **Super Admin Access:** Log in as super admin and verify you can see data from all organizations
2. **Invoice Window:** Click "View Invoice" button and verify it opens in a new window (not modal)
3. **Delete Button:** Log in as regular admin and verify Delete button appears for sales/service invoices

---

## Files Changed
- `pages/ServiceHistory.tsx` - Modified significantly (removed ~100 lines of modal code)
- `pages/SalesHistory.tsx` - Minor change to delete button visibility condition
