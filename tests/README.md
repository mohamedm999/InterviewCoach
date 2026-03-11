# InterviewCoach Testing System

Comprehensive testing suite for validating all features of the InterviewCoach application (Next.js frontend + NestJS backend).

## 📋 Overview

This testing system validates:
- ✅ All API endpoints (authentication, CRUD operations, authorization)
- ✅ All frontend routes (public, auth, dashboard, admin)
- ✅ Request/response structures
- ✅ HTTP status codes
- ✅ Error handling
- ✅ Integration between frontend and backend

## 🚀 Quick Start

### Prerequisites

1. Both servers must be running:
   ```bash
   # Terminal 1 - Start both servers
   npm run dev
   ```

2. Database must be seeded:
   ```bash
   cd apps/api
   npm run seed
   ```

### Running Tests

```bash
# Install test dependencies
cd tests
npm install

# Run all tests (API + Frontend)
npm run test:all

# Run only API tests
npm run test:api

# Run only frontend tests
npm run test:frontend
```

## 📊 Test Reports

After running tests, reports are generated in the `reports/` directory:

- `test-report.json` - API test results
- `frontend-test-report.json` - Frontend test results
- `combined-test-report.json` - Complete test summary

## 🧪 What Gets Tested

### API Tests

#### Auth Module
- ✅ Login with valid credentials
- ✅ Login with invalid credentials (401)
- ✅ Register new user
- ✅ Register with existing email (409)
- ✅ Refresh token
- ✅ Logout

#### Users Module
- ✅ Get current user (authenticated)
- ✅ Get current user without auth (401)
- ✅ Update profile

#### Analyses Module
- ✅ Create analysis
- ✅ Get analyses list
- ✅ Get single analysis
- ✅ Get analyses without auth (401)

#### Templates Module
- ✅ Get templates
- ✅ Create template (admin only)

#### Admin Module
- ✅ Get admin config
- ✅ Get audit logs
- ✅ Get admin stats

#### Statistics Module
- ✅ Get user progression
- ✅ Get user goals

### Frontend Tests

#### Public Routes
- ✅ Home page (/)
- ✅ About page (/about)
- ✅ Privacy page (/privacy)
- ✅ Terms page (/terms)

#### Auth Routes
- ✅ Login page (/auth/login)
- ✅ Register page (/auth/register)
- ✅ Forgot password (/auth/forgot-password)
- ✅ Reset password (/auth/reset-password)
- ✅ Verify email (/auth/verify)

#### Dashboard Routes (Protected)
- ✅ Dashboard (/dashboard)
- ✅ Statistics (/statistics)
- ✅ History (/history)
- ✅ Profile (/profile)
- ✅ New Analysis (/analysis/new)

#### Admin Routes (Protected)
- ✅ Admin Dashboard (/admin)
- ✅ Templates (/admin/templates)
- ✅ Config (/admin/config)
- ✅ Audit Logs (/admin/audit-logs)

## 📈 Report Format

### Console Output

```
================================================================================
📋 FINAL TEST REPORT
================================================================================
Timestamp: 2026-03-16T10:30:00.000Z

📊 OVERALL SUMMARY:
   Total Tests: 45
   ✅ Passed: 42 (93.3%)
   ❌ Failed: 2 (4.4%)
   ⚠️  Warnings: 1 (2.2%)

📡 API TESTS:
   Total: 25
   ✅ Passed: 24
   ❌ Failed: 1
   ⚠️  Warnings: 0

🌐 FRONTEND TESTS:
   Total: 20
   ✅ Passed: 18
   ❌ Failed: 1
   ⚠️  Warnings: 1

💡 RECOMMENDATIONS:
   1. 🔧 Fix 2 failing API endpoint(s)
   2. 🌐 Fix 1 broken frontend route(s)
   3. ⚠️  Review 1 frontend warning(s)

================================================================================

🏥 HEALTH SCORE: 93.3%
   Status: 🟢 Excellent

================================================================================
```

### JSON Report Structure

```json
{
  "timestamp": "2026-03-16T10:30:00.000Z",
  "summary": {
    "apiTests": {
      "total": 25,
      "passed": 24,
      "failed": 1,
      "warnings": 0
    },
    "frontendTests": {
      "total": 20,
      "passed": 18,
      "failed": 1,
      "warnings": 1
    },
    "overall": {
      "total": 45,
      "passed": 42,
      "failed": 2,
      "warnings": 1
    }
  },
  "recommendations": [
    "🔧 Fix 2 failing API endpoint(s)",
    "🌐 Fix 1 broken frontend route(s)"
  ]
}
```

## 🎯 Health Score

The system calculates an overall health score:

- 🟢 **90-100%**: Excellent - Production ready
- 🟡 **70-89%**: Good - Minor issues
- 🟠 **50-69%**: Needs Improvement - Several issues
- 🔴 **0-49%**: Critical - Major issues

## 🔧 Customization

### Adding New API Tests

Edit `integration/api-test-runner.ts`:

```typescript
async testYourModule() {
  console.log('\n🔧 Testing Your Module...');
  
  await this.testEndpoint(
    'yourModule',
    'Test description',
    'GET',
    '/your-endpoint',
    undefined,
    200,
    true
  );
}
```

### Adding New Frontend Tests

Edit `integration/frontend-test-runner.ts`:

```typescript
async testYourRoutes() {
  console.log('\n🌐 Testing Your Routes...');
  
  await this.testRoute('yourCategory', '/your-route', 200, false);
}
```

## 🐛 Troubleshooting

### Servers Not Running

```
❌ API Server is NOT running on http://localhost:3000
   Please start the API server with: npm run dev
```

**Solution**: Start the development servers from the project root:
```bash
npm run dev
```

### Connection Refused

**Solution**: Ensure both API (port 3000) and Web (port 3001) servers are running.

### Database Not Seeded

**Solution**: Run the seed script:
```bash
cd apps/api
npm run seed
```

## 📝 Test Credentials

The tests use these credentials (from seed data):

**Admin:**
- Email: `admin@interviewcoach.com`
- Password: `Admin123!`

**Regular User:**
- Email: `john.doe@example.com`
- Password: `User123!`

## 🔄 CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run Tests
  run: |
    npm run dev &
    sleep 10
    cd tests
    npm install
    npm run test:all
```

## 📚 Additional Resources

- [API Documentation](http://localhost:3000/api/docs) - Swagger docs
- [Error Handling Guide](../apps/web/ERROR_HANDLING_GUIDE.md)
- [Architecture Review](../docs/ARCHITECTURE_REVIEW_COMPLETE.md)

## 🤝 Contributing

When adding new features:
1. Add corresponding tests to the test runners
2. Run the full test suite
3. Ensure health score remains above 90%
4. Update this README if needed

---

**Last Updated**: March 2026
