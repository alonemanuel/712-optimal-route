"use client";

import { useRef, useState, useCallback } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AddressFormProps {
  onSubmitted: () => void;
}

interface SelectedPlace {
  address_text: string;
  lat: number;
  lng: number;
}

export default function AddressForm({ onSubmitted }: AddressFormProps) {
  const { isLoaded } = useGoogleMaps();
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onAutocompleteLoad = useCallback(
    (ac: google.maps.places.Autocomplete) => {
      setAutocomplete(ac);
    },
    []
  );

  const onPlaceChanged = useCallback(() => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (place.geometry?.location) {
      setSelected({
        address_text: place.formatted_address ?? place.name ?? "",
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
      setError(null);
    }
  }, [autocomplete]);

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
      if (inputRef.current) inputRef.current.value = "";
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Submit Your Address</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            componentRestrictions: { country: "il" },
            types: ["address"],
          }}
        >
          <Input
            ref={inputRef}
            placeholder="Type your Tel Aviv address..."
            dir="ltr"
            disabled={submitting}
          />
        </Autocomplete>

        {selected && (
          <p className="text-xs text-muted-foreground truncate">
            {selected.address_text}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className="w-full"
        >
          {submitting ? "Submitting..." : "Submit Address"}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {submitted && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3">
            <p className="text-sm text-green-800">
              Submitted: {submitted}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Route is recalculating...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
