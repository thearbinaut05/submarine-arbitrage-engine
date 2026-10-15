import { createRoot } from "react-dom/client";
import "./index.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { isSupabaseConfigured } from "./integrations/supabase/client";

const queryClient = new QueryClient();

const BackendNotConfigured = () => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
    <div className="max-w-xl w-full rounded-2xl border bg-card p-6 shadow-sm space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">FlashArb</p>
        <h1 className="mt-2 text-2xl font-semibold">Backend not configured</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This build was created without the public Supabase environment variables, so the
          scanner, wallet assistant, and other backend features are disabled instead of
          showing a blank page.
        </p>
      </div>
      <div className="rounded-xl bg-muted p-4 text-sm space-y-2">
        <p className="font-medium">Add these in Render → Environment, then redeploy:</p>
        <code className="block break-all">VITE_SUPABASE_URL</code>
        <code className="block break-all">VITE_SUPABASE_PUBLISHABLE_KEY</code>
      </div>
      <p className="text-xs text-muted-foreground">
        Use only the Supabase project URL and publishable/anon key in the frontend. Never put
        a service-role key, deployer private key, Gelato secret, or wallet private key in
        VITE_* variables.
      </p>
    </div>
  </div>
);

const App = () => {
  if (!isSupabaseConfigured) {
    return <BackendNotConfigured />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);

export default App;
