import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { ContactPublic, ContactUpdate } from "@/client"
import { ContactsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }).optional(),
  phone: z.string().optional().nullable(),
  category: z
    .enum(["personal", "professional", "family", "other"])
    .default("personal"),
  tags: z.array(z.string()).optional(),
  relationship_strength: z.number().min(1).max(1000),
  notes: z.string().optional().nullable(),
})

type FormData = z.infer<typeof formSchema>

interface EditContactProps {
  contact: ContactPublic | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EditContact = ({ contact, open, onOpenChange }: EditContactProps) => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    mode: "onBlur",
    criteriaMode: "all",
    values: contact
      ? {
          name: contact.name,
          email: contact.email || undefined,
          phone: contact.phone,
          category: contact.category as FormData["category"],
          tags: contact.tags || [],
          relationship_strength: contact.relationship_strength || 500,
          notes: contact.notes,
        }
      : undefined,
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      if (!contact) return Promise.resolve({} as any)
      const updateData: ContactUpdate = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        category: data.category,
        tags: data.tags,
        relationship_strength: data.relationship_strength,
        notes: data.notes,
      }
      return ContactsService.updateContact({
        id: contact.id,
        requestBody: updateData,
      })
    },
    onSuccess: () => {
      showSuccessToast("Contact updated successfully")
      onOpenChange(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  if (!contact) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>Update contact information.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email{" "}
                      <span className="text-muted-foreground text-xs">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="personal">Personal</option>
                        <option value="professional">Professional</option>
                        <option value="family">Family</option>
                        <option value="other">Other</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <LoadingButton type="submit" loading={mutation.isPending}>
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default EditContact
