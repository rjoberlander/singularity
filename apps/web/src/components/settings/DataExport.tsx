"use client";

import { useState } from "react";
import { useBiomarkers } from "@/hooks/useBiomarkers";
import { useSupplements } from "@/hooks/useSupplements";
import { useRoutines } from "@/hooks/useRoutines";
import { useGoals } from "@/hooks/useGoals";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DataExport() {
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: biomarkers } = useBiomarkers();
  const { data: supplements } = useSupplements();
  const { data: routines } = useRoutines();
  const { data: goals } = useGoals();

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAllJSON = async () => {
    setExporting("json");
    try {
      const data = {
        exportDate: new Date().toISOString(),
        biomarkers: biomarkers || [],
        supplements: supplements || [],
        routines: routines || [],
        goals: goals || [],
      };

      const json = JSON.stringify(data, null, 2);
      const date = new Date().toISOString().split("T")[0];
      downloadFile(json, `singularity-export-${date}.json`, "application/json");
      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(null);
    }
  };

  const exportBiomarkersCSV = async () => {
    setExporting("biomarkers");
    try {
      if (!biomarkers || biomarkers.length === 0) {
        toast.error("No biomarkers to export");
        return;
      }

      const headers = [
        "Name",
        "Value",
        "Unit",
        "Date Tested",
        "Category",
        "Status",
        "Reference Low",
        "Reference High",
        "Optimal Low",
        "Optimal High",
        "Lab Source",
        "Notes",
      ];

      const rows = biomarkers.map((b) => [
        b.name,
        b.value,
        b.unit,
        b.date_tested,
        b.category || "",
        b.status || "",
        b.reference_range_low || "",
        b.reference_range_high || "",
        b.optimal_range_low || "",
        b.optimal_range_high || "",
        b.lab_source || "",
        (b.notes || "").replace(/"/g, '""'),
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${cell}"`).join(",")
        ),
      ].join("\n");

      const date = new Date().toISOString().split("T")[0];
      downloadFile(csv, `biomarkers-${date}.csv`, "text/csv");
      toast.success("Biomarkers exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export biomarkers");
    } finally {
      setExporting(null);
    }
  };

  const exportSupplementsCSV = async () => {
    setExporting("supplements");
    try {
      if (!supplements || supplements.length === 0) {
        toast.error("No supplements to export");
        return;
      }

      const headers = [
        "Name",
        "Brand",
        "Intake Quantity",
        "Intake Form",
        "Dose Per Serving",
        "Dose Unit",
        "Category",
        "Timing",
        "Frequency",
        "Active",
        "Price",
        "Price Per Serving",
        "Purchase URL",
        "Notes",
      ];

      const rows = supplements.map((s) => [
        s.name,
        s.brand || "",
        s.intake_quantity || 1,
        s.intake_form || "",
        s.dose_per_serving || "",
        s.dose_unit || "",
        s.category || "",
        s.timing || "",
        s.frequency || "",
        s.is_active ? "Yes" : "No",
        s.price || "",
        s.price_per_serving || "",
        s.purchase_url || "",
        (s.notes || "").replace(/"/g, '""'),
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${cell}"`).join(",")
        ),
      ].join("\n");

      const date = new Date().toISOString().split("T")[0];
      downloadFile(csv, `supplements-${date}.csv`, "text/csv");
      toast.success("Supplements exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export supplements");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Data</CardTitle>
        <CardDescription>
          Download your health data in various formats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div>
            <p className="font-medium">Export All Data (JSON)</p>
            <p className="text-sm text-muted-foreground">
              Complete export of all your health data
            </p>
          </div>
          <Button
            variant="outline"
            onClick={exportAllJSON}
            disabled={exporting !== null}
          >
            {exporting === "json" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div>
            <p className="font-medium">Export Biomarkers (CSV)</p>
            <p className="text-sm text-muted-foreground">
              Spreadsheet-compatible biomarker data
            </p>
          </div>
          <Button
            variant="outline"
            onClick={exportBiomarkersCSV}
            disabled={exporting !== null}
          >
            {exporting === "biomarkers" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div>
            <p className="font-medium">Export Supplements (CSV)</p>
            <p className="text-sm text-muted-foreground">
              Your supplement stack data
            </p>
          </div>
          <Button
            variant="outline"
            onClick={exportSupplementsCSV}
            disabled={exporting !== null}
          >
            {exporting === "supplements" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
