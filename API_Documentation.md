# Project Numbering Tool - API Documentation

## Overview

This document provides comprehensive documentation for the Project Numbering Tool API. The API is built with Next.js 16 and uses MongoDB Atlas as the database backend. All endpoints follow RESTful principles and return JSON responses.

**Project Version:** 1.0.0  
**Last Updated:** March 4, 2026

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Base Configuration](#base-configuration)
3. [Data Models](#data-models)
4. [API Endpoints](#api-endpoints)
   - [Health Check](#health-check)
   - [Users](#users)
   - [Clients](#clients)
   - [Projects](#projects)
5. [Error Handling](#error-handling)
6. [Response Format](#response-format)
7. [Status Codes](#status-codes)

---

## Getting Started

### Base URL

```
http://localhost:3000/api
```

### Environment Setup

**Backend Directory:**
```
backend/lovable-next/
```

**Frontend URL:**
```
http://localhost:8080
```

**MongoDB Connection:**
```
MONGODB_URI=mongodb+srv://olcen_db_user:PASSWORD@cluster0.pjyqknk.mongodb.net/lovable?retryWrites=true&w=majority&appName=Cluster0
```

### Starting the Backend

```bash
cd backend/lovable-next
npm run dev
```

---

## Base Configuration

### Framework & Dependencies

- **Framework:** Next.js 16 with TypeScript
- **Database:** MongoDB Atlas
- **ODM:** Mongoose 9.2.2
- **Driver:** MongoDB 7.1.0
- **Node.js:** v24.x

### Key Libraries

- `dotenv` - Environment variable management
- `mongoose` - MongoDB ORM with connection pooling
- `next` - Framework and routing

---

## Data Models

### User Model

**Collection:** `users`

**Fields:**

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `_id` | ObjectId | Yes | Yes | MongoDB generated ID |
| `email` | String | Yes | Yes | User email (lowercase, validated) |
| `first_name` | String | No | No | User's first name |
| `last_name` | String | No | No | User's last name |
| `display_name` | String | No | No | User's display name |
| `short_name` | String | No | No | User's short name (e.g., initials) |
| `roles` | Array | No | No | Array of roles: `admin`, `manager`, `account`, `viewer` |
| `createdAt` | Date | Yes | No | Automatic timestamp |
| `updatedAt` | Date | Yes | No | Automatic timestamp |

**Example Document:**
```json
{
  "_id": "65a7f8c9d1e2b3a4c5f6g7h8",
  "email": "john.doe@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "display_name": "John Doe",
  "short_name": "JD",
  "roles": ["manager"],
  "createdAt": "2026-03-01T10:30:00Z",
  "updatedAt": "2026-03-04T14:22:15Z"
}
```

---

### Client Model

**Collection:** `clients`

**Fields:**

| Field | Type | Required | Unique | Reference | Description |
|-------|------|----------|--------|-----------|-------------|
| `_id` | ObjectId | Yes | Yes | - | MongoDB generated ID |
| `name` | String | Yes | No | - | Client name (trimmed) |
| `prefix` | String | No | No | - | Client prefix code |
| `created_by` | ObjectId | Yes | No | User | ID of user who created the client |
| `createdAt` | Date | Yes | No | - | Automatic timestamp |
| `updatedAt` | Date | Yes | No | - | Automatic timestamp |

**Example Document:**
```json
{
  "_id": "69a533bf9ea73097eb85daa1",
  "name": "REGE",
  "prefix": "REG",
  "created_by": "65a7f8c9d1e2b3a4c5f6g7h8",
  "createdAt": "2026-02-15T09:00:00Z",
  "updatedAt": "2026-03-04T16:30:00Z"
}
```

---

### Project Model

**Collection:** `projects`

**Fields:**

| Field | Type | Required | Unique | Reference | Description |
|-------|------|----------|--------|-----------|-------------|
| `_id` | ObjectId | Yes | Yes | - | MongoDB generated ID |
| `project_number` | String | Yes | Yes | - | Unique project identifier |
| `name` | String | Yes | No | - | Project name (trimmed) |
| `description` | String | No | No | - | Project description |
| `client_id` | ObjectId | Yes | No | Client | Reference to Client |
| `status` | String | No | No | - | Project status: `active`, `completed`, `on_hold` |
| `created_by` | ObjectId | No | No | User | ID of user who created the project |
| `createdAt` | Date | Yes | No | - | Automatic timestamp |
| `updatedAt` | Date | Yes | No | - | Automatic timestamp |

**Status Enum:**
- `active` - Project is currently active
- `completed` - Project has been completed
- `on_hold` - Project is on hold

**Example Document:**
```json
{
  "_id": "69b644cg0fb84108fc96ebb2",
  "project_number": "REG-001",
  "name": "REGE Building Phase 1",
  "description": "Construction of main building structure",
  "client_id": "69a533bf9ea73097eb85daa1",
  "status": "active",
  "created_by": "65a7f8c9d1e2b3a4c5f6g7h8",
  "createdAt": "2026-02-20T11:45:00Z",
  "updatedAt": "2026-03-04T16:30:00Z"
}
```

---

## API Endpoints

### Health Check

#### Test Database Connection

**Endpoint:** `GET /test`

**Description:** Verifies MongoDB connection and lists all collections

**Request:**
```bash
curl http://localhost:3000/api/test
```

**Response (200 OK):**
```json
{
  "message": "MongoDB Connected Successfully",
  "collections": [
    { "name": "users" },
    { "name": "clients" },
    { "name": "projects" }
  ]
}
```

**Response (500 Error):**
```json
{
  "error": "querySrv ECONNREFUSED _mongodb._tcp.cluster0.pjyqknk.mongodb.net"
}
```

---

## Users Endpoint

### List Users

**Endpoint:** `GET /users`

**Description:** Retrieve a list of users with pagination and optional email filtering

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `email` | String | No | - | Filter by email (case-insensitive, partial match) |
| `limit` | Integer | No | 10 | Number of results per page |
| `skip` | Integer | No | 0 | Number of results to skip for pagination |

**Request:**
```bash
# Get all users
curl http://localhost:3000/api/users

# Get users with email containing 'john', limit 5
curl "http://localhost:3000/api/users?email=john&limit=5"

# Pagination: get 10 users, skip first 20
curl "http://localhost:3000/api/users?limit=10&skip=20"
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "_id": "65a7f8c9d1e2b3a4c5f6g7h8",
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "display_name": "John Doe",
      "short_name": "JD",
      "roles": ["manager"],
      "createdAt": "2026-03-01T10:30:00Z",
      "updatedAt": "2026-03-04T14:22:15Z"
    },
    {
      "_id": "65a7f8c9d1e2b3a4c5f6g7h9",
      "email": "jane.smith@example.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "display_name": "Jane Smith",
      "short_name": "JS",
      "roles": ["viewer"],
      "createdAt": "2026-03-02T14:15:00Z",
      "updatedAt": "2026-03-04T14:22:15Z"
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 10,
    "skip": 0
  }
}
```

**Response (500 Error):**
```json
{
  "error": "Connection timeout"
}
```

---

### Create User

**Endpoint:** `POST /users`

**Description:** Create a new user account

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "first_name": "New",
  "last_name": "User",
  "display_name": "New User",
  "short_name": "NU",
  "roles": ["viewer"]
}
```

**Required Fields:**
- `email` - Email address (must be valid email format, unique)

**Optional Fields:**
- `first_name` - First name
- `last_name` - Last name
- `display_name` - Display name
- `short_name` - Short name
- `roles` - Array of roles (default: `["viewer"]`)

**Request:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice.johnson@example.com",
    "first_name": "Alice",
    "last_name": "Johnson",
    "display_name": "Alice Johnson",
    "short_name": "AJ",
    "roles": ["account"]
  }'
```

**Response (201 Created):**
```json
{
  "data": {
    "_id": "65a7f8c9d1e2b3a4c5f6g71a",
    "email": "alice.johnson@example.com",
    "first_name": "Alice",
    "last_name": "Johnson",
    "display_name": "Alice Johnson",
    "short_name": "AJ",
    "roles": ["account"],
    "createdAt": "2026-03-04T16:45:00Z",
    "updatedAt": "2026-03-04T16:45:00Z"
  },
  "message": "User created successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Email is required"
}
```

**Response (409 Conflict):**
```json
{
  "error": "User with this email already exists"
}
```

---

## Clients Endpoint

### List Clients

**Endpoint:** `GET /clients`

**Description:** Retrieve a list of clients with pagination and optional name filtering

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | String | No | - | Filter by client name (case-insensitive, partial match) |
| `limit` | Integer | No | 10 | Number of results per page |
| `skip` | Integer | No | 0 | Number of results to skip for pagination |

**Request:**
```bash
# Get all clients
curl http://localhost:3000/api/clients

# Get clients with name containing 'REGE'
curl "http://localhost:3000/api/clients?name=REGE"

# Pagination example
curl "http://localhost:3000/api/clients?limit=5&skip=10"
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "_id": "69a533bf9ea73097eb85daa1",
      "name": "REGE",
      "prefix": "REG",
      "created_by": {
        "_id": "65a7f8c9d1e2b3a4c5f6g7h8",
        "email": "john.doe@example.com",
        "display_name": "John Doe"
      },
      "createdAt": "2026-02-15T09:00:00Z",
      "updatedAt": "2026-03-04T16:30:00Z"
    },
    {
      "_id": "69a533bf9ea73097eb85daa2",
      "name": "Alpha Construction",
      "prefix": "AC",
      "created_by": {
        "_id": "65a7f8c9d1e2b3a4c5f6g7h9",
        "email": "jane.smith@example.com",
        "display_name": "Jane Smith"
      },
      "createdAt": "2026-02-20T10:00:00Z",
      "updatedAt": "2026-03-03T15:20:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 10,
    "skip": 0
  }
}
```

**Response (500 Error):**
```json
{
  "error": "Connection timeout"
}
```

---

### Create Client

**Endpoint:** `POST /clients`

**Description:** Create a new client

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Client",
  "prefix": "NCL",
  "created_by": "65a7f8c9d1e2b3a4c5f6g7h8"
}
```

**Required Fields:**
- `name` - Client name
- `created_by` - User ID of who created the client (must be valid ObjectId)

**Optional Fields:**
- `prefix` - Client prefix code

**Request:**
```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beta Industries",
    "prefix": "BETA",
    "created_by": "65a7f8c9d1e2b3a4c5f6g7h8"
  }'
```

**Response (201 Created):**
```json
{
  "data": {
    "_id": "69a533bf9ea73097eb85daa3",
    "name": "Beta Industries",
    "prefix": "BETA",
    "created_by": {
      "_id": "65a7f8c9d1e2b3a4c5f6g7h8",
      "email": "john.doe@example.com",
      "display_name": "John Doe"
    },
    "createdAt": "2026-03-04T17:00:00Z",
    "updatedAt": "2026-03-04T17:00:00Z"
  },
  "message": "Client created successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Client name is required"
}
```

or

```json
{
  "error": "created_by (User ID) is required"
}
```

or

```json
{
  "error": "Invalid created_by ID format"
}
```

---

### Update Client

**Endpoint:** `PUT /clients/:id`

**Description:** Update an existing client by ID

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | MongoDB ObjectId of the client |

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Client Name",
  "prefix": "UPN"
}
```

**Request:**
```bash
curl -X PUT http://localhost:3000/api/clients/69a533bf9ea73097eb85daa1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated REGE",
    "prefix": "UREG"
  }'
```

**Response (200 OK):**
```json
{
  "data": {
    "_id": "69a533bf9ea73097eb85daa1",
    "name": "Updated REGE",
    "prefix": "UREG",
    "created_by": {
      "_id": "65a7f8c9d1e2b3a4c5f6g7h8",
      "email": "john.doe@example.com",
      "display_name": "John Doe"
    },
    "createdAt": "2026-02-15T09:00:00Z",
    "updatedAt": "2026-03-04T17:15:00Z"
  },
  "message": "Client updated successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid client ID format"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Client not found"
}
```

---

### Delete Client

**Endpoint:** `DELETE /clients/:id`

**Description:** Delete a client by ID

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | MongoDB ObjectId of the client |

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/clients/69a533bf9ea73097eb85daa1
```

**Response (200 OK):**
```json
{
  "message": "Client deleted successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid client ID format"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Client not found"
}
```

---

## Projects Endpoint

### List Projects

**Endpoint:** `GET /projects`

**Description:** Retrieve a list of projects with advanced filtering and pagination

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | String | No | - | Filter by project name (case-insensitive, partial match) |
| `status` | String | No | - | Filter by status: `active`, `completed`, `on_hold` |
| `client_id` | String | No | - | Filter by client ID (must be valid ObjectId) |
| `limit` | Integer | No | 10 | Number of results per page |
| `skip` | Integer | No | 0 | Number of results to skip for pagination |

**Request:**
```bash
# Get all projects
curl http://localhost:3000/api/projects

# Get active projects for a specific client
curl "http://localhost:3000/api/projects?client_id=69a533bf9ea73097eb85daa1&status=active"

# Get projects with 'Phase' in name, limit 5
curl "http://localhost:3000/api/projects?name=Phase&limit=5"

# Pagination example
curl "http://localhost:3000/api/projects?limit=10&skip=20"
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "_id": "69b644cg0fb84108fc96ebb2",
      "project_number": "REG-001",
      "name": "REGE Building Phase 1",
      "description": "Construction of main building structure",
      "client_id": {
        "_id": "69a533bf9ea73097eb85daa1",
        "name": "REGE",
        "prefix": "REG"
      },
      "status": "active",
      "created_by": {
        "_id": "65a7f8c9d1e2b3a4c5f6g7h8",
        "email": "john.doe@example.com",
        "display_name": "John Doe"
      },
      "createdAt": "2026-02-20T11:45:00Z",
      "updatedAt": "2026-03-04T16:30:00Z"
    },
    {
      "_id": "69b644cg0fb84108fc96ebb3",
      "project_number": "REG-002",
      "name": "REGE Building Phase 2",
      "description": "Installation of interior fixtures",
      "client_id": {
        "_id": "69a533bf9ea73097eb85daa1",
        "name": "REGE",
        "prefix": "REG"
      },
      "status": "completed",
      "created_by": {
        "_id": "65a7f8c9d1e2b3a4c5f6g7h8",
        "email": "john.doe@example.com",
        "display_name": "John Doe"
      },
      "createdAt": "2026-02-25T09:30:00Z",
      "updatedAt": "2026-03-02T14:00:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 10,
    "skip": 0
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid client_id format"
}
```

**Response (500 Error):**
```json
{
  "error": "Connection timeout"
}
```

---

### Create Project

**Endpoint:** `POST /projects`

**Description:** Create a new project

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "project_number": "REG-003",
  "name": "REGE Building Phase 3",
  "description": "Final finishing touches",
  "client_id": "69a533bf9ea73097eb85daa1",
  "status": "active",
  "created_by": "65a7f8c9d1e2b3a4c5f6g7h8"
}
```

**Required Fields:**
- `project_number` - Unique project identifier (must be unique in database)
- `name` - Project name
- `client_id` - Client ID (must be valid ObjectId)
- `created_by` - User ID (must be valid ObjectId)

**Optional Fields:**
- `description` - Project description
- `status` - Project status (default: `active`)

**Request:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "project_number": "REG-003",
    "name": "REGE Building Phase 3",
    "description": "Final finishing touches",
    "client_id": "69a533bf9ea73097eb85daa1",
    "status": "active",
    "created_by": "65a7f8c9d1e2b3a4c5f6g7h8"
  }'
```

**Response (201 Created):**
```json
{
  "data": {
    "_id": "69b644cg0fb84108fc96ebb4",
    "project_number": "REG-003",
    "name": "REGE Building Phase 3",
    "description": "Final finishing touches",
    "client_id": {
      "_id": "69a533bf9ea73097eb85daa1",
      "name": "REGE",
      "prefix": "REG"
    },
    "status": "active",
    "created_by": {
      "_id": "65a7f8c9d1e2b3a4c5f6g7h8",
      "email": "john.doe@example.com",
      "display_name": "John Doe"
    },
    "createdAt": "2026-03-04T17:30:00Z",
    "updatedAt": "2026-03-04T17:30:00Z"
  },
  "message": "Project created successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Project number is required"
}
```

or

```json
{
  "error": "Invalid client_id format"
}
```

**Response (409 Conflict):**
```json
{
  "error": "Project with this number already exists"
}
```

---

### Update Project

**Endpoint:** `PUT /projects/:id`

**Description:** Update an existing project by ID

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | MongoDB ObjectId of the project |

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "on_hold"
}
```

**Request:**
```bash
curl -X PUT http://localhost:3000/api/projects/69b644cg0fb84108fc96ebb2 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "REGE Building Phase 1 - Updated",
    "status": "on_hold"
  }'
```

**Response (200 OK):**
```json
{
  "data": {
    "_id": "69b644cg0fb84108fc96ebb2",
    "project_number": "REG-001",
    "name": "REGE Building Phase 1 - Updated",
    "description": "Construction of main building structure",
    "client_id": {
      "_id": "69a533bf9ea73097eb85daa1",
      "name": "REGE",
      "prefix": "REG"
    },
    "status": "on_hold",
    "created_by": {
      "_id": "65a7f8c9d1e2b3a4c5f6g7h8",
      "email": "john.doe@example.com",
      "display_name": "John Doe"
    },
    "createdAt": "2026-02-20T11:45:00Z",
    "updatedAt": "2026-03-04T17:45:00Z"
  },
  "message": "Project updated successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid project ID format"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Project not found"
}
```

---

### Delete Project

**Endpoint:** `DELETE /projects/:id`

**Description:** Delete a project by ID

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | MongoDB ObjectId of the project |

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/projects/69b644cg0fb84108fc96ebb2
```

**Response (200 OK):**
```json
{
  "message": "Project deleted successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid project ID format"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Project not found"
}
```

---

## Error Handling

### Error Response Format

All error responses follow a consistent format:

```json
{
  "error": "Description of the error"
}
```

### Common Error Scenarios

#### Missing Required Field
```json
{
  "error": "Client name is required"
}
```

#### Invalid MongoDB ObjectId Format
```json
{
  "error": "Invalid client ID format"
}
```

#### Resource Not Found
```json
{
  "error": "Client not found"
}
```

#### Duplicate Unique Field
```json
{
  "error": "Project with this number already exists"
}
```

#### Database Connection Error
```json
{
  "error": "Connection timeout"
}
```

---

## Response Format

### Success Response

All successful responses follow this format:

**List/GET endpoints:**
```json
{
  "data": [...],
  "pagination": {
    "total": 10,
    "limit": 10,
    "skip": 0
  }
}
```

**Single item endpoints (GET by ID, PUT, POST):**
```json
{
  "data": {...},
  "message": "Description of action"
}
```

**Delete endpoints:**
```json
{
  "message": "Resource deleted successfully"
}
```

---

## Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Successful GET, PUT request |
| 201 | Created | Successful POST request |
| 400 | Bad Request | Invalid request format or missing required fields |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists (duplicate unique field) |
| 500 | Internal Server Error | Server error or database connection failure |

---

## Authentication & Authorization

**Current Status:** Not implemented

The API does not currently enforce authentication or authorization. All endpoints are publicly accessible. 

**Future Implementation:**
Consider implementing role-based access control (RBAC) using the user roles: `admin`, `manager`, `account`, `viewer`.

---

## Rate Limiting

**Current Status:** Not implemented

No rate limiting is currently in place. 

**Recommendation:** Implement rate limiting to prevent abuse in production environments.

---

## Data Validation Rules

### Email Validation
- Must match email regex pattern: `^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$`
- Must be unique in Users collection
- Always stored in lowercase

### Project Number
- Must be unique in Projects collection
- Cannot be null or empty

### Status Enumeration (Projects)
- Valid values: `active`, `completed`, `on_hold`
- Default value: `active`

### Roles Enumeration (Users)
- Valid values: `admin`, `manager`, `account`, `viewer`
- Default value: `["viewer"]`

### MongoDB ObjectId Validation
- Must be valid 24-character hexadecimal string
- Used for all relationship references

---

## Database Indexes

The following indexes are recommended for optimal query performance:

```javascript
// Users collection
db.users.createIndex({ email: 1 })

// Clients collection
db.clients.createIndex({ created_by: 1 })
db.clients.createIndex({ name: 1 })

// Projects collection
db.projects.createIndex({ project_number: 1 }) // Unique
db.projects.createIndex({ client_id: 1 })
db.projects.createIndex({ status: 1 })
db.projects.createIndex({ created_by: 1 })
db.projects.createIndex({ name: 1 })
```

---

## Pagination Details

### Pagination Parameters

All list endpoints support pagination through `limit` and `skip` parameters:

- **limit**: Number of documents to return (default: 10)
- **skip**: Number of documents to skip (default: 0)

### Pagination Response

All paginated responses include pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "total": 50,
    "limit": 10,
    "skip": 0
  }
}
```

### Calculating Pagination

```
page = (skip / limit) + 1
total_pages = Math.ceil(total / limit)
has_next = (skip + limit) < total
```

**Example: Get page 3 with 10 items per page**
```
skip = (3 - 1) * 10 = 20
limit = 10
URL: /api/clients?limit=10&skip=20
```

---

## Troubleshooting

### Connection Issues

**Error:** `querySrv ECONNREFUSED _mongodb._tcp.cluster0.pjyqknk.mongodb.net`

**Cause:** DNS SRV resolution failure on Windows

**Solution:** Ensure MongoDB connection string includes proper DNS configuration and network access is enabled

---

## Development Tools

### Testing with cURL

All examples in this documentation use cURL. To test endpoints:

```bash
# Basic GET request
curl http://localhost:3000/api/clients

# POST with JSON body
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","created_by":"ID"}'

# PUT request with query parameters
curl -X PUT http://localhost:3000/api/clients/ID \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated"}'

# DELETE request
curl -X DELETE http://localhost:3000/api/clients/ID
```

### Testing with Postman

1. Create a new Postman collection
2. Import the examples from this documentation
3. Set the base URL variable to `http://localhost:3000/api`
4. Test each endpoint individually

---

## API Versioning

**Current Version:** v1.0.0

No API versioning is currently implemented. All endpoints are stable for version 1.0.0.

**Future versions** will maintain backward compatibility or use URL versioning (`/api/v2/...`)

---

## Support & Documentation

- **Backend Directory:** `/backend/lovable-next/`
- **Models Directory:** `/backend/lovable-next/lib/models/`
- **Routes Directory:** `/backend/lovable-next/app/api/`
- **Environment File:** `/backend/lovable-next/.env.local`

---

**Last Updated:** March 4, 2026  
**Maintained By:** Olcen Solbita
