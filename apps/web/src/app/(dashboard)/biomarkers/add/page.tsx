"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateBiomarker, useCreateBiomarkersBulk } from "@/hooks/useBiomarkers";
import { useExtractBiomarkers } from "@/hooks/useAI";
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
import { CreateBiomarkerRequest, ExtractedBiomarkerData } from "@/types";
import { Camera, FileText, PenLine, Upload, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "blood",
  "metabolic",
  "hormone",
  "vitamin",
  "mineral",
  "lipid",
  "thyroid",
  "liver",
  "kidney",
  "other",
];

export default function AddBiomarkerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("manual");

  // Manual entry state
  const [manualData, setManualData] = useState<CreateBiomarkerRequest>({
    name: "",
    value: 0,
    unit: "",
    date_tested: new Date().toISOString().split("T")[0],
    category: "",
  });

  // Image upload state
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Text paste state
  const [textContent, setTextContent] = useState("");

  // Extracted data state (for review)
  const [extractedData, setExtractedData] = useState<ExtractedBiomarkerData | null>(null);
  const [selectedBiomarkers, setSelectedBiomarkers] = useState<Set<number>>(new Set());

  // Mutations
  const createBiomarker = useCreateBiomarker();
  const createBiomarkersBulk = useCreateBiomarkersBulk();
  const extractBiomarkers = useExtractBiomarkers();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtractFromImage = async () => {
    if (!imageBase64) return;

    try {
      const result = await extractBiomarkers.mutateAsync({
        image_base64: imageBase64,
        source_type: "image",
      });
      setExtractedData(result);
      // Select all by default
      setSelectedBiomarkers(new Set(result.biomarkers.map((_, i) => i)));
      toast.success(`Extracted ${result.biomarkers.length} biomarkers`);
    } catch (error) {
      console.error("Extraction failed:", error);
      toast.error("Failed to extract biomarkers. Please try again.");
    }
  };

  const handleExtractFromText = async () => {
    if (!textContent.trim()) return;

    try {
      const result = await extractBiomarkers.mutateAsync({
        text_content: textContent,
        source_type: "text",
      });
      setExtractedData(result);
      // Select all by default
      setSelectedBiomarkers(new Set(result.biomarkers.map((_, i) => i)));
      toast.success(`Extracted ${result.biomarkers.length} biomarkers`);
    } catch (error) {
      console.error("Extraction failed:", error);
      toast.error("Failed to extract biomarkers. Please try again.");
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBiomarker.mutateAsync(manualData);
      toast.success("Biomarker saved successfully");
      router.push("/biomarkers");
    } catch (error) {
      console.error("Failed to create biomarker:", error);
      toast.error("Failed to save biomarker. Please try again.");
    }
  };

  const handleConfirmExtracted = async () => {
    if (!extractedData) return;

    const selectedData = extractedData.biomarkers
      .filter((_, i) => selectedBiomarkers.has(i))
      .map((b) => ({
        name: b.name,
        value: b.value,
        unit: b.unit,
        date_tested: extractedData.lab_info.test_date || new Date().toISOString().split("T")[0],
        category: b.category,
        reference_range_low: b.reference_range_low,
        reference_range_high: b.reference_range_high,
        optimal_range_low: b.optimal_range_low,
        optimal_range_high: b.optimal_range_high,
        ai_extracted: true,
      }));

    try {
      await createBiomarkersBulk.mutateAsync(selectedData);
      toast.success(`Saved ${selectedData.length} biomarkers`);
      router.push("/biomarkers");
    } catch (error) {
      console.error("Failed to save biomarkers:", error);
      toast.error("Failed to save biomarkers. Please try again.");
    }
  };

  const toggleBiomarkerSelection = (index: number) => {
    const newSelected = new Set(selectedBiomarkers);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedBiomarkers(newSelected);
  };

  // Show review screen if we have extracted data
  if (extractedData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Review Extracted Data</h1>
          <p className="text-muted-foreground">
            Review and confirm the biomarkers extracted from your lab report
          </p>
        </div>

        {extractedData.lab_info.lab_name && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm">
                <span className="text-muted-foreground">Lab: </span>
                {extractedData.lab_info.lab_name}
              </p>
              {extractedData.lab_info.test_date && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Date: </span>
                  {extractedData.lab_info.test_date}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {extractedData.biomarkers.map((biomarker, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-colors ${
                selectedBiomarkers.has(index) ? "border-primary" : "opacity-60"
              }`}
              onClick={() => toggleBiomarkerSelection(index)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        selectedBiomarkers.has(index)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {selectedBiomarkers.has(index) && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{biomarker.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {biomarker.category}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">
                    {biomarker.value} <span className="text-sm font-normal text-muted-foreground">{biomarker.unit}</span>
                  </p>
                  {biomarker.reference_range_low !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Ref: {biomarker.reference_range_low} - {biomarker.reference_range_high}
                    </p>
                  )}
                </div>
                <div className="ml-4">
                  <p className="text-xs text-muted-foreground">
                    {Math.round(biomarker.confidence * 100)}% confidence
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
              setSelectedBiomarkers(new Set());
            }}
          >
            Back
          </Button>
          <Button
            onClick={handleConfirmExtracted}
            disabled={selectedBiomarkers.size === 0 || createBiomarkersBulk.isPending}
          >
            {createBiomarkersBulk.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Save {selectedBiomarkers.size} Biomarker{selectedBiomarkers.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Biomarkers</h1>
        <p className="text-muted-foreground">
          Add biomarkers manually or extract from lab reports
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <PenLine className="w-4 h-4" />
            Manual
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Image
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Text
          </TabsTrigger>
        </TabsList>

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
                    <Label htmlFor="name">Biomarker Name</Label>
                    <Input
                      id="name"
                      value={manualData.name}
                      onChange={(e) =>
                        setManualData({ ...manualData, name: e.target.value })
                      }
                      placeholder="e.g., Vitamin D"
                      required
                    />
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
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Value</Label>
                    <Input
                      id="value"
                      type="number"
                      step="any"
                      value={manualData.value}
                      onChange={(e) =>
                        setManualData({
                          ...manualData,
                          value: parseFloat(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={manualData.unit}
                      onChange={(e) =>
                        setManualData({ ...manualData, unit: e.target.value })
                      }
                      placeholder="e.g., ng/mL"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date Tested</Label>
                    <Input
                      id="date"
                      type="date"
                      value={manualData.date_tested}
                      onChange={(e) =>
                        setManualData({ ...manualData, date_tested: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ref_low">Reference Range Low</Label>
                    <Input
                      id="ref_low"
                      type="number"
                      step="any"
                      value={manualData.reference_range_low ?? ""}
                      onChange={(e) =>
                        setManualData({
                          ...manualData,
                          reference_range_low: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ref_high">Reference Range High</Label>
                    <Input
                      id="ref_high"
                      type="number"
                      step="any"
                      value={manualData.reference_range_high ?? ""}
                      onChange={(e) =>
                        setManualData({
                          ...manualData,
                          reference_range_high: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                </div>

                <Button type="submit" disabled={createBiomarker.isPending}>
                  {createBiomarker.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Save Biomarker
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Image Upload */}
        <TabsContent value="image">
          <Card>
            <CardHeader>
              <CardTitle>Upload Lab Report Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  imageBase64 ? "border-primary" : "border-muted hover:border-primary/50"
                }`}
              >
                {imageBase64 ? (
                  <div className="space-y-4">
                    <img
                      src={imageBase64}
                      alt="Uploaded lab report"
                      className="max-h-64 mx-auto rounded"
                    />
                    <Button variant="outline" onClick={() => setImageBase64(null)}>
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, or WEBP up to 10MB
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

              <Button
                onClick={handleExtractFromImage}
                disabled={!imageBase64 || extractBiomarkers.isPending}
                className="w-full"
              >
                {extractBiomarkers.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Extract Biomarkers with AI
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Text Paste */}
        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle>Paste Lab Results Text</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your lab results here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={10}
              />

              <Button
                onClick={handleExtractFromText}
                disabled={!textContent.trim() || extractBiomarkers.isPending}
                className="w-full"
              >
                {extractBiomarkers.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Extract Biomarkers with AI
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
