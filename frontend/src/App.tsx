import { useState, useCallback } from "react";
import { AppStatus, SearchResponse } from "./types";
import { searchFace } from "./services/api";
import LandingPage from "./pages/LandingPage";
import LoadingState from "./components/LoadingState";
import ResultsPage from "./pages/ResultsPage";
import ErrorState from "./components/ErrorState";
import ConfirmIdentity from "./components/ConfirmIdentity";
import UnassignedPhotos from "./components/UnassignedPhotos";

function getInitialStatus(): AppStatus {
  try {
    if (new URLSearchParams(window.location.search).get("view") === "unassigned") {
      return "unassigned";
    }
  } catch {
    // ignore — fall back to landing page
  }
  return "idle";
}

function App() {
  const [status, setStatus] = useState<AppStatus>(getInitialStatus);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string>("");

  const handleUpload = useCallback(async (file: File) => {
    setStatus("uploading");
    setError("");

    try {
      const response = await searchFace(file);
      setResults(response);
      // Only ask "Are you X?" when Immich actually has a name for this person.
      // Unnamed matches go straight to results.
      setStatus(response.personName ? "confirm" : "results");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setStatus("error");
    }
  }, []);

  const handleConfirmYes = useCallback(() => {
    setStatus("results");
  }, []);

  const handleConfirmNo = useCallback(() => {
    setStatus("idle");
  }, []);

  const handleReset = useCallback(() => {
    setStatus("idle");
    setResults(null);
    setError("");
    // Clear the deep-link param so a later reload lands on the home page
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("view")) {
        url.searchParams.delete("view");
        const clean = url.pathname + (url.search ? url.search : "") + url.hash;
        window.history.replaceState({}, "", clean || "/");
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-wedding-50">
      {status === "idle" && <LandingPage onUpload={handleUpload} />}

      {(status === "uploading" || status === "searching") && <LoadingState />}

      {status === "confirm" && results && (
        <ConfirmIdentity
          personName={results.personName || ""}
          onYes={handleConfirmYes}
          onNo={handleConfirmNo}
          onReset={handleReset}
        />
      )}

      {status === "results" && results && (
        <ResultsPage results={results} onReset={handleReset} />
      )}

      {status === "unassigned" && (
        <UnassignedPhotos onClose={handleReset} />
      )}

      {status === "error" && (
        <ErrorState message={error} onReset={handleReset} />
      )}
    </div>
  );
}

export default App;
