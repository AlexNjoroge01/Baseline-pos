import { NextResponse } from "next/server"
import axios from "axios"

import { getSession } from "@/lib/auth-session"

/**
 * Mints a short-lived (15 min) signed WebSocket URL for the voice agent. The
 * agent is configured as private (platform_settings.auth.enable_auth: true —
 * see scripts/setup-elevenlabs-agent.ts), so this route is the *only* way to
 * ever start a voice session: no session cookie, no signed URL, no voice.
 * ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID never leave the server.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Sign in to use the voice assistant." }, { status: 401 })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  const agentId = process.env.ELEVENLABS_AGENT_ID
  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: "Voice assistant isn't configured yet (missing ElevenLabs credentials)." },
      { status: 503 }
    )
  }

  try {
    const res = await axios.get<{ signed_url: string }>(
      "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
      { params: { agent_id: agentId }, headers: { "xi-api-key": apiKey } }
    )
    return NextResponse.json({ signedUrl: res.data.signed_url })
  } catch (e) {
    console.error("Failed to get ElevenLabs signed URL:", e)
    return NextResponse.json({ error: "Couldn't reach the voice service. Try again shortly." }, { status: 502 })
  }
}
