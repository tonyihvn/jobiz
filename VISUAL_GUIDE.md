# Super Admin Feature - Visual Guide

## 🎨 User Interface Flow

### Super Admin Sidebar (Expanded View)
```
┌─────────────────────────────────────┐
│ 🏢 Super Admin                       │
│    Selected: Acme Corp               │
├─────────────────────────────────────┤
│                                      │
│ ▼ Select Business              ⬇️    │◄── NEW: Business Switcher
│   [Acme Corp]                       │
│   [Tech Solutions]                  │
│   [Global Services]                 │
│                                      │
├─────────────────────────────────────┤
│ MAIN                                 │
│ • Dashboard                          │
│                                      │
│ SALES & FRONT OFFICE                │
│ • Storefront (POS)                  │
│ • Sales History                     │
│ • Service History                   │
│                                      │
│ INVENTORY & STOCK                   │
│ • Stock Management                  │
│ • Suppliers                         │
│                                      │
│ CRM & TASKS                          │
│ • Clients                           │
│ • Communication                     │
│ • Tasks & Memos                     │
│ • Categories                        │
│                                      │
│ ADMINISTRATION                       │
│ • Finance & HR                      │
│ • Reports                           │
│ • Audit Trails                      │
│ • Roles & Admin                     │
│ • App Settings                      │
│                                      │
│ ✨ SUPER ADMIN CONTROLS              │◄── NEW: Super Admin Section
│ • Approvals                         │
│ • Payments                          │
│ • Activation                        │
│ • Feedbacks                         │
│ • Business Data                     │
│                                      │
├─────────────────────────────────────┤
│ SA Logout                            │
└─────────────────────────────────────┘
```

## 📊 Dashboard Tabs

### Original (3 Tabs)
```
[Alerts] [Tenants] [Plans]
```

### Enhanced (8 Tabs)
```
[Alerts] [Tenants] [Plans] [Approvals] [Payments] [Activation] [Feedbacks] [Business Data]
```

## 📱 Business Switcher Detail

### Closed State
```
┌──────────────────────────────────────────┐
│ [🏢] Select Business              [v]    │
└──────────────────────────────────────────┘
```

### Open State
```
┌──────────────────────────────────────────┐
│ [🏢] Select Business              [^]    │
├──────────────────────────────────────────┤
│ [✓] Acme Corp                           │◄── Currently Selected (Blue bg)
│     admin@acme.com                      │
│                                          │
│ [ ] Tech Solutions                      │
│     contact@techsol.com                 │
│                                          │
│ [ ] Global Services                     │
│     hello@global.com                    │
│                                          │
│ [ ] Digital Agency                      │
│     support@agency.com                  │
└──────────────────────────────────────────┘
```

## 🎯 Feature Screens

### Approvals Tab
```
Currently managing: ✓ Acme Corp

Status                    Payment Status
┌──────────────────┐    ┌──────────────────┐
│ Active           │    │ Pending Verif.   │
│ (green badge)    │    │ (amber badge)    │
└──────────────────┘    └──────────────────┘
```

### Payments Tab
```
Currently managing: ✓ Acme Corp

┌─────────────────────────────────────┐
│ Plan: Premium Monthly               │
│ Subscription Expiry: Dec 17, 2025   │
│ Status: Paid ✓                      │
├─────────────────────────────────────┤
│ [👁️] View Receipt                    │
└─────────────────────────────────────┘
```

### Activation Tab
```
Currently managing: ✓ Acme Corp

┌─────────────────────────────────────┐
│ [🔴 Suspend Business]  (if active)  │
│                                     │
│ or                                  │
│                                     │
│ [🟢 Activate Business]  (if inactive)│
│                                     │
│ [✓ Verify & Activate Payment]      │
│    (if pending_verification)        │
└─────────────────────────────────────┘
```

### Feedbacks Tab
```
Feedback #1                          Dec 15, 2024
┌─────────────────────────────────────────────┐
│ Name: John Smith                            │
│ Email: john@example.com                     │
│                                             │
│ Message:                                    │
│ "Great service! Love the interface..."     │
└─────────────────────────────────────────────┘

Feedback #2                          Dec 14, 2024
┌─────────────────────────────────────────────┐
│ Name: Sarah Jones                           │
│ Email: sarah@test.com                       │
│                                             │
│ Message:                                    │
│ "Would like to see more integrations..."   │
└─────────────────────────────────────────────┘
```

### Business Data Tab
```
Currently viewing: ✓ Acme Corp

Products (23)
┌────────────────────────────────────────┐
│ Product      │ Category  │ Price │ Stock │
├────────────────────────────────────────┤
│ Widget A     │ Tools     │ $29   │ 150   │
│ Gadget Pro   │ Tech      │ $199  │ 45    │
│ Service Pack │ Services  │ $99   │ 200   │
│ ...          │ ...       │ ...   │ ...   │
└────────────────────────────────────────┘

Recent Sales (47)
┌────────────────────────────────────────┐
│ Date      │ Items │ Total  │ Payment    │
├────────────────────────────────────────┤
│ Dec 15    │ 3     │ $450   │ Cash       │
│ Dec 14    │ 5     │ $1,250 │ Card       │
│ Dec 13    │ 2     │ $300   │ Mobile Pay │
│ ...       │ ...   │ ...    │ ...        │
└────────────────────────────────────────┘
```

## 🔄 Data Flow Diagram

```
┌─────────────────┐
│   Super Admin   │
│     Login       │
└────────┬────────┘
         │
         ▼
    ┌────────────┐
    │ isSuperAdmin
    │   = true   │
    └────┬───────┘
         │
         ▼
  ┌──────────────────┐
  │ Load Businesses  │
  │ from API         │
  └────┬─────────────┘
       │
       ▼
 ┌─────────────────────┐
 │ Check localStorage  │
 │ for last business   │
 └────┬────────────────┘
      │
      ▼
 ┌─────────────────────────┐
 │ Set selectedBusiness    │
 │ (last or first in list) │
 └────┬────────────────────┘
      │
      ▼
 ┌──────────────────────────┐
 │ Show Business Switcher   │
 │ + Super Admin Menu       │
 └────┬─────────────────────┘
      │
      ├──────────────────┬──────────────────┐
      │                  │                  │
      ▼                  ▼                  ▼
  Click Menu      Click Switcher       Access Page
  Item                Button           as Regular User
      │                  │                  │
      ▼                  ▼                  ▼
  Load Page      Show Business      Get Data via API
  with Data      Dropdown List      (filtered by
  Filtered by         │            selectedBusiness)
  selected       Select New            │
  Business       Business              ▼
      │              │            Display Filtered
      ▼              ▼            Business Data
  Display        Update Context
  Business       & localStorage
  Data              │
                    ▼
               All pages update
               to show new
               business data
```

## 💾 LocalStorage Behavior

### Initial Login
```
User logs in as super admin
         ↓
No localStorage key exists
         ↓
First business auto-selected
         ↓
localStorage set to: { omnisales_last_business_id: "business_1" }
```

### Subsequent Login
```
User logs in
         ↓
Check localStorage
         ↓
Found: "business_2"
         ↓
Auto-select business_2
         ↓
If business_2 no longer exists, select first in list
```

### Switching Business
```
User clicks switcher dropdown
         ↓
Selects "Tech Solutions"
         ↓
setSelectedBusiness(techSolutions)
         ↓
Context triggers re-render
         ↓
localStorage updated to: "tech_solutions_id"
         ↓
All pages fetch new data
```

## 🎭 Response to Actions

### Action: Switch to Business A → Click Inventory
```
Step 1: User clicks "Tech Solutions" in switcher
        └─ selectedBusiness = Tech Solutions
        └─ localStorage = "tech_sol_id"

Step 2: User clicks "Inventory" menu
        └─ Inventory.tsx loads

Step 3: db.products.getAll() called
        └─ Backend should filter: WHERE businessId = "tech_sol_id"

Step 4: Products table shows only Tech Solutions items
        └─ Can add/edit/delete products for this business

Step 5: User switches to Acme Corp
        └─ selectedBusiness = Acme Corp
        └─ localStorage = "acme_id"

Step 6: Same Inventory page now shows Acme Corp products
        └─ No page reload needed (context updates)
```

## 🎨 Color Scheme

| Element | Color | Purpose |
|---------|-------|---------|
| Business Switcher | slate-800/700 | Neutral, secondary control |
| Selected Business | indigo-600 | Brand highlight |
| Active Menu Item | indigo-600 | Current page indicator |
| Alerts/Warnings | amber-500 | Pending actions |
| Success | emerald-500 | Completed actions |
| Danger | rose-500 | Error/suspension |
| Sidebar | slate-900 | Professional, dark |

## 📱 Responsive Behavior

### Desktop (Wide Screen)
```
┌─────────────────────────────────────────────────────────┐
│ [Logo] Acme Corp | Sidebar | [  Main Content Area     ] │
│ [▼ Select Business]         | [  All tabs visible      ] │
│ • Dashboard                 | [  Full table width      ] │
│ • Inventory                 | [  All features enabled  ] │
│ • Reports                   | [  Buttons side-by-side  ] │
└─────────────────────────────────────────────────────────┘
```

### Tablet (Medium Screen)
```
┌──────────────────────────┐
│ [Logo] [▼] | Content     │
│ • Dashboard              │
│ • Inventory              │
│ • Reports                │
└──────────────────────────┘
```

### Mobile (Small Screen - Collapsed)
```
┌──────────┐
│ [🏢]|Tab │  ◄─── Business icon (switcher still works)
│ • [icon] │
│ • [icon] │  ◄─── Minimal text
│ • [icon] │
└──────────┘
```

## 🔔 Visual Feedback

### Business Switcher Hover
```
Before: [🏢] Select Business              [v]
After:  [🏢] Select Business              [v]  ◄─── bg-slate-700
        └─ Cursor changes to pointer
```

### Dropdown Item Selection
```
Unselected: [ ] Tech Solutions
            └─ Normal text color

Selected:   [✓] Acme Corp           ◄─── bg-indigo-600, white text
            └─ Highlighted with brand color

Hover:      [ ] Global Services      ◄─── bg-slate-700 (on unselected)
            └─ Slight background highlight
```

### Approval Button States
```
Default:     [Verify & Activate]       ◄─── emerald-600
Hover:       [Verify & Activate]       ◄─── emerald-700 (darker)
Active:      [Verify & Activate]       ◄─── Slightly pressed
Disabled:    [Verify & Activate]       ◄─── opacity-50, cursor-not-allowed
```

---

This visual guide helps understand the UI layout, data flow, and user interactions for the super admin feature.
