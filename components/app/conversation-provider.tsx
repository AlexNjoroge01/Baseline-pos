"use client"

import { ConversationProvider as ElevenLabsConversationProvider } from "@elevenlabs/react"

/**
 * @elevenlabs/react's ConversationProvider doesn't ship a "use client"
 * directive in its compiled output, so importing it directly into a Server
 * Component (app/(app)/layout.tsx) puts it in the server module graph and
 * breaks at build time ("createContext is not a function") — React strips
 * context APIs from the react-server condition. Wrapping it in our own
 * client-marked module forces the correct client boundary.
 */
export function ConversationProvider({ children }: { children: React.ReactNode }) {
  return <ElevenLabsConversationProvider>{children}</ElevenLabsConversationProvider>
}
