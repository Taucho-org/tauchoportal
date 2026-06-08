# Email Verification Setup Guide

This guide walks through implementing email verification for user registration using SendGrid.

## Overview

- **Frontend**: 2-step registration flow (email/password → verification code)
- **Backend**: Sends 6-digit verification code via email, validates on verify endpoint
- **Email Service**: SendGrid (free tier: 100 emails/day)
- **Verification Code Lifetime**: 1 hour
- **Code Format**: 6 random digits

---

## Phase 1: SendGrid Account Setup (15 minutes)

### Step 1: Create SendGrid Account
1. Go to [sendgrid.com](https://sendgrid.com)
2. Sign up for a free account
3. Verify your email
4. Create a "Sender Identity" (verify your domain or email)

### Step 2: Generate API Key
1. Navigate to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it: `tauchoportal-verification`
4. Select "Full Access" (or minimal scope for production)
5. Copy the API key (keep it secret!)

### Step 3: Add to Cloud Run Environment
1. In Google Cloud Console, go to **Cloud Run**
2. Select your backend service
3. Click **Edit & Deploy New Revision**
4. Add environment variable:
   ```
   SENDGRID_API_KEY = <your-api-key-here>
   SENDGRID_FROM_EMAIL = noreply@yourdomain.com
   ```
5. Deploy

---

## Phase 2: Backend Implementation (60 minutes)

### New Endpoints to Implement

#### 1. POST `/auth/register/send-verification-code`
**Purpose**: Initiate email verification flow

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepass123",
  "username": "username_here"
}
```

**Response (Success - 200)**:
```json
{
  "status": "verification_required",
  "verification_session_id": "sess_abc123def456",
  "expires_in": 3600
}
```

**Response (Error)**:
- `409 Conflict`: Email already registered
- `400 Bad Request`: Invalid email format or password too short
- `429 Too Many Requests`: Rate limited (if same email requests within 30 seconds)

**Backend Logic**:
1. Validate email format and password strength
2. Check if email already exists (return 409)
3. Generate 6-digit random code: `secure_random(1000000, 9999999)`
4. Create pending verification record:
   ```
   verification_sessions {
     id: "sess_...",
     email: "user@example.com",
     username: "username_here",
     password_hash: bcrypt(password),
     verification_code: "123456",
     created_at: now(),
     expires_at: now() + 1 hour,
     attempts: 0
   }
   ```
5. Send email with HTML template (see template below)
6. Return session ID and expires_in

#### 2. POST `/auth/register/verify-code`
**Purpose**: Complete registration after code verification

**Request**:
```json
{
  "verification_session_id": "sess_abc123def456",
  "code": "123456"
}
```

**Response (Success - 200)**:
```json
{
  "status": "registered",
  "user_id": 42,
  "message": "Account created successfully"
}
```

**Response (Error)**:
- `400 Bad Request`: Invalid or incorrect code
- `410 Gone`: Session expired or invalid
- `429 Too Many Requests`: Too many failed attempts (after 5 attempts, lock for 5 minutes)

**Backend Logic**:
1. Look up verification_session by ID
2. Check if expired (return 410)
3. Check if code matches (case-sensitive)
4. If wrong, increment attempts counter (lock after 5 attempts)
5. If correct, create user in `users` table:
   ```
   users {
     id: auto,
     email: from_session.email,
     username: from_session.username,
     password_hash: from_session.password_hash,
     created_at: now(),
     has_password: true
   }
   ```
6. Delete verification_session record
7. Return user_id

---

## Email Template

### HTML Template with Logo

**File**: `templates/email/verification-code.html`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
        .box { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { height: 40px; margin-bottom: 20px; }
        .code { background: #f0f0f0; border: 2px solid #3498db; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
        .code-value { font-size: 32px; font-weight: bold; color: #3498db; letter-spacing: 2px; font-family: monospace; }
        .info { background: #e3f2fd; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 14px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
        .warning { color: #e74c3c; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="box">
            <div class="header">
                <img src="https://yourdomain.com/public/image/logo_clear.png" alt="TauchoPortal" class="logo" style="width: 120px; height: auto;">
                <h1 style="margin: 0; color: #3498db;">Verify Your Email</h1>
            </div>

            <p>Hi there! 👋</p>
            <p>Welcome to TauchoPortal! To complete your registration, please verify your email using the code below.</p>

            <div class="code">
                <div class="code-value">{{.Code}}</div>
            </div>

            <div class="info">
                <p style="margin: 0;">⏱️ This code <span class="warning">expires in 1 hour</span>. Don't share it with anyone!</p>
            </div>

            <p>If you didn't sign up for TauchoPortal, you can safely ignore this email.</p>

            <div class="footer">
                <p>TauchoPortal © 2026 | All rights reserved</p>
                <p><a href="https://yourdomain.com" style="color: #3498db; text-decoration: none;">Visit our website</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

### Go SendGrid Integration

**File**: `pkg/email/sendgrid.go`

```go
package email

import (
    "fmt"
    "os"
    "github.com/sendgrid/sendgrid-go"
    "github.com/sendgrid/sendgrid-go/helpers/mail"
)

func SendVerificationCode(toEmail, code string) error {
    from := mail.NewEmail("TauchoPortal", os.Getenv("SENDGRID_FROM_EMAIL"))
    subject := "Your TauchoPortal Verification Code"
    to := mail.NewEmail("", toEmail)
    
    // Load HTML template
    htmlContent := fmt.Sprintf(`...your template with {{.Code}} replaced...`, code)
    
    message := mail.NewSingleEmail(from, subject, to, "Your verification code: "+code, htmlContent)
    client := sendgrid.NewSendClient(os.Getenv("SENDGRID_API_KEY"))
    
    response, err := client.Send(message)
    if err != nil {
        return fmt.Errorf("failed to send email: %w", err)
    }
    
    if response.StatusCode != 202 {
        return fmt.Errorf("sendgrid returned status %d", response.StatusCode)
    }
    
    return nil
}
```

---

## Phase 3: Frontend Implementation (30 minutes)

✅ **Already implemented in `/pages/register.gohtml`**

The frontend now:
1. Accepts email/password/username on Step 1
2. Calls `POST /api/auth/register/send-verification-code`
3. Shows Step 2 form with 6-digit input and 1-hour countdown
4. Calls `POST /api/auth/register/verify-code` with code
5. Redirects to login on success

---

## Testing Checklist

### Backend Testing
- [ ] Send code endpoint validates email format
- [ ] Send code endpoint generates random 6-digit codes
- [ ] Send code endpoint returns verification_session_id
- [ ] Email is sent successfully (check SendGrid dashboard)
- [ ] Verify code endpoint rejects invalid codes
- [ ] Verify code endpoint rejects expired sessions
- [ ] User is created in database on successful verification
- [ ] Duplicate email attempts return 409

### Frontend Testing
- [ ] Registration form Step 1 validates input
- [ ] Step 1 submit calls `/api/auth/register/send-verification-code`
- [ ] Step 2 form appears after successful send
- [ ] Email display shows entered email
- [ ] Timer counts down from 1 hour
- [ ] 6-digit input only accepts numbers (maxlength="6")
- [ ] Step 2 submit calls `/api/auth/register/verify-code`
- [ ] Success redirects to login page
- [ ] Invalid code shows error message
- [ ] Back button returns to Step 1 registration

---

## Environment Variables

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

---

## Cost Estimate

- **SendGrid Free Tier**: 100 emails/day (sufficient for development/MVP)
- **Production Upgrade**: $19.95/month (10,000 emails/month)
- **Cost per email**: ~$0.0001 at scale

---

## Summary

**What you need to do**:
1. ✅ Create SendGrid account and get API key
2. ✅ Add API key to Cloud Run environment
3. ✅ Implement 2 backend endpoints (send-verification-code, verify-code)
4. ✅ Implement email sending with HTML template
5. ✅ Database table for verification sessions (auto-expire in 1 hour)
6. ✅ Frontend is ready to use!

**Frontend is ready**: All code is in `/pages/register.gohtml` and just needs the API endpoints to exist.
