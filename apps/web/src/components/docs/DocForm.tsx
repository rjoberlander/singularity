"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtocolDoc } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateProtocolDoc, useUpdateProtocolDoc, useDeleteProtocolDoc } from "@/hooks/useProtocolDocs";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "routine", label: "Routine" },
  { value: "biomarkers", label: "Biomarkers" },
  { value: "supplements", label: "Supplements" },
  { value: "goals", label: "Goals" },
  { value: "reference", label: "Reference" },
  { value: "other", label: "Other" },
];

interface DocFormProps {
  doc?: ProtocolDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocForm({ doc, open, onOpenChange }: DocFormProps) {
  const router = useRouter();
  const isEditing = !!doc;

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    content: "",
  });

  const createDoc = useCreateProtocolDoc();
  const updateDoc = useUpdateProtocolDoc();
  const deleteDoc = useDeleteProtocolDoc();

  useEffect(() => {
    if (doc) {
      setFormData({
        title: doc.title,
        category: doc.category || "",
        content: doc.content || "",
      });
    } else {
      setFormData({
        title: "",
        category: "",
        content: "",
      });
    }
  }, [doc, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && doc) {
        await updateDoc.mutateAsync({
          id: doc.id,
          data: {
            title: formData.title,
            category: formData.category as any,
            content: formData.content,
          },
        });
        toast.success("Document updated successfully");
        onOpenChange(false);
      } else {
        const newDoc = await createDoc.mutateAsync({
          title: formData.title,
          category: formData.category as any,
          content: formData.content,
        });
        toast.success("Document created successfully");
        onOpenChange(false);
        // Navigate to the new document
        router.push(`/docs/${newDoc.id}`);
      }
    } catch (error) {
      console.error("Failed to save document:", error);
      toast.error("Failed to save document. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!doc) return;

    if (confirm("Are you sure you want to delete this document?")) {
      try {
        await deleteDoc.mutateAsync(doc.id);
        toast.success("Document deleted");
        onOpenChange(false);
        router.push("/docs");
      } catch (error) {
        console.error("Failed to delete document:", error);
        toast.error("Failed to delete document. Please try again.");
      }
    }
  };

  const isPending = createDoc.isPending || updateDoc.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Document" : "Add Document"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Document title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your document content here... (Markdown supported)"
              rows={12}
              className="font-mono"
            />
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteDoc.isPending}
                  className="w-full sm:w-auto"
                >
                  {deleteDoc.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !formData.title} className="w-full sm:w-auto">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Update" : "Create"} Document
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
