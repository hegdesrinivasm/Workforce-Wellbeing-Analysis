# Input Validation Guide

## 📋 Overview

Comprehensive input validation has been implemented across the frontend and backend to ensure data integrity, security, and user experience.

## 🔐 Backend Validation (Python - Flask)

### Location: `app/backend/app.py`

#### Validation Functions

##### 1. **validate_email(email)**
- Validates email format using regex pattern
- Pattern: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
- **Returns**: Boolean
- **Example Usage**: 
  - ✅ Valid: `user@example.com`, `john.doe+tag@company.co.uk`
  - ❌ Invalid: `invalid.email`, `@example.com`, `user@.com`

##### 2. **validate_password(password)**
- Validates password strength
- **Requirements**:
  - Minimum 8 characters
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 digit (0-9)
- **Returns**: Tuple of (valid: bool, errors: list)
- **Error Messages**: 
  - "Password must be at least 8 characters long"
  - "Password must contain at least one uppercase letter"
  - "Password must contain at least one lowercase letter"
  - "Password must contain at least one digit"
- **Examples**:
  - ✅ Valid: `MyPassword123`, `SecurePass456`
  - ❌ Invalid: `short1`, `nouppercase123`, `NOLOWERCASE123`, `NoDigits`

##### 3. **validate_phone(phone)**
- Validates phone number format (basic validation)
- Allows: digits, spaces, dashes, plus sign, parentheses
- Minimum length: 10 characters
- **Returns**: Boolean
- **Examples**:
  - ✅ Valid: `+1-555-123-4567`, `(555) 123-4567`, `5551234567`
  - ❌ Invalid: `123`, `abc-defgh`

##### 4. **validate_name(name)**
- Validates name format
- Allows: letters, spaces, hyphens, apostrophes
- Maximum length: 120 characters
- **Returns**: Tuple of (valid: bool, error: string)
- **Examples**:
  - ✅ Valid: `John Doe`, `Mary-Jane Smith`, `O'Neill`
  - ❌ Invalid: `John123`, `@Name#`, empty string

##### 5. **validate_string_field(value, field_name, max_length, required)**
- Generic string validation
- Checks for empty strings, max length constraints
- **Parameters**:
  - `value`: String to validate
  - `field_name`: Field name for error messages
  - `max_length`: Maximum allowed length (default 120)
  - `required`: Whether field is required (default False)
- **Returns**: Tuple of (valid: bool, error: string)

### Endpoint Validation

#### POST /api/login
**Validates**:
- Email is provided and not empty
- Password is provided and not empty
- Email format is valid
- Email length ≤ 120 characters
- Returns: `401 Unauthorized` for invalid credentials
- Returns: `400 Bad Request` for validation failures

**Error Messages**:
```json
{
  "error": "Email is required"
}
```
```json
{
  "error": "Invalid email format. Please enter a valid email address"
}
```
```json
{
  "error": "Invalid email or password"
}
```

#### POST /api/register
**Validates**:
- Email is provided, not empty, valid format, ≤120 chars
- Name is provided, not empty, ≤120 chars, valid characters only
- Password meets strength requirements
- Phone format (if provided)
- Department (supervisor only, ≤120 chars)
- Role is either 'supervisor' or 'member'
- Email is not already registered
- Returns: `400 Bad Request` for validation failures
- Returns: `409 Conflict` for duplicate email
- Returns: `201 Created` on success

**Error Messages** (Examples):
```json
{
  "error": "Name is required"
}
```
```json
{
  "error": "Password requirements: Password must be at least 8 characters long, Password must contain at least one uppercase letter"
}
```
```json
{
  "error": "This email is already registered. Please use a different email or try logging in"
}
```

---

## 🎨 Frontend Validation (TypeScript/React)

### Location: `app/frontend/src/pages/`

#### Validation Functions (Shared Across Pages)

All registration pages (`SupervisorRegister.tsx`, `MemberRegister.tsx`) and `Login.tsx` include:

##### **validateEmail(email)**
```typescript
// Returns: { valid: boolean; error?: string }
// Pattern same as backend
```

##### **validatePassword(password)**
```typescript
// Returns: { valid: boolean; errors: string[] }
// Same requirements as backend
// Shows multiple errors at once
```

##### **validateName(name)**
```typescript
// Returns: { valid: boolean; error?: string }
// Checks: not empty, ≤120 chars, valid characters
```

##### **validatePhone(phone)**
```typescript
// Returns: { valid: boolean; error?: string }
// Optional field - valid if empty or matches pattern
```

### Form Validation Strategy

#### Validation Timing
1. **On Submit**: Full form validation before API call
2. **On Change**: Clear field-specific error when user starts typing
3. **Real-time Feedback**: Error messages displayed in TextField helper text

#### Validation Flow

```
User Input → On Change (clear error) → On Submit (validate all)
                                          ↓
                                    Validation passes?
                                    ↙         ↘
                                Yes          No
                                 ↓            ↓
                            API Call    Show errors
                                 ↓
                           API validates again
```

#### Field-Level Error Display

Each field shows:
- **error prop**: `true` if validation fails (red border)
- **helperText prop**: Error message below field
- **Auto-clear**: Error clears when user types in field

### Implementation Examples

#### SupervisorRegister.tsx
Validates all fields:
- ✅ Full Name (required, format check)
- ✅ Email (required, format check)
- ✅ Department (optional, no format check)
- ✅ Phone (optional, format check if provided)
- ✅ Password (required, strength check)
- ✅ Confirm Password (match with Password)

#### MemberRegister.tsx
Same as SupervisorRegister except:
- ❌ No Department field

#### Login.tsx
Validates:
- ✅ Email (required, format check)
- ✅ Password (required, non-empty)

---

## 🔄 Validation Flow Diagram

```
┌─────────────────┐
│  User Input     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Frontend Validation            │
│  - Format checks                │
│  - Length validation            │
│  - Required field checks        │
│  - Field-level error display    │
└────────┬────────────────────────┘
         │
         ├─ Invalid ─────► Show Errors (don't submit)
         │
         └─ Valid
              │
              ▼
       ┌─────────────────┐
       │  Send to API    │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────────────────────┐
       │  Backend Validation             │
       │  - All frontend checks again    │
       │  - Database checks              │
       │  - Security validations         │
       └────────┬────────────────────────┘
                │
                ├─ Invalid ─────► Return 400/409
                │
                └─ Valid
                     │
                     ▼
            ┌─────────────────┐
            │  Process Data   │
            │  Return 201/200 │
            └─────────────────┘
```

---

## 📊 Validation Rules Summary

| Field | Backend | Frontend | Required | Max Length | Special Rules |
|-------|---------|----------|----------|------------|---------------|
| Email | Regex pattern | Regex pattern | Yes | 120 | Unique in DB |
| Password | Strength (8+ chars, upper, lower, digit) | Strength | Yes | - | Must match confirm |
| Name | Regex (letters, space, dash, apostrophe) | Regex | Yes | 120 | - |
| Phone | Regex pattern | Regex pattern | No | 20 | Optional field |
| Department | Regex pattern | - | No | 120 | Supervisors only |
| Role | Enum (supervisor/member) | - | Yes | - | Case-insensitive |

---

## 🛡️ Security Features

### 1. **Email Validation**
- Prevents invalid email formats
- Database level: unique constraint prevents duplicates
- Generic error messages prevent user enumeration

### 2. **Password Security**
- Enforced strong password requirements
- Never transmitted in plaintext (HTTPS should be used in production)
- Hashed on backend with Werkzeug `generate_password_hash`

### 3. **SQL Injection Prevention**
- SQLAlchemy ORM prevents direct SQL injection
- All inputs parameterized

### 4. **Input Sanitization**
- `.strip()` removes leading/trailing whitespace
- Length validation prevents buffer overflow attacks
- Format validation prevents code injection

### 5. **Error Message Security**
- Generic login error: "Invalid email or password" (doesn't reveal if email exists)
- No stack traces shown to client on errors
- Backend logs full errors for debugging

---

## ✅ Testing Validation

### Valid Registration (Supervisor)
```json
{
  "name": "John Manager",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "supervisor",
  "department": "HR",
  "phone": "+1-555-123-4567"
}
```

### Valid Registration (Member)
```json
{
  "name": "Jane Employee",
  "email": "jane@example.com",
  "password": "StrongPassword456",
  "role": "member",
  "phone": "(555) 987-6543"
}
```

### Invalid Examples

❌ **Password too weak**:
```json
{
  "password": "weak"
}
// Error: "Password requirements: Password must be at least 8 characters long, ..."
```

❌ **Invalid email**:
```json
{
  "email": "not-an-email"
}
// Error: "Invalid email format. Please enter a valid email address"
```

❌ **Duplicate email**:
```json
{
  "email": "existing@example.com"
}
// Error: "This email is already registered. Please use a different email or try logging in"
(HTTP 409)
```

---

## 🚀 Best Practices Implemented

✅ **Validate on both frontend and backend**
✅ **User-friendly error messages**
✅ **Real-time error feedback**
✅ **Auto-clear errors when user corrects field**
✅ **Trim whitespace from input**
✅ **Case-insensitive comparisons where appropriate**
✅ **Separate error handling from security checks**
✅ **Generic error messages for failed login** (security)
✅ **Specific error messages for registration** (user experience)
✅ **Validate data type and format**
✅ **Enforce maximum lengths**
✅ **Check required fields**

---

## 📝 Future Enhancements

- [ ] Rate limiting on login attempts
- [ ] Email verification on registration
- [ ] Password reset functionality
- [ ] Regex complexity customization via settings
- [ ] CAPTCHA on multiple failed login attempts
- [ ] Advanced XSS protection
- [ ] Input sanitization library integration
