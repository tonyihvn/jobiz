# Quick Testing Guide - All 4 Fixes

## Issue 1: Mobile Sidebar Auto-Collapse ✅ FIXED

### How to Test:
1. Open your app in mobile view (< 768px width)
   - Desktop: Press F12, then click device toolbar icon or Ctrl+Shift+M
   - Or resize browser to mobile size

2. Verify sidebar is collapsed by default on mobile

3. Click any menu item (Dashboard, POS, Inventory, etc.)

4. **Expected Result:** Sidebar automatically closes, page content fully visible

### Before Fix:
- Sidebar stays open after clicking menu
- Content partially hidden behind sidebar on mobile

### After Fix:
- Sidebar auto-collapses on menu click
- Full page content visible immediately

---

## Issue 2: Company Name Wrapping ✅ FIXED

### How to Test:
1. Navigate to your app dashboard
2. Look at the company name in top-left corner of sidebar
3. If company name is long, it should wrap to multiple lines
4. The collapse/expand button should always be visible

### Before Fix:
- Long company name: "My Very Long Company Name Inc LLC" → hidden/truncated
- Collapse button sometimes hidden

### After Fix:
- Long company name: "My Very Long Company" (wraps to line 2) "Name Inc LLC"
- Collapse button always visible

---

## Issue 3: OTP Delivery After Registration ✅ FIXED

### How to Test (CRITICAL):

#### Step 1: Register New Account
1. Go to http://localhost:3000/#/register
2. Fill in registration form with:
   - Business Name: "Test Business"
   - Admin Email: "test@example.com"
   - Admin Phone: **08012345678** (or any Nigerian number with 0 or +234 prefix)
   - Password: "Test@123456"
   - Confirm Password: "Test@123456"
3. Click "Register Business"

#### Step 2: Verify Step 2 Screen Appears
- Should see "Registration Successful! 🎉"
- Should see two verification options:
  - Email verification (via link)
  - Phone verification (via OTP)

#### Step 3: Check for OTP
**Option A - Via SMS (Production):**
- Check your phone for SMS from GINTEC
- Message should contain: "Your JOBIZ verification code is: XXXXXX"
- OTP is valid for 10 minutes

**Option B - Via Server Logs (Development/Debug):**
1. Open terminal running your Node.js server
2. Look for logs like:
   ```
   ✅ OTP stored in database for phone: 2348012345678 OTP: 123456
   ✅ OTP send result: { success: true, ... }
   ```
3. Or fallback message:
   ```
   📱 [SMS FALLBACK - Development Mode] OTP/Message for 2348012345678: Your JOBIZ verification code is: 123456
   ```

#### Step 4: Verify OTP Works
1. Enter the 6-digit OTP in the form
2. Click "Verify OTP"
3. **Expected:** Redirected to login page with success message
4. You can now log in with your credentials

### Before Fix:
- OTP might not be generated
- Registration would complete but no OTP available
- User stuck unable to verify
- Server would throw "SMS provider not configured" error

### After Fix:
- OTP ALWAYS generated and stored
- SMS sent via SMSLive247 (production)
- Fallback to console logging if SMS fails
- User can complete verification via either email or phone

---

## Issue 4: Hero Background Opacity ✅ VERIFIED (No Changes Needed)

### Current Status: ✅ ALREADY WORKING CORRECTLY

### How to Verify:
1. Go to http://localhost:3000/#/super-admin/landing-config
2. Upload an image in "Hero Background Image" field
3. Adjust sliders:
   - "Opacity" (0-100%)
   - "Transparency" (0-100%)
4. Scroll down to view hero section
5. **Expected:**
   - Hero background image opacity changes with slider
   - Carousel images BELOW hero are NOT affected
   - Carousel images remain clear and full opacity

### Visual Check:
- Hero section: Shows background image with adjusted opacity
- Carousel section below: Images remain clear with no opacity effect

---

## Server Logs to Watch For

### OTP Registration Logs:
```
✅ OTP stored in database for phone: 2348012345678 OTP: 123456
✅ OTP send result: { success: true, ... }
```

### SMS Sending Logs:
```
✅ SMS sent successfully to 2348012345678
```

### Fallback Logs (if SMS fails):
```
📱 [SMS FALLBACK - Development Mode] OTP/Message for 2348012345678: Your JOBIZ...
⚠️ SMS provider not fully configured. To enable SMS:
   1. Set SMS_PROVIDER=smslive247
   2. Set SMSLIVE_API_KEY=your_api_key
```

### Error Logs (to fix):
```
❌ Failed to send OTP to 2348012345678: [error details]
```

---

## Troubleshooting

### Issue: OTP not received via SMS
**Solution:**
1. Check `.env` file has:
   - `SMS_PROVIDER=smslive247` ✓
   - `SMSLIVE_API_KEY=MA-5757d667-...` ✓
   - `SMSLIVE_SENDER=GINTEC` ✓

2. Check server logs for OTP code
3. Check phone number format (must be Nigerian: 08... or +234...)
4. Verify phone number is not already registered

### Issue: Sidebar not collapsing on mobile
**Solution:**
1. Check browser width is < 768px
2. Clear browser cache (Ctrl+Shift+Delete)
3. Refresh page (Ctrl+R or Cmd+R)

### Issue: Company name still truncated
**Solution:**
1. Clear browser cache
2. Hard refresh page (Ctrl+Shift+R)
3. Check if company name is actually long (test with 30+ chars)

### Issue: Hero opacity affecting carousel
**Solution:**
This should NOT happen. If it does:
1. Check browser console for errors (F12)
2. Report issue with screenshot

---

## Success Criteria

✅ All 4 fixes are working when:

1. **Mobile Sidebar:** Closes automatically after clicking menu on small screens
2. **Company Name:** Long names wrap instead of being hidden
3. **OTP Delivery:** New users receive OTP after registration
4. **Hero Opacity:** Only hero background is affected, not carousel

---

## Quick Video Test Steps (If Needed)

### 60-Second Test:
1. Register new account with phone number (20 sec)
2. Check for SMS or server logs (20 sec)
3. Enter OTP and verify (20 sec)

### 5-Minute Full Test:
1. Test mobile sidebar collapse (1 min)
2. Test company name wrapping (1 min)
3. Register and verify OTP (2 min)
4. Test hero opacity in admin panel (1 min)

---

**Need Help?**
- Check server console logs (Node.js terminal)
- Check browser console logs (F12)
- Review FIXES_SUMMARY.md for detailed changes
- Verify .env file has SMS provider configured
