"use client";

import { useState } from "react";
import { useGoogleContacts, useSyncGoogleContacts } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  RefreshCw,
  User,
  Phone,
  Mail,
  Plus,
  X,
} from "lucide-react";
import { GoogleContact } from "@singularity/shared-types";

export interface SelectedRecipient {
  contact_name: string;
  contact_phone?: string;
  contact_email?: string;
  google_contact_id?: string;
}

interface ContactSelectorProps {
  selected: SelectedRecipient[];
  onChange: (recipients: SelectedRecipient[]) => void;
}

export function ContactSelector({ selected, onChange }: ContactSelectorProps) {
  const [search, setSearch] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const { data: contacts, isLoading } = useGoogleContacts(search || undefined);
  const syncContacts = useSyncGoogleContacts();

  const isSelected = (contact: GoogleContact) =>
    selected.some((r) => r.google_contact_id === contact.google_resource_name);

  const toggleContact = (contact: GoogleContact) => {
    if (isSelected(contact)) {
      onChange(
        selected.filter((r) => r.google_contact_id !== contact.google_resource_name)
      );
    } else {
      const phone = contact.phone_numbers?.[0]?.value;
      const email = contact.email_addresses?.[0]?.value;
      onChange([
        ...selected,
        {
          contact_name: contact.display_name || "Unknown",
          contact_phone: phone,
          contact_email: email,
          google_contact_id: contact.google_resource_name,
        },
      ]);
    }
  };

  const addManual = () => {
    if (!manualName.trim()) return;
    onChange([
      ...selected,
      {
        contact_name: manualName.trim(),
        contact_phone: manualPhone.trim() || undefined,
      },
    ]);
    setManualName("");
    setManualPhone("");
    setShowManual(false);
  };

  const removeRecipient = (index: number) => {
    onChange(selected.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Selected recipients */}
      {selected.length > 0 && (
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Selected ({selected.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {selected.map((r, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {r.contact_name}
                {r.contact_phone && (
                  <span className="text-muted-foreground text-xs ml-1">
                    {r.contact_phone}
                  </span>
                )}
                <button onClick={() => removeRecipient(i)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search + Sync */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => syncContacts.mutate()}
          disabled={syncContacts.isPending}
        >
          <RefreshCw
            className={`h-4 w-4 ${syncContacts.isPending ? "animate-spin" : ""}`}
          />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowManual(!showManual)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Manual
        </Button>
      </div>

      {/* Manual entry */}
      {showManual && (
        <div className="flex gap-2 p-3 border rounded-lg bg-muted/50">
          <Input
            placeholder="Name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Phone (e.g. +1...)"
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            className="flex-1"
          />
          <Button type="button" size="sm" onClick={addManual} disabled={!manualName.trim()}>
            Add
          </Button>
        </div>
      )}

      {/* Contact list */}
      <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : contacts && contacts.length > 0 ? (
          contacts.map((contact: GoogleContact) => (
            <label
              key={contact.id}
              className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={isSelected(contact)}
                onCheckedChange={() => toggleContact(contact)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">
                    {contact.display_name || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {contact.phone_numbers?.[0]?.value && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {contact.phone_numbers[0].value}
                    </span>
                  )}
                  {contact.email_addresses?.[0]?.value && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {contact.email_addresses[0].value}
                    </span>
                  )}
                </div>
              </div>
            </label>
          ))
        ) : (
          <div className="p-6 text-center text-muted-foreground text-sm">
            {search
              ? "No contacts match your search"
              : "No contacts found. Click sync to import from Google."}
          </div>
        )}
      </div>
    </div>
  );
}
