"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProtocolDoc, useDeleteProtocolDoc } from "@/hooks/useProtocolDocs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Edit, Trash2, FileText, Download, Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DocDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: doc, isLoading, error } = useProtocolDoc(id);
  const deleteDoc = useDeleteProtocolDoc();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDoc.mutateAsync(id);
      router.push("/docs");
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Document not found</h2>
        <Link href="/docs">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Docs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/docs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{doc.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {doc.category && (
                <Badge variant="secondary">{doc.category}</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                Updated {formatDate(doc.updated_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {doc.file_url && (
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </a>
          )}
          <Link href={`/docs/${doc.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteDoc.isPending}
          >
            {deleteDoc.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          {doc.content ? (
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans">{doc.content}</pre>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No content in this document.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
