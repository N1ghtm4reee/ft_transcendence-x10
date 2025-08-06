# 🔔 Notification Service

A real-time notification microservice built with Fastify, Prisma, and WebSocket support.

## ✨ Features

- **Real-time Notifications**: WebSocket-based instant notification delivery
- **Online Status API**: Check if users are currently connected
- **REST API**: Complete CRUD operations for notifications
- **User Preferences**: Customizable notification settings
- **Multi-connection Support**: Same user can connect from multiple devices
- **Persistent Storage**: SQLite database with Prisma ORM

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up database
npx prisma db push

# Start the service
npm start
```

## 🧪 Testing

For comprehensive testing instructions, see [TESTING-GUIDE.md](./TESTING-GUIDE.md)

**Quick Test:**

```bash
# Start test UI
node serve-test.js

# Open browser
open http://localhost:8081
```

## 📡 API Endpoints

### Notifications

- `POST /api/notifications/` - Create notification
- `GET /api/notifications/` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `GET /api/notifications/unread-count` - Get unread count

### Online Status

- `GET /api/notifications/user/:userId/online` - Check if user is online
- `GET /api/notifications/users/online` - Get all online users

### WebSocket

- `ws://localhost:3005/ws/notifications/live?userId=123` - Real-time connection

## � Environment Variables

```bash
DATABASE_PATH="file:./prisma/notification.db"
NOTIFICATION_PORT=3005
```

## 🐳 Docker

```bash
docker build -t notification-service .
docker run -p 3005:3005 notification-service
```

## 📊 Usage Example

```javascript
// Check if user is online
const response = await fetch(
  "http://localhost:3005/api/notifications/user/123/online"
);
const { online } = await response.json();

// Send notification if user is online
if (online) {
  await fetch("http://localhost:3005/api/notifications/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: 123,
      type: "message",
      title: "Hello!",
      content: "You have a new message",
    }),
  });
}
```

## 📄 License

MIT
git clone <repository-url>
cd services/notification

````

2. **Install dependencies**

```bash
npm install
````

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize the database**

   ```bash
   npm run prisma:generate
   npm run prisma:push
   ```

5. **Start the service**

   ```bash
   # Development mode with hot reloading
   npm run dev

   # Production mode
   npm start
   ```

The service will be available at `http://localhost:3005`

## 📚 API Documentation

### Health Check

```http
GET /health
```

Returns service health status.

### Notifications

#### Create Notification

```http
POST /api/notifications/
```

**Headers**: `x-user-id: <user_id>`

**Body**:

```json
{
  "targetUserId": 123,
  "type": "message",
  "title": "New Message",
  "content": "You have a new message from John",
  "sourceId": "msg_123",
  "sourceType": "message"
}
```

#### Get User Notifications

```http
GET /api/notifications/
```

**Headers**: `x-user-id: <user_id>`

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by notification type
- `unread` (optional): Filter unread notifications (true/false)

#### Mark Notification as Read

```http
PATCH /api/notifications/:id/read
```

**Headers**: `x-user-id: <user_id>`

#### Mark All Notifications as Read

```http
PATCH /api/notifications/read-all
```

**Headers**: `x-user-id: <user_id>`

#### Get Unread Count

```http
GET /api/notifications/unread-count
```

**Headers**: `x-user-id: <user_id>`

#### Get Notification Settings

```http
GET /api/notifications/settings
```

**Headers**: `x-user-id: <user_id>`

#### Update Notification Settings

```http
PUT /api/notifications/settings
```

**Headers**: `x-user-id: <user_id>`

**Body**:

```json
{
  "enableMessages": true,
  "enableFriendRequests": false,
  "enableGameInvites": true
}
```

## 🔌 WebSocket Events

### Connection

Connect to the WebSocket endpoint:

```javascript
const ws = new WebSocket("ws://localhost:3005/ws/notifications");
```

### Events

#### Client to Server

```javascript
// Subscribe to notifications for a specific user
ws.send(
  JSON.stringify({
    type: "subscribe",
    userId: 123,
  })
);

// Unsubscribe
ws.send(
  JSON.stringify({
    type: "unsubscribe",
    userId: 123,
  })
);
```

#### Server to Client

```javascript
// New notification received
{
  type: 'notification',
  data: {
    id: "notif_123",
    userId: 123,
    type: "message",
    title: "New Message",
    content: "You have a new message",
    read: false,
    createdAt: "2024-01-01T12:00:00Z",
    sourceId: "msg_123",
    sourceType: "message"
  }
}

// Notification marked as read
{
  type: 'notification_read',
  data: {
    notificationId: "notif_123",
    userId: 123
  }
}
```

## 🗄 Database Schema

### Notification

| Field      | Type     | Description                   |
| ---------- | -------- | ----------------------------- |
| id         | String   | Unique identifier (CUID)      |
| userId     | Int      | Target user ID                |
| type       | String   | Notification type             |
| title      | String   | Notification title            |
| content    | String   | Notification content          |
| read       | Boolean  | Read status (default: false)  |
| createdAt  | DateTime | Creation timestamp            |
| sourceId   | String?  | Source entity ID (optional)   |
| sourceType | String?  | Source entity type (optional) |

### NotificationSettings

| Field                | Type    | Description                          |
| -------------------- | ------- | ------------------------------------ |
| id                   | Int     | Auto-increment ID                    |
| userId               | Int     | User ID (unique)                     |
| enableMessages       | Boolean | Message notifications enabled        |
| enableFriendRequests | Boolean | Friend request notifications enabled |
| enableGameInvites    | Boolean | Game invite notifications enabled    |

## 🧪 Testing

### Run the Test UI

The service includes a comprehensive test UI for manual testing:

```bash
# Start the test UI server
node serve-ui.js
```

The test UI will be available at `http://localhost:8080` and includes:

- Health check testing
- WebSocket connection testing
- All API endpoint testing
- Real-time notification display

### API Testing with curl

```bash
# Health check
curl http://localhost:3005/health

# Create notification
curl -X POST http://localhost:3005/api/notifications/ \
  -H "Content-Type: application/json" \
  -H "x-user-id: 123" \
  -d '{"targetUserId": 456, "type": "message", "title": "Test", "content": "Test notification"}'

# Get notifications
curl http://localhost:3005/api/notifications/ \
  -H "x-user-id: 456"
```

## 🐳 Docker Deployment

### Build the Image

```bash
docker build -t notification-service .
```

### Run with Docker Compose

```bash
# From the project root
docker-compose -f docker-compose.backend.yml up -d notification-service
```

### Docker Configuration

The service runs on Alpine Linux with:

- Node.js runtime
- Prisma database setup
- Health check endpoint
- Volume mounts for database persistence

## 🔧 Environment Variables

| Variable            | Description          | Default                       |
| ------------------- | -------------------- | ----------------------------- |
| `NOTIFICATION_PORT` | Service port         | 3005                          |
| `DATABASE_PATH`     | SQLite database path | file:./prisma/notification.db |
| `NODE_ENV`          | Environment mode     | development                   |

## 📝 Scripts

| Command                   | Description                                |
| ------------------------- | ------------------------------------------ |
| `npm start`               | Start the service in production mode       |
| `npm run dev`             | Start with nodemon for development         |
| `npm run prisma:generate` | Generate Prisma client                     |
| `npm run prisma:push`     | Push schema changes to database            |
| `npm run prisma:studio`   | Open Prisma Studio for database management |

## 🚨 Error Handling

The service includes comprehensive error handling:

- Input validation with detailed error messages
- Database connection error handling
- WebSocket connection management
- CORS configuration for cross-origin requests
- Graceful shutdown handling

## 🔍 Monitoring

### Health Check

The service provides a health endpoint at `/health` that returns:

```json
{
  "message": "Notification service healthy"
}
```

### Logging

Fastify's built-in logger provides detailed request/response logging for debugging and monitoring.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of the Trandandan platform. See the main repository for license information.

---

**Need help?** Check the test UI at `http://localhost:8080` for interactive API testing and examples.
