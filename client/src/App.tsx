import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Wizard from "@/pages/wizard";
import Dashboard from "@/pages/dashboard";
import Trade from "@/pages/trade";
import Portfolio from "@/pages/portfolio";
import TwitterDebug from "@/pages/twitter-debug";
import Sidebar from "@/components/layout/Sidebar";

function Router() {
  return (
    <div className="flex min-h-screen bg-dark-bg">
      <Sidebar />
      <div className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/wizard" component={Wizard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/trade/:id" component={Trade} />
          <Route path="/portfolio/:id" component={Portfolio} />
          <Route path="/twitter-debug" component={TwitterDebug} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
