import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Zap, 
  RefreshCw, 
  Wallet,
  Settings,
  History,
  TrendingUp,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'scanner', icon: Zap, label: 'Arbitrage Scanner' },
  { id: 'positions', icon: TrendingUp, label: 'Positions' },
  { id: 'rebalance', icon: RefreshCw, label: 'Rebalancer' },
  { id: 'gasless', icon: Shield, label: 'Gasless TX' },
  { id: 'history', icon: History, label: 'History' },
  { id: 'wallet', icon: Wallet, label: 'Portfolio' },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden",
              activeTab === item.id
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-all",
              activeTab === item.id && "text-primary"
            )} />
            <span className="font-medium">{item.label}</span>
            {activeTab === item.id && (
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                layoutId="sidebar-indicator"
              />
            )}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100"
              initial={false}
            />
          </motion.button>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
      </div>

      <div className="p-4 mx-4 mb-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Pro Mode</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Unlock advanced features and higher limits
        </p>
        <button className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Upgrade
        </button>
      </div>
    </aside>
  );
}
