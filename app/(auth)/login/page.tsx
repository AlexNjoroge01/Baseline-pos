"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Store04Icon, Mail01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { requestMagicLink } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function LoginPage() {
  const [email, setEmail] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const [sent, setSent] = React.useState(false)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await requestMagicLink({ email })
      if (res.ok) {
        setSent(true)
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HugeiconsIcon icon={Store04Icon} size={26} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Duka POS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your shop terminal
          </p>
        </div>

        <Card className="border-border shadow-sm">
          {sent ? (
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-accent text-[var(--success)]">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} />
              </div>
              <h2 className="font-display text-lg font-semibold text-foreground">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                If <span className="font-figures">{email}</span> is registered, a sign-in link is on
                its way. It expires in 15 minutes.
              </p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSent(false)}>
                Use a different email
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-0">
                <p className="text-sm text-muted-foreground">
                  Enter your email and we&apos;ll send a secure sign-in link — no password needed.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      autoFocus
                      placeholder="you@duka.co.ke"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={isPending} className="w-full">
                    <HugeiconsIcon icon={Mail01Icon} />
                    {isPending ? "Sending…" : "Send sign-in link"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Cashiers can switch tills with a PIN once signed in.
        </p>
      </div>
    </main>
  )
}
