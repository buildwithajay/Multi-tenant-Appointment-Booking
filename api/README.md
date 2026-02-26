# Appointment Booking System API

## Quick Start

### Build & Run
```bash
# Install dependencies
dotnet restore

# Run application
dotnet run

# Watch mode (auto-reload)
dotnet watch run
```

### Database Setup
```bash
# Apply migrations
dotnet ef database update

# Create new migration
dotnet ef migrations add MigrationName
```

### Swagger UI
Visit `https://localhost:5001/swagger` to test API endpoints

---

## Project Architecture

**Clean Layered Architecture:**
- **API Layer**: Controllers & HTTP handlers
- **Application Layer**: DTOs, business logic, interfaces  
- **Domain Layer**: Entity models & enumerations
- **Infrastructure Layer**: Data access, external services, migrations

---

## Key Technologies

| Component | Technology |
|-----------|-----------|
| Framework | ASP.NET Core 10.0 |
| Database | PostgreSQL (Neon Cloud) |
| ORM | Entity Framework Core 10.0 |
| Authentication | JWT Tokens + Google OAuth |
| Identity | ASP.NET Core Identity |
| API Docs | Swagger/OpenAPI |

---

## Current Features

### ✅ Implemented
- User authentication (email/password & Google OAuth)
- JWT token generation & validation
- Tenant multi-tenancy management
- Role-based access control (Admin role)
- Database migrations & seeding infrastructure
- API documentation (Swagger)
- Core domain models (9 entities)

### 🔄 In Development
- Booking management endpoints
- Service CRUD operations
- Staff management
- Customer management
- Payment tracking

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login (JWT) |
| POST | `/api/tenant` | Create new tenant |

*More endpoints coming soon...*

---

## Configuration

**Database Connection** (`appsettings.json`):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "postgresql://..."
  },
  "JWT": {
    "Issuer": "http://backend.com",
    "Audience": "http://frontend.com",
    "key": "Your_Secret_Key_Min_32_Chars"
  }
}
```

---

## Project Structure
```
src/
├── API/              # Controllers & middlewares
├── Application/      # Services, DTOs, interfaces
├── Domain/           # Models & enums
└── Infrastructure/   # Repositories, DbContext, migrations
```

---

## Version
- **.NET**: 10.0
- **Project Version**: 0.1.0
- **Status**: Active Development

For detailed documentation, see [PROJECT_DOCUMENTATION.md](../PROJECT_DOCUMENTATION.md)
