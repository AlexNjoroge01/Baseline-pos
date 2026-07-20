"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon, Edit02Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { createCategory, updateCategory, deleteCategory } from "@/actions/categories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  productCount: number
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Category | null>(null)
  const [toDelete, setToDelete] = React.useState<Category | null>(null)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string[]>>({})
  const [isPending, startTransition] = React.useTransition()

  function openNew() {
    setEditing(null)
    setName("")
    setDescription("")
    setErrors({})
    setOpen(true)
  }

  function openEdit(c: Category) {
    setEditing(c)
    setName(c.name)
    setDescription(c.description ?? "")
    setErrors({})
    setOpen(true)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    startTransition(async () => {
      const payload = { name, description }
      const res = editing
        ? await updateCategory(editing.id, payload)
        : await createCategory(payload)
      if (res.ok) {
        toast.success(editing ? "Category updated" : "Category created")
        setOpen(false)
      } else {
        setErrors(res.fieldErrors ?? {})
        toast.error(res.error)
      }
    })
  }

  function confirmDelete() {
    if (!toDelete) return
    startTransition(async () => {
      const res = await deleteCategory(toDelete.id)
      if (res.ok) {
        toast.success("Category deleted")
      } else {
        toast.error(res.error)
      }
      setToDelete(null)
    })
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-end">
        <Button onClick={openNew}>
          <HugeiconsIcon icon={PlusSignIcon} />
          New category
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Group your products into categories like Grains & Flour or Beverages."
        >
          <Button onClick={openNew}>
            <HugeiconsIcon icon={PlusSignIcon} />
            New category
          </Button>
        </EmptyState>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.description ?? "—"}</TableCell>
                  <TableCell className="text-right font-figures">{c.productCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                        <HugeiconsIcon icon={Edit02Icon} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setToDelete(c)}
                        className="text-destructive"
                      >
                        <HugeiconsIcon icon={Delete02Icon} />
                      </Button>
                    </div>
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
                {editing ? "Edit category" : "New category"}
              </DialogTitle>
              <DialogDescription>
                Categories organise the catalogue and drive the revenue breakdown.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={!!errors.name}
                  autoFocus
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea
                  id="cat-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
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

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. Categories with products can&apos;t be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
