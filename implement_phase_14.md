# Phase 14 Implementation: User Management

**Status:** ✅ COMPLETED  
**Date:** 2026-08-20

---

## Overview
This document describes the implementation of Phase 14, which adds comprehensive user management features to the Enterprise CMS. This phase includes password reset functionality, email verification, profile management, and enhanced user model fields.

---

## Step 14.1: Enhanced User Model

### File Modified: `src/models/user-model.ts`

**Purpose:** Added new fields to the user schema for email verification, password reset, and profile management.

**New Fields Added:**

| Field | Type | Purpose |
|-------|------|---------|
| `emailVerified` | Boolean (default: `false`) | Tracks whether the user's email has been verified |
| `emailVerificationToken` | String | Hashed token for email verification |
| `emailVerificationExpiry` | Date | Expiry date for the email verification token |
| `passwordResetToken` | String | Hashed token for password reset |
| `passwordResetExpiry` | Date | Expiry date for the password reset token |
| `lastLoginAt` | Date | Timestamp of the user's last login |
| `profileImage` | String | URL to the user's profile image |

```typescript
const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Editor'], default: 'Editor' },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpiry: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpiry: { type: Date },
    lastLoginAt: { type: Date },
    profileImage: { type: String },
  },
  { timestamps: true }
);
```

**Design Decisions:**
- Tokens are stored **hashed** (SHA-256) in the database for security
- `emailVerified` defaults to `false` for new users
- All new fields are optional except `emailVerified` which has a default

---

## Step 14.2: Token Generation Utility

### File Created: `src/utils/tokens.ts`

**Purpose:** Centralized utility for generating and managing security tokens.

**Functions:**

| Function | Purpose |
|----------|---------|
| `generateToken(length)` | Generates a cryptographically secure random token using `crypto.randomBytes` |
| `generateTokenWithExpiry(hours)` | Generates a token with an expiry date |
| `isTokenExpired(expiryDate)` | Checks if a token has expired |
| `hashToken(token)` | Hashes a token using SHA-256 for secure storage |

```typescript
// Generate a token with 24-hour expiry
const { token, expiresAt } = generateTokenWithExpiry(24);

// Hash the token for database storage
const hashedToken = hashToken(token);
```

**Security Design:**
- Uses Node.js `crypto` module (not `Math.random()`) for cryptographically secure tokens
- Tokens are hashed before storage to prevent database leaks from exposing usable tokens
- Expiry dates are enforced on every verification

---

## Step 14.3: Email Sending Utility

### File Created: `src/utils/email.ts`

**Purpose:** Email sending utility using nodemailer with SMTP configuration.

**Functions:**

| Function | Purpose |
|----------|---------|
| `sendEmail(options)` | Core email sending function |
| `sendVerificationEmail(to, name, verificationUrl)` | Sends welcome email with verification link |
| `sendPasswordResetEmail(to, name, resetUrl)` | Sends password reset email |
| `sendAccountNotificationEmail(to, name, message)` | Sends account update notifications |

**Email Templates:**
- **Verification Email:** Welcome message with "Verify Email" button, 24-hour expiry notice
- **Password Reset Email:** Reset link with 1-hour expiry notice
- **Account Notification:** Generic account update notification

**SMTP Configuration:**
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@example.com
```

**Design Decisions:**
- Returns `false` gracefully if SMTP is not configured (no crash)
- Uses HTML templates with inline styles for email client compatibility
- Includes plain text fallback for each email

---

## Step 14.4: Enhanced User Service

### File Modified: `src/services/user-service.ts`

**Purpose:** Added new service methods for email verification, password reset, and profile management.

**New Methods Added:**

| Method | Purpose |
|--------|---------|
| `updateProfile(userId, input)` | Updates user profile with password/email change validation |
| `trackLogin(userId)` | Records the last login timestamp |
| `generateEmailVerificationToken(email)` | Generates a verification token for a user |
| `verifyEmail(token)` | Verifies a user's email using the token |
| `generatePasswordResetToken(email)` | Generates a password reset token |
| `resetPassword(token, newPassword)` | Resets a user's password using the token |

**Key Implementation Details:**

```typescript
// Email verification flow
async verifyEmail(token: string): Promise<boolean> {
  const hashedToken = hashToken(token);
  const user = await User.findOne({ emailVerificationToken: hashedToken });

  if (!user) return false;
  if (isTokenExpired(user.emailVerificationExpiry)) return false;

  await User.findByIdAndUpdate(user._id, {
    emailVerified: true,
    emailVerificationToken: undefined,
    emailVerificationExpiry: undefined,
  });

  return true;
}

// Password reset flow
async resetPassword(token: string, newPassword: string): Promise<boolean> {
  const hashedToken = hashToken(token);
  const user = await User.findOne({ passwordResetToken: hashedToken });

  if (!user) return false;
  if (isTokenExpired(user.passwordResetExpiry)) return false;

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await User.findByIdAndUpdate(user._id, {
    passwordHash,
    passwordResetToken: undefined,
    passwordResetExpiry: undefined,
  });

  return true;
}
```

**Profile Update Security:**
- Changing email requires current password verification
- Changing password requires current password verification
- Email change resets `emailVerified` to `false` and generates a new verification token
- Tokens are cleared after successful use

---

## Step 14.5: API Routes

### Files Created:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/verify-email` | POST | Verifies user email with token |
| `/api/auth/forgot-password` | POST | Generates password reset token and sends email |
| `/api/auth/reset-password` | POST | Resets password with token |
| `/api/auth/profile` | GET | Returns current user's profile |
| `/api/auth/profile` | PUT | Updates current user's profile |

**Security Features:**
- **User Enumeration Prevention:** `/api/auth/forgot-password` always returns success, even if the email doesn't exist
- **Zod Validation:** All routes use Zod schemas for request validation
- **Token Hashing:** Tokens are hashed before database storage
- **Expiry Enforcement:** All tokens have expiry dates that are checked

**Zod Schemas Added:**
```typescript
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).optional(),
  profileImage: z.string().max(1000).optional(),
});
```

---

## Step 14.6: Public Pages

### Files Created:

| Page | Route | Purpose |
|------|-------|---------|
| `verify-email/page.tsx` | `/verify-email` | Handles email verification with token from URL |
| `forgot-password/page.tsx` | `/forgot-password` | Email input form for password reset |
| `reset-password/page.tsx` | `/reset-password` | New password form with token from URL |

**Verify Email Page:**
- Reads `token` from URL search params
- Automatically calls `/api/auth/verify-email` on mount
- Shows loading spinner, success checkmark, or error message
- Links to login page on success

**Forgot Password Page:**
- Email input form
- Always shows success message (prevents user enumeration)
- Links back to login page

**Reset Password Page:**
- Reads `token` from URL search params
- New password + confirm password fields
- Client-side validation (match check, min length)
- Links to login page on success

---

## Step 14.7: Admin Profile Page

### Files Created:

| File | Purpose |
|------|---------|
| `src/app/admin/(dashboard)/profile/page.tsx` | Server component that fetches user data |
| `src/components/features/admin/ProfileForm.tsx` | Client component for profile editing |

**Profile Page Features:**
- **Account Information:** Name, email, profile image URL
- **Email Status:** Shows verified/unverified badge
- **Last Login:** Displays last login timestamp
- **Password Change:** Current password, new password, confirm password fields
- **Security Validation:** Requires current password for email/password changes

**ProfileForm Component:**
- Client component with `useState` for form state
- Validates password match and minimum length
- Requires current password for sensitive changes
- Shows success/error messages
- Refreshes router after successful update

---

## Step 14.8: NextAuth Integration

### File Modified: `src/app/api/auth/[...nextauth]/route.ts`

**Changes:**
- Added `lastLoginAt` tracking on successful authentication
- Uses `User.findByIdAndUpdate` to record login timestamp

```typescript
// Track last login
await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });
```

---

## Step 14.9: UI Updates

### Files Modified:

| File | Change |
|------|--------|
| `src/components/features/admin/AdminSidebar.tsx` | Added "Profile" link with UserCircle icon |
| `src/app/admin/(auth)/login/page.tsx` | Added "Forgot Password?" link |

**Admin Sidebar:**
- New "Account" category with Profile link
- Uses `UserCircle` icon from lucide-react

**Login Page:**
- Added "Forgot Password?" link below the sign-in button
- Links to `/forgot-password` public page

---

## Step 14.10: Seed Script Update

### File Modified: `scripts/seed.ts`

**Changes:**
- Added new user schema fields to match the model
- Default admin user is pre-verified (`emailVerified: true`)

---

## Environment Variables

### New Variables Added to `.env.local`:

```env
# Phase 14: Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@example.com
```

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port (587 for TLS, 465 for SSL) |
| `SMTP_USER` | SMTP authentication username |
| `SMTP_PASSWORD` | SMTP authentication password |
| `EMAIL_FROM` | From address for outgoing emails |

---

## Dependencies Added

```json
{
  "dependencies": {
    "nodemailer": "^6.9.7"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.14"
  }
}
```

---

## Files Created/Modified

### New Files
```
src/utils/tokens.ts
src/utils/email.ts
src/app/api/auth/verify-email/route.ts
src/app/api/auth/forgot-password/route.ts
src/app/api/auth/reset-password/route.ts
src/app/api/auth/profile/route.ts
src/app/(public)/verify-email/page.tsx
src/app/(public)/forgot-password/page.tsx
src/app/(public)/reset-password/page.tsx
src/app/admin/(dashboard)/profile/page.tsx
src/components/features/admin/ProfileForm.tsx
```

### Modified Files
```
src/models/user-model.ts
src/services/user-service.ts
src/types/schemas.ts
src/app/api/auth/[...nextauth]/route.ts
src/components/features/admin/AdminSidebar.tsx
src/app/admin/(auth)/login/page.tsx
scripts/seed.ts
.env.local
```

---

## Problem Solving

### 1. User Enumeration Prevention
**Issue:** The forgot-password endpoint could reveal whether an email exists in the system.

**Solution:** The endpoint always returns a success message, regardless of whether the email exists. This prevents attackers from enumerating valid user emails.

### 2. Token Security
**Issue:** Storing plaintext tokens in the database could expose them in a data breach.

**Solution:** Tokens are hashed using SHA-256 before storage. The plaintext token is only sent via email and never stored.

### 3. Email Change Security
**Issue:** Allowing email changes without verification could enable account takeover.

**Solution:** Changing email requires current password verification and resets `emailVerified` to `false`, requiring re-verification of the new email.

### 4. SMTP Configuration Graceful Degradation
**Issue:** The app should not crash if SMTP is not configured.

**Solution:** The email utility returns `false` if SMTP credentials are missing, allowing the app to continue functioning without email features.

---

## Verification

### Build Status
```
✓ Compiled successfully
✓ Finished TypeScript check
✓ Collecting page data
✓ Generating static pages
```

### New Routes Verified
- `/verify-email` - Static route
- `/forgot-password` - Static route
- `/reset-password` - Static route
- `/admin/profile` - Dynamic route
- `/api/auth/verify-email` - API route
- `/api/auth/forgot-password` - API route
- `/api/auth/reset-password` - API route
- `/api/auth/profile` - API route

### Feature Verification Checklist
1. **Email Verification:** User can verify email via token link
2. **Password Reset:** User can request reset email and set new password
3. **Profile Management:** User can update name, email, profile image, and password
4. **Last Login Tracking:** Login timestamps are recorded
5. **Email Status:** Profile shows verified/unverified status
6. **Security:** Current password required for sensitive changes

---

## Next Steps for Production

1. Configure real SMTP credentials for production email delivery
2. Add rate limiting to auth endpoints (Phase 13.1)
3. Add audit logging for auth events (Phase 13.2)
4. Implement email verification resend functionality
5. Add password strength requirements
6. Implement account lockout after failed login attempts