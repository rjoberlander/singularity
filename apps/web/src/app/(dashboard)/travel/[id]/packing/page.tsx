"use client";

import { useParams } from "next/navigation";
import { useTripFull } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  ListTodo,
  Plus,
} from "lucide-react";

export default function TripPackingPage() {
  const params = useParams();
  const tripId = params.id as string;

  const { data: trip } = useTripFull(tripId);

  if (!trip) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Packing List</h2>
          <p className="text-sm text-muted-foreground">
            Keep track of what to pack
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold">Packing list coming soon</h3>
          <p className="text-muted-foreground mt-1">
            Create and manage your packing checklist
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
