export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-red-700 shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* ESQUERDA */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.gif"
            alt="Logo"
            className="h-8 w-auto object-contain"
          />

          <div className="text-white">
            <h1 className="text-sm font-bold leading-tight">
              Busca de PI
            </h1>
            <p className="text-[10px] opacity-80">
              Painel comercial
            </p>
          </div>
        </div>

        {/* DIREITA - LOGO METRÓPOLES */}
        <img
          src="/logo-metropoles-large (1).svg"
          alt="Metrópoles"
          className="h-5 w-auto object-contain brightness-0 invert opacity-90"
        />
      </div>
    </header>
  );
}