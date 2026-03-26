export function Footer() {
  return (
    <footer className="mt-6 border-t border-neutral-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        
        <img
          src="/logo-maisacessado.webp"
          className="h-6"
        />

        <p className="text-xs text-neutral-500">
          © {new Date().getFullYear()} Metrópoles · desenvolvido por daniel
        </p>
      </div>
    </footer>
  );
}