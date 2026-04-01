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
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-2 h-8 rounded-full bg-primary" />
        <h2 className="font-display text-xl tracking-widest text-primary">SMC — SMART MONEY CONCEPTS</h2>
      </div>
      <div className="flex-1 flex items-center justify-center bg-card rounded-xl border border-border overflow-hidden">
        {error ? (
          <p className="text-muted-foreground text-sm">Failed to load chart image</p>
        ) : (
          <img
            src={imgSrc}
            alt="SMC Chart Analysis"
            className="w-full h-full object-contain"
            onError={() => setError(true)}
          />
        )}
      </div>
    </div>
  );
}
