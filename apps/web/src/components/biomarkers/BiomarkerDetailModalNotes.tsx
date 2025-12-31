"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBiomarkerNotes, useCreateBiomarkerNote, useUpdateBiomarkerNote, useDeleteBiomarkerNote } from "@/hooks/useBiomarkerNotes";
import { BiomarkerNote } from "@/types";
import { Pencil, Trash2, Bot, User, Plus, X, Check } from "lucide-react";

interface BiomarkerDetailModalNotesProps {
  biomarkerName: string;
}

export function BiomarkerDetailModalNotes({ biomarkerName }: BiomarkerDetailModalNotesProps) {
  const { data: notes, isLoading } = useBiomarkerNotes(biomarkerName);
  const createNote = useCreateBiomarkerNote();
  const updateNote = useUpdateBiomarkerNote();
  const deleteNote = useDeleteBiomarkerNote();

  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    await createNote.mutateAsync({
      biomarker_name: biomarkerName,
      content: newNoteContent.trim(),
      created_by: "user",
    });
    setNewNoteContent("");
    setIsAdding(false);
  };

  const handleUpdateNote = async (id: string) => {
    if (!editContent.trim()) return;
    await updateNote.mutateAsync({ id, content: editContent.trim() });
    setEditingId(null);
    setEditContent("");
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote.mutateAsync(id);
  };

  const startEditing = (note: BiomarkerNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading notes...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Add Note Button/Form */}
      {isAdding ? (
        <div className="space-y-2">
          <Textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Add a note about this biomarker..."
            className="min-h-[80px] text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNoteContent.trim() || createNote.isPending}
            >
              <Check className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAdding(false);
                setNewNoteContent("");
              }}
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Note
        </Button>
      )}

      {/* Notes List */}
      {notes && notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-3 rounded-lg bg-muted/50 border border-border"
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[60px] text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={!editContent.trim() || updateNote.isPending}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditContent("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEditing(note)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-red-500"
                        disabled={deleteNote.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    {note.created_by === "ai" ? (
                      <span className="flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        AI
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        You
                      </span>
                    )}
                    <span>•</span>
                    <span>{formatDate(note.created_at)}</span>
                    {note.ai_context && (
                      <>
                        <span>•</span>
                        <span className="italic">{note.ai_context}</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notes yet. Add a note to track insights about this biomarker.
          </p>
        )
      )}
    </div>
  );
}
