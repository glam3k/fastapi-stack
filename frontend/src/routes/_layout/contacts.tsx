import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Suspense } from "react"

import { ContactsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import AddContact from "@/components/Contacts/AddContact"
import { columns } from "@/components/Contacts/columns"
import PendingItems from "@/components/Pending/PendingItems"

function getContactsQueryOptions() {
  return {
    queryFn: () => ContactsService.readContacts({ skip: 0, limit: 100 }),
    queryKey: ["contacts"],
  }
}

export const Route = createFileRoute("/_layout/contacts")({
  component: Contacts,
  head: () => ({
    meta: [
      {
        title: "Contacts - JCRM",
      },
    ],
  }),
})

function ContactsTableContent() {
  const { data: contacts } = useSuspenseQuery(getContactsQueryOptions())

  if (contacts.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">
          You don't have any contacts yet
        </h3>
        <p className="text-muted-foreground">
          Add a new contact to get started
        </p>
      </div>
    )
  }

  return <DataTable columns={columns} data={contacts.data} />
}

function ContactsTable() {
  return (
    <Suspense fallback={<PendingItems />}>
      <ContactsTableContent />
    </Suspense>
  )
}

function Contacts() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Create and manage your contacts
          </p>
        </div>
        <AddContact />
      </div>
      <ContactsTable />
    </div>
  )
}
