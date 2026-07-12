# UR Platform - Production Architecture

## Overview

This document describes the enterprise-grade, production-ready architecture of the UR platform. The system is designed to be:
- **Fully portable** to any pay-as-you-go cloud provider (AWS, Google Cloud, Azure, DigitalOcean, Heroku)
- **Scalable** from startup to enterprise
- **Maintainable** with clear separation of concerns
- **Secure** with proper authentication and authorization
- **Resilient** with error handling and recovery
- **Observable** with logging and monitoring

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  Mobile App (React Native/Expo) | Web App (Next.js/React)  │
│  - Feature Pages (Isolated)                                 │
│  - State Management (Redux/Context)                         │
│  - Local Storage (AsyncStorage)                             │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/REST/WebSocket
┌────────────────────▼────────────────────────────────────────┐
│                    API GATEWAY LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  - Authentication & Authorization                           │
│  - Rate Limiting                                            │
│  - Request Validation                                       │
│  - Response Transformation                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──┐  ┌──────▼──┐  ┌─────▼────┐
│ Auth     │  │ Content │  │ AI/ML    │
│ Service  │  │ Service │  │ Service  │
└───────┬──┘  └──────┬──┘  └─────┬────┘
        │            │            │
        └────────────┼────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    DATA LAYER                               │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database (Primary)                              │
│  - User Management                                          │
│  - Content Storage                                          │
│  - AI Agent Data                                            │
│  - Transactions & Audit Logs                                │
└─────────────────────────────────────────────────────────────┘
        │
        ├─ Redis Cache (Session & Performance)
        ├─ S3/Blob Storage (Files & Media)
        └─ Message Queue (Background Jobs)
```

## Technology Stack

### Frontend
- **Framework**: React Native + Expo (Mobile) / React 19 (Web)
- **Styling**: NativeWind (Tailwind CSS)
- **State**: Redux Toolkit + Redux Thunk
- **API Client**: tRPC + React Query
- **Build**: Expo CLI / Vite

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js + tRPC
- **Database**: PostgreSQL 14+
- **ORM**: Drizzle ORM
- **Cache**: Redis
- **Queue**: Bull (Redis-backed)
- **Auth**: JWT + OAuth2
- **Validation**: Zod

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose (dev) / Kubernetes (prod)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch + Logstash + Kibana)

## Database Schema

### Core Tables
```sql
-- Users
users (id, email, password_hash, created_at, updated_at)
user_profiles (user_id, name, avatar, bio, preferences)
user_settings (user_id, theme, notifications, privacy)

-- Authentication
sessions (id, user_id, token, expires_at)
oauth_tokens (user_id, provider, access_token, refresh_token)
audit_logs (user_id, action, resource, timestamp)

-- AI Agents
ai_agents (id, name, type, description, model, config)
ai_agent_conversations (id, user_id, agent_id, messages, created_at)
ai_learning_data (agent_id, topic, content, confidence, verified)

-- Content
projects (id, user_id, name, description, data, created_at)
project_versions (id, project_id, version, data, created_at)
project_collaborators (project_id, user_id, role, permissions)

-- Safety & Compliance
user_agreements (user_id, type, version, accepted_at, ip_address)
safety_events (id, user_id, event_type, severity, details)
compliance_records (id, user_id, action, timestamp, details)

-- Transactions (Future)
transactions (id, user_id, amount, type, status, created_at)
transaction_items (transaction_id, description, quantity, price)
```

## API Structure

### Authentication Endpoints
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/oauth/:provider
```

### User Endpoints
```
GET    /api/users/me
PUT    /api/users/me
GET    /api/users/:id
PUT    /api/users/:id/settings
```

### AI Agent Endpoints
```
GET    /api/agents
GET    /api/agents/:id
POST   /api/agents/:id/chat
GET    /api/agents/:id/history
POST   /api/agents/:id/learn
```

### Project Endpoints
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/versions
POST   /api/projects/:id/share
```

### Safety Endpoints
```
POST   /api/safety/report
GET    /api/safety/status
POST   /api/safety/check-content
```

## Deployment Architecture

### Development Environment
```
docker-compose up
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Database: localhost:5432
- Redis: localhost:6379
```

### Production Environment (Cloud Agnostic)

#### AWS Deployment
```
- Frontend: CloudFront + S3
- Backend: ECS/Fargate + ALB
- Database: RDS PostgreSQL
- Cache: ElastiCache Redis
- Storage: S3
- Queue: SQS
```

#### Google Cloud Deployment
```
- Frontend: Cloud CDN + Cloud Storage
- Backend: Cloud Run
- Database: Cloud SQL PostgreSQL
- Cache: Cloud Memorystore Redis
- Storage: Cloud Storage
- Queue: Cloud Tasks
```

#### Azure Deployment
```
- Frontend: CDN + Blob Storage
- Backend: Container Instances / App Service
- Database: Azure Database for PostgreSQL
- Cache: Azure Cache for Redis
- Storage: Blob Storage
- Queue: Service Bus
```

## Environment Configuration

### Environment Variables
```
# Frontend
REACT_APP_API_URL=https://api.urplatform.com
REACT_APP_WS_URL=wss://api.urplatform.com
REACT_APP_ENV=production

# Backend
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/urdb
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-key
OAUTH_GOOGLE_ID=...
OAUTH_GOOGLE_SECRET=...

# Services
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Monitoring
SENTRY_DSN=...
LOG_LEVEL=info
```

## Security Considerations

### Authentication & Authorization
- JWT tokens with 24-hour expiration
- Refresh tokens with 30-day expiration
- Role-based access control (RBAC)
- OAuth2 for social login

### Data Protection
- AES-256 encryption for sensitive data
- TLS 1.3 for all communications
- HTTPS only (no HTTP)
- CORS properly configured

### API Security
- Rate limiting (100 req/min per user)
- Input validation with Zod
- SQL injection prevention (ORM)
- CSRF protection

### Compliance
- GDPR compliant (data export, deletion)
- CCPA compliant (privacy controls)
- SOC 2 ready (audit logs)
- PCI DSS ready (for payments)

## Scaling Strategy

### Horizontal Scaling
- Stateless backend services
- Load balancing across multiple instances
- Database read replicas
- Redis cluster for caching

### Vertical Scaling
- Increase instance size as needed
- Database optimization (indexing, partitioning)
- CDN for static assets
- Compression and caching

### Monitoring & Alerts
- CPU/Memory usage
- API response times
- Database query performance
- Error rates and exceptions
- User activity metrics

## Disaster Recovery

### Backup Strategy
- Daily automated database backups
- 30-day retention
- Cross-region replication
- Point-in-time recovery

### Failover
- Multi-AZ deployment
- Automatic failover
- Health checks every 30 seconds
- RTO: 5 minutes, RPO: 1 minute

## Portability Checklist

- [ ] All configuration via environment variables
- [ ] No hardcoded credentials
- [ ] Database-agnostic ORM (Drizzle)
- [ ] Cloud-agnostic storage (S3-compatible)
- [ ] Docker containerization
- [ ] Docker Compose for local dev
- [ ] Kubernetes manifests for prod
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Infrastructure as Code (Terraform)
- [ ] Monitoring stack included
- [ ] Logging stack included
- [ ] Documentation complete

## Migration Path

### From Manus Sandbox to AWS
1. Export database from Manus
2. Create RDS PostgreSQL instance
3. Migrate data using AWS DMS
4. Deploy backend to ECS/Fargate
5. Deploy frontend to CloudFront + S3
6. Configure Route53 DNS
7. Set up CloudWatch monitoring
8. Enable auto-scaling

### From AWS to Google Cloud
1. Export database from RDS
2. Create Cloud SQL PostgreSQL instance
3. Migrate data using Cloud Database Migration Service
4. Deploy backend to Cloud Run
5. Deploy frontend to Cloud CDN + Cloud Storage
6. Configure Cloud Load Balancing
7. Set up Cloud Monitoring
8. Enable auto-scaling

## Cost Estimation

### Monthly Costs (AWS, Small Scale)
- EC2 (Backend): $50-100
- RDS (Database): $50-100
- S3 (Storage): $10-20
- CloudFront (CDN): $10-20
- Other (Route53, etc): $10-20
- **Total: ~$130-260/month**

### Monthly Costs (AWS, Medium Scale)
- EC2 (Backend): $200-400
- RDS (Database): $200-400
- S3 (Storage): $50-100
- CloudFront (CDN): $50-100
- Other: $50-100
- **Total: ~$550-1100/month**

## Next Steps

1. Set up Docker environment
2. Create Kubernetes manifests
3. Set up CI/CD pipeline
4. Create Terraform infrastructure code
5. Test migration to AWS
6. Document operational procedures
7. Set up monitoring and alerting
8. Create disaster recovery plan
