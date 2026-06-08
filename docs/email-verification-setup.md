# Email Verification Setup Guide

This guide walks through implementing email verification for user registration using SendGrid.

## Overview

- **Frontend**: 2-step registration flow (email/password → verification code)
- **Backend**: Sends 6-digit verification code via email, validates on verify endpoint
- **Email Service**: SendGrid (free tier: 100 emails/day)
- **Verification Code Lifetime**: 1 hour
- **Code Format**: 6 random digits
- **Multi-language Support**: English, Japanese, German, Spanish, French, Chinese (new), Korean (new)

---

## Language Detection (Multi-language Email Support)

### How It Works

1. **Frontend detects user's language** from `navigator.language` (browser UI language)
2. **Frontend passes language code** as `language` parameter to API
3. **Backend uses language code** to select the appropriate email template
4. **Backend sends email** in user's preferred language

### Supported Languages

The frontend sends one of these language codes (matching your i18n setup):
- `en` - English (fallback)
- `ja` - 日本語 (Japanese)
- `de` - Deutsch (German)
- `fr` - Français (French)
- `es` - Español (Spanish)
- `zh` - 中文 (Chinese) *(new)*
- `ko` - 한국어 (Korean) *(new)*

### Frontend Implementation

```javascript
// Detect user's preferred language from navigator or Accept-Language
function detectUserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    const supported = ['en', 'ja', 'de', 'fr', 'es', 'zh', 'ko'];
    
    // Extract base language code (e.g., "ja" from "ja-JP")
    const baseLang = browserLang.split('-')[0].toLowerCase();
    
    // Return if supported, otherwise default to English
    return supported.includes(baseLang) ? baseLang : 'en';
}

// When calling the API:
const language = detectUserLanguage();
const response = await fetch('/api/auth/register/send-verification-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        username, 
        email, 
        password, 
        language  // <- NEW: pass detected language
    })
});
```

### Backend Implementation

**Endpoint: POST `/auth/register/send-verification-code`**

```go
type SendVerificationCodeRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
    Username string `json:"username"`
    Language string `json:"language"` // <- NEW: optional, defaults to "en"
}

func (h *Handler) SendVerificationCode(w http.ResponseWriter, r *http.Request) {
    var req SendVerificationCodeRequest
    json.NewDecoder(r.Body).Decode(&req)
    
    // Validate language code
    language := req.Language
    if language == "" {
        // Optional: try to detect from Accept-Language header as fallback
        language = i18n.DetectLang(r)  // Uses your existing i18n.DetectLang()
    }
    
    // Validate language is supported
    supported := []string{"en", "ja", "de", "fr", "es", "zh", "ko"}
    if !contains(supported, language) {
        language = "en"  // fallback to English
    }
    
    // ... rest of logic ...
    
    // Store language in verification_session
    session := VerificationSession{
        ID:          generateID(),
        Email:       req.Email,
        Username:    req.Username,
        PasswordHash: bcrypt(req.Password),
        Code:        generateCode(),
        Language:    language,  // <- Store it
        CreatedAt:   time.Now(),
        ExpiresAt:   time.Now().Add(1 * time.Hour),
    }
    
    // Send email in user's language
    template := fmt.Sprintf("templates/email/verification-code.%s.html", language)
    err := email.SendVerificationEmail(req.Email, session.Code, template)
    
    // Return response
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "status": "verification_required",
        "verification_session_id": session.ID,
        "expires_in": 3600,
    })
}
```

### Email Template Files

Create email templates for each language:

```
templates/email/verification-code.en.html
templates/email/verification-code.ja.html
templates/email/verification-code.de.html
templates/email/verification-code.fr.html
templates/email/verification-code.es.html
templates/email/verification-code.zh.html    (NEW)
templates/email/verification-code.ko.html    (NEW)
```

Each template receives:
- `Code` - the 6-digit verification code
- `Email` - user's email address
- `Expires` - expiration time (1 hour)

Example Go code to load template:

```go
func SendVerificationEmail(toEmail, code, templatePath string) error {
    // Load and parse template
    tmpl, err := template.ParseFiles(templatePath)
    if err != nil {
        return fmt.Errorf("failed to load template: %w", err)
    }
    
    // Render template with data
    var buf bytes.Buffer
    tmpl.Execute(&buf, map[string]interface{}{
        "Code":    code,
        "Email":   toEmail,
        "Expires": "1 hour",
    })
    
    // Send via SendGrid
    from := mail.NewEmail("TauchoPortal", os.Getenv("SENDGRID_FROM_EMAIL"))
    to := mail.NewEmail("", toEmail)
    message := mail.NewSingleEmail(from, "Your TauchoPortal Verification Code", to, 
        "Code: "+code, buf.String())
    
    client := sendgrid.NewSendClient(os.Getenv("SENDGRID_API_KEY"))
    response, err := client.Send(message)
    
    if response.StatusCode != 202 {
        return fmt.Errorf("sendgrid returned %d", response.StatusCode)
    }
    return nil
}
```

### Fallback Strategy

If language parameter is missing or unsupported:
1. Try to detect from `Accept-Language` header (your existing `i18n.DetectLang()` function)
2. Default to English ("en")

This ensures graceful degradation if frontend doesn't send language.

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
  "username": "username_here",
  "language": "ja"
}
```

Note: `language` is optional. If not provided, backend will detect from `Accept-Language` header or default to "en". Supported values: "en", "ja", "de", "fr", "es", "zh", "ko".

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
1. Parse `language` parameter (optional, defaults to "en" if not provided)
2. Validate email format and password strength
3. Check if email already exists (return 409)
4. Generate 6-digit random code: `secure_random(1000000, 9999999)`
5. Create pending verification record:
   ```
   verification_sessions {
     id: "sess_...",
     email: "user@example.com",
     username: "username_here",
     password_hash: bcrypt(password),
     verification_code: "123456",
     language: "ja",
     created_at: now(),
     expires_at: now() + 1 hour,
     attempts: 0
   }
   ```
6. Send email with HTML template in user's language (see language templates below)
7. Return session ID and expires_in

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
