import { useState, useEffect } from "react";

export function SlideSMC() {
  const [imgSrc, setImgSrc] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const update = () => setImgSrc(`https://${projectId}.supabase.co/functions/v1/chart-proxy?t=${Date.now()}`);
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full overflow-hidden">
      {error ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Failed to load chart image</p>
        </div>
      ) : (
        <img
          src={imgSrc}
          alt="SMC Chart Analysis"
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
