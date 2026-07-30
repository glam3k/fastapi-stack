import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Upload, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { ContactPublic, ContactUpdate } from "@/client"
import { ContactsService, UploadsService } from "@/client"
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
import { TagsInput } from "@/components/ui/tags-input"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().optional().refine(
    val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    { message: "Invalid email address" },
  ),
  phone: z.string().optional().nullable(),
  category: z
    .enum(["personal", "professional", "family", "other"])
    .default("personal"),
  tags: z.array(z.string()).optional(),
  linkedin_url: z.string().optional().nullable(),
  facebook_url: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  first_met: z.string().optional().nullable(),
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

  const { data: tagSuggestions } = useQuery({
    queryKey: ["contact-tags"],
    queryFn: () => ContactsService.readTags(),
  })

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
          linkedin_url: contact.linkedin_url,
          facebook_url: contact.facebook_url,
          photo_url: contact.photo_url,
          first_met: contact.first_met,
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
        linkedin_url: data.linkedin_url,
        facebook_url: data.facebook_url,
        photo_url: data.photo_url,
        first_met: data.first_met,
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

              <FormField
                control={form.control}
                name="linkedin_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://linkedin.com/in/username"
                        type="url"
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
                name="facebook_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://facebook.com/username"
                        type="url"
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
                name="photo_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {field.value && (
                          <div className="relative w-20 h-20">
                            <img
                              src={field.value}
                              alt="Preview"
                              className="h-full w-full rounded-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => field.onChange("")}
                              className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                          <Upload className="h-4 w-4" />
                          {field.value ? "Change photo" : "Upload photo"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              const formData = new FormData()
                              formData.append("file", file)
                              const result = await UploadsService.uploadPhotoEndpoint({ formData } as any)
                              field.onChange((result as any).url)
                            }}
                          />
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="first_met"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Met</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Any notes about this contact..."
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
                name="relationship_strength"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score (1-1000)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        value={field.value ?? 500}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <TagsInput
                        value={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Type tag and press Enter..."
                        suggestions={tagSuggestions}
                      />
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
