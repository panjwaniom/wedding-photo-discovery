export interface Photo {
  id: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  type: string;
}

export interface SearchResponse {
  matched: boolean;
  sessionId: string;
  personId: string;
  personName?: string;
  similarity: number;
  photoCount: number;
  photos: Photo[];
}

export type AppStatus = "idle" | "uploading" | "searching" | "results" | "error" | "confirm" | "unassigned";
