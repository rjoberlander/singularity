"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateSupplement, useCreateSupplementsBulk } from "@/hooks/useSupplements";
import { useExtractSupplements, useHasActiveAIKey } from "@/hooks/useAI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreateSupplementRequest, ExtractedSupplementData, SupplementTiming } from "@/types";
import { Sparkles, PenLine, Upload, Loader2, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "vitamin_mineral",
  "amino_protein",
  "herb_botanical",
  "probiotic",
  "other",
];

// Order: Wake, AM, Lunch, PM, Dinner, Evening, Bed
const TIMING_OPTIONS = [
  { value: "wake_up", label: "Wake" },
  { value: "am", label: "AM" },
  { value: "lunch", label: "Lunch" },
  { value: "pm", label: "PM" },
  { value: "dinner", label: "Dinner" },
  { value: "evening", label: "Evening" },
  { value: "bed", label: "Bed" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "twice_daily", label: "Twice Daily" },
  { value: "three_times_daily", label: "3x Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "As Needed" },
];

const INTAKE_FORM_OPTIONS = [
  { value: "capsule", label: "Capsule" },
  { value: "powder", label: "Powder" },
  { value: "liquid", label: "Liquid" },
  { value: "spray", label: "Spray" },
  { value: "gummy", label: "Gummy" },
  { value: "patch", label: "Patch" },
];

const DOSE_UNIT_OPTIONS = [
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "mcg", label: "mcg" },
  { value: "IU", label: "IU" },
  { value: "ml", label: "ml" },
  { value: "CFU", label: "CFU" },
  { value: "%", label: "%" },
];

export default function AddSupplementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("ai");

  // Check for AI API key
  const { hasKey: hasAIKey, isLoading: isCheckingKey } = useHasActiveAIKey();

  // Manual entry state
  const [manualData, setManualData] = useState<CreateSupplementRequest>({
    name: "",
    brand: "",
    intake_quantity: 1,
    intake_form: "",
    dose_per_serving: undefined,
    dose_unit: "",
    category: "",
  });

  // AI tab state - combined image + text
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [textContent, setTextContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Extracted data state (for review)
  const [extractedData, setExtractedData] = useState<ExtractedSupplementData | null>(null);
  const [selectedSupplements, setSelectedSupplements] = useState<Set<number>>(new Set());

  // Mutations
  const createSupplement = useCreateSupplement();
  const createSupplementsBulk = useCreateSupplementsBulk();
  const extractSupplements = useExtractSupplements();

  const processFile = useCallback((file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleExtract = async () => {
    if (!imageBase64 && !textContent.trim()) return;

    try {
      let result: ExtractedSupplementData;

      if (imageBase64) {
        result = await extractSupplements.mutateAsync({
          image_base64: imageBase64,
          source_type: "image",
        });
      } else {
        result = await extractSupplements.mutateAsync({
          text_content: textContent,
          source_type: "text",
        });
      }

      setExtractedData(result);
      // Select all by default
      setSelectedSupplements(new Set(result.supplements.map((_, i) => i)));
      toast.success(`Extracted ${result.supplements.length} supplements`);
    } catch (error) {
      console.error("Extraction failed:", error);
      toast.error("Failed to extract supplements. Please try again.");
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSupplement.mutateAsync(manualData);
      toast.success("Supplement saved successfully");
      router.push("/supplements");
    } catch (error) {
      console.error("Failed to create supplement:", error);
      toast.error("Failed to save supplement. Please try again.");
    }
  };

  const handleConfirmExtracted = async () => {
    if (!extractedData) return;

    const selectedData = extractedData.supplements
      .filter((_, i) => selectedSupplements.has(i))
      .map((s) => ({
        name: s.name,
        brand: s.brand,
        intake_quantity: s.intake_quantity || 1,
        intake_form: s.intake_form,
        dose_per_serving: s.dose_per_serving,
        dose_unit: s.dose_unit,
        servings_per_container: s.servings_per_container,
        price: s.price,
        category: s.category,
        timing: s.timing,
        frequency: s.frequency,
      }));

    try {
      await createSupplementsBulk.mutateAsync(selectedData);
      toast.success(`Saved ${selectedData.length} supplements`);
      router.push("/supplements");
    } catch (error) {
      console.error("Failed to save supplements:", error);
      toast.error("Failed to save supplements. Please try again.");
    }
  };

  const toggleSupplementSelection = (index: number) => {
    const newSelected = new Set(selectedSupplements);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSupplements(newSelected);
  };

  // Show review screen if we have extracted data
  if (extractedData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Review Extracted Data</h1>
          <p className="text-muted-foreground">
            Review and confirm the supplements extracted from your image or text
          </p>
        </div>

        {extractedData.source_info.store_name && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm">
                <span className="text-muted-foreground">Store: </span>
                {extractedData.source_info.store_name}
              </p>
              {extractedData.source_info.purchase_date && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Date: </span>
                  {extractedData.source_info.purchase_date}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {extractedData.supplements.map((supplement, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-colors ${
                selectedSupplements.has(index) ? "border-primary" : "opacity-60"
              }`}
              onClick={() => toggleSupplementSelection(index)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        selectedSupplements.has(index)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {selectedSupplements.has(index) && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{supplement.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {supplement.brand && `${supplement.brand} - `}
                        {supplement.category?.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {supplement.intake_form && (
                    <p className="text-lg font-semibold">
                      {supplement.intake_quantity || 1} {supplement.intake_form}{(supplement.intake_quantity || 1) > 1 ? 's' : ''}
                    </p>
                  )}
                  {supplement.servings_per_container && (
                    <p className="text-xs text-muted-foreground">
                      {supplement.servings_per_container} servings
                    </p>
                  )}
                  {supplement.price && (
                    <p className="text-sm text-muted-foreground">
                      ${supplement.price.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="ml-4">
                  <p className="text-xs text-muted-foreground">
                    {Math.round(supplement.confidence * 100)}% confidence
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setExtractedData(null);
              setSelectedSupplements(new Set());
            }}
          >
            Back
          </Button>
          <Button
            onClick={handleConfirmExtracted}
            disabled={selectedSupplements.size === 0 || createSupplementsBulk.isPending}
          >
            {createSupplementsBulk.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Save {selectedSupplements.size} Supplement{selectedSupplements.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Supplements</h1>
        <p className="text-muted-foreground">
          Add supplements manually or extract from images
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <PenLine className="w-4 h-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        {/* AI Tab - Combined Image + Text */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Extraction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isCheckingKey && !hasAIKey && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Warning: No API key configured.{" "}
                    <Link href="/settings" className="underline font-medium hover:no-underline">
                      Input API Key
                    </Link>
                  </AlertDescription>
                </Alert>
              )}

              {/* Image Upload with Drag & Drop */}
              <div>
                <Label className="mb-2 block">Upload Supplement Image</Label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : imageBase64
                      ? "border-primary"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  {imageBase64 ? (
                    <div className="space-y-4">
                      <img
                        src={imageBase64}
                        alt="Uploaded supplement"
                        className="max-h-48 mx-auto rounded"
                      />
                      <Button variant="outline" size="sm" onClick={() => setImageBase64(null)}>
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-2">
                        Drag and drop an image, or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bottle labels, receipts, or supplement lists
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or paste text</span>
                </div>
              </div>

              {/* Text Input */}
              <div>
                <Label htmlFor="text-content" className="mb-2 block">Paste Supplement List</Label>
                <Textarea
                  id="text-content"
                  placeholder="Paste your supplement list here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={6}
                  disabled={!!imageBase64}
                  className={imageBase64 ? "opacity-50" : ""}
                />
                {imageBase64 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Remove the image above to use text input instead
                  </p>
                )}
              </div>

              <Button
                onClick={handleExtract}
                disabled={(!imageBase64 && !textContent.trim()) || extractSupplements.isPending || !hasAIKey}
                className="w-full"
              >
                {extractSupplements.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Extract Supplements with AI
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Manual Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Supplement Name *</Label>
                    <Input
                      id="name"
                      value={manualData.name}
                      onChange={(e) =>
                        setManualData({ ...manualData, name: e.target.value })
                      }
                      placeholder="e.g., Vitamin D3"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={manualData.brand}
                      onChange={(e) =>
                        setManualData({ ...manualData, brand: e.target.value })
                      }
                      placeholder="e.g., Thorne"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="intake_quantity">Intake</Label>
                    <Select
                      value={(manualData.intake_quantity || 1).toString()}
                      onValueChange={(value) =>
                        setManualData({ ...manualData, intake_quantity: parseInt(value, 10) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Qty" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="intake_form">Form</Label>
                    <Select
                      value={manualData.intake_form || ""}
                      onValueChange={(value) =>
                        setManualData({ ...manualData, intake_form: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTAKE_FORM_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dose_unit">Unit</Label>
                    <Select
                      value={manualData.dose_unit || ""}
                      onValueChange={(value) =>
                        setManualData({ ...manualData, dose_unit: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOSE_UNIT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={manualData.category}
                      onValueChange={(value) =>
                        setManualData({ ...manualData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timing">Timing</Label>
                    <Select
                      value={manualData.timing || ""}
                      onValueChange={(value) =>
                        setManualData({ ...manualData, timing: value as SupplementTiming })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timing" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMING_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={manualData.frequency}
                      onValueChange={(value) =>
                        setManualData({ ...manualData, frequency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="servings">Servings Per Container</Label>
                    <Input
                      id="servings"
                      type="number"
                      value={manualData.servings_per_container ?? ""}
                      onChange={(e) =>
                        setManualData({
                          ...manualData,
                          servings_per_container: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={manualData.price ?? ""}
                      onChange={(e) =>
                        setManualData({
                          ...manualData,
                          price: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                </div>

                <Button type="submit" disabled={createSupplement.isPending}>
                  {createSupplement.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Save Supplement
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
