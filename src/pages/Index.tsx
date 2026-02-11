import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Wallet as WalletIcon, 
  Copy, 
  Zap, 
  Shield, 
  Activity, 
  TrendingUp,
  Settings,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Header } from '@/components/terminal/Header';
import { Sidebar } from '@/components/terminal/Sidebar';
import { ScannerControls } from '@/components/terminal/ScannerControls';
import { OpportunityList, OpportunityListSkeleton } from '@/components/terminal/OpportunityList';
import { GaslessTransactionBuilder } from '@/components/terminal/GaslessTransactionBuilder';
import { PositionRebalancer } from '@/components/terminal/PositionRebalancer';
import { DashboardStats } from '@/components/terminal/DashboardStats';
import { useRealArbitrage } from '@/hooks/useRealArbitrage';
import { useWallet, TokenBalance, EnhancedWalletState } from '@/hooks/useWallet';
import { useArbitrageScanner } from '@/hooks/useArbitrageScanner';
import { Button } from '@/components/ui/button';
import { ScannerConfig, Network } from '@/types/defi';
import { ethers } from 'ethers';
import { cn } from '@/lib/utils';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnecting, setIsConnecting] = useState(false);
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
    isScanning: realIsScanning,
    lastScanTime,
    scanError,
    startScanning: realStartScanning,
    stopScanning: realStopScanning,
    executeOpportunity: realExecuteOpportunity,
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

  // Determine if scanner is active (either real or mock)
  const isScanning = realIsScanning || config.isActive;

  // Start/stop scanner functions - use mock scanner when no wallet connected
  const handleStartScanning = useCallback(async () => {
    const signer = await getSigner();
    if (signer) {
      // Use real scanner with signer
      realStartScanning();
    } else {
      // Fallback to mock scanner for demo
      startScanner();
    }
  }, [startScanner, realStartScanning, getSigner]);

  const handleStopScanning = useCallback(() => {
    realStopScanning();
    stopScanner();
  }, [realStopScanning, stopScanner]);

  // Combined opportunities (real + mock)
  const combinedOpportunities = [...realOpportunities];

  // Execute opportunity handler
  const handleExecute = useCallback(async (id: string) => {
    const opportunity = realOpportunities.find(op => op.id === id);
    if (opportunity) {
      try {
        const signer = await getSigner();
        if (signer) {
          await realExecuteOpportunity(opportunity);
        } else {
          // Fallback to mock execution for demo
          executeMockOpportunity(id);
        }
      } catch (error) {
        console.error('Execution failed:', error);
        executeMockOpportunity(id);
      }
    }
  }, [realOpportunities, realExecuteOpportunity, executeMockOpportunity, getSigner]);

  // Handle wallet connection
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [connect]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <Header 
        totalProfit={stats.totalProfit}
        successRate={stats.successRate}
        isScanning={isScanning}
      />

      {/* Main Content */}
      <div className="flex-1 flex relative">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full max-w-7xl mx-auto"
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Dashboard Stats */}
                <DashboardStats 
                  opportunities={combinedOpportunities}
                  totalProfit={stats.totalProfit}
                  successRate={stats.successRate}
                  isScanning={isScanning}
                />
                
                {/* Main Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left Column - Scanner & Controls */}
                  <div className="xl:col-span-1 space-y-6">
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

                  {/* Right Column - Opportunities */}
                  <div className="xl:col-span-2 h-[calc(100vh-14rem)] min-h-[500px]">
                    <OpportunityList
                      opportunities={combinedOpportunities}
                      onExecute={handleExecute}
                      isScanning={isScanning}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scanner' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-sans font-bold text-foreground">Arbitrage Scanner</h2>
                    <p className="text-muted-foreground mt-1">
                      Configure and run the arbitrage opportunity scanner across multiple networks
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {scanError && (
                      <div className="px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                        {scanError}
                      </div>
                    )}
                    {lastScanTime && (
                      <span className="text-xs text-muted-foreground">
                        Last scan: {new Date(lastScanTime).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
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
                  </div>
                  <div className="lg:col-span-2 h-[calc(100vh-16rem)]">
                    <OpportunityList
                      opportunities={combinedOpportunities}
                      onExecute={handleExecute}
                      isScanning={isScanning}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'positions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-sans font-bold text-foreground">Positions</h2>
                    <p className="text-muted-foreground mt-1">
                      Monitor and manage your DeFi positions across all networks
                    </p>
                  </div>
                  {!wallet.isConnected && (
                    <Button onClick={handleConnect} disabled={isConnecting}>
                      {isConnecting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <WalletIcon className="w-4 h-4 mr-2" />
                      )}
                      Connect Wallet
                    </Button>
                  )}
                </div>

                <div className="max-w-4xl">
                  <PositionRebalancer isWalletConnected={wallet.isConnected} />
                </div>
              </div>
            )}

            {activeTab === 'rebalance' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-sans font-bold text-foreground">Position Rebalancer</h2>
                    <p className="text-muted-foreground mt-1">
                      Automatically rebalance your positions to maintain optimal health factors
                    </p>
                  </div>
                </div>

                <div className="max-w-4xl">
                  <PositionRebalancer isWalletConnected={wallet.isConnected} />
                </div>
              </div>
            )}

            {activeTab === 'gasless' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-sans font-bold text-foreground">Gasless Transactions</h2>
                    <p className="text-muted-foreground mt-1">
                      Execute transactions without paying gas fees using meta-transactions
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-xs text-primary font-medium">MEV Protected</span>
                  </div>
                </div>

                <div className="max-w-xl">
                  <GaslessTransactionBuilder isWalletConnected={wallet.isConnected} />
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-sans font-bold text-foreground">Transaction History</h2>
                    <p className="text-muted-foreground mt-1">
                      View all your past arbitrage transactions and their outcomes
                    </p>
                  </div>
                </div>

                <div className="p-12 rounded-lg border border-border bg-card text-center">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-sans font-semibold text-foreground mb-2">No Transactions Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Start the scanner and execute arbitrage opportunities to see your transaction history here.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'wallet' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-sans font-bold text-foreground">Portfolio</h2>
                    <p className="text-muted-foreground mt-1">
                      View your wallet balances and portfolio overview
                    </p>
                  </div>
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
              
                {!wallet.isConnected ? (
                  <div className="max-w-md mx-auto mt-12">
                    <div className="p-8 rounded-xl border border-border bg-card text-center">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <WalletIcon className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="font-sans font-semibold text-xl text-foreground mb-2">
                        Connect Your Wallet
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Connect your wallet to view your portfolio, token balances, and manage your DeFi positions.
                      </p>
                      <Button 
                        onClick={handleConnect} 
                        disabled={isConnecting}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <WalletIcon className="w-4 h-4 mr-2" />
                            Connect Wallet
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Wallet Info Card */}
                    <div className="lg:col-span-2">
                      <div className="p-6 rounded-xl border border-border bg-card">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <WalletIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Connected Wallet</div>
                              <div className="text-sm font-mono text-foreground">
                                {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(wallet.address || '')}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={disconnect}>
                              Disconnect
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {wallet.network ? wallet.network.charAt(0).toUpperCase() + wallet.network.slice(1) : 'Unknown'} Balance
                            </div>
                            <div className="text-4xl font-bold text-foreground">
                              {parseFloat(wallet.balance).toFixed(4)} <span className="text-lg text-muted-foreground">ETH</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">Session Profit</div>
                            <div className="text-4xl font-bold text-accent">
                              ${stats.totalProfit.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {wallet.lastUpdated && (
                          <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                            Last updated: {new Date(wallet.lastUpdated).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Network Info */}
                    <div>
                      <div className="p-6 rounded-xl border border-border bg-card h-full">
                        <div className="flex items-center gap-2 mb-4">
                          <Shield className="w-5 h-5 text-primary" />
                          <span className="font-medium text-foreground">Network Status</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Current Network</span>
                            <span className="text-sm font-medium text-foreground capitalize">
                              {wallet.network || 'Unknown'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Token Support</span>
                            <span className={cn(
                              "text-sm font-medium",
                              wallet.isLoadingTokens ? "text-muted-foreground" : "text-accent"
                            )}>
                              {wallet.isLoadingTokens ? 'Loading...' : `${wallet.tokens.length} tokens`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Scanner Status</span>
                            <span className={cn(
                              "text-sm font-medium flex items-center gap-1",
                              isScanning ? "text-accent" : "text-muted-foreground"
                            )}>
                              {isScanning && (
                                <motion.div
                                  className="w-2 h-2 rounded-full bg-accent"
                                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                />
                              )}
                              {isScanning ? 'Active' : 'Idle'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Token Holdings */}
                {wallet.isConnected && wallet.tokens.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Token Holdings</h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {wallet.tokens.map((token: TokenBalance) => (
                        <motion.div
                          key={token.address}
                          whileHover={{ scale: 1.02 }}
                          className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                {token.symbol.slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{token.symbol}</div>
                                <div className="text-xs text-muted-foreground">{token.name}</div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-mono font-medium text-foreground">
                              {parseFloat(token.balance).toLocaleString(undefined, {
                                minimumFractionDigits: token.decimals > 6 ? 2 : 0,
                                maximumFractionDigits: token.decimals > 6 ? 4 : token.decimals,
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">{token.symbol}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
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

