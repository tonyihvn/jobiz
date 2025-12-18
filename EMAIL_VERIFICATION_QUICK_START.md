# Email Verification & Payment System - Quick Start Guide

## What Changed

Your application now requires users to:
1. **Verify their email** before they can access anything
2. **Submit payment details** as part of registration
3. **Get approved by super admin** before dashboard access

## User Registration Flow (NEW)

### Step 1: Register
User fills out registration form with:
- Business name
- Email address
- Password

### Step 2: Check Email ✉️
A verification email is sent automatically with:
- Clickable verification link
- 24-hour expiry warning

### Step 3: Verify Email
User clicks the link from email → Email is confirmed

### Step 4: Add Payment Details 💳
User selects a plan and enters card details:
- **Starter**: $9.99/month
- **Professional**: $29.99/month  
- **Enterprise**: $99.99/month

Payment Type options:
- Subscription (recurring monthly)
- One-time payment

### Step 5: Super Admin Review ⏳
Super admin sees payment in `/super-admin/payments` panel and:
- Approves the payment → Account activated ✓
- Rejects the payment → Requires new registration

### Step 6: User Receives Activation Email
Once approved, user gets email saying account is ready

### Step 7: User Can Login 🎉
User logs in with email + password and accesses dashboard

## Login Changes

Users trying to log in will see:

**Case 1**: Email not verified
- Error: "Please verify your email first. Check your inbox for the verification link."
- Solution: Click link in verification email

**Case 2**: Account not approved
- Error: "Your account is pending approval. You'll receive an email once it's activated."
- Solution: Wait for super admin to approve payment

**Case 3**: Everything good
- Success → Redirect to dashboard

## Super Admin Tasks

### New Payment Management Page
Located at: `/super-admin/payments`

**Tasks:**
1. Review pending payments
2. Click "Approve" → User gets activated email
3. Click "Reject" → (Optional) add rejection reason

**Payment Details Shown:**
- Business name & email
- Amount & payment type
- Card brand & last 4 digits
- Submission date

## File Changes Summary

### New Files Created
```
pages/VerifyEmail.tsx              → Email verification UI
pages/PaymentRegistration.tsx      → Payment form UI
EMAIL_VERIFICATION_IMPLEMENTATION.md  → Full technical docs
```

### Modified Files
```
server.js                 → Added 6 new API endpoints
schema.sql               → Added 2 new tables, 4 new employee fields
App.tsx                  → Added 2 new routes
pages/Register.tsx       → Updated success message
pages/SuperAdminPayments.tsx  → Complete redesign with new payment workflow
```

### No Changes (Working As Before)
```
pages/Dashboard.tsx
pages/Login.tsx (Enhanced with new error handling)
pages/Settings.tsx
All other pages remain functional
```

## API Endpoints Added

### Public Endpoints
- `POST /api/verify-email` - Confirm email from link
- `POST /api/add-payment` - Submit payment details

### Super Admin Endpoints
- `GET /api/super-admin/pending-payments` - View pending payments
- `POST /api/super-admin/approve-payment/:id` - Approve payment
- `POST /api/super-admin/reject-payment/:id` - Reject payment

### Helper Endpoints
- `GET /api/user-payment` - Get user's payment status

## Testing the System

### Test as New User
1. Go to `/landing` → Click "Get Started"
2. Register with test email & password
3. Check inbox for verification email (check spam folder!)
4. Click verification link
5. Select plan & enter test card details:
   - Card Number: 4532123456789010
   - Expiry: 12/25
   - CVC: 123
   - Name: Test User
6. Submit → See "Payment submitted for approval"

### Test as Super Admin
1. Log in as super admin
2. Go to `/super-admin/payments`
3. See pending payments from step above
4. Click "Approve" on payment
5. Go back to test user email
6. Should receive approval email

### Test User Login
After approval:
1. Go to `/login`
2. Enter test user's email & password
3. Should login successfully → Dashboard shows
4. Try logging in before approval:
   - Error: "Account pending approval"

## Database Checks

Check if setup worked:

```sql
-- Check verification tokens
SELECT * FROM email_verification_tokens;

-- Check employee verification status
SELECT id, email, email_verified, account_approved FROM employees LIMIT 5;

-- Check payments
SELECT id, business_id, amount, status FROM business_payments;
```

## Common Issues & Solutions

**Issue**: Verification email not received
- **Solution**: Check spam/junk folder, resend verification email feature can be added later

**Issue**: User can't login even after approval
- **Solution**: Clear browser cache, check both `email_verified=1` AND `account_approved=1` in database

**Issue**: Super admin doesn't see payments
- **Solution**: Ensure super admin is logged in, payments table has records with correct status

**Issue**: Payment amount wrong
- **Solution**: Verify plan_id matches the selected plan amount

## Environment Variables Check

Make sure your `.env` has these set:
```
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
APP_URL=http://localhost:5173 (or your app URL)
```

## Visual Workflow

```
Registration Page
    ↓
Verify Email Page (auto-redirect from email link)
    ↓
Payment Registration Page
    ↓
Success Message
    ↓
(Super Admin approves in background)
    ↓
User receives approval email
    ↓
User logs in successfully
    ↓
Dashboard Access ✓
```

## Next Steps for You

1. **Test the complete flow** as a new user and super admin
2. **Verify database records** are created correctly
3. **Check email delivery** (especially verification emails)
4. **Customize payment plans** if needed (edit in PaymentRegistration.tsx)
5. **Set up email templates** for better branding
6. **Configure environment variables** for email service

## Support Notes

- All tokens expire after 24 hours
- Users can't login until BOTH email_verified=1 AND account_approved=1
- Card details are never stored in full (only last 4 digits)
- Payment status can be tracked in Super Admin panel
- Rejection reasons are stored for audit trail
