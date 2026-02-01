import React, { useState, useEffect, useCallback } from 'react';

// Types
interface XHandle {
  id: string;
  handle: string;
  name: string;
  followers: string;
  active: boolean;
}

interface DetectedTicker {
  id: string;
  symbol: string;
  handle: string;
  timestamp: Date;
  confidence: number;
  virality: number;
  trend: number;
  mentions: number;
  status: 'analyzing' | 'ready' | 'traded';
  action?: 'BUY' | 'SELL' | 'HOLD';
}

interface Trade {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  timestamp: Date;
  pnl?: number;
}

interface ActivityLog {
  id: string;
  type: 'detection' | 'analysis' | 'trade' | 'system';
  message: string;
  timestamp: Date;
}

// Mock Data
const initialHandles: XHandle[] = [
  { id: '1', handle: '@elonmusk', name: 'Elon Musk', followers: '180.5M', active: true },
  { id: '2', handle: '@caborockz', name: 'Murad Mahmudov', followers: '592K', active: true },
  { id: '3', handle: '@CryptoWizardd', name: 'Crypto Wizard', followers: '1.2M', active: true },
  { id: '4', handle: '@VitalikButerin', name: 'Vitalik Buterin', followers: '5.4M', active: false },
  { id: '5', handle: '@APompliano', name: 'Anthony Pompliano', followers: '1.6M', active: true },
];

const cryptoSymbols = ['$BTC', '$ETH', '$SOL', '$DOGE', '$PEPE', '$WIF', '$BONK', '$SHIB', '$ARB', '$OP', '$AVAX', '$LINK', '$UNI', '$AAVE', '$CRV'];

// Utility Functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const randomInRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Components
const ScanLine: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden opacity-30">
    <div className="scan-line w-full h-32 absolute" />
  </div>
);

const NeuralBackground: React.FC = () => (
  <div className="fixed inset-0 neural-bg grid-pattern pointer-events-none" />
);

const StatusIndicator: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`inline-block w-2 h-2 rounded-full status-dot ${
    active ? 'bg-[#00ff88]' : 'bg-[#5a5a70]'
  }`} />
);

const ConfidenceMeter: React.FC<{ value: number; size?: number }> = ({ value, size = 80 }) => {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 75 ? '#00ff88' : value >= 50 ? '#ffaa00' : '#ff6b4a';
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size} viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="#1a1a25"
          strokeWidth="8"
        />
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-orbitron text-lg font-bold" style={{ color }}>{value}%</span>
      </div>
    </div>
  );
};

const TickerBadge: React.FC<{ symbol: string; action?: 'BUY' | 'SELL' | 'HOLD' }> = ({ symbol, action }) => {
  const actionColors = {
    BUY: 'bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88]',
    SELL: 'bg-[#ff6b4a]/20 border-[#ff6b4a] text-[#ff6b4a]',
    HOLD: 'bg-[#ffaa00]/20 border-[#ffaa00] text-[#ffaa00]',
  };
  
  return (
    <div className="flex items-center gap-2">
      <span className="font-orbitron font-bold text-[#00f5ff] text-lg">{symbol}</span>
      {action && (
        <span className={`px-2 py-0.5 text-xs font-bold border rounded ${actionColors[action]}`}>
          {action}
        </span>
      )}
    </div>
  );
};

const MetricBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-[#5a5a70]">{label}</span>
      <span style={{ color }}>{value}%</span>
    </div>
    <div className="h-1.5 bg-[#1a1a25] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

const Panel: React.FC<{ title: string; icon: string; children: React.ReactNode; className?: string }> = ({
  title, icon, children, className = ''
}) => (
  <div className={`bg-[#12121a]/80 backdrop-blur-sm border border-[#00f5ff]/20 rounded-lg overflow-hidden card-hover ${className}`}>
    <div className="px-4 py-3 border-b border-[#00f5ff]/10 flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <h3 className="font-orbitron text-sm font-semibold text-[#00f5ff] uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const HandleCard: React.FC<{ handle: XHandle; onToggle: (id: string) => void }> = ({ handle, onToggle }) => (
  <div
    className={`p-3 rounded-lg border transition-all cursor-pointer ${
      handle.active
        ? 'bg-[#00f5ff]/5 border-[#00f5ff]/30 hover:border-[#00f5ff]/50'
        : 'bg-[#1a1a25]/50 border-[#5a5a70]/20 hover:border-[#5a5a70]/40'
    }`}
    onClick={() => onToggle(handle.id)}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <StatusIndicator active={handle.active} />
        <div>
          <p className="font-semibold text-white text-sm">{handle.handle}</p>
          <p className="text-xs text-[#5a5a70]">{handle.followers} followers</p>
        </div>
      </div>
      <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${
        handle.active ? 'bg-[#00f5ff]' : 'bg-[#5a5a70]'
      }`}>
        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${
          handle.active ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </div>
    </div>
  </div>
);

const DetectionCard: React.FC<{ ticker: DetectedTicker; onTrade: (ticker: DetectedTicker) => void }> = ({ ticker, onTrade }) => {
  const isAnalyzing = ticker.status === 'analyzing';
  const isTraded = ticker.status === 'traded';
  
  return (
    <div className={`p-4 rounded-lg border transition-all fade-in ${
      isAnalyzing
        ? 'bg-[#ffaa00]/5 border-[#ffaa00]/30 animate-pulse'
        : isTraded
        ? 'bg-[#00ff88]/5 border-[#00ff88]/30'
        : 'bg-[#12121a] border-[#00f5ff]/20 hover:border-[#00f5ff]/40'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <TickerBadge symbol={ticker.symbol} action={ticker.action} />
          <p className="text-xs text-[#5a5a70] mt-1">via {ticker.handle}</p>
        </div>
        <ConfidenceMeter value={ticker.confidence} size={60} />
      </div>
      
      <div className="space-y-2 mb-3">
        <MetricBar label="Virality" value={ticker.virality} color="#00f5ff" />
        <MetricBar label="Trend" value={ticker.trend} color="#ff6b4a" />
        <MetricBar label="Mentions" value={ticker.mentions} color="#ffaa00" />
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#5a5a70]">
          {ticker.timestamp.toLocaleTimeString()}
        </span>
        {!isTraded && !isAnalyzing && (
          <button
            onClick={() => onTrade(ticker)}
            className="btn-cyber px-3 py-1.5 bg-[#00f5ff]/20 border border-[#00f5ff]/50 text-[#00f5ff] text-xs font-bold rounded hover:bg-[#00f5ff]/30 transition-all"
          >
            EXECUTE TRADE
          </button>
        )}
        {isTraded && (
          <span className="text-xs text-[#00ff88] font-bold">✓ TRADED</span>
        )}
        {isAnalyzing && (
          <span className="text-xs text-[#ffaa00] font-bold">ANALYZING...</span>
        )}
      </div>
    </div>
  );
};

const TradeRow: React.FC<{ trade: Trade }> = ({ trade }) => (
  <div className="flex items-center justify-between py-2 border-b border-[#1a1a25] last:border-0 fade-in">
    <div className="flex items-center gap-3">
      <span className={`px-2 py-0.5 text-xs font-bold rounded ${
        trade.action === 'BUY'
          ? 'bg-[#00ff88]/20 text-[#00ff88]'
          : 'bg-[#ff6b4a]/20 text-[#ff6b4a]'
      }`}>
        {trade.action}
      </span>
      <span className="font-orbitron text-[#00f5ff] font-bold">{trade.symbol}</span>
    </div>
    <div className="text-right">
      <p className="text-sm text-white">${trade.price.toLocaleString()}</p>
      <p className="text-xs text-[#5a5a70]">{trade.amount.toFixed(4)} units</p>
    </div>
    {trade.pnl !== undefined && (
      <span className={`text-sm font-bold ${
        trade.pnl >= 0 ? 'text-[#00ff88]' : 'text-[#ff6b4a]'
      }`}>
        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}%
      </span>
    )}
  </div>
);

const ActivityLogItem: React.FC<{ log: ActivityLog }> = ({ log }) => {
  const typeColors = {
    detection: 'text-[#00f5ff]',
    analysis: 'text-[#ffaa00]',
    trade: 'text-[#00ff88]',
    system: 'text-[#5a5a70]',
  };
  
  const typeIcons = {
    detection: '🎯',
    analysis: '🔍',
    trade: '💰',
    system: '⚙️',
  };
  
  return (
    <div className="flex items-start gap-2 py-2 border-b border-[#1a1a25]/50 last:border-0 fade-in">
      <span>{typeIcons[log.type]}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${typeColors[log.type]}`}>{log.message}</p>
        <p className="text-[10px] text-[#5a5a70]">{log.timestamp.toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

const TickerTape: React.FC<{ tickers: string[] }> = ({ tickers }) => {
  const doubled = [...tickers, ...tickers];
  
  return (
    <div className="overflow-hidden bg-[#12121a]/80 border-y border-[#00f5ff]/10 py-2">
      <div className="ticker-animate flex gap-8 whitespace-nowrap">
        {doubled.map((ticker, i) => (
          <span key={i} className="font-orbitron text-sm text-[#00f5ff]/70">
            {ticker} <span className="text-[#00ff88]">+{randomInRange(1, 15)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const StatsCard: React.FC<{ label: string; value: string; trend?: string; positive?: boolean }> = ({
  label, value, trend, positive
}) => (
  <div className="bg-[#12121a]/60 border border-[#00f5ff]/10 rounded-lg p-4">
    <p className="text-xs text-[#5a5a70] uppercase tracking-wider mb-1">{label}</p>
    <p className="font-orbitron text-2xl font-bold text-white">{value}</p>
    {trend && (
      <p className={`text-xs mt-1 ${positive ? 'text-[#00ff88]' : 'text-[#ff6b4a]'}`}>
        {trend}
      </p>
    )}
  </div>
);

// Main App
const App: React.FC = () => {
  const [handles, setHandles] = useState<XHandle[]>(initialHandles);
  const [detectedTickers, setDetectedTickers] = useState<DetectedTicker[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [totalPnL, setTotalPnL] = useState(0);
  const [newHandle, setNewHandle] = useState('');

  const addLog = useCallback((type: ActivityLog['type'], message: string) => {
    setActivityLog(prev => [{
      id: generateId(),
      type,
      message,
      timestamp: new Date()
    }, ...prev].slice(0, 50));
  }, []);

  const toggleHandle = useCallback((id: string) => {
    setHandles(prev => prev.map(h =>
      h.id === id ? { ...h, active: !h.active } : h
    ));
  }, []);

  const addHandle = useCallback(() => {
    if (newHandle && newHandle.startsWith('@')) {
      const handle: XHandle = {
        id: generateId(),
        handle: newHandle,
        name: newHandle.slice(1),
        followers: `${randomInRange(10, 500)}K`,
        active: true
      };
      setHandles(prev => [...prev, handle]);
      addLog('system', `Added new handle: ${newHandle}`);
      setNewHandle('');
    }
  }, [newHandle, addLog]);

  const executeTrade = useCallback((ticker: DetectedTicker) => {
    const action = ticker.confidence >= 70 ? 'BUY' : 'SELL';
    const price = randomInRange(100, 50000);
    const amount = randomInRange(1, 100) / 100;
    const pnl = (Math.random() - 0.3) * 20;
    
    const trade: Trade = {
      id: generateId(),
      symbol: ticker.symbol,
      action,
      amount,
      price,
      timestamp: new Date(),
      pnl
    };
    
    setTrades(prev => [trade, ...prev].slice(0, 20));
    setTotalPnL(prev => prev + pnl);
    setDetectedTickers(prev => prev.map(t =>
      t.id === ticker.id ? { ...t, status: 'traded' as const } : t
    ));
    addLog('trade', `Executed ${action} for ${ticker.symbol} at $${price.toLocaleString()}`);
  }, [addLog]);

  // Simulate ticker detection
  useEffect(() => {
    if (!isScanning) return;
    
    const interval = setInterval(() => {
      const activeHandles = handles.filter(h => h.active);
      if (activeHandles.length === 0) return;
      
      const randomHandle = activeHandles[Math.floor(Math.random() * activeHandles.length)];
      const randomSymbol = cryptoSymbols[Math.floor(Math.random() * cryptoSymbols.length)];
      
      const newTicker: DetectedTicker = {
        id: generateId(),
        symbol: randomSymbol,
        handle: randomHandle.handle,
        timestamp: new Date(),
        confidence: 0,
        virality: 0,
        trend: 0,
        mentions: 0,
        status: 'analyzing'
      };
      
      setDetectedTickers(prev => [newTicker, ...prev].slice(0, 10));
      addLog('detection', `Detected ${randomSymbol} mention from ${randomHandle.handle}`);
      
      // Simulate analysis
      setTimeout(() => {
        const virality = randomInRange(30, 100);
        const trend = randomInRange(20, 100);
        const mentions = randomInRange(10, 100);
        const confidence = Math.round((virality * 0.35 + trend * 0.35 + mentions * 0.3));
        const action: 'BUY' | 'SELL' | 'HOLD' = confidence >= 70 ? 'BUY' : confidence >= 40 ? 'HOLD' : 'SELL';
        
        setDetectedTickers(prev => prev.map(t =>
          t.id === newTicker.id
            ? { ...t, virality, trend, mentions, confidence, status: 'ready' as const, action }
            : t
        ));
        addLog('analysis', `Analysis complete for ${randomSymbol}: ${confidence}% confidence → ${action}`);
      }, 2000);
      
    }, randomInRange(5000, 10000));
    
    return () => clearInterval(interval);
  }, [isScanning, handles, addLog]);

  // Auto-trade high confidence tickers
  useEffect(() => {
    const autoTrade = detectedTickers.find(
      t => t.status === 'ready' && t.confidence >= 85
    );
    
    if (autoTrade) {
      setTimeout(() => executeTrade(autoTrade), 1000);
    }
  }, [detectedTickers, executeTrade]);

  const activeHandleCount = handles.filter(h => h.active).length;
  const todayTrades = trades.length;
  const winRate = trades.length > 0
    ? Math.round((trades.filter(t => (t.pnl || 0) > 0).length / trades.length) * 100)
    : 0;

  return (
    <div className="min-h-screen text-white relative">
      <NeuralBackground />
      <ScanLine />
      
      {/* Header */}
      <header className="relative z-10 border-b border-[#00f5ff]/20 bg-[#0a0a0f]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00f5ff] to-[#ff6b4a] flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#00ff88] status-dot" />
              </div>
              <div>
                <h1 className="font-orbitron text-xl font-bold tracking-wider">
                  <span className="text-[#00f5ff] glow-cyan">CRYPTO</span>
                  <span className="text-[#ff6b4a] glow-coral">SENTINEL</span>
                </h1>
                <p className="text-xs text-[#5a5a70]">AI-Powered Trading Intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsScanning(!isScanning)}
                className={`btn-cyber px-4 py-2 rounded-lg font-orbitron text-sm font-bold transition-all ${
                  isScanning
                    ? 'bg-[#00ff88]/20 border border-[#00ff88]/50 text-[#00ff88] box-glow-cyan'
                    : 'bg-[#ff6b4a]/20 border border-[#ff6b4a]/50 text-[#ff6b4a]'
                }`}
              >
                {isScanning ? '● SCANNING' : '○ PAUSED'}
              </button>
            </div>
          </div>
        </div>
        
        <TickerTape tickers={cryptoSymbols} />
      </header>

      {/* Stats Bar */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fade-in">
          <StatsCard
            label="Active Handles"
            value={activeHandleCount.toString()}
            trend={`${handles.length} total`}
            positive
          />
          <StatsCard
            label="Today's Trades"
            value={todayTrades.toString()}
            trend={winRate > 50 ? `${winRate}% win rate` : `${winRate}% win rate`}
            positive={winRate > 50}
          />
          <StatsCard
            label="Total P&L"
            value={`${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}%`}
            trend={totalPnL >= 0 ? 'Profitable' : 'In drawdown'}
            positive={totalPnL >= 0}
          />
          <StatsCard
            label="Signals Detected"
            value={detectedTickers.length.toString()}
            trend="Last 24h"
            positive
          />
        </div>
      </div>

      {/* Main Grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Handles */}
          <div className="lg:col-span-3 space-y-6">
            <Panel title="X Handles" icon="📡" className="fade-in stagger-1">
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {handles.map(handle => (
                  <HandleCard
                    key={handle.id}
                    handle={handle}
                    onToggle={toggleHandle}
                  />
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="@handle"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addHandle()}
                  className="flex-1 px-3 py-2 bg-[#1a1a25] border border-[#5a5a70]/30 rounded text-sm focus:outline-none focus:border-[#00f5ff]/50"
                />
                <button
                  onClick={addHandle}
                  className="px-3 py-2 bg-[#00f5ff]/20 border border-[#00f5ff]/50 text-[#00f5ff] rounded text-sm font-bold hover:bg-[#00f5ff]/30 transition-all"
                >
                  +
                </button>
              </div>
            </Panel>
            
            <Panel title="Activity Log" icon="📋" className="fade-in stagger-2">
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {activityLog.length === 0 ? (
                  <p className="text-xs text-[#5a5a70] text-center py-4">No activity yet...</p>
                ) : (
                  activityLog.map(log => (
                    <ActivityLogItem key={log.id} log={log} />
                  ))
                )}
              </div>
            </Panel>
          </div>
          
          {/* Center Column - Detections */}
          <div className="lg:col-span-5">
            <Panel title="Live Detections" icon="🎯" className="fade-in stagger-3">
              <div className="space-y-4 max-h-[700px] overflow-y-auto">
                {detectedTickers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-[#5a5a70]">Scanning for ticker mentions...</p>
                    <p className="text-xs text-[#5a5a70]/60 mt-2">Detections will appear here</p>
                  </div>
                ) : (
                  detectedTickers.map(ticker => (
                    <DetectionCard
                      key={ticker.id}
                      ticker={ticker}
                      onTrade={executeTrade}
                    />
                  ))
                )}
              </div>
            </Panel>
          </div>
          
          {/* Right Column - Trades */}
          <div className="lg:col-span-4 space-y-6">
            <Panel title="Trade History" icon="💰" className="fade-in stagger-4">
              <div className="max-h-[350px] overflow-y-auto">
                {trades.length === 0 ? (
                  <p className="text-xs text-[#5a5a70] text-center py-8">No trades executed yet</p>
                ) : (
                  trades.map(trade => (
                    <TradeRow key={trade.id} trade={trade} />
                  ))
                )}
              </div>
            </Panel>
            
            <Panel title="Auto-Trade Settings" icon="⚙️" className="fade-in stagger-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#5a5a70]">Auto-execute trades</span>
                  <div className="w-10 h-5 rounded-full p-0.5 bg-[#00f5ff] cursor-pointer">
                    <div className="w-4 h-4 rounded-full bg-white translate-x-5" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#5a5a70]">Min. confidence</span>
                  <span className="font-orbitron text-[#00f5ff]">85%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#5a5a70]">Max position size</span>
                  <span className="font-orbitron text-[#00f5ff]">$1,000</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#5a5a70]">Stop loss</span>
                  <span className="font-orbitron text-[#ff6b4a]">-5%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#5a5a70]">Take profit</span>
                  <span className="font-orbitron text-[#00ff88]">+15%</span>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#00f5ff]/10 bg-[#0a0a0f]/80 backdrop-blur-sm py-4">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[11px] text-[#5a5a70]/60 tracking-wide">
            Requested by <span className="text-[#5a5a70]/80">@AlexandraLiam3</span> · Built by <span className="text-[#5a5a70]/80">@clonkbot</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;