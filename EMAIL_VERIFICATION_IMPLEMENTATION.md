# Email Verification & Payment Approval System - Implementation Complete

## Overview
Implemented a comprehensive three-stage account activation system:
1. **Email Verification** - Users must verify their email before accessing the app
2. **Payment Processing** - Users submit payment details for review
3. **Admin Approval** - Super admin approves payment and activates account

## Database Changes (schema.sql)

### Modified: `employees` table
Added four new fields:
```sql
email_verified TINYINT(1) DEFAULT 0,
email_verified_at TIMESTAMP NULL,
account_approved TINYINT(1) DEFAULT 0,
account_approved_at TIMESTAMP NULL
```

### New: `email_verification_tokens` table
Stores secure verification tokens with 24-hour expiry:
```sql
CREATE TABLE email_verification_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_token (token),
  KEY idx_expires (expires_at),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
)
```

### New: `business_payments` table
Tracks subscription and one-time payments with approval workflow:
```sql
CREATE TABLE business_payments (
  id VARCHAR(255) PRIMARY KEY,
  business_id VARCHAR(255) NOT NULL,
  payment_type ENUM('subscription', 'one-time') NOT NULL,
  plan_id VARCHAR(100),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_by VARCHAR(255),
  approved_at TIMESTAMP NULL,
  billing_cycle_start DATE,
  billing_cycle_end DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_business (business_id),
  KEY idx_status (status),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES super_admin(id)
)
```

## Backend API Endpoints (server.js)

### 1. POST `/api/verify-email`
**Purpose**: Confirm email verification token and mark email as verified
**Request**: 
```json
{ "token": "hex_token_string" }
```
**Response** (Success):
```json
{ "success": true, "message": "Email verified successfully!" }
```
**Response** (Error):
```json
{ "error": "Invalid or expired verification token" }
```
**Logic**:
- Finds valid, non-expired token in `email_verification_tokens`
- Updates `employees.email_verified = 1` and `email_verified_at`
- Deletes used token from database
- Prevents token reuse

### 2. POST `/api/add-payment` (Requires Auth)
**Purpose**: Submit payment details for new registration
**Request**:
```json
{
  "paymentType": "subscription",
  "planId": "starter",
  "amount": 9.99,
  "cardLastFour": "4242",
  "cardBrand": "visa",
  "billingCycleStart": "2024-01-01",
  "billingCycleEnd": "2024-02-01"
}
```
**Response** (Success):
```json
{
  "success": true,
  "paymentId": "payment_1702882400000",
  "message": "Payment details submitted for approval"
}
```
**Logic**:
- Gets user's business_id from employees table
- Creates payment record with status='pending'
- Stores card details (last 4 digits only for PCI compliance)
- Timestamps creation for audit trail

### 3. GET `/api/user-payment` (Requires Auth)
**Purpose**: Retrieve user's pending payment status
**Response**:
```json
{
  "payment": {
    "id": "payment_xxx",
    "status": "pending",
    "amount": 29.99,
    "approved_at": null
  }
}
```

### 4. GET `/api/super-admin/pending-payments` (Super Admin Only)
**Purpose**: List all pending payments awaiting approval
**Response**:
```json
{
  "payments": [
    {
      "id": "payment_1",
      "business_id": "bus_1",
      "businessName": "ABC Corp",
      "businessEmail": "admin@abccorp.com",
      "payment_type": "subscription",
      "amount": 29.99,
      "card_last_four": "4242",
      "card_brand": "visa",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 5. POST `/api/super-admin/approve-payment/:paymentId` (Super Admin Only)
**Purpose**: Approve payment and activate user account
**Logic**:
- Updates payment status to 'approved'
- Sets `approved_by` to super admin ID
- Sets `approved_at` to current timestamp
- Updates all employees with matching business_id:
  - `account_approved = 1`
  - `account_approved_at = NOW()`
- Updates business record to `paymentStatus = 'paid'`
- Triggers notification email to user

### 6. POST `/api/super-admin/reject-payment/:paymentId` (Super Admin Only)
**Purpose**: Reject payment with optional reason
**Request**:
```json
{ "reason": "Invalid card details" }
```
**Logic**:
- Updates payment status to 'rejected'
- Records super admin ID who rejected it
- Stores timestamp for audit trail

## Modified Login Flow (`/api/login`)

Enhanced validation checks:
```
1. Verify user credentials (email + password)
2. Check email_verified = 1
   → If false: return 403 { errorCode: "EMAIL_NOT_VERIFIED" }
3. Check account_approved = 1
   → If false: return 403 { errorCode: "ACCOUNT_NOT_APPROVED" }
4. Generate JWT token
5. Return success response
```

## Modified Registration Flow (`/api/register`)

Enhanced process:
```
1. Validate company name and email
2. Hash password with bcrypt
3. Create employee record with:
   - email_verified = 0
   - account_approved = 0
4. Generate 32-byte random verification token (hex encoded)
5. Store token in email_verification_tokens table with 24-hour expiry
6. Send verification email with link:
   {APP_URL}/verify-email?token={verificationToken}
7. Send super admin notification about new registration
8. Return response with status: "pending_verification"
```

## Frontend Components

### 1. VerifyEmail.tsx (New)
**Location**: `pages/VerifyEmail.tsx`
**Purpose**: Handle email verification from link in email
**Features**:
- Extracts token from URL query parameter
- Shows loading state while verifying
- Displays success message with redirect to payment form
- Displays error for expired/invalid tokens
- Auto-redirects to `/payment-registration` on success

### 2. PaymentRegistration.tsx (New)
**Location**: `pages/PaymentRegistration.tsx`
**Purpose**: Multi-step payment form after email verification
**Steps**:
1. **Plan Selection**: Choose Starter ($9.99), Professional ($29.99), or Enterprise ($99.99)
2. **Payment Type**: Select subscription or one-time payment
3. **Card Details**: Enter card number, expiry, CVC, cardholder name
4. **Success**: Confirmation message with redirect instructions

**Features**:
- Card brand detection (Visa, Mastercard, Amex, Discover)
- Last 4 digits extraction for secure storage
- Responsive design with validation
- Error handling and retry capability

### 3. Updated Register.tsx
**Changes**:
- Enhanced success screen to explain email verification steps
- Shows user the email they registered with
- Displays clear next steps: verify email → payment → admin approval
- Better visual hierarchy with numbered steps

### 4. Updated SuperAdminPayments.tsx
**Enhancements**:
- Complete payment management interface
- Filter by status: pending, approved, rejected, all
- Display payment type (subscription/one-time)
- Show card details (last 4 digits + brand)
- Approval flow with rejection reason input
- Success/error feedback on actions

### Updated App.tsx
**Routes Added**:
```tsx
<Route path="/verify-email" element={<VerifyEmail />} />
<Route path="/payment-registration" element={<PaymentRegistration />} />
```

## Flow Diagram

```
New User Registration
        ↓
    Registration Form (Step 1)
        ↓
    Verification Email Sent
    (contains token link)
        ↓
    User Clicks Email Link
    /verify-email?token=xxx
        ↓
    VerifyEmail Component
    Validates & Confirms Email
        ↓
    Redirects to /payment-registration
        ↓
    PaymentRegistration Component
    (Plan Selection → Card Details)
        ↓
    Payment Record Created
    (status = 'pending')
        ↓
    Super Admin Notification
        ↓
    SuperAdminPayments UI
    (Shows pending payments)
        ↓
    Super Admin Reviews & Approves
        ↓
    employees.account_approved = 1
    businesses.paymentStatus = 'paid'
        ↓
    Approval Email Sent to User
        ↓
    User Can Now Login
    (email_verified = 1 ✓)
    (account_approved = 1 ✓)
        ↓
    Dashboard Access Granted
```

## Security Considerations

1. **Token Generation**: Uses `crypto.randomBytes(32)` for secure 64-character hex tokens
2. **Token Expiry**: 24-hour expiration window prevents indefinite token validity
3. **One-Time Use**: Tokens deleted after successful verification prevent reuse
4. **Card Data**: Only last 4 digits stored in database (PCI DSS compliance)
5. **Authentication**: All payment endpoints require JWT authentication
6. **Authorization**: Super admin endpoints require superAdminAuthMiddleware
7. **Rate Limiting**: Suggest implementing on verification endpoint to prevent token brute force

## User Notifications

### Email 1: Verification Email
- Sent immediately after registration
- Contains clickable verification link
- 24-hour expiry warning

### Email 2: Super Admin Notification
- Alerts super admin of new registration
- Contains business details and payment pending notification

### Email 3: Payment Approval Email
- Sent when super admin approves payment
- Confirms account activation
- Invites user to login

## Testing Checklist

- [ ] User can register with valid credentials
- [ ] Verification email sent to correct address
- [ ] Verification link works and marks email_verified
- [ ] Invalid/expired tokens show error
- [ ] Payment form displays after email verification
- [ ] Payment submission creates pending record
- [ ] Super admin sees pending payments
- [ ] Super admin can approve payments
- [ ] Super admin can reject payments with reason
- [ ] Approved users can login successfully
- [ ] Unverified users blocked from login
- [ ] Unapproved users blocked from login (even with verified email)
- [ ] Login shows appropriate error messages for each blocked case

## Next Steps (Optional Enhancements)

1. **Email Verification Resend**: Add option to resend verification email
2. **Payment Method Storage**: Implement Stripe/Payment Gateway integration
3. **Automated Email Reminders**: Remind users of pending approvals
4. **Payment History**: Show payment records in user Settings
5. **Subscription Management**: Handle plan upgrades/downgrades
6. **Invoice Generation**: Create PDF invoices for payments
7. **Webhook Integration**: Handle payment provider callbacks
8. **Email Templates**: Move to template engine (Handlebars/EJS)
