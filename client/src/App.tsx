import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import NewSession from "./pages/NewSession";
import Trial from "./pages/Trial";
import MySessions from "./pages/MySessions";
import Multiplayer from "./pages/Multiplayer";
import MultiplayerLobby from "./pages/MultiplayerLobby";
import Campaigns from "./pages/Campaigns";
import CreateCustomTrial from "./pages/CreateCustomTrial";
import CampaignPlay from "./pages/CampaignPlay";
import Settings from "./pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/nova-sessao" component={NewSession} />
      <Route path="/julgamento/:id" component={Trial} />
      <Route path="/minhas-sessoes" component={MySessions} />
      <Route path="/multiplayer" component={Multiplayer} />
      <Route path="/multiplayer/lobby/:id" component={MultiplayerLobby} />
      <Route path="/campanhas" component={Campaigns} />
      <Route path="/campanha/:campaignId/caso/:caseNumber" component={CampaignPlay} />
      <Route path="/criar-caso" component={CreateCustomTrial} />
      <Route path="/configuracoes" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
