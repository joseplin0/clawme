# Chat Streaming Specification

## MODIFIED Requirements

### Requirement: Server-side streaming with AI SDK
The system SHALL use AI SDK's `streamText` and `createUIMessageStreamResponse` for streaming responses, replacing custom SSE implementation.

#### Scenario: Stream text generation
- **WHEN** server receives a chat request
- **THEN** server uses `streamText` to generate AI response and streams it to client

#### Scenario: Stream response format
- **WHEN** streaming response is sent to client
- **THEN** response uses AI SDK's `UIMessageStreamResponse` format

#### Scenario: Convert messages for model
- **WHEN** sending messages to AI model
- **THEN** system uses `convertToModelMessages` to transform UIMessage format

### Requirement: Client-side stream consumption
The system SHALL consume streaming responses through Chat class and DefaultChatTransport.

#### Scenario: Receive streaming chunks
- **WHEN** server streams response chunks
- **THEN** client receives and displays chunks in real-time

#### Scenario: Stream completion
- **WHEN** stream completes successfully
- **THEN** message is marked as complete and chat status returns to `ready`

### Requirement: Stream interruption
The system SHALL allow users to stop streaming responses.

#### Scenario: User stops generation
- **WHEN** user clicks stop button during streaming
- **THEN** system calls `chat.stop()` and streaming is interrupted

#### Scenario: Interrupted message handling
- **WHEN** streaming is interrupted
- **THEN** partial message is preserved and displayed

### Requirement: Response regeneration
The system SHALL allow users to regenerate the last AI response.

#### Scenario: User regenerates response
- **WHEN** user clicks regenerate button
- **THEN** system calls `chat.regenerate()` to generate a new response

#### Scenario: Regeneration replaces previous response
- **WHEN** regeneration completes
- **THEN** new response replaces the previous AI response in the conversation

## REMOVED Requirements

### Requirement: Custom SSE parsing
**Reason**: Replaced by AI SDK's built-in streaming mechanism
**Migration**: Use `DefaultChatTransport` instead of manual `fetch` + `ReadableStream` parsing

### Requirement: Manual stream state management
**Reason**: Chat class now manages streaming state automatically
**Migration**: Use `chat.status` instead of custom `isStreaming`, `chatStatus` refs

### Requirement: Optimistic message handling
**Reason**: Chat class handles optimistic updates internally
**Migration**: Remove manual `optimisticMessages` and `streamDraft` management
