"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, MapPin, Phone, Globe, Clock, Star } from "lucide-react";
import { toast } from "sonner";
import { useLookupHotel, useCreateTripAccommodation, useFetchGooglePlacesForAccommodation } from "@/lib/api";
import type { HotelLookupResult, CreateTripAccommodationRequest } from "@singularity/shared-types";

interface AddHotelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  segment: {
    segmentId: string;
    segmentName: string;
    startDate: string;
    endDate: string;
  };
  onSuccess?: () => void;
}

type Step = "input" | "looking-up" | "review";

export function AddHotelDialog({ open, onOpenChange, tripId, segment, onSuccess }: AddHotelDialogProps) {
  const [step, setStep] = useState<Step>("input");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<HotelLookupResult | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedAddress, setEditedAddress] = useState("");

  const lookupHotel = useLookupHotel();
  const createAccommodation = useCreateTripAccommodation();
  const fetchPhotos = useFetchGooglePlacesForAccommodation();

  const handleLookup = async () => {
    if (!query.trim()) return;

    setStep("looking-up");
    try {
      const data = await lookupHotel.mutateAsync({
        tripId,
        data: {
          query: query.trim(),
          segmentName: segment.segmentName,
          startDate: segment.startDate,
          endDate: segment.endDate,
        },
      });
      const hotel = data as HotelLookupResult;
      setResult(hotel);
      setEditedName(hotel.name || "");
      setEditedAddress(hotel.address || "");
      setStep("review");
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to look up hotel";
      toast.error(message);
      setStep("input");
    }
  };

  const handleConfirm = async () => {
    if (!result) return;

    try {
      const accommodationData: CreateTripAccommodationRequest = {
        segment_id: segment.segmentId,
        name: editedName || result.name,
        address: editedAddress || result.address,
        latitude: result.latitude,
        longitude: result.longitude,
        check_in_date: segment.startDate,
        check_out_date: segment.endDate,
        check_in_time: result.check_in_time || "15:00",
        check_out_time: result.check_out_time || "11:00",
        room_type: result.room_type,
        amenities: result.amenities,
        website: result.website,
        phone: result.phone,
        notes: result.notes,
      };
      const saved = await createAccommodation.mutateAsync({ tripId, data: accommodationData });
      toast.success(`Added ${editedName || result.name}`);
      // Fire-and-forget: fetch Google Places photos in background
      if (saved?.id) {
        fetchPhotos.mutateAsync({ tripId, accommodationId: saved.id }).catch(() => {
          // Photos are best-effort, don't block on failure
        });
      }
      handleClose();
      onSuccess?.();
    } catch (err) {
      toast.error("Failed to save accommodation");
    }
  };

  const handleClose = () => {
    setStep("input");
    setQuery("");
    setResult(null);
    setEditedName("");
    setEditedAddress("");
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step === "input" && query.trim()) {
      handleLookup();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Add Hotel — {segment.segmentName}
          </DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Hotel name or URL</Label>
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Four Seasons Lisbon, Airbnb link, or booking URL..."
                  className="text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleLookup}
                  disabled={!query.trim()}
                  className="shrink-0"
                >
                  <Search className="h-3.5 w-3.5 mr-1" />
                  Look up
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter a hotel name, Airbnb/VRBO link, or booking URL. AI will identify the property and fill in details.
            </p>
          </div>
        )}

        {step === "looking-up" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            <p className="text-sm text-muted-foreground">Looking up hotel details...</p>
          </div>
        )}

        {step === "review" && result && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input
                value={editedAddress}
                onChange={(e) => setEditedAddress(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {result.website && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Globe className="h-3 w-3 shrink-0" />
                  <a href={result.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-foreground">
                    {new URL(result.website).hostname}
                  </a>
                </div>
              )}
              {result.phone && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{result.phone}</span>
                </div>
              )}
              {result.check_in_time && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>In: {result.check_in_time}</span>
                </div>
              )}
              {result.check_out_time && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>Out: {result.check_out_time}</span>
                </div>
              )}
              {result.latitude && result.longitude && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}</span>
                </div>
              )}
              {result.confidence && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Star className="h-3 w-3 shrink-0" />
                  <span>Confidence: {result.confidence}</span>
                </div>
              )}
            </div>

            {result.amenities && result.amenities.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Amenities</p>
                <div className="flex flex-wrap gap-1">
                  {result.amenities.map((a) => (
                    <span key={a} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.notes && (
              <p className="text-xs text-muted-foreground italic">{result.notes}</p>
            )}
          </div>
        )}

        {step === "review" && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setStep("input")}>
              Back
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={createAccommodation.isPending}
            >
              {createAccommodation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
