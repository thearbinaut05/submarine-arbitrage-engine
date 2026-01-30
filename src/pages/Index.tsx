import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Wallet as WalletIcon, Copy, Zap, Shield, Activity, TrendingUp } from 'lucide-react';
import { Header } from '@/components/terminal/Header';
import { Sidebar } from '@/components/terminal/Sidebar';
import { ScannerControls } from '@/components/terminal/ScannerControls';
import { OpportunityList } from '@/components/terminal/OpportunityList';
import { GaslessTransactionBuilder } from '@/components/terminal/GaslessTransactionBuilder';
import { PositionRebalancer } from '@/components/terminal/PositionRebalancer';
import { DashboardStats } from '@/components/terminal/DashboardStats';
import { useRealArbitrage } from '@/hooks/useRealArbitrage';
import { useWallet, TokenBalance, EnhancedWalletState } from '@/hooks/useWallet';
import { useArbitrageScanner } from '@/hooks/useArbitrageScanner';
import { Button } from '@/components/ui/button';
import { ScannerConfig, Network } from '@/types/defi';
import { ethers } from 'ethers';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { wallet, connect, disconnect, switchNetwork, networks, refreshBalances } = useWallet();

  // Get signer from wallet for transactions
  const getSigner = useCallback(async () => {
    if (!wallet.address || !wallet.network) return null;
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        return null;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      return await provider.getSigner();
    } catch (error) {
      console.error('Failed to get signer:', error);
      return null;
    }
  }, [wallet.address, wallet.network]);

  // Real arbitrage hook
  const {
    opportunities: realOpportunities,
    isScanning,
    lastScanTime,
    scanError,
    startScanning,
    stopScanning,
    executeOpportunity,
  } = useRealArbitrage(wallet.address, wallet.network as Network | null, null);

  // Mock scanner for UI demo (can be replaced with real scanning)
  const {
    config,
    stats,
    startScanner,
    stopScanner,
    toggleAutoExecute,
    executeOpportunity: executeMockOpportunity,
    updateConfig,
  } = useArbitrageScanner();

  // Combined opportunities (real + mock)
  const combinedOpportunities = [...realOpportunities];

  // Execute opportunity handler
  const handleExecute = useCallback(async (id: string) => {
    const opportunity = realOpportunities.find(op => op.id === id);
    if (opportunity) {
      try {
        const signer = await getSigner();
        if (signer) {
          await executeOpportunity(opportunity);
        } else {
          // Fallback to mock execution for demo
          executeMockOpportunity(id);
        }
      } catch (error) {
        console.error('Execution failed:', error);
        executeMockOpportunity(id);
      }
    }
  }, [realOpportunities, executeOpportunity, executeMockOpportunity, getSigner]);

  const handleStartScanning = useCallback(async () => {
    const signer = await getSigner();
    if (signer) {
      // Use real scanner with signer
      startScanning();
    } else {
      // Fallback to mock scanner for demo
      startScanner();
    }
  }, [startScanning, startScanner, getSigner]);

  const handleStopScanning = useCallback(() => {
    stopScanning();
    stopScanner();
  }, [stopScanning, stopScanner]);

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
        isScanning={isScanning || config.isActive}
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
                  opportunities={combinedOpportunities}
                  totalProfit={stats.totalProfit}
                  successRate={stats.successRate}
                  isScanning={isScanning || config.isActive}
                />
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-6">
                  <ScannerControls
                      config={config}
                      stats={{
                        totalScanned: stats.totalScanned + (lastScanTime ? 1 : 0),
                        totalProfit: stats.totalProfit,
                        successRate: stats.successRate,
                        avgProfit: stats.avgProfit,
                      }}
                      onStart={handleStartScanning}
                      onStop={handleStopScanning}
                      onToggleAutoExecute={toggleAutoExecute}
                      onUpdateConfig={updateConfig}
                    />
                    <GaslessTransactionBuilder isWalletConnected={wallet.isConnected} />
                  </div>
                  <div className="flex flex-col h-[calc(100vh-16rem)]">
                    <OpportunityList
                      opportunities={combinedOpportunities}
                      onExecute={handleExecute}
                      isScanning={isScanning || config.isActive}
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
                    stats={{
                      totalScanned: stats.totalScanned,
                      totalProfit: stats.totalProfit,
                      successRate: stats.successRate,
                      avgProfit: stats.avgProfit,
                    }}
                    onStart={handleStartScanning}
                    onStop={handleStopScanning}
                    onToggleAutoExecute={toggleAutoExecute}
                    onUpdateConfig={updateConfig}
                  />
                  {scanError && (
                    <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                      {scanError}
                    </div>
                  )}
                  {lastScanTime && (
                    <div className="mt-4 text-xs text-muted-foreground">
                      Last scan: {new Date(lastScanTime).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="h-[calc(100vh-10rem)]">
                  <OpportunityList
                    opportunities={combinedOpportunities}
                    onExecute={handleExecute}
                    isScanning={isScanning || config.isActive}
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
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-sans font-semibold text-foreground">Portfolio Overview</h2>
                {wallet.isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshBalances()}
                    disabled={wallet.isLoadingTokens}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${wallet.isLoadingTokens ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                )}
              </div>
              
              {wallet.isConnected ? (
                <div className="space-y-6">
                  {/* Native Token Balance Card */}
                  <div className="p-6 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <WalletIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Connected Wallet</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Network</div>
                        <div className="text-sm font-medium text-foreground capitalize">
                          {wallet.network || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">ETH Balance</div>
                        <div className="text-3xl font-bold text-foreground">
                          {parseFloat(wallet.balance).toFixed(4)} <span className="text-lg text-muted-foreground">ETH</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-1">Session Profit</div>
                        <div className="text-3xl font-bold text-accent">
                          ${stats.totalProfit.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {wallet.lastUpdated && (
                      <div className="text-xs text-muted-foreground mt-4 text-right">
                        Last updated: {new Date(wallet.lastUpdated).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Token Balances Section */}
                  {wallet.tokens.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">Token Holdings</h3>
                      <div className="grid gap-3">
                        {wallet.tokens.map((token: TokenBalance) => (
                          <div
                            key={token.address}
                            className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                {token.symbol.slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{token.symbol}</div>
                                <div className="text-xs text-muted-foreground">{token.name}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-medium text-foreground">
                                {parseFloat(token.balance).toLocaleString(undefined, {
                                  minimumFractionDigits: token.decimals > 6 ? 2 : 0,
                                  maximumFractionDigits: token.decimals > 6 ? 4 : token.decimals,
                                })}
                              </div>
                              <div className="text-xs text-muted-foreground">{token.symbol}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty Token State */}
                  {wallet.tokens.length === 0 && (
                    <div className="p-6 rounded-lg border border-border bg-card text-center">
                      <p className="text-muted-foreground">
                        No token holdings detected for this wallet on {wallet.network}.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 rounded-lg border border-border bg-card text-center">
                  <WalletIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
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

