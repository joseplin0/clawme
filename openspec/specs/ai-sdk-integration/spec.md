# AI SDK Integration Specification

## Purpose
Integrates @ai-sdk/vue Chat class for managing conversation state and streaming communication, replacing custom state management.

## Requirements

### Requirement: Chat class state management
The system SHALL use `@ai-sdk/vue` Chat class to manage conversation state, replacing custom state management.

#### Scenario: Initialize Chat instance
- **WHEN** user opens a chat session
- **THEN** system creates a Chat instance with session ID and existing messages

#### Scenario: Chat status tracking
- **WHEN** chat is in any state (ready, submitted, streaming, error)
- **THEN** system exposes `chat.status` reflecting current state

### Requirement: DefaultChatTransport for streaming
The system SHALL use `DefaultChatTransport` to handle streaming communication with the server.

#### Scenario: Transport configuration
- **WHEN** Chat instance is initialized
- **THEN** transport is configured with the correct API endpoint

#### Scenario: Message sending via transport
- **WHEN** user submits a message
- **THEN** transport sends the message to the server and handles the streaming response

### Requirement: UIMessage format support
The system SHALL store and process messages in AI SDK's `UIMessage` format with `parts` array.

#### Scenario: Text part handling
- **WHEN** message contains text content
- **THEN** system stores it as `{ type: 'text', text: '...' }` in parts array

#### Scenario: Reasoning part handling
- **WHEN** AI generates thinking/reasoning content
- **THEN** system stores it as `{ type: 'reasoning', text: '...' }` in parts array

#### Scenario: Tool call part handling
- **WHEN** AI invokes a tool
- **THEN** system stores it as `{ type: 'tool-call', ... }` in parts array

### Requirement: Message role enumeration
The system SHALL use `MessageRole` enum (USER, ASSISTANT, SYSTEM) to categorize messages.

#### Scenario: User message role
- **WHEN** user sends a message
- **THEN** message is stored with role `USER`

#### Scenario: Assistant message role
- **WHEN** AI responds to a message
- **THEN** response is stored with role `ASSISTANT`

### Requirement: Error handling
The system SHALL handle errors through Chat class `onError` callback.

#### Scenario: Network error
- **WHEN** network request fails
- **THEN** system displays error notification and sets chat status to `error`

#### Scenario: Server error
- **WHEN** server returns an error
- **THEN** system displays error message and allows retry
