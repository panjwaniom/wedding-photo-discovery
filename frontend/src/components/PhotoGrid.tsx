import { Photo } from "../types";
import { getThumbnailUrl } from "../services/api";

interface Props {
  photos: Photo[];
  sessionId: string;
  onPhotoClick: (index: number) => void;
}

export default function PhotoGrid({ photos, sessionId, onPhotoClick }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className="relative aspect-square rounded-xl overflow-hidden cursor-pointer
            group bg-white/50 animate-fade-in shadow-sm hover:shadow-md transition-shadow"
          style={{ animationDelay: `${Math.min(index * 0.05, 1)}s` }}
          onClick={() => onPhotoClick(index)}
        >
          <img
            src={getThumbnailUrl(sessionId, photo.id)}
            alt={`Wedding photo ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-300
              group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      ))}
    </div>
  );
}
