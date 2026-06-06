import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      {/* Glitch-style 404 */}
      <div className="relative">
        <p className="text-8xl font-bold text-slate-800 tracking-widest select-none">404</p>
        <p className="absolute inset-0 text-8xl font-bold text-emerald-500/20 tracking-widest select-none translate-x-0.5 -translate-y-0.5">
          404
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm uppercase tracking-widest text-slate-400">
          Route not found
        </p>
        <p className="text-xs text-slate-600 font-mono">
          ERR: PATH_DOES_NOT_EXIST — check your router config
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded text-xs tracking-widest uppercase text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200 transition-colors"
        >
          ← Go Back
        </button>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 rounded text-xs tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
        >
          Dashboard
        </button>
      </div>
    </div>
  );
}