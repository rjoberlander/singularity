"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateProtocolDoc } from "@/hooks/useProtocolDocs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "routine", label: "Routine" },
  { value: "biomarkers", label: "Biomarkers" },
  { value: "supplements", label: "Supplements" },
  { value: "goals", label: "Goals" },
  { value: "reference", label: "Reference" },
  { value: "other", label: "Other" },
];

export default function AddDocPage() {
  const router = useRouter();
  const createDoc = useCreateProtocolDoc();

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    content: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const doc = await createDoc.mutateAsync({
        title: formData.title,
        category: formData.category as "routine" | "biomarkers" | "supplements" | "goals" | "reference" | "other" | undefined,
        content: formData.content,
      });
      router.push(`/docs/${doc.id}`);
    } catch (error) {
      console.error("Failed to create:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/docs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Document</h1>
          <p className="text-muted-foreground">Create a new protocol document</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
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
                rows={20}
                className="font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/docs">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={createDoc.isPending}>
                {createDoc.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Document
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
