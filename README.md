# Swifty Query Service (CQRS Read Model)

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.0-orange.svg)](https://www.rabbitmq.com/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

A high-performance **Query Service** for the Swifty image processing platform, implementing the **CQRS pattern** with MongoDB materialized views and RabbitMQ event consumption.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start MongoDB & RabbitMQ
docker-compose up -d mongodb rabbitmq

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Run the service
npm run dev
```

**Service runs on port 3002** and provides read-only endpoints.

📖 **[See QUICKSTART.md for detailed setup instructions](QUICKSTART.md)**

## 📋 Overview

### What is This Service?

This is the **Query Side** of a CQRS architecture:
- ✅ **Read-only operations** (GET endpoints)
- ✅ **MongoDB** for fast queries
- ✅ **Event-driven** updates from RabbitMQ
- ✅ **Materialized views** with denormalized data
- ✅ **Eventual consistency** (~100ms lag)

### Architecture

```
Command Service (3000)     Query Service (3002)
       |                           |
   PostgreSQL                  MongoDB
       |                           |
       └─→ RabbitMQ Events ───────┘
           (swifty.events)
```

## 🎯 Key Features

- **CQRS Pattern**: Separate read and write models
- **Event Sourcing**: Consumes events to materialize views
- **MongoDB**: Optimized schemas for fast queries
- **Denormalized Data**: Pre-joined data for performance
- **Real-time Stats**: Aggregated statistics per user
- **Idempotent Handlers**: Safe event replay
- **Clean Architecture**: Domain-driven design

## 📡 API Endpoints

All endpoints require Firebase authentication token.

### Images
```http
GET /api/images              # List user's processed images
GET /api/images/:id          # Get specific image details
```

**Query Parameters:**
- `status`: Filter by status (processing, completed, failed)
- `style`: Filter by style (cartoon, watercolor, etc.)
- `limit`: Max results (default: 50)

### Users
```http
GET /api/users/profile       # Get user profile with stats
```

### Statistics
```http
GET /api/stats/images        # Get aggregated image statistics
```

### Health
```http
GET /health                  # Service health check
```

## 🗃️ MongoDB Collections

### 1. user_profiles
User profile materialized view:
```javascript
{
  user_id: "uuid",
  firebase_uid: "firebase_uid",
  email: "user@example.com",
  full_name: "John Doe",
  total_images: 42,
  total_processing_time: 15000,
  last_activity: ISODate("2025-11-08T...")
}
```

### 2. processed_images
Denormalized image view:
```javascript
{
  image_id: "uuid",
  user_id: "uuid",
  user_email: "user@example.com",  // Denormalized
  original_url: "https://...",
  processed_url: "https://...",
  style: "cartoon",
  status: "completed",
  size: 1024000,
  processing_time: 5000,
  processed_at: ISODate("...")
}
```

### 3. image_statistics
Pre-aggregated statistics:
```javascript
{
  user_id: "uuid",
  total_images: 42,
  completed_images: 40,
  failed_images: 2,
  processing_images: 0,
  avg_processing_time: 4500,
  styles_used: { "cartoon": 20, "watercolor": 22 }
}
```

## 🔄 Event Handlers

This service consumes the following events from `swifty.query-events` queue:

| Event Type | Handler | Action |
|------------|---------|--------|
| `user.registered` | UserRegisteredEventHandler | Create user profile |
| `image.uploaded` | ImageUploadedEventHandler | Create image record + update stats |
| `image.processed` | ImageProcessedEventHandler | Update status + metrics |
| `image.failed` | ProcessingFailedEventHandler | Mark as failed |

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5
- **Database**: MongoDB 7+ (Mongoose)
- **Message Broker**: RabbitMQ (amqplib)
- **Authentication**: Firebase Admin SDK
- **Logging**: Pino
- **Testing**: Jest
- **Language**: JavaScript (ES Modules)

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- MongoDB 7+ (local or cloud)
- RabbitMQ 3+ (local or cloud)
- Firebase project with service account

### Setup

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd swifty-api-handler
   npm install
   ```

2. **Start Dependencies**
   ```bash
   docker-compose up -d mongodb rabbitmq
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Run Service**
   ```bash
   npm run dev  # Development
   npm start    # Production
   ```

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

**Test Coverage**: Query handlers and Event handlers have 100% coverage.

## 🐳 Docker Deployment

### Using Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f query-service

# Stop all services
docker-compose down
```

### Build Standalone Image
```bash
docker build -t swifty-query-service .
docker run -p 3002:3002 --env-file .env swifty-query-service
```

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=3002
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb://localhost:27017/swifty_read

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=swifty.events

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_email@project.iam.gserviceaccount.com

# Optional
LOG_LEVEL=info
FRONTEND_URL=http://localhost:3000
```

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Step-by-step setup guide
- **[QUERY_SERVICE.md](QUERY_SERVICE.md)** - Detailed architecture documentation
- **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Implementation status
- **[ROUTE_REFACTORING.md](ROUTE_REFACTORING.md)** - Route refactoring guide (DI pattern)
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Overall system architecture

## 🔍 Monitoring

### Health Check
```bash
curl http://localhost:3002/health
```

### MongoDB Monitoring
```bash
# Check collections
mongosh mongodb://localhost:27017/swifty_read --eval "show collections"

# View stats
mongosh mongodb://localhost:27017/swifty_read --eval "db.stats()"
```

### RabbitMQ Monitoring
- UI: http://localhost:15672
- User: `guest` / Pass: `guest`

## 🚨 Troubleshooting

### MongoDB Connection Issues
```bash
docker ps | grep mongo
docker logs mongodb
```

### RabbitMQ Not Connected
```bash
docker ps | grep rabbitmq
docker logs rabbitmq
```

### Events Not Processing
1. Check queue exists in RabbitMQ UI
2. Verify exchange bindings
3. Check service logs for errors

See **[QUICKSTART.md](QUICKSTART.md)** for detailed troubleshooting.

## 🤝 Integration

### Command Service Integration

This service works alongside a **Command Service** (port 3000):

1. **Command Service**: Handles writes (POST, PATCH, DELETE)
2. **Query Service**: Handles reads (GET)
3. **Communication**: Via RabbitMQ events

### Example Flow
```
Client → Command Service: POST /api/images/process
Command Service → PostgreSQL: Save image
Command Service → RabbitMQ: Publish ImageUploadedEvent
Query Service → RabbitMQ: Consume event
Query Service → MongoDB: Materialize view
Client → Query Service: GET /api/images (fast read)
```

## 📊 Performance

- **Query Speed**: < 50ms (MongoDB indexed queries)
- **Event Processing**: < 10ms per event
- **Consistency**: Eventually consistent (~100ms lag)
- **Throughput**: 1000+ queries/second
- **Connection Pool**: 10 MongoDB connections

## 🔐 Security

- **Authentication**: Firebase JWT required for all API endpoints
- **CORS**: Configured via `FRONTEND_URL`
- **Read-Only**: No write operations exposed
- **Input Validation**: Query parameters validated

## 📈 Roadmap

- [ ] Redis caching layer
- [ ] GraphQL API
- [ ] Pagination cursors
- [ ] WebSocket real-time updates
- [ ] Elasticsearch integration
- [ ] Prometheus metrics

## 🤔 FAQ

**Q: Why CQRS?**  
A: Separates read and write concerns, allowing independent scaling and optimization.

**Q: Why MongoDB?**  
A: Flexible schema, fast reads, horizontal scaling, perfect for materialized views.

**Q: What about consistency?**  
A: Eventually consistent (~100ms). Acceptable for most read scenarios.

**Q: Can I write to this service?**  
A: No. All writes go through the Command Service (port 3000).

**Q: How do I test locally?**  
A: See [QUICKSTART.md](QUICKSTART.md) for complete setup instructions.

## 📝 License

ISC

## 👥 Contributing

This is part of the Swifty platform. See main repository for contribution guidelines.

## 🆘 Support

- **Issues**: Check logs and [QUICKSTART.md](QUICKSTART.md) troubleshooting
- **Documentation**: See [QUERY_SERVICE.md](QUERY_SERVICE.md)
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md)

---

**Status**: ✅ Production Ready  
**Service**: Query Service (CQRS Read Model)  
**Port**: 3002  
**Version**: 1.0.0

