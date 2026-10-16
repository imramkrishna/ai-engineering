# Atlas-v1 RAG Chat Application

## Overview

Atlas-v1 is a sophisticated Retrieval-Augmented Generation (RAG) chat application that allows users to upload documents and ask questions about their content. The application uses advanced AI models to provide accurate, context-aware responses based on uploaded documents.

## Architecture

### Backend (Node.js/Express)

The backend is built with **Node.js**, **Express**, and **TypeScript**. It provides RESTful APIs for document management, chat functionality, and authentication.

#### Key Components:

1. **Server** (`src/Atlas-v1/backend/server.ts`)
   - Express application with CORS configuration
   - Routes for `/api/v1/chat` and `/api/v1/upload`
   - Better-auth integration for authentication
   - Redis BullMQ for background job processing

2. **Database** (`src/packages/db/schema/atlasv1.ts`)
   - PostgreSQL with Drizzle ORM
   - Vector database support for embeddings
   - Tables: `documents`, `documentChunks`, `ingestionJobs`

3. **Authentication** (`src/Atlas-v1/backend/lib/auth.ts`)
   - Better-auth 1.7.7 with Express server-side sessions
   - Email/password authentication
   - Session-based auth with cookie credentials

4. **Controllers**
   - `chatController.ts`: Continue existing conversations
   - `newChatController.ts`: Create new conversations
   - `getMessagesController.ts`: Load messages for a conversation
   - `uploadDocumentsController.ts`: Handle document uploads
   - `getUploadedDocuments.ts`: Retrieve uploaded documents

5. **Routes**
   - `chat.route.ts`: Chat endpoints (`/api/v1/chat`)
   - `upload.route.ts`: Document upload endpoints (`/api/v1/upload`)

6. **Queries** (`src/Atlas-v1/backend/lib/queries.ts`)
   - Database query functions
   - `listDocuments(userId)`: Get user's documents
   - `listConversations(userId)`: Get user's conversations
   - `getMessages(conversationId)`: Get messages for a conversation
   - `saveMessage()`: Save user/assistant messages
   - `retrieveRelevantChunks()`: Find relevant document chunks

7. **Background Processing** (`src/Atlas-v1/backend/worker.ts`)
   - BullMQ worker for document ingestion
   - Processes PDFs, generates chunks, creates embeddings
   - Updates database with processed content

8. **Configuration**
   - `multer.config.ts`: File upload configuration
   - `redis.config.ts`: Redis connection setup
   - `s3.config.ts`: S3 storage configuration

### Frontend (Next.js 16.4)

The frontend is built with **Next.js 16.4** using the App Router, **React**, **TypeScript**, and **Tailwind CSS**.

#### Key Components:

1. **App Structure**
   - `app/chat/page.tsx`: Chat index page with conversation list
   - `app/chat/[conversationId]/page.tsx`: Individual conversation page
   - `app/chat/new/page.tsx`: New conversation input
   - `app/documents/page.tsx`: Document management
   - `app/login/page.tsx` & `app/signup/page.tsx`: Authentication

2. **API Client** (`src/Atlas-v1/frontend/src/lib/api/client.ts`)
   - Centralized API calls to backend
   - Handles authentication, error handling, and data transformation
   - Includes document upload, chat, and conversation management

3. **Auth Context** (`src/Atlas-v1/frontend/src/lib/auth/context.tsx`)
   - Better-auth integration with React hooks
   - Session management and authentication state

4. **Components**
   - `ChatInput`: Message input component
   - `ChatMessage`: Individual message display
   - `ConversationItem`: Conversation list item
   - `DocumentCard`: Document display and management

5. **Providers**
   - `providers.tsx`: Query client and theme providers

## Database Schema

### Documents Table
```typescript
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  name: varchar("name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  storageKey: text("storage_key").notNull(),
  contentHash: varchar("content_hash", { length: 64 }),
  status: documentStatus("status").default("queued").notNull(),
  errorMessage: text("error_message"),
  chunkCount: integer("chunk_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});
```

### Document Chunks Table
```typescript
export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id").notNull().references(() => documents.id),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    metadata: jsonb("metadata"),
    embedding: vector("embedding", { dimensions: 1024 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("document_chunks_document_id_idx").on(table.documentId)],
);
```

## API Endpoints

### Chat Endpoints (`/api/v1/chat`)

#### POST `/api/v1/chat/conversation/:id`
Continue an existing conversation
```typescript
// Request body
{
  "conversationId": "uuid",
  "query": "Your question here"
}

// Response
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "message": "AI response",
    "sources": [
      {
        "source": "Source 1",
        "documentId": "uuid",
        "documentName": "Document Name",
        "metadata": {...},
        "similarity": 0.95
      }
    ]
  }
}
```

#### POST `/api/v1/chat/new`
Create a new conversation
```typescript
// Request body
{
  "query": "Your initial question"
}

// Response
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "message": "AI response",
    "sources": [...]
  }
}
```

#### GET `/api/v1/chat/conversation/:conversationId`
Get messages for a conversation
```typescript
// Response
{
  "success": true,
  "messages": [
    {
      "id": "uuid",
      "conversationId": "uuid",
      "role": "user",
      "content": "User message",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET `/api/v1/chat/list`
List all conversations for the authenticated user
```typescript
// Response
{
  "success": true,
  "conversations": [
    {
      "id": "uuid",
      "title": "Conversation title",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "userId": "user-uuid"
    }
  ]
}
```

### Upload Endpoints (`/api/v1/upload`)

#### POST `/api/v1/upload/new-document`
Upload a document
```typescript
// FormData with file field
{
  "file": PDF/DOC/DOCX/TXT file
}

// Response
{
  "success": true,
  "message": "Document uploaded successfully",
  "documentName": "Document Name"
}
```

#### GET `/api/v1/upload/documents`
Get all uploaded documents for the authenticated user
```typescript
// Response
{
  "success": true,
  "documents": [
    {
      "id": "uuid",
      "name": "Document Name",
      "mimeType": "application/pdf",
      "size": 1024000,
      "status": "completed",
      "chunkCount": 50,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Documents retrieved successfully"
}
```

## Key Features

### 1. Document Upload and Processing
- Supports PDF, DOC, DOCX, and TXT files
- Automatic chunking and embedding generation
- Background processing with progress tracking
- Error handling and retry mechanisms

### 2. RAG Chat Functionality
- Context-aware responses using document embeddings
- Source citation for AI-generated answers
- Streaming placeholder pattern for better UX
- Conversation history management

### 3. Authentication
- Email/password sign-up and sign-in
- Session-based authentication
- Protected routes for all user actions
- User session persistence

### 4. User Interface
- Responsive design with Tailwind CSS
- Real-time chat interface
- Document management dashboard
- Conversation history sidebar

## Technology Stack

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **TypeScript**: Type-safe development
- **Drizzle ORM**: PostgreSQL database
- **Better-auth**: Authentication
- **BullMQ**: Background job processing
- **Multer**: File upload handling
- **Redis**: Cache and message broker
- **S3**: File storage

### Frontend
- **Next.js 16.4**: React framework
- **React**: UI library
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Styling
- **Lucide React**: Icons
- **Sonner**: Toast notifications
- **NextThemes**: Theme switching
- **Tanstack Query**: Data fetching

### AI/ML
- **LangChain**: AI orchestration
- **OpenAI**: LLM integration
- **Hugging Face**: Embedding models
- **Vector Database**: Semantic search

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis (Upstash recommended)
- S3-compatible storage (optional)

### Backend Setup
```bash
# Navigate to backend directory
cd src/Atlas-v1/backend

# Install dependencies
npm install

# Set environment variables
# Create .env file with:
# PORT=3002
# DATABASE_URL=postgresql://...
# REDIS_URL=redis://...
# BETTER_AUTH_SECRET=your-secret
# BETTER_AUTH_URL=http://localhost:3000
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_REGION=...

# Run migrations
npx drizzle-kit push

# Start the server
npm run dev
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd src/Atlas-v1/frontend

# Install dependencies
npm install

# Set environment variables
# Create .env.local file with:
# NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1

# Start the development server
npm run dev
```

## Development Workflow

### 1. Document Upload
1. User uploads a document via the upload interface
2. Document is stored in S3 with a unique key
3. Background worker processes the document:
   - Extracts text content
   - Generates chunks
   - Creates embeddings
   - Stores in database
4. User can track processing progress

### 2. Chat Interaction
1. User starts a new conversation or selects an existing one
2. User asks a question about their documents
3. Backend retrieves relevant document chunks using vector similarity search
4. AI model generates response based on context
5. Response is returned with source citations
6. Conversation is saved to database

### 3. Authentication Flow
1. User clicks "Sign In" or "Sign Up"
2. User enters email and password
3. Better-auth validates credentials and creates session
4. User is redirected to chat interface
5. Session is maintained via cookies

## Error Handling

### Common Error Scenarios

1. **Authentication Errors**
   - Invalid credentials
   - Session expired
   - Missing authentication

2. **Document Upload Errors**
   - File type not supported
   - File size too large
   - Upload failed

3. **Chat Errors**
   - No relevant documents found
   - AI service unavailable
   - Conversation not found

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (in development)"
}
```

## Performance Considerations

### 1. Vector Search Optimization
- Use HNSW or IVFFlat indexes for vector similarity search
- Limit number of chunks retrieved (typically 5-10)
- Cache frequently accessed documents

### 2. Background Processing
- Use BullMQ for scalable job processing
- Implement retry logic for failed jobs
- Monitor processing progress

### 3. Database Optimization
- Index on `userId` for document queries
- Index on `documentId` for chunk queries
- Use connection pooling

## Security Considerations

### 1. Authentication
- Use HTTPS in production
- Set secure cookie flags
- Implement rate limiting
- Validate user permissions

### 2. File Upload
- Validate file types and sizes
- Scan files for malware
- Store files in secure locations
- Implement rate limiting for uploads

### 3. API Security
- Use API keys for external services
- Implement request validation
- Rate limit API endpoints
- Log and monitor suspicious activity

## Future Enhancements

### 1. Frontend Improvements
- Add real-time messaging
- Implement conversation search
- Add document preview
- Support for more file types

### 2. Backend Enhancements
- Add caching layer
- Implement WebSocket support
- Add more AI model options
- Implement document versioning

### 3. New Features
- Multi-user collaboration
- Document comparison
- AI model fine-tuning
- Analytics and monitoring

## Troubleshooting

### Common Issues and Solutions

1. **"documents.map is not a function" Error**
   - Cause: Backend returns wrapped response, frontend expects array
   - Solution: Update API client to unwrap response

2. **Field Name Mismatch**
   - Cause: Backend and frontend use different field names
   - Solution: Add mapping layer in API client

3. **Port Conflicts**
   - Cause: Backend and frontend running on same port
   - Solution: Use different ports (3002 for backend, 3000 for frontend)

4. **Authentication Issues**
   - Cause: Session not properly set
   - Solution: Check cookie settings and auth configuration

## Conclusion

Atlas-v1 is a comprehensive RAG chat application that combines advanced AI capabilities with a user-friendly interface. The architecture is designed for scalability, security, and performance, making it suitable for enterprise-level document management and AI-powered chat applications.

The application demonstrates best practices in modern web development, including separation of concerns, proper error handling, and comprehensive testing. It provides a solid foundation for building intelligent document management and chat systems.