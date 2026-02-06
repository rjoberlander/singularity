"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Image,
  Search,
  MapPin,
  Car,
  Plane,
  Loader2,
  TrendingUp,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";

interface UsageByModule {
  rv_enrichment: { photos: number; searches: number; details: number; cost: number };
  travel_planning: { photos: number; searches: number; details: number; cost: number };
  other: { photos: number; searches: number; details: number; cost: number };
}

interface GooglePlacesUsage {
  photos: { count: number; cost: number; freeRemaining: number };
  textSearches: { count: number; cost: number };
  placeDetails: { count: number; cost: number };
  totalCost: number;
}

interface ApiUsageResponse {
  success: boolean;
  data: {
    overall: {
      google_places: GooglePlacesUsage;
      anthropic: { input_tokens: number; output_tokens: number; cost: number };
      openai: { input_tokens: number; output_tokens: number; cost: number };
      perplexity: { requests: number; cost: number };
      totalCost: number;
    };
    byModule: UsageByModule;
    month: string;
  };
}

const FREE_PHOTOS_PER_MONTH = 1000;

function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.01) return "<$0.01";
  return `$${cost.toFixed(2)}`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
  }
  return options;
}

export function ApiUsage() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const { data, isLoading, error } = useQuery<ApiUsageResponse>({
    queryKey: ["api-usage", selectedMonth],
    queryFn: async () => {
      const response = await api.get(`/users/api-usage?month=${selectedMonth}-01`);
      return response.data;
    },
  });

  const monthOptions = getMonthOptions();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <AlertCircle className="w-5 h-5 mr-2" />
          Failed to load usage data
        </CardContent>
      </Card>
    );
  }

  const { overall, byModule } = data.data;
  const googlePlaces = overall.google_places;
  const totalPhotos = googlePlaces.photos.count;
  const freePhotosUsedPercent = Math.min(100, (totalPhotos / FREE_PHOTOS_PER_MONTH) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Usage</CardTitle>
              <CardDescription>
                Track your API usage across RV Locations, Travel, and other features
              </CardDescription>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Places Photo Usage - Main Focus */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Google Places Photos</h3>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Monthly Free Tier ({FREE_PHOTOS_PER_MONTH.toLocaleString()} photos)</span>
                <span className="font-medium">
                  {totalPhotos.toLocaleString()} / {FREE_PHOTOS_PER_MONTH.toLocaleString()} used
                </span>
              </div>
              <Progress value={freePhotosUsedPercent} className="h-3" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {googlePlaces.photos.freeRemaining > 0
                    ? `${googlePlaces.photos.freeRemaining.toLocaleString()} free photos remaining`
                    : "Free tier exhausted"}
                </span>
                {totalPhotos > FREE_PHOTOS_PER_MONTH && (
                  <span className="text-orange-500">
                    {(totalPhotos - FREE_PHOTOS_PER_MONTH).toLocaleString()} billable @ $0.007 each
                  </span>
                )}
              </div>
            </div>

            {/* Usage by Module */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-sm">RV Locations</span>
                </div>
                <div className="text-2xl font-bold">
                  {byModule.rv_enrichment.photos.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">photos downloaded</div>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-sm">Travel</span>
                </div>
                <div className="text-2xl font-bold">
                  {byModule.travel_planning.photos.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">photos downloaded</div>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-sm">Other</span>
                </div>
                <div className="text-2xl font-bold">
                  {byModule.other.photos.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">photos downloaded</div>
              </div>
            </div>
          </div>

          {/* Other Google Places APIs */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-500" />
              Other Google Places API Calls
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <div className="font-medium">Text Searches</div>
                  <div className="text-xs text-muted-foreground">$0.032 per search</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{googlePlaces.textSearches.count.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatCost(googlePlaces.textSearches.cost)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <div className="font-medium">Place Details</div>
                  <div className="text-xs text-muted-foreground">$0.017 per request</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{googlePlaces.placeDetails.count.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatCost(googlePlaces.placeDetails.cost)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Provider Usage */}
          {(overall.anthropic.cost > 0 || overall.openai.cost > 0 || overall.perplexity.cost > 0) && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-500" />
                AI Provider Usage
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {overall.anthropic.cost > 0 && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="font-medium mb-1">Anthropic</div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(overall.anthropic.input_tokens)} in / {formatNumber(overall.anthropic.output_tokens)} out
                    </div>
                    <div className="font-bold mt-1">{formatCost(overall.anthropic.cost)}</div>
                  </div>
                )}

                {overall.openai.cost > 0 && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="font-medium mb-1">OpenAI</div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(overall.openai.input_tokens)} in / {formatNumber(overall.openai.output_tokens)} out
                    </div>
                    <div className="font-bold mt-1">{formatCost(overall.openai.cost)}</div>
                  </div>
                )}

                {overall.perplexity.cost > 0 && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="font-medium mb-1">Perplexity</div>
                    <div className="text-sm text-muted-foreground">
                      {overall.perplexity.requests.toLocaleString()} requests
                    </div>
                    <div className="font-bold mt-1">{formatCost(overall.perplexity.cost)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Total Cost Summary */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold">Estimated Total Cost</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{formatCost(overall.totalCost)}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedMonth === new Date().toISOString().slice(0, 7)
                    ? "this month"
                    : monthOptions.find((o) => o.value === selectedMonth)?.label}
                </div>
              </div>
            </div>
            {overall.totalCost === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                You&apos;re within the free tier limits! Google Places provides 1,000 free photos per month.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
