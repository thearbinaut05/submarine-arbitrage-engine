import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/terminal/Header';
import { Sidebar } from '@/components/terminal/Sidebar';
import { ScannerControls } from '@/components/terminal/ScannerControls';
import { OpportunityList } from '@/components/terminal/OpportunityList';
import { GaslessTransactionBuilder } from '@/components/terminal/GaslessTransactionBuilder';
import { PositionRebalancer } from '@/components/terminal/PositionRebalancer';
import { DashboardStats } from '@/components/terminal/DashboardStats';
import { useArbitrageScanner } from '@/hooks/useArbitrageScanner';
import { useWallet } from '@/hooks/useWallet';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { wallet } = useWallet();
  const {
    opportunities,
    config,
    stats,
    startScanner,
    stopScanner,
    toggleAutoExecute,
    executeOpportunity,
    updateConfig,
  } = useArbitrageScanner();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <Header 
        totalProfit={stats.totalProfit}
        successRate={stats.successRate}
        isScanning={config.isActive}
      />

      {/* Main Content */}
      <div className="flex-1 flex relative">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 overflow-auto p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <DashboardStats 
                  opportunities={opportunities}
                  totalProfit={stats.totalProfit}
                  successRate={stats.successRate}
                  isScanning={config.isActive}
                />
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <ScannerControls
                      config={config}
                      stats={stats}
                      onStart={startScanner}
                      onStop={stopScanner}
                      onToggleAutoExecute={toggleAutoExecute}
                      onUpdateConfig={updateConfig}
                    />
                    <GaslessTransactionBuilder isWalletConnected={wallet.isConnected} />
                  </div>
                  <div className="flex flex-col h-[calc(100vh-16rem)]">
                    <OpportunityList
                      opportunities={opportunities}
                      onExecute={executeOpportunity}
                      isScanning={config.isActive}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scanner' && (
              <div className="grid grid-cols-2 gap-6 h-full">
                <div>
                  <ScannerControls
                    config={config}
                    stats={stats}
                    onStart={startScanner}
                    onStop={stopScanner}
                    onToggleAutoExecute={toggleAutoExecute}
                    onUpdateConfig={updateConfig}
                  />
                </div>
                <div className="h-[calc(100vh-10rem)]">
                  <OpportunityList
                    opportunities={opportunities}
                    onExecute={executeOpportunity}
                    isScanning={config.isActive}
                  />
                </div>
              </div>
            )}

            {activeTab === 'positions' && (
              <div className="max-w-4xl">
                <PositionRebalancer isWalletConnected={wallet.isConnected} />
              </div>
            )}

            {activeTab === 'rebalance' && (
              <div className="max-w-4xl">
                <PositionRebalancer isWalletConnected={wallet.isConnected} />
              </div>
            )}

            {activeTab === 'gasless' && (
              <div className="max-w-xl">
                <GaslessTransactionBuilder isWalletConnected={wallet.isConnected} />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <h2 className="text-xl font-sans font-semibold text-foreground">Transaction History</h2>
                <div className="p-8 rounded-lg border border-border bg-card text-center">
                  <p className="text-muted-foreground">No transactions yet. Start the scanner to execute arbitrage opportunities.</p>
                </div>
              </div>
            )}

            {activeTab === 'wallet' && (
              <div className="space-y-4">
                <h2 className="text-xl font-sans font-semibold text-foreground">Portfolio Overview</h2>
                {wallet.isConnected ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <div className="text-xs text-muted-foreground mb-1">Wallet Balance</div>
                      <div className="text-2xl font-bold text-foreground">
                        {parseFloat(wallet.balance).toFixed(4)} ETH
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <div className="text-xs text-muted-foreground mb-1">Network</div>
                      <div className="text-2xl font-bold text-foreground capitalize">
                        {wallet.network || 'Unknown'}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <div className="text-xs text-muted-foreground mb-1">Session Profit</div>
                      <div className="text-2xl font-bold text-accent">
                        ${stats.totalProfit.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-lg border border-border bg-card text-center">
                    <p className="text-muted-foreground">Connect your wallet to view portfolio details.</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Index;
