"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, GripVertical } from "lucide-react";

interface VoteOptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
}

export function VoteOptionsEditor({ options, onChange }: VoteOptionsEditorProps) {
  const addOption = () => {
    onChange([...options, ""]);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </span>
          <Input
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
            placeholder={`Option ${index + 1}`}
            className="flex-1"
          />
          {options.length > 2 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeOption(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addOption}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Option
      </Button>
      <p className="text-xs text-muted-foreground">
        An &quot;Other&quot; option with free text will be added automatically.
      </p>
    </div>
  );
}
