export function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="error-banner" role="alert" aria-live="assertive">
      {error}
    </div>
  );
}
