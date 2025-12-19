# Phone OTP Verification Feature

## Overview
Users can now choose between **Email** or **Phone (SMS)** verification during registration. This provides a more flexible and robust verification experience, especially for users who don't receive verification emails.

## Features Implemented

### 1. **Phone Number Field on Registration Page**
- New optional phone number input field on the registration form
- Automatically formats phone numbers with +234 country code prefix
- Removes leading 0 if present (e.g., 08123456789 → +2348123456789)
- Validation: Requires at least 10 digits if using phone verification

### 2. **Verification Method Selection**
- Radio buttons to choose between "Email" or "Phone (SMS)" verification
- Phone option is disabled until phone number is entered
- Default is Email for backward compatibility

### 3. **Multi-Step Registration Flow**

#### Step 1: Registration Form
- Collect: Business Name, Email, Phone (optional), Password, Confirmation Password
- Validate password policy (8+ chars, uppercase, lowercase, number, special char)
- Validate phone number format (if phone verification selected)

#### Step 2: Email Verification (if Email selected)
- Success screen with verification email message
- Option to resend email if not received
- Check spam folder reminder

#### Step 3: Phone OTP Entry (if Phone selected)
- 6-digit OTP input screen
- Clear display of phone number being used
- Resend code button
- OTP validation in real-time

#### Step 4: Success Screen
- Confirmation of successful verification
- Proceed to payment button

### 4. **Backend Endpoints**

#### `/api/register` (Updated)
**Method:** POST
**Parameters:**
```json
{
  "companyName": "string",
  "email": "string",
  "password": "string",
  "phone": "string (optional, +234 format)"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Registration successful"
}
```

#### `/api/send-otp` (New)
**Method:** POST
**Parameters:**
```json
{
  "phone": "string (+234 format)"
}
```
**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your phone"
}
```
**Features:**
- Generates random 6-digit OTP
- OTP expires in 10 minutes
- Stores OTP in `phone_otp_tokens` table
- Sends SMS via SMSLive247 API
- Falls back to console logging if SMS not configured

#### `/api/verify-otp` (New)
**Method:** POST
**Parameters:**
```json
{
  "phone": "string (+234 format)",
  "otp": "string (6 digits)"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Phone verified successfully. You can now proceed to payment."
}
```
**Features:**
- Validates OTP format (6 digits)
- Checks OTP expiry (10 minutes)
- Enforces attempt limit (max 5 attempts)
- Marks phone as verified in database
- Increments attempt counter on wrong OTP

### 5. **Database Changes**

#### New Table: `phone_otp_tokens`
```sql
CREATE TABLE IF NOT EXISTS phone_otp_tokens (
  id VARCHAR(255) PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  phone VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  attempts INT DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (phone),
  INDEX (employee_id),
  INDEX (expires_at),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
```

#### Updated Table: `employees`
- Added `phone_verified` (TINYINT(1), default 0)
- Added `phone_verified_at` (TIMESTAMP NULL)

## Usage Flow

### For Users Choosing Phone Verification

1. **On Registration Page:**
   - Fill in business name, email, password
   - Enter phone number (e.g., "08012345678" or "+2348012345678")
   - Select "Phone (SMS)" verification method
   - Click "Register Business"

2. **After Registration:**
   - Automatically receives 6-digit OTP via SMS
   - Enters OTP on the "Verify Your Phone" screen
   - Can resend code if not received
   - Upon successful verification, sees success screen
   - Clicks "Proceed to Payment" to continue

### For Users Choosing Email Verification (Default)

- Follows existing email verification flow
- Receives verification email
- Can resend if not received
- Clicks link in email to verify

## Configuration

### SMS Provider Setup

**Required Environment Variables:**
```env
SMS_PROVIDER=smslive247
SMSLIVE_API_KEY=MA-5757d667-9fa8-4a93-ae98-65334712bb09
SMSLIVE_SENDER=INFO
```

### SMS Sending Logic
- Uses SMSLive247 API for production
- Falls back to console logging in development (if SMS not configured)
- 10-second timeout to prevent hanging
- Detailed logging for debugging

## Security Features

1. **OTP Security:**
   - 6-digit random OTP (1 in 1 million)
   - 10-minute expiry
   - Max 5 attempt limit
   - Prevents brute force attacks

2. **Phone Number Validation:**
   - Requires country code (+234) or local format (0xxx)
   - Normalizes to international format
   - Prevents invalid entries

3. **Rate Limiting:**
   - OTP expires after 10 minutes
   - 5 attempt limit per OTP
   - Users can request new OTP

4. **Database:**
   - Attempt count tracked
   - Verified timestamp recorded
   - Employee linked to verification token

## Testing Checklist

- [ ] Register with email verification
- [ ] Register with phone verification
- [ ] Verify OTP correctly
- [ ] Attempt wrong OTP (should increment attempts)
- [ ] Try OTP after expiry (10+ minutes)
- [ ] Exceed attempt limit (5 attempts)
- [ ] Phone number formatting:
  - [ ] 08012345678 → +2348012345678
  - [ ] +2348012345678 → +2348012345678
  - [ ] 2348012345678 → +2348012345678
- [ ] SMS delivery (if configured)
- [ ] Resend OTP functionality
- [ ] Database records created correctly

## Files Modified

1. **schema.sql**
   - Added `phone_verified` and `phone_verified_at` to `employees` table
   - Added new `phone_otp_tokens` table

2. **server.js**
   - Updated `/api/register` endpoint to accept phone parameter
   - Added `/api/send-otp` endpoint
   - Added `/api/verify-otp` endpoint

3. **pages/Register.tsx**
   - Added phone number input field
   - Added verification method selection (Email/Phone radio)
   - Added OTP input and verification screen (Step 3)
   - Updated success screen for both email and phone flows
   - Updated step management (4 steps total now)

4. **services/auth.ts**
   - Updated `register()` function to accept phone parameter

## Future Enhancements

1. **Rate Limiting:**
   - Add IP-based rate limiting for OTP requests
   - Prevent spam/abuse

2. **SMS Retry:**
   - Automatic retry if SMS fails
   - Fallback to email if SMS unavailable

3. **User Preferences:**
   - Remember user's preferred verification method
   - Option to change verification method

4. **Multi-Language:**
   - SMS messages in user's preferred language

5. **WhatsApp Integration:**
   - Use WhatsApp Business API for OTP delivery
   - Higher delivery rate than SMS

## Support

For issues with phone OTP verification:

1. **SMS not being sent:**
   - Check SMS_PROVIDER and SMSLIVE_API_KEY in .env
   - Check console logs for error messages
   - Verify phone number is in correct format (+234xxx)

2. **Wrong OTP:**
   - Check if OTP entered matches
   - Check if OTP has expired (10 min max)
   - Check attempt count (max 5)

3. **Database errors:**
   - Ensure `phone_otp_tokens` table exists
   - Run `schema.sql` to create missing tables
   - Check `employees` table has `phone_verified` column

## Code Examples

### Frontend - Sending OTP
```typescript
const handleSendOtp = async (phone: string) => {
  const response = await fetch('/api/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
  const result = await response.json();
  if (result.success) {
    console.log('OTP sent successfully');
  }
};
```

### Frontend - Verifying OTP
```typescript
const handleVerifyOtp = async (phone: string, otp: string) => {
  const response = await fetch('/api/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp })
  });
  const result = await response.json();
  if (result.success) {
    console.log('Phone verified successfully');
  }
};
```

### Backend - SMS Sending Logic
```javascript
// Configured via SMSLive247 API
const smsPayload = {
  api_key: process.env.SMSLIVE_API_KEY,
  sender: process.env.SMSLIVE_SENDER,
  messages: [{ to: phone, message: `Your OTP: ${otp}` }]
};
// Sent with 10-second timeout
```

---

**Feature Status:** ✅ Complete and Ready for Testing
**Last Updated:** December 19, 2025
