"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon, Edit02Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { createCustomer, updateCustomer } from "@/actions/customers"
import { formatCents } from "@/lib/money"
import type { Customer } from "@/db/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/app/page-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function CustomerManager({ customers }: { customers: Customer[] }) {
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Customer | null>(null)
  const [name, setName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string[]>>({})
  const [isPending, startTransition] = React.useTransition()

  const filtered = customers.filter((c) =>
    (c.name + c.phone).toLowerCase().includes(query.toLowerCase())
  )

  function openNew() {
    setEditing(null)
    setName("")
    setPhone("+254")
    setEmail("")
    setErrors({})
    setOpen(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setName(c.name)
    setPhone(c.phone)
    setEmail(c.email ?? "")
    setErrors({})
    setOpen(true)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    startTransition(async () => {
      const payload = { name, phone, email }
      const res = editing
        ? await updateCustomer(editing.id, payload)
        : await createCustomer(payload)
      if (res.ok) {
        toast.success(editing ? "Customer updated" : "Customer added")
        setOpen(false)
      } else {
        setErrors(res.fieldErrors ?? {})
        toast.error(res.error)
      }
    })
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
            <HugeiconsIcon icon={Search01Icon} size={16} />
          </span>
          <Input
            placeholder="Search name or phone…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button onClick={openNew}>
          <HugeiconsIcon icon={PlusSignIcon} />
          New customer
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={customers.length === 0 ? "No customers yet" : "No matches"}
          description="Add customers to track loyalty points and email them receipts."
        >
          {customers.length === 0 && (
            <Button onClick={openNew}>
              <HugeiconsIcon icon={PlusSignIcon} />
              New customer
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Loyalty pts</TableHead>
                <TableHead className="text-right">Total spent</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/customers/${c.id}`} className="hover:text-primary hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-figures text-muted-foreground">{c.phone}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="font-figures">
                      {c.loyaltyPoints}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-figures">
                    {formatCents(c.totalSpentCents)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                      <HugeiconsIcon icon={Edit02Icon} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle className="font-display">
                {editing ? "Edit customer" : "New customer"}
              </DialogTitle>
              <DialogDescription>Phone must be in the format +2547XXXXXXXX.</DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-4">
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} autoFocus />
                {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone[0]}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email (optional)</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
                {errors.email && <p className="text-sm text-destructive">{errors.email[0]}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
