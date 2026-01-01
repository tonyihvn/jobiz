# SMS Sending Quick Reference

## What Was Fixed

✅ **SMS OTP during registration** - Now properly sends to Nigerian numbers
✅ **SMS confirmation after email verification** - NEW feature
✅ **Phone number format handling** - Converts all formats to 234-based
✅ **Simplified SMS code** - Centralized helper function
✅ **Better error messages** - Clear feedback on what went wrong

## How to Use

### 1. Set Environment Variables

Add to your `.env` file:
```
SMS_PROVIDER=smslive247
SMSLIVE_API_KEY=your_api_key_here
SMSLIVE_SENDER=INFO
```

### 2. Registration Flow (Automatic)

When a user registers with phone number:
- `08012345678` or
- `+2348012345678` or  
- `2348012345678`

They receive:
1. **Email**: Verification link (during registration)
2. **SMS**: OTP code (during registration)
3. **SMS**: Confirmation (after email verification) ← NEW

### 3. Manual SMS Testing

```bash
node test_sms.js
```

Or with curl:
```bash
curl -X POST http://localhost:3001/api/test-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "08012345678",
    "message": "Test message"
  }'
```

## Phone Number Formats (All Work Now!)

| Format | Example | Works? |
|--------|---------|--------|
| 0-based | `08012345678` | ✅ |
| +234 format | `+2348012345678` | ✅ |
| 234 format | `2348012345678` | ✅ |
| Spaced | `080 1234 5678` | ✅ |
| Dashed | `080-1234-5678` | ✅ |

## Common Errors & Solutions

### "SMS provider not configured"
**Solution:** Add SMS_PROVIDER and SMSLIVE_API_KEY to .env

### "Invalid phone number format"
**Solution:** Ensure phone is a valid Nigerian number with 11 digits (08x format) or 13 digits (234x format)

### "SMS sending timeout"
**Solution:** Check internet connection or SMSLive247 API status

### "Email verification successful" but no SMS
**Solution:** This is normal - SMS confirmation is asynchronous and may take a moment

## Database Fields

Phone numbers are stored in two tables:

**businesses table:**
```sql
phone VARCHAR(100)  -- Raw input from user
```

**employees table:**
```sql
phone VARCHAR(100)  -- Raw input from user
```

No need to migrate - formatting happens at the application layer.

## SMS Message Templates

### OTP During Registration
```
Your JOBIZ verification code is: [6-digit-code]. 
This code expires in 10 minutes. 
Do not share this code.
```

### Confirmation After Email Verification
```
Your JOBIZ email has been verified successfully! 
Your registration is now complete. 
Awaiting super admin approval.
```

## Code Examples

### Using the sendSMS() function directly

```javascript
// Basic usage
try {
  await sendSMS('08012345678', 'Your message here');
  console.log('SMS sent!');
} catch (err) {
  console.error('SMS failed:', err.message);
}

// With formatted number
const formattedPhone = formatNigerianPhone('08012345678');
// formattedPhone = '2348012345678'
```

## Verification Steps

1. **Register** → Check phone for OTP SMS
2. **Verify Email** → Check email for verification link
3. **Click Link** → Wait for confirmation SMS on phone
4. **Check Database** → Phone should be stored in employees table

## Logging Indicators

### Success
```
✅ OTP sent successfully to 2348012345678
✅ SMS sent successfully to 2348012345678
```

### Failure
```
❌ Failed to send SMS to 2348012345678: timeout
📱 OTP for phone verification: 123456 (SMS failed)
```

## Important Notes

- ✅ SMS is optional - registration completes even if SMS fails
- ✅ Multiple phone formats are automatically standardized
- ✅ All changes are backward compatible
- ⚠️ Requires SMSLive247 API credentials
- ⚠️ Check spam/promotional folders for SMS

## Still Having Issues?

1. Check console logs for error messages
2. Verify SMS_PROVIDER and SMSLIVE_API_KEY are set
3. Test with `/api/test-sms` endpoint
4. Check SMSLive247 dashboard for failed messages
5. Ensure phone number is a valid Nigerian number

---

**Need Help?** Check SMS_FIX_SUMMARY.md for detailed documentation
