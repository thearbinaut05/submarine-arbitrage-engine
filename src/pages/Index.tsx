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
import { EmbeddedWalletPanel } from '@/components/terminal/EmbeddedWalletPanel';
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

  // Real arbitrage hook - primary scanner & executor
  const {
    opportunities: realOpportunities,
    isScanning: realIsScanning,
    lastScanTime,
    scanError,
    startScanning: realStartScanning,
    stopScanning: realStopScanning,
    executeOpportunity: realExecuteOpportunity,
  } = useRealArbitrage(wallet.address, wallet.network as Network | null, null);

  // Mock scanner for config UI only (stats tracking)
  const {
    config,
    stats,
    startScanner,
    stopScanner,
    toggleAutoExecute,
    executeOpportunity: executeMockOpportunity,
    updateConfig,
  } = useArbitrageScanner();

  // Use real scanner state
  const isScanning = realIsScanning || config.isActive;

  // Start/stop scanner - only use real scanner
  const handleStartScanning = useCallback(async () => {
    await realStartScanning();
    startScanner(); // for config.isActive state
  }, [realStartScanning, startScanner]);

  const handleStopScanning = useCallback(() => {
    realStopScanning();
    stopScanner();
  }, [realStopScanning, stopScanner]);

  // Use only real opportunities
  const combinedOpportunities = realOpportunities;

  // Execute opportunity - real execution via edge function + Gelato
  const handleExecute = useCallback(async (id: string) => {
    const opportunity = realOpportunities.find(op => op.id === id);
    
    if (opportunity) {
      try {
        await realExecuteOpportunity(opportunity);
      } catch (error) {
        console.error('Execution failed:', error);
      }
    }
  }, [realOpportunities, realExecuteOpportunity]);

  // Handle wallet connection with error handling
  const handleConnect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet to connect.');
      return;
    }
    setIsConnecting(true);
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
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
                      Real-time on-chain scanning across 7 networks with live execution via Gelato relay
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
                  <div className="max-w-md mx-auto mt-12 space-y-6">
                    <div className="p-8 rounded-xl border border-border bg-card text-center">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <WalletIcon className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="font-sans font-semibold text-xl text-foreground mb-2">
                        Connect Your Wallet
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Connect MetaMask for direct profit routing, or use the built-in embedded wallet below.
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
                            Connect MetaMask
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Embedded Wallet - available even without MetaMask */}
                    <div className="p-6 rounded-xl border border-border bg-card">
                      <EmbeddedWalletPanel connectedWalletAddress={null} />
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={disconnect}
                            >
                              Disconnect
                            </Button>
                          </div>
                        </div>

                        {/* Network Info */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="p-4 rounded-lg bg-muted/30">
                            <div className="text-xs text-muted-foreground mb-1">Network</div>
                            <div className="font-medium text-foreground capitalize">{wallet.network || 'Unknown'}</div>
                          </div>
                          <div className="p-4 rounded-lg bg-muted/30">
                            <div className="text-xs text-muted-foreground mb-1">Native Balance</div>
                            <div className="font-medium text-foreground">
                              {parseFloat(wallet.balance).toFixed(4)} {wallet.network === 'bsc' ? 'BNB' : wallet.network === 'polygon' ? 'MATIC' : 'ETH'}
                            </div>
                          </div>
                        </div>

                        {/* Token Balances */}
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-3">Token Balances</h4>
                          {wallet.isLoadingTokens ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : wallet.tokens.length > 0 ? (
                            <div className="space-y-2">
                              {wallet.tokens.map((token: TokenBalance) => (
                                <div key={token.address} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="text-xs font-bold text-primary">{token.symbol.slice(0, 2)}</span>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-foreground">{token.symbol}</div>
                                      <div className="text-xs text-muted-foreground">{token.name}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-foreground">{token.balance}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-muted-foreground text-sm">
                              No token balances found on this network
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Network Switcher + Embedded Wallet */}
                    <div className="space-y-6">
                      <div className="p-6 rounded-xl border border-border bg-card">
                        <h4 className="text-sm font-medium text-foreground mb-4">Switch Network</h4>
                        <div className="space-y-2">
                          {Object.values(networks).map((net) => (
                            <button
                              key={net.id}
                              onClick={() => switchNetwork(net.id)}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                                wallet.network === net.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50 hover:bg-muted/30"
                              )}
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: net.color }}
                              />
                              <div>
                                <div className="text-sm font-medium text-foreground">{net.name}</div>
                                <div className="text-xs text-muted-foreground">Chain ID: {net.chainId}</div>
                              </div>
                              {wallet.network === net.id && (
                                <div className="ml-auto text-xs text-primary font-medium">Active</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Embedded Wallet Panel */}
                      <div className="p-6 rounded-xl border border-border bg-card">
                        <EmbeddedWalletPanel connectedWalletAddress={wallet.address} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-sans font-bold text-foreground">Settings</h2>
                    <p className="text-muted-foreground mt-1">
                      Configure scanner parameters and execution preferences
                    </p>
                  </div>
                </div>

                <div className="max-w-2xl">
                  <div className="p-6 rounded-xl border border-border bg-card space-y-6">
                    <div>
                      <h3 className="font-medium text-foreground mb-2">Scanner Configuration</h3>
                      <p className="text-sm text-muted-foreground">
                        Scanner rotates through 7 networks (Ethereum, Arbitrum, Polygon, BSC, Optimism, Base, Avalanche) every 15 seconds per network. 
                        Execution uses Gelato relay for gasless transactions via free DEX aggregators (Paraswap, KyberSwap, OpenOcean).
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/30">
                        <div className="text-xs text-muted-foreground mb-1">Execution Method</div>
                        <div className="font-medium text-foreground">Gelato SyncFee Relay</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30">
                        <div className="text-xs text-muted-foreground mb-1">MEV Protection</div>
                        <div className="font-medium text-foreground">Private Mempool</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30">
                        <div className="text-xs text-muted-foreground mb-1">Flash Loan Provider</div>
                        <div className="font-medium text-foreground">Balancer V2 (0% fee)</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30">
                        <div className="text-xs text-muted-foreground mb-1">Wallet Connected</div>
                        <div className="font-medium text-foreground">{wallet.isConnected ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Index;
