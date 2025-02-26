# Scarlett AI - Language Learning Through Music

A Next.js application that helps users learn languages through music, featuring AI-powered chat, interactive song lessons, and spaced repetition learning.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: React 19, Tailwind CSS 4, Radix UI components
- **Authentication**: Reown AppKit
- **Blockchain**: Viem, Wagmi, Unlock Protocol (for subscriptions)
- **Messaging**: XMTP (for secure chat)
- **Storage**: Irys (for user progress), IPFS (for content)
- **Learning Algorithm**: FSRS (for spaced repetition)
- **Internationalization**: Custom i18n implementation with App Router

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A wallet with Base Sepolia testnet ETH (for premium features)

### Installation

```bash
# Install dependencies
npm install
# or
bun install
```

### Development

```bash
# Start the development server
npm run dev
# or
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_PROJECT_ID=your_reown_project_id
```

## Features

- 🎵 Learn language through music with interactive lyrics
- 💬 Chat with an AI language tutor
- 📚 Study with spaced repetition questions
- 🌐 Multilingual support (English/Chinese)
- 🔒 Premium subscription via Unlock Protocol
- 📊 Progress tracking with Irys
