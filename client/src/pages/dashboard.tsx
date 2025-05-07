import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import BotDashboard from "@/components/dashboard/BotDashboard";
import BotDetail from "@/components/dashboard/BotDetail";

function BotDetailPage({ params }: { params: { id: string } }) {
  const botId = parseInt(params.id);
  
  if (isNaN(botId)) {
    return <div>Invalid Bot ID</div>;
  }
  
  return <BotDetail botId={botId} />;
}

export default function Dashboard() {
  // Add mobile header padding
  useEffect(() => {
    const content = document.getElementById('dashboard-content');
    if (content) {
      content.classList.add('md:pt-0', 'pt-16');
    }
    
    return () => {
      if (content) {
        content.classList.remove('md:pt-0', 'pt-16');
      }
    };
  }, []);

  return (
    <div id="dashboard-content">
      <Switch>
        <Route path="/dashboard" component={BotDashboard} />
        <Route path="/dashboard/:id" component={BotDetailPage} />
      </Switch>
    </div>
  );
}
