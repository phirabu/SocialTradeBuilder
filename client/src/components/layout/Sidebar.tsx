import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { 
    name: "Bot Wizard", 
    path: "/wizard", 
    icon: <i className="fas fa-robot w-5 h-5 mr-3"></i> 
  },
  { 
    name: "Dashboard", 
    path: "/dashboard", 
    icon: <i className="fas fa-table-columns w-5 h-5 mr-3"></i> 
  },
  { 
    name: "Twitter Debug", 
    path: "/twitter-debug", 
    icon: <i className="fab fa-twitter w-5 h-5 mr-3"></i> 
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col bg-card-bg border-r border-border-color">
        <div className="p-6">
          <Link href="/">
            <div className="flex items-center text-xl font-bold mb-8 cursor-pointer">
              <span className="gradient-text">TweetTrade</span>
              <span className="ml-2 text-white">Builder</span>
            </div>
          </Link>
          
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg cursor-pointer",
                    location === item.path
                      ? "text-white bg-[#9945FF]/10"
                      : "text-text-secondary hover:text-white hover:bg-white/5"
                  )}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </div>
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-border-color">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#9945FF]/20 flex items-center justify-center">
              <i className="fas fa-user text-[#9945FF]"></i>
            </div>
            <div>
              <p className="text-sm font-medium">Solana Dev</p>
              <p className="text-xs text-text-secondary">devnet</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden border-b border-border-color p-4 flex items-center justify-between fixed top-0 left-0 right-0 bg-dark-bg z-10">
        <Link href="/">
          <div className="flex items-center text-xl font-bold cursor-pointer">
            <span className="gradient-text">TweetTrade</span>
            <span className="ml-1 text-white">Builder</span>
          </div>
        </Link>
        <button 
          className="p-2 rounded-lg hover:bg-white/5"
          onClick={toggleMobileMenu}
        >
          <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-text-secondary`}></i>
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-card-bg/95 backdrop-blur-sm z-20 pt-16 shadow-lg">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg cursor-pointer",
                    location === item.path
                      ? "text-white bg-[#9945FF]/30"
                      : "text-text-secondary hover:text-white hover:bg-[#9945FF]/10"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </div>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
