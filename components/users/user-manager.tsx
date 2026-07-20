"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon, MoreVerticalIcon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { inviteUser, setRole, setPin, setUserActive } from "@/actions/users"
import { roleValues } from "@/lib/validations"
import { formatDate } from "@/lib/datetime"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  hasPin: boolean
  createdAt: Date
}

export function UserManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [role, setRoleValue] = React.useState("cashier")
  const [errors, setErrors] = React.useState<Record<string, string[]>>({})

  const [pinFor, setPinFor] = React.useState<UserRow | null>(null)
  const [pin, setPinValue] = React.useState("")

  const [isPending, startTransition] = React.useTransition()

  function submitInvite(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    startTransition(async () => {
      const res = await inviteUser({ name, email, role })
      if (res.ok) {
        toast.success("Invitation sent")
        setInviteOpen(false)
        setName("")
        setEmail("")
        setRoleValue("cashier")
      } else {
        setErrors(res.fieldErrors ?? {})
        toast.error(res.error)
      }
    })
  }

  function changeRole(userId: string, newRole: string) {
    startTransition(async () => {
      const res = await setRole({ userId, role: newRole })
      if (res.ok) toast.success("Role updated")
      else toast.error(res.error)
    })
  }

  function submitPin(e: React.FormEvent) {
    e.preventDefault()
    if (!pinFor) return
    startTransition(async () => {
      const res = await setPin({ userId: pinFor.id, pin })
      if (res.ok) {
        toast.success(`PIN set for ${pinFor.name}`)
        setPinFor(null)
        setPinValue("")
      } else {
        toast.error(res.error)
      }
    })
  }

  function toggleActive(u: UserRow) {
    startTransition(async () => {
      const res = await setUserActive(u.id, !u.isActive)
      if (res.ok) toast.success(u.isActive ? "User deactivated" : "User reactivated")
      else toast.error(res.error)
    })
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setInviteOpen(true)}>
          <HugeiconsIcon icon={PlusSignIcon} />
          Invite user
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.name}
                  {u.id === currentUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    onValueChange={(v) => changeRole(u.id, v)}
                    disabled={u.id === currentUserId}
                  >
                    <SelectTrigger size="sm" className="w-32 capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleValues.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {u.hasPin ? (
                    <Badge variant="outline" className="text-[var(--success)]">
                      Set
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      None
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {u.isActive ? (
                    <Badge variant="outline" className="text-[var(--success)]">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-destructive">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-figures text-xs text-muted-foreground">
                  {formatDate(u.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <HugeiconsIcon icon={MoreVerticalIcon} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setPinFor(u)}>
                        {u.hasPin ? "Reset PIN" : "Set PIN"}
                      </DropdownMenuItem>
                      {u.id !== currentUserId && (
                        <DropdownMenuItem
                          variant={u.isActive ? "destructive" : "default"}
                          onSelect={() => toggleActive(u)}
                        >
                          {u.isActive ? "Deactivate" : "Reactivate"}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <form onSubmit={submitInvite}>
            <DialogHeader>
              <DialogTitle className="font-display">Invite user</DialogTitle>
              <DialogDescription>
                They&apos;ll get a magic-link email to sign in — no password needed.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-4">
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} autoFocus />
                {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
                {errors.email && <p className="text-sm text-destructive">{errors.email[0]}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRoleValue}>
                  <SelectTrigger className="capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleValues.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PIN dialog */}
      <Dialog open={!!pinFor} onOpenChange={(o) => !o && setPinFor(null)}>
        <DialogContent>
          <form onSubmit={submitPin}>
            <DialogHeader>
              <DialogTitle className="font-display">
                {pinFor?.hasPin ? "Reset" : "Set"} PIN — {pinFor?.name}
              </DialogTitle>
              <DialogDescription>
                A 4–6 digit PIN lets this cashier take over a shared till quickly.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 flex flex-col gap-1.5">
              <Label>New PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                className="font-figures tracking-[0.3em]"
                value={pin}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPinFor(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || pin.length < 4}>
                {isPending ? "Saving…" : "Save PIN"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
