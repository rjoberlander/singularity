"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProtocolDocs, useCreateProtocolDoc } from "@/hooks/useProtocolDocs";
import { DocForm } from "@/components/docs/DocForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { FileText, Plus, Search, Clock, Pill, Activity, Target, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DOC_CATEGORIES = [
  { value: "routine", label: "Routine" },
  { value: "biomarkers", label: "Biomarkers" },
  { value: "supplements", label: "Supplements" },
  { value: "goals", label: "Goals" },
  { value: "reference", label: "Reference" },
  { value: "other", label: "Other" },
];

function InlineDocForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");

  const createDoc = useCreateProtocolDoc();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a document title");
      return;
    }

    try {
      const doc = await createDoc.mutateAsync({
        title: title.trim(),
        category: category as any || undefined,
        content: content.trim() || undefined,
      });
      toast.success("Document created successfully");
      router.push(`/docs/${doc.id}`);
    } catch (error) {
      console.error("Failed to create document:", error);
      toast.error("Failed to create document");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="inline-doc-title">Title *</Label>
          <Input
            id="inline-doc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inline-doc-category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {DOC_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="inline-doc-content">Content</Label>
        <Textarea
          id="inline-doc-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your document content here... (Markdown supported)"
          rows={8}
          className="font-mono"
        />
      </div>

      <Button type="submit" className="w-full" disabled={createDoc.isPending || !title.trim()}>
        {createDoc.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Create Document
      </Button>
    </form>
  );
}

const CATEGORIES = [
  { value: "all", label: "All", icon: BookOpen },
  { value: "routine", label: "Routines", icon: Clock },
  { value: "biomarkers", label: "Biomarkers", icon: Activity },
  { value: "supplements", label: "Supplements", icon: Pill },
  { value: "goals", label: "Goals", icon: Target },
  { value: "reference", label: "Reference", icon: BookOpen },
  { value: "other", label: "Other", icon: FileText },
];

export default function DocsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [formOpen, setFormOpen] = useState(false);

  const { data: docs, isLoading, error } = useProtocolDocs({
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });

  const handleAddDoc = () => {
    setFormOpen(true);
  };

  const filteredDocs = docs?.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryIcon = (category?: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    if (cat) {
      const Icon = cat.icon;
      return <Icon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Protocol Docs</h1>
          <p className="text-muted-foreground">
            Your personal health knowledge base
          </p>
        </div>
        <Button onClick={handleAddDoc}>
          <Plus className="w-4 h-4 mr-2" />
          Add Document
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "secondary"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
            >
              <category.icon className="w-4 h-4 mr-2" />
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[150px] rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load documents</p>
        </div>
      ) : filteredDocs && filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <Link key={doc.id} href={`/docs/${doc.id}`}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2">{doc.title}</CardTitle>
                    {doc.category && (
                      <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                        {getCategoryIcon(doc.category)}
                        {doc.category}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {doc.content && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {doc.content.substring(0, 150)}...
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(doc.updated_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto py-8">
          <div className="text-center mb-6">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
            <p className="text-muted-foreground">
              Create your first protocol document to get started
            </p>
          </div>

          {/* Inline Doc Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create Your First Document</CardTitle>
            </CardHeader>
            <CardContent>
              <InlineDocForm onSuccess={(id) => {}} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Doc Form Modal */}
      <DocForm
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
