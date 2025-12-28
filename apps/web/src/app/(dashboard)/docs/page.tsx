"use client";

import { useState } from "react";
import Link from "next/link";
import { useProtocolDocs } from "@/hooks/useProtocolDocs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { FileText, Plus, Search, Clock, Pill, Activity, Target, BookOpen } from "lucide-react";

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

  const { data: docs, isLoading, error } = useProtocolDocs({
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });

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
        <Link href="/docs/add">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Document
          </Button>
        </Link>
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
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first protocol document to get started
          </p>
          <Link href="/docs/add">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
