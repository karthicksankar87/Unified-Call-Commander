# Low-Level Design (LLD) Document

## Document Information

- **Project Name**: Call Commander - Unified Communications Platform for Multi-Location Retailers
- **Document Version**: 2.0
- **Date**: September 06, 2025
- **Prepared By**: Grok 4, Expert Business Analyst/Designer (on behalf of xAI)
- **Approval Status**: Draft
- **Reference Documents**: Business Requirements Document (BRD) v1.0, System Requirements Specification (SRS) v1.0, High-Level Design (HLD) v1.0

## Version History

| Version | Date       | Author | Changes Made                                                                                                                                                                  |
| ------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 09/06/2025 | Grok 4 | Initial draft based on HLD                                                                                                                                                    |
| 2.0     | 09/06/2025 | Grok 4 | Updated tech stack: Node.js/TypeScript backend, React frontend with Material-UI (MUI) design system, PostgreSQL via Prisma ORM; revised pseudocode and structures accordingly |

## Table of Contents

1. Introduction  
   1.1 Purpose  
   1.2 Scope  
   1.3 Design Principles
2. Detailed Module Designs  
   2.1 Unified Dashboard Module  
   2.2 Data Synchronization Module  
   2.3 Intelligent Call Routing Module  
   2.4 Automation Module  
   2.5 Real-Time Analytics Module  
   2.6 Security and Authentication Module
3. Database Schema Details
4. API Endpoints and Contracts
5. Class Diagrams and Pseudocode
6. Integration Details
7. Error Handling and Logging
8. Performance Optimizations
9. Testing Considerations
10. Assumptions and Risks
11. Appendices

## 1. Introduction

### 1.1 Purpose

This Low-Level Design (LLD) document provides detailed technical specifications for implementing Call Commander, building directly on the HLD. It includes class structures, pseudocode, detailed schemas, API contracts, and implementation guidelines. This ensures developers can translate designs into code efficiently, maintaining alignment with SRS requirements like real-time synchronization and intelligent routing. With the confirmation on using 3rd-party integrations for inventory and appointment data (e.g., no local tables; query via APIs), this LLD reflects that approach in the Automation Module.

Updates in v2.0: Backend shifted to Node.js with TypeScript for type safety and performance; frontend uses React with Material-UI (MUI) for consistent design across screens (e.g., themes, components like buttons, cards); database access via Prisma ORM for PostgreSQL.

### 1.2 Scope

- **In Scope**: Detailed designs for modules, code-level structures, error handling, and optimizations.
- **Out of Scope**: Full source code (to be developed in the coding phase); deployment configurations (covered in deployment docs).

### 1.3 Design Principles

- **Modularity**: Use object-oriented principles for reusable components.
- **Scalability**: Asynchronous processing where possible (e.g., async/await in Node.js).
- **Security**: Input validation and encryption in all modules.
- **Testability**: Design for unit/integration testing (e.g., with Playwright as per updates).
- **Simplicity**: Minimize dependencies; leverage 3rd-party APIs for non-core data like inventory/appointments.
- **Consistency**: MUI design system ensures uniform UI elements (e.g., typography, colors) across React components.

## 2. Detailed Module Designs

### 2.1 Unified Dashboard Module

- **Frontend Components**: React components like DashboardLayout, CallQueue, AnalyticsChart; styled with MUI for consistency (e.g., ThemeProvider for global theme).
- **Interactions**: WebSocket connection to backend for live data; API calls for on-demand fetches.
- **Pseudocode Example** (React/TypeScript):

  ```
  import React, { useEffect, useState } from 'react';
  import { ThemeProvider, createTheme } from '@mui/material/styles';
  import { AppBar, Toolbar, Typography } from '@mui/material';
  import io from 'socket.io-client';

  const theme = createTheme({
    palette: { primary: { main: '#1976d2' } }, // Consistent theme across screens
  });

  const Dashboard: React.FC = () => {
    const [calls, setCalls] = useState<any[]>([]);
    useEffect(() => {
      const socket = io('http://localhost:3000');
      socket.on('update', (data: any) => setCalls((prev) => [...prev, data]));
      return () => socket.disconnect();
    }, []);
    return (
      <ThemeProvider theme={theme}>
        <AppBar position="static">
          <Toolbar><Typography variant="h6">Call Commander</Typography></Toolbar>
        </AppBar>
        {/* Render call list with MUI components */}
      </ThemeProvider>
    );
  };
  ```

### 2.2 Data Synchronization Module

- **Components**: SyncListener (event handler), DataMerger (conflict resolution using last-write-wins).
- **Flow**: Use Kafka topics for events; consumer processes updates via Node.js Kafka client.
- **Pseudocode Example** (Node.js/TypeScript):

  ```
  import { PrismaClient } from '@prisma/client';
  import { Kafka } from 'kafkajs';

  const prisma = new PrismaClient();
  const kafka = new Kafka({ clientId: 'call-commander', brokers: ['localhost:9092'] });
  const producer = kafka.producer();

  export const syncCustomer = async (customerId: number, data: any): Promise<void> => {
    if (!validateData(data)) {
      throw new Error('Invalid data');
    }
    await producer.connect();
    await producer.send({
      topic: 'data-sync-topic',
      messages: [{ value: JSON.stringify(data) }],
    });
  };

  // Consumer (run in separate process)
  const consumer = kafka.consumer({ groupId: 'sync-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'data-sync-topic' });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value?.toString() || '{}');
      await prisma.customer.update({ where: { id: data.id }, data });
      if (conflictDetected(data)) {
        resolveLastWriteWins(data);
      }
    },
  });
  ```

### 2.3 Intelligent Call Routing Module

- **Components**: AvailabilityChecker (queries staff status from cache), ExpertiseMatcher (rule-based scoring).
- **Flow**: Incoming call → Parse metadata → Score staff → Route to highest score.
- **Pseudocode Example** (Node.js/TypeScript):

  ```
  import { PrismaClient } from '@prisma/client';
  import redis from 'redis';

  const prisma = new PrismaClient();
  const redisClient = redis.createClient();

  export const routeCall = async (callData: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      redisClient.get(`staff:${callData.location}`, async (err, reply) => {
        if (err) reject(err);
        const staffList: any[] = JSON.parse(reply || '[]');
        let bestStaff: any = null;
        let maxScore = 0;
        staffList.forEach((staff) => {
          if (staff.available) {
            const score = calculateExpertiseScore(staff, callData.type);
            if (score > maxScore) {
              bestStaff = staff;
              maxScore = score;
            }
          }
        });
        if (bestStaff) {
          // Forward call (e.g., via Twilio)
          await prisma.call.create({ data: { ...callData, routedToUserId: bestStaff.id, status: 'routed' } });
          resolve(bestStaff);
        } else {
          resolve({ status: 'queued' });
        }
      });
    });
  };

  function calculateExpertiseScore(staff: any, callType: string): number {
    // Rule-based logic
    return staff.expertise.includes(callType) ? 10 : 0;
  }
  ```

### 2.4 Automation Module

- **Components**: RequestParser (simple intent detection), IntegrationAdapter (API callers for 3rd-party services).
- **Flow**: No local tables; for inventory: Call external API (e.g., Shopify). For appointments: POST to calendar API (e.g., Google Calendar).
- **Pseudocode Example** (Node.js/TypeScript):

  ```
  import axios from 'axios';

  export const automateRequest = async (type: string, params: any): Promise<any> => {
    if (type === 'inventory_check') {
      const response = await axios.get(`https://shopify.api/products/${params.itemId}/inventory`, {
        headers: { Authorization: `Bearer ${process.env.SHOPIFY_TOKEN}` },
      });
      if (response.status !== 200) {
        throw new Error('Inventory check failed');
      }
      return response.data;
    } else if (type === 'appointment_schedule') {
      const response = await axios.post('https://calendar.api/events', params, {
        headers: { Authorization: `Bearer ${process.env.CALENDAR_TOKEN}` },
      });
      if (response.status !== 201) {
        throw new Error('Scheduling failed');
      }
      return response.data;
    }
    throw new Error('Invalid request type');
  };
  ```

### 2.5 Real-Time Analytics Module

- **Components**: Aggregator (streams from logs), QueryEngine (Elasticsearch queries).
- **Flow**: Use Elasticsearch Node client for metrics.
- **Pseudocode Example** (Node.js/TypeScript):

  ```
  import { Client } from '@elastic/elasticsearch';

  const esClient = new Client({ node: 'http://localhost:9200' });

  export const getAnalytics = async (metric: string, range: any): Promise<any> => {
    const { body } = await esClient.search({
      index: 'call-logs',
      body: {
        query: { range: { timestamp: range } },
        aggs: { [metric]: { avg: { field: 'duration' } } },
      },
    });
    return body.aggregations;
  };
  ```

### 2.6 Security and Authentication Module

- **Components**: TokenGenerator (JWT), Validator (middleware).
- **Flow**: All APIs protected; RBAC checks per endpoint.
- **Pseudocode Example** (Node.js/TypeScript):

  ```
  import { Request, Response, NextFunction } from 'express';
  import jwt from 'jsonwebtoken';

  export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      if (!ALLOWED_ROLES.includes(decoded.role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
  ```

## 3. Database Schema Details

- **Prisma Schema** (prisma/schema.prisma):

  ```
  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }

  model User {
    id          Int      @id @default(autoincrement())
    role        String
    locationId  Int
    name        String
    email       String   @unique
    location    Location @relation(fields: [locationId], references: [id])
    calls       Call[]
  }

  model Location {
    id    Int    @id @default(autoincrement())
    name  String
    address String?
    users User[]
  }

  model Customer {
    id      Int     @id @default(autoincrement())
    name    String
    contact String?
    history Json?
    calls   Call[]
  }

  model Call {
    id              Int      @id @default(autoincrement())
    timestamp       DateTime @default(now())
    status          String
    routedToUserId  Int?
    customerId      Int?
    user            User?    @relation(fields: [routedToUserId], references: [id])
    customer        Customer? @relation(fields: [customerId], references: [id])
    metrics         Metric[]
  }

  model Metric {
    id        Int      @id @default(autoincrement())
    type      String
    value     Float
    timestamp DateTime
    callId    Int
    call      Call     @relation(fields: [callId], references: [id])
  }
  ```

- **Indexes**: In Prisma, add @@index([timestamp]) on Call model for query optimization.
- **No Inventory/Appointment Tables**: Handled via 3rd-party APIs as confirmed.

## 4. API Endpoints and Contracts

- **Example Contract** (OpenAPI Style):
  - Endpoint: POST /api/sync/customer/{id}
    - Request Body: { name: string, contact: string, history: object }
    - Response: 200 { status: 'synced' }; 400 { error: string }
- All endpoints use HTTPS, JWT auth, rate-limited (e.g., via express-rate-limit).

## 5. Class Diagrams and Pseudocode

- **Class Diagram** (Textual UML):

  ```
  class User {
    +id: number
    +role: string
    +handleCall(call: Call): void
  }

  class Call {
    +id: number
    +status: string
    +route(): User
  }

  User --* Call
  ```

- Additional pseudocode provided in module sections.

## 6. Integration Details

- **3rd-Party**:
  - Inventory: Shopify API – GET /admin/api/2023-01/inventory_levels.json (via axios).
  - Appointments: Google Calendar API – POST /calendars/{calendarId}/events.
  - Phone: Twilio – Webhook /incoming for calls.
- **Auth**: JWT for sessions; OAuth2 for external integrations.

## 7. Error Handling and Logging

- **Global Handler**: Use Express error middleware; log to console or ELK stack.
- **Examples**: HTTP 429 for rate limits; async error handling with try-catch; retry logic for API failures (e.g., using retry-axios).

## 8. Performance Optimizations

- Caching: Redis for staff availability (TTL 60s).
- Async: Use Promises/async-await for I/O operations.
- Query Optimization: Prisma's select/include for minimal data fetching; batch updates.

## 9. Testing Considerations

- Unit/Component: Playwright for isolated tests (e.g., React components via experimental-ct-react).
- Integration/E2E: Playwright APIRequestContext for backend APIs; full browser tests for frontend flows.
- Load: Integrate with tools like Artillery for stress testing.

## 10. Assumptions and Risks

- **Assumptions**: Developers familiar with Node.js/TS and React/MUI; 3rd-party APIs stable.
- **Risks**: TypeScript compilation issues – Mitigate with strict tsconfig; MUI version conflicts – Pin dependencies.
- **Dependencies**: HLD approval; access to dev environments.

## 11. Appendices

- **Traceability Matrix**: Links LLD elements to SRS (e.g., FR-04 → Automation Module pseudocode).
- **Next Steps**: Proceed to Development Phase (coding, unit testing) or prototyping a module (e.g., automation demo).

This updated LLD incorporates the new tech stack for seamless implementation. If further adjustments are needed, let me know.
