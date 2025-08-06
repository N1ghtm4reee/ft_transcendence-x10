# 🔔 Notification Service - Testing Guide

## 📋 Overview

This notification service provides real-time notifications with WebSocket support and online user status checking. This guide will walk you through testing all the features.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Database

```bash
npx prisma db push
```

### 3. Start the Service

```bash
npm start
```

The service will run on `http://localhost:3005`

---

## 🧪 Testing Methods

### Method 1: Interactive Web UI (Recommended)

The easiest way to test all features with a visual interface.

1. **Start the test UI server:**

   ```bash
   node serve-test.js
   ```

2. **Open in browser:**

   - Navigate to `http://localhost:8081`
   - You'll see a two-user interface (Alice & Bob)

3. **Test Features:**
   - **Auto-connect**: Both users auto-connect after 2 seconds
   - **Send messages**: Use the forms to send notifications between users
   - **Real-time delivery**: Watch notifications appear instantly
   - **Mark as read**: Click buttons to mark notifications as read
   - **Check online status**: Use "Check [User]'s Status" buttons
   - **View all online users**: Click "📊 Check All Online Users"

### Method 2: Command Line Testing

Test the online status API from command line.

```bash
node test-online-status.js
```

This will:

- Check if specific users are online
- Get all currently online users
- Show example usage for other services

### Method 3: Manual API Testing

Use curl or any HTTP client to test endpoints directly.

---

## 📖 API Endpoints Reference

### Notification Endpoints

#### Create Notification

```bash
curl -X POST http://localhost:3005/api/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "type": "message",
    "title": "Hello!",
    "content": "Test notification"
  }'
```

#### Get User Notifications

```bash
curl -H "x-user-id: 1" http://localhost:3005/api/notifications/
```

#### Mark Notification as Read

```bash
curl -X PATCH http://localhost:3005/api/notifications/{notificationId}/read \
  -H "x-user-id: 1"
```

#### Mark All as Read

```bash
curl -X PATCH http://localhost:3005/api/notifications/read-all \
  -H "x-user-id: 1"
```

#### Get Unread Count

```bash
curl -H "x-user-id: 1" http://localhost:3005/api/notifications/unread-count
```

### Online Status Endpoints

#### Check if User is Online

```bash
curl http://localhost:3005/api/notifications/user/1/online
```

Response:

```json
{
  "userId": 1,
  "online": true,
  "connections": 1,
  "timestamp": "2025-08-04T13:40:45.222Z"
}
```

#### Get All Online Users

```bash
curl http://localhost:3005/api/notifications/users/online
```

Response:

```json
{
  "onlineUsers": [
    { "userId": 1, "connections": 1 },
    { "userId": 2, "connections": 1 }
  ],
  "totalOnline": 2,
  "timestamp": "2025-08-04T13:40:45.268Z"
}
```

### WebSocket Connection

Connect to real-time notifications:

```javascript
const ws = new WebSocket("ws://localhost:3005/ws/notifications/live?userId=1");
```

---

## 🎯 Test Scenarios

### Scenario 1: Basic Notification Flow

1. Start the service and web UI
2. Connect both users (Alice & Bob)
3. Send a message from Alice to Bob
4. Verify Bob receives the notification in real-time
5. Mark the notification as read
6. Check that unread count updates

### Scenario 2: Online Status Checking

1. Disconnect Bob from WebSocket
2. Use Alice's "Check Bob's Status" button
3. Verify it shows Bob as offline
4. Reconnect Bob
5. Check status again - should show online

### Scenario 3: Multiple Connections

1. Open the web UI in multiple browser tabs
2. Connect the same user from different tabs
3. Check online status - should show multiple connections
4. Send a notification - should appear in all tabs

### Scenario 4: Service Integration

Use the online status API from another service:

```javascript
// Example: Check if user is online before sending notification
const response = await fetch(
  "http://localhost:3005/api/notifications/user/123/online"
);
const { online } = await response.json();

if (online) {
  // User is online, send real-time notification
  await fetch("http://localhost:3005/api/notifications/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: 123,
      type: "message",
      title: "New Message",
      content: "You have a new message!",
    }),
  });
} else {
  // User is offline, handle accordingly
  console.log("User is offline");
}
```

---

## 🐛 Troubleshooting

### Service Won't Start

- Check if port 3005 is already in use: `lsof -i :3005`
- Kill existing process: `pkill -f "node src/notification.js"`
- Check environment variables in `.env` file

### WebSocket Connection Issues

- Verify the service is running on port 3005
- Check browser console for WebSocket errors
- Ensure userId parameter is provided in WebSocket URL

### Database Issues

- Run `npx prisma db push` to reset/update database
- Check that `DATABASE_PATH` in `.env` is correct

### CORS Issues

- The service has CORS enabled for all origins
- If testing from different domains, verify CORS headers

---

## 📊 Expected Results

### Web UI Testing

- ✅ Users auto-connect within 2 seconds
- ✅ Messages appear instantly on recipient's side
- ✅ Online status updates in real-time
- ✅ Notifications persist and can be marked as read
- ✅ Unread count updates correctly

### API Testing

- ✅ All endpoints return proper JSON responses
- ✅ Online status reflects actual WebSocket connections
- ✅ Notifications are stored in database
- ✅ Real-time WebSocket messages are delivered

### Performance

- ✅ WebSocket connections are cleaned up on disconnect
- ✅ Multiple connections per user are supported
- ✅ Service handles connection errors gracefully

---

## 🎉 Success Criteria

Your notification service is working correctly if:

1. **Real-time notifications work**: Messages sent through the API appear instantly via WebSocket
2. **Online status is accurate**: API endpoints reflect actual WebSocket connection status
3. **Persistence works**: Notifications are stored and retrievable via API
4. **Cleanup works**: Disconnected users show as offline
5. **Multi-connection support**: Same user can connect from multiple clients

---

## 🔧 Advanced Testing

### Load Testing

```bash
# Test with multiple concurrent users
for i in {1..10}; do
  curl -X POST http://localhost:3005/api/notifications/ \
    -H "Content-Type: application/json" \
    -d "{\"userId\": $i, \"type\": \"message\", \"title\": \"Test $i\", \"content\": \"Load test message\"}" &
done
```

### Database Inspection

```bash
# Open Prisma Studio to view database
npx prisma studio
```

### Monitoring

Check service logs for connection/disconnection events and error handling.

---

## 🚀 Next Steps

Once testing is complete, your notification service is ready for:

- Integration with other microservices
- Production deployment with Docker
- Scaling with load balancers
- Monitoring with logging services

Happy testing! 🎉
