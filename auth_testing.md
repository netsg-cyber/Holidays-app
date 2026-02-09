# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session

```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  role: 'hr',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
// Create holiday credit for current year
db.holiday_credits.insertOne({
  credit_id: 'cred_test_' + Date.now(),
  user_id: userId,
  user_email: 'test.user.' + Date.now() + '@example.com',
  user_name: 'Test User',
  year: new Date().getFullYear(),
  total_days: 35.0,
  used_days: 0.0,
  remaining_days: 35.0,
  created_at: new Date(),
  updated_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API

```bash
# Test auth endpoint
curl -X GET "https://vacation-hub-62.preview.emergentagent.com/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test credits endpoint
curl -X GET "https://vacation-hub-62.preview.emergentagent.com/api/credits/my" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test requests endpoint
curl -X GET "https://vacation-hub-62.preview.emergentagent.com/api/requests/my" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3: Browser Testing

```python
# Set cookie and navigate
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "vacation-hub-62.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://vacation-hub-62.preview.emergentagent.com/dashboard")
```

## Quick Debug

```bash
# Check data format
mongosh --eval "
use('test_database');
db.users.find().limit(2).pretty();
db.user_sessions.find().limit(2).pretty();
db.holiday_credits.find().limit(2).pretty();
"

# Clean test data
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /test\.user\./});
db.user_sessions.deleteMany({session_token: /test_session/});
db.holiday_credits.deleteMany({credit_id: /cred_test/});
"
```

## Checklist

- [ ] User document has user_id field
- [ ] Session user_id matches user's user_id exactly
- [ ] All queries use `{"_id": 0}` projection
- [ ] Backend queries use user_id (not _id)
- [ ] API returns user data with user_id field
- [ ] Browser loads dashboard without redirect

## Success Indicators

✅ /api/auth/me returns user data
✅ Dashboard loads without redirect
✅ CRUD operations work

## Failure Indicators

❌ "User not found" errors
❌ 401 Unauthorized responses
❌ Redirect to login page
