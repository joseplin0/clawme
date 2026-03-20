# Markdown Rendering Specification

## ADDED Requirements

### Requirement: MDC component integration
The system SHALL use `@nuxtjs/mdc` MDC component to render message content as Markdown.

#### Scenario: Text message rendering
- **WHEN** message contains Markdown-formatted text
- **THEN** system renders it with proper styling (headings, lists, code blocks, etc.)

#### Scenario: Code block syntax highlighting
- **WHEN** message contains code blocks with language identifier
- **THEN** system applies syntax highlighting to the code

### Requirement: Message text extraction
The system SHALL use `getTextFromMessage` utility to extract text content from AI SDK message parts.

#### Scenario: Extract text from text part
- **WHEN** message has text parts
- **THEN** utility concatenates all text content for rendering

#### Scenario: Handle empty message
- **WHEN** message has no text parts
- **THEN** utility returns empty string

### Requirement: Streaming content rendering
The system SHALL render streaming content in real-time as it arrives.

#### Scenario: Partial content display
- **WHEN** AI is streaming a response
- **THEN** system displays content as it arrives, not waiting for completion

#### Scenario: Markdown parsing during stream
- **WHEN** incomplete Markdown syntax is received during streaming
- **THEN** system gracefully handles incomplete syntax without breaking layout

### Requirement: Prose styling
The system SHALL apply Nuxt UI prose styles to rendered Markdown content.

#### Scenario: Consistent typography
- **WHEN** Markdown content is rendered
- **THEN** it follows the application's typography theme

#### Scenario: Link styling
- **WHEN** Markdown contains links
- **THEN** links are styled consistently with the application theme
