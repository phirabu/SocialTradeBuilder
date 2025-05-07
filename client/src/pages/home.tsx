import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-dark-bg text-white pt-16 md:pt-0">
      {/* Mobile header space compensation */}
      <div className="md:hidden h-12"></div>
      
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-24 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-8 md:mb-0">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Tweet-to-Trade</span> <br />
            Trading Bot Builder
          </h1>
          <p className="text-xl text-text-secondary mb-8">
            Create trading bots that execute Solana transactions based on Twitter commands. No coding required.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/wizard">
              <Button className="bg-[#9945FF] hover:bg-[#9945FF]/90 text-white px-8 py-6 text-lg">
                <i className="fas fa-magic mr-2"></i> Start Building
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="border-[#9945FF] text-[#9945FF] hover:bg-[#9945FF]/10 px-8 py-6 text-lg">
                <i className="fas fa-th-large mr-2"></i> View Dashboard
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="md:w-1/2 md:pl-12">
          <div className="bg-card-bg border border-border-color rounded-xl p-6 shadow-xl">
            <div className="mock-tweet p-5 mb-4">
              <div className="flex mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 mr-3"></div>
                <div>
                  <div className="flex items-center">
                    <span className="font-bold text-white">Crypto User</span>
                    <span className="ml-2 text-text-secondary">@crypto_user · 2m</span>
                  </div>
                  <p className="text-white mt-1">@TradeBot buy 0.1 SOL of JUP</p>
                </div>
              </div>
            </div>
            
            <div className="mock-tweet p-5">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-[#9945FF]/20 flex items-center justify-center mr-3">
                  <i className="fas fa-robot text-[#9945FF]"></i>
                </div>
                <div>
                  <div className="flex items-center">
                    <span className="font-bold text-white">TradeBot</span>
                    <span className="ml-2 text-text-secondary">@tradebot · 1m</span>
                  </div>
                </div>
              </div>
              
              <p className="text-white mb-3">
                ✅ Swap succeeded!<br />
                Traded 0.1 SOL for 1.25 JUP
              </p>
              
              <div className="bg-gray-800/30 rounded-md p-3 text-xs font-mono text-text-secondary">
                Signature: Hs7VtQCvTm3...<a href="#" className="text-[#9945FF] ml-1">View ↗️</a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-card-bg border-t border-border-color py-12">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-border-color">
              <div className="w-12 h-12 rounded-full bg-[#9945FF]/20 flex items-center justify-center mb-4">
                <i className="fas fa-robot text-[#9945FF]"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Create Your Bot</h3>
              <p className="text-text-secondary">
                Use our wizard to configure your trading bot with supported tokens and actions.
              </p>
            </div>
            
            <div className="bg-gray-800/50 p-6 rounded-lg border border-border-color">
              <div className="w-12 h-12 rounded-full bg-[#14F195]/20 flex items-center justify-center mb-4">
                <i className="fas fa-exchange-alt text-[#14F195]"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Tweet Commands</h3>
              <p className="text-text-secondary">
                Users tweet commands like "@YourBot buy 0.1 SOL of JUP" to trigger trades.
              </p>
            </div>
            
            <div className="bg-gray-800/50 p-6 rounded-lg border border-border-color">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                <i className="fas fa-chart-line text-blue-500"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Execute Trades</h3>
              <p className="text-text-secondary">
                Bot automatically executes trades on Solana using Jupiter and replies with confirmation.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link href="/wizard">
              <Button className="bg-[#9945FF] hover:bg-[#9945FF]/90 text-white px-8 py-6 text-lg">
                <i className="fas fa-magic mr-2"></i> Create Your Bot Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
