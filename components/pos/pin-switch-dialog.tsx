"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserSwitchIcon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { verifyPin } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Cashier = { id: string; name: string }

export function PinSwitchDialog({ cashiers }: { cashiers: Cashier[] }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [userId, setUserId] = React.useState(cashiers[0]?.id ?? "")
  const [pin, setPin] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await verifyPin({ userId, pin })
      if (res.ok) {
        toast.success("Till switched")
        setOpen(false)
        setPin("")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HugeiconsIcon icon={UserSwitchIcon} />
          Switch till
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display">Switch cashier</DialogTitle>
            <DialogDescription>
              Enter your PIN to take over this terminal. Sales you complete will be stamped to you.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label>Cashier</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose cashier" />
                </SelectTrigger>
                <SelectContent>
                  {cashiers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                className="font-figures tracking-[0.3em]"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !userId || pin.length < 4}>
              {isPending ? "Verifying…" : "Switch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
