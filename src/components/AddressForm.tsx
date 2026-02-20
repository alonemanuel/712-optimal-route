"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { useMapbox } from "@/components/MapboxProvider";
import { Input } from "@/components/ui/input";

interface AddressFormProps {
  onSubmitted: () => void;
}

interface SelectedPlace {
  address_text: string;
  lat: number;
  lng: number;
}

interface MapboxSuggestion {
  id: string;
  place_name: string;
  center: [number, number];
  relevance: number;
}

export default function AddressForm({ onSubmitted }: AddressFormProps) {
  const { ready } = useMapbox();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(
    async (value: string) => {
      setQuery(value);
      setSelected(null);
      setSuggestions([]);

      if (!value.trim() || !ready) return;

      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            value
          )}.json?country=il&limit=5&access_token=${token}`
        );

        if (!response.ok) throw new Error("Search failed");
        const data = await response.json();
        setSuggestions(data.features || []);
      } catch (err) {
        console.error("Geocoding error:", err);
      }
    },
    [ready]
  );

  const handleSelectSuggestion = (suggestion: MapboxSuggestion) => {
    const [lng, lat] = suggestion.center;
    setSelected({
      address_text: suggestion.place_name,
      lat,
      lng,
    });
    setQuery(suggestion.place_name);
    setSuggestions([]);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selected) {
      setError("Select an address from the suggestions.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/submissions/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Server error: ${res.status}`);
      }

      setSubmitted(selected.address_text);
      setSelected(null);
      setQuery("");
      setSuggestions([]);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-slate-500">Loading maps...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="Type your Tel Aviv address..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          disabled={submitting}
          className="h-11 text-base border-slate-300 focus:ring-2 focus:ring-blue-500"
          dir="ltr"
          autoComplete="off"
        />

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto z-50"
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
              >
                <p className="text-sm font-medium text-slate-900 truncate">
                  {suggestion.place_name}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-600 mb-1">Selected:</p>
          <p className="text-sm text-blue-900 font-medium truncate">
            {selected.address_text}
          </p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selected || submitting}
        className={`w-full h-11 rounded-lg font-semibold transition-all duration-200 ${
          !selected || submitting
            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-md hover:shadow-lg"
        }`}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Submitting...
          </span>
        ) : (
          "Submit Address"
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {submitted && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-3 animate-in fade-in">
          <p className="text-sm font-medium text-green-900 mb-1">
            ✓ Address submitted successfully
          </p>
          <p className="text-xs text-green-700">
            {submitted}
          </p>
          <p className="text-xs text-green-600 mt-2">
            Route is recalculating...
          </p>
        </div>
      )}
    </div>
  );
}
