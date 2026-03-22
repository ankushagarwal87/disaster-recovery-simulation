/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Cloud, 
  Database, 
  Server, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight, 
  Activity,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type DRStrategy = 'backup-restore' | 'pilot-light' | 'warm-standby' | 'active-active';

interface StrategyMetrics {
  rto: string; // Recovery Time Objective
  rpo: string; // Recovery Point Objective
  cost: number; // Relative cost (1-10)
  description: string;
  pros: string[];
  cons: string[];
}

const STRATEGIES: Record<DRStrategy, StrategyMetrics> = {
  'backup-restore': {
    rto: 'Hours',
    rpo: '24 Hours',
    cost: 1,
    description: 'Data is backed up and restored from off-site storage. Infrastructure is created only after a disaster.',
    pros: ['Lowest cost', 'Simple to implement'],
    cons: ['High RTO/RPO', 'Manual recovery steps'],
  },
  'pilot-light': {
    rto: 'Minutes',
    rpo: 'Minutes',
    cost: 3,
    description: 'Core data is replicated. Minimal infrastructure (database) is running. App servers are provisioned during recovery.',
    pros: ['Lower cost than standby', 'Faster recovery than backup'],
    cons: ['Requires automation for scaling', 'Some downtime during spin-up'],
  },
  'warm-standby': {
    rto: 'Seconds',
    rpo: 'Seconds',
    cost: 6,
    description: 'A scaled-down but functional version of the environment is always running in the secondary region.',
    pros: ['Very low RTO', 'Immediate failover capability'],
    cons: ['Higher cost', 'Requires constant maintenance of two environments'],
  },
  'active-active': {
    rto: 'Near Zero',
    rpo: 'Near Zero',
    cost: 10,
    description: 'Full capacity environments are running in multiple regions. Traffic is balanced across all regions.',
    pros: ['Zero downtime', 'Global performance', 'Automatic failover'],
    cons: ['Highest cost', 'Complex data synchronization', 'Operational overhead'],
  },
};

// --- Components ---

const TrafficFlow = ({ from, to, active, color = "bg-emerald-400" }: { from: string, to: string, active: boolean, color?: string }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
        >
          {/* This is a simplified representation of traffic hitting a region */}
          <motion.div
            animate={{ 
              y: [0, 100],
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-1 h-8 rounded-full blur-[1px]", color)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const MetricCard = ({ icon: Icon, label, value, subValue, colorClass }: any) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-4">
    <div className={cn("p-2 rounded-lg", colorClass)}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {subValue && <p className="text-xs text-zinc-500 mt-1">{subValue}</p>}
    </div>
  </div>
);

const RegionBox = ({ 
  name, 
  status, 
  isActive, 
  isPrimary, 
  strategy, 
  isDisaster,
  recoveryProgress
}: { 
  name: string; 
  status: 'healthy' | 'down' | 'standby' | 'provisioning'; 
  isActive: boolean;
  isPrimary: boolean;
  strategy: DRStrategy;
  isDisaster: boolean;
  recoveryProgress: number;
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
      case 'down': return 'text-rose-400 border-rose-500/30 bg-rose-500/5';
      case 'standby': return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
      case 'provisioning': return 'text-blue-400 border-blue-500/30 bg-blue-500/5 animate-pulse';
      default: return 'text-zinc-400 border-zinc-500/30 bg-zinc-500/5';
    }
  };

  const getServerCount = () => {
    if (isPrimary) return isDisaster ? 0 : 4;
    
    if (isDisaster) {
      if (recoveryProgress === 100) return 4;
      if (strategy === 'active-active') return 4;
      if (strategy === 'warm-standby') return 1 + Math.floor((recoveryProgress / 100) * 3);
      if (strategy === 'pilot-light') return Math.floor((recoveryProgress / 100) * 4);
      if (strategy === 'backup-restore') return Math.floor((recoveryProgress / 100) * 4);
      return 0;
    }

    if (strategy === 'active-active') return 4;
    if (strategy === 'warm-standby') return 1;
    if (strategy === 'pilot-light') return 0;
    return 0;
  };

  const serverCount = getServerCount();

  return (
    <div className={cn(
      "relative flex-1 border rounded-2xl p-6 transition-all duration-500",
      getStatusColor(),
      isActive ? "ring-2 ring-offset-4 ring-offset-zinc-950 ring-current" : "opacity-60"
    )}>
      {/* User Traffic Visualization */}
      <TrafficFlow from="user" to={name} active={isActive && status === 'healthy'} color={isPrimary ? "bg-emerald-400" : "bg-blue-400"} />

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          <h3 className="font-bold text-lg">{name}</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 border border-current/20 text-[10px] uppercase font-bold tracking-widest">
          {status === 'healthy' && <CheckCircle2 className="w-3 h-3" />}
          {status === 'down' && <XCircle className="w-3 h-3" />}
          {status}
        </div>
      </div>

      <div className="space-y-4">
        {/* Load Balancer */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-10 border border-current/20 rounded-lg flex items-center justify-center bg-black/10">
            <Activity className="w-4 h-4 mr-2" />
            <span className="text-xs font-mono">Load Balancer</span>
          </div>
          <div className="w-px h-4 bg-current/20" />
        </div>

        {/* App Servers */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={cn(
              "h-12 border border-current/20 rounded-lg flex flex-col items-center justify-center bg-black/10 transition-all duration-300",
              i > serverCount ? "opacity-5 grayscale border-dashed" : "opacity-100"
            )}>
              <Server className="w-3 h-3 mb-0.5" />
              <span className="text-[8px] font-mono">Srv-0{i}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <div className="w-px h-4 bg-current/20" />
        </div>

        {/* Database */}
        <div className={cn(
          "h-20 border border-current/20 rounded-lg flex flex-col items-center justify-center bg-black/10 relative overflow-hidden",
          (isPrimary && isDisaster) && "opacity-20 grayscale",
          (!isPrimary && strategy === 'backup-restore' && !isDisaster) && "opacity-5 grayscale border-dashed"
        )}>
          <Database className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-mono">RDS Cluster</span>
          {/* Replication Overlay */}
          {!isPrimary && strategy !== 'backup-restore' && (
            <div className="absolute inset-0 bg-current/5 flex items-center justify-center">
              <RefreshCw className={cn("w-3 h-3 animate-spin-slow opacity-40", status === 'down' && "hidden")} />
            </div>
          )}
        </div>
      </div>

      {isPrimary && isDisaster && (
        <div className="absolute inset-0 bg-rose-950/20 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
          <div className="bg-rose-500 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            REGION FAILURE
          </div>
        </div>
      )}
    </div>
  );
};


export default function App() {
  const [strategy, setStrategy] = useState<DRStrategy>('backup-restore');
  const [isDisaster, setIsDisaster] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [logs, setLogs] = useState<string[]>(["System initialized. Primary region active."]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const handleDisaster = () => {
    setIsDisaster(true);
    setIsRecovering(false);
    setRecoveryProgress(0);
    addLog("CRITICAL: Primary region (us-east-1) is DOWN.");

    // Automatic failover for high-availability strategies
    if (strategy === 'active-active') {
      setRecoveryProgress(100);
      addLog("Active-Active: Traffic automatically shifted to us-west-2.");
    } else if (strategy === 'warm-standby') {
      addLog("Warm Standby: Secondary region is functional. Scaling up to full capacity...");
      setIsRecovering(true);
    }
  };

  const handleRecover = () => {
    setIsRecovering(true);
    addLog(`Initiating recovery using ${STRATEGIES[strategy].rto} strategy...`);
  };

  useEffect(() => {
    if (isRecovering && recoveryProgress < 100) {
      const timer = setTimeout(() => {
        setRecoveryProgress(prev => Math.min(prev + 5, 100));
      }, strategy === 'active-active' ? 50 : strategy === 'warm-standby' ? 100 : strategy === 'pilot-light' ? 200 : 400);
      return () => clearTimeout(timer);
    } else if (recoveryProgress === 100) {
      setIsRecovering(false);
      addLog("Recovery complete. Secondary region is now PRIMARY.");
    }
  }, [isRecovering, recoveryProgress, strategy]);

  const secondaryStatus = useMemo(() => {
    if (isDisaster) {
      if (recoveryProgress === 100) return 'healthy';
      if (isRecovering) return 'provisioning';
      
      if (strategy === 'active-active') return 'healthy';
      if (strategy === 'warm-standby') return 'healthy'; // scaled down but healthy
      if (strategy === 'pilot-light') return 'standby';
      return 'down';
    }
    
    if (strategy === 'active-active') return 'healthy';
    if (strategy === 'warm-standby') return 'standby';
    if (strategy === 'pilot-light') return 'standby';
    return 'down';
  }, [isDisaster, recoveryProgress, isRecovering, strategy]);

  const primaryStatus = isDisaster ? 'down' : 'healthy';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-1.5 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-zinc-950" />
            </div>
            <h1 className="font-bold tracking-tight text-lg">AWS DR Simulator</h1>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
              {(Object.keys(STRATEGIES) as DRStrategy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStrategy(s);
                    setIsDisaster(false);
                    setRecoveryProgress(0);
                    setIsRecovering(false);
                    addLog(`Switched to ${s.replace('-', ' ')} strategy.`);
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                    strategy === s 
                      ? "bg-white/10 text-white shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {s.split('-').join(' ')}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Visualization */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Strategy Overview */}
            <section className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    {strategy.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    <Info className="w-4 h-4 text-zinc-500" />
                  </h2>
                  <p className="text-zinc-400 max-w-xl leading-relaxed">
                    {STRATEGIES[strategy].description}
                  </p>
                </div>
                <div className="flex gap-4">
                  {!isDisaster ? (
                    <button 
                      onClick={handleDisaster}
                      className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-rose-500/20"
                    >
                      <Zap className="w-4 h-4" />
                      SIMULATE DISASTER
                    </button>
                  ) : (
                    <button 
                      onClick={handleRecover}
                      disabled={isRecovering || recoveryProgress === 100}
                      className={cn(
                        "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg",
                        recoveryProgress === 100 
                          ? "bg-emerald-500 text-white cursor-default" 
                          : "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20"
                      )}
                    >
                      {recoveryProgress === 100 ? (
                        <><CheckCircle2 className="w-4 h-4" /> RECOVERED</>
                      ) : (
                        <><RefreshCw className={cn("w-4 h-4", isRecovering && "animate-spin")} /> {isRecovering ? 'RECOVERING...' : 'START RECOVERY'}</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Architecture Diagram */}
              <div className="relative flex flex-col md:flex-row gap-12 items-center justify-center py-10">
                <RegionBox 
                  name="us-east-1 (Primary)" 
                  status={primaryStatus} 
                  isActive={!isDisaster || (strategy === 'active-active' && recoveryProgress < 100)}
                  isPrimary={true}
                  strategy={strategy}
                  isDisaster={isDisaster}
                  recoveryProgress={recoveryProgress}
                />

                {/* Data Flow / Replication */}
                <div className="flex flex-col items-center gap-4">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-800 px-3 py-1 rounded-full border border-white/5">
                    {strategy === 'backup-restore' ? 'S3 Backup' : 'Replication'}
                  </div>
                  <div className="relative w-12 h-px bg-zinc-800">
                    <motion.div 
                      animate={{ x: [0, 48] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className={cn(
                        "absolute top-0 left-0 w-2 h-px bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
                        isDisaster && strategy !== 'active-active' && "hidden"
                      )}
                    />
                  </div>
                  <ArrowRight className={cn("w-5 h-5 text-zinc-700", !isDisaster && "text-emerald-500")} />
                </div>

                <RegionBox 
                  name="us-west-2 (Secondary)" 
                  status={secondaryStatus} 
                  isActive={isDisaster || strategy === 'active-active'}
                  isPrimary={false}
                  strategy={strategy}
                  isDisaster={false}
                  recoveryProgress={recoveryProgress}
                />
              </div>

              {/* Warm Standby vs Pilot Light Deep Dive */}
              {strategy === 'warm-standby' && (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-8 mt-8"
                >
                  <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Warm Standby vs. Pilot Light
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-bold text-white flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Warm Standby (This Strategy)
                      </h4>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        A scaled-down version of your fully functional environment is always running in the secondary region. 
                        Traffic can be shifted almost immediately.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">RTO</p>
                          <p className="text-sm font-bold text-emerald-400">Seconds</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Cost</p>
                          <p className="text-sm font-bold text-amber-400">Higher (6/10)</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-bold text-zinc-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-600" />
                        Pilot Light
                      </h4>
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        Only the critical data is replicated. Application servers are NOT running and must be provisioned 
                        from AMIs or code during recovery.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">RTO</p>
                          <p className="text-sm font-bold text-zinc-400">Minutes</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Cost</p>
                          <p className="text-sm font-bold text-emerald-400">Lower (3/10)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Recovery Progress Bar */}
              <AnimatePresence>
                {isRecovering && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-8 space-y-2"
                  >
                    <div className="flex justify-between text-xs font-mono text-zinc-400">
                      <span>Restoring Infrastructure...</span>
                      <span>{recoveryProgress}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${recoveryProgress}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Comparison Table */}
            <section className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h3 className="font-bold text-white">Strategy Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-black/20 text-zinc-500 uppercase text-[10px] tracking-widest">
                      <th className="px-6 py-4 font-bold">Strategy</th>
                      <th className="px-6 py-4 font-bold">RTO</th>
                      <th className="px-6 py-4 font-bold">RPO</th>
                      <th className="px-6 py-4 font-bold">Cost</th>
                      <th className="px-6 py-4 font-bold">Complexity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(Object.keys(STRATEGIES) as DRStrategy[]).map((s) => (
                      <tr key={s} className={cn(
                        "transition-colors",
                        strategy === s ? "bg-white/5" : "hover:bg-white/[0.02]"
                      )}>
                        <td className="px-6 py-4 font-bold text-zinc-200 capitalize">{s.replace('-', ' ')}</td>
                        <td className="px-6 py-4 text-zinc-400">{STRATEGIES[s].rto}</td>
                        <td className="px-6 py-4 text-zinc-400">{STRATEGIES[s].rpo}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className={cn(
                                "w-2 h-2 rounded-full",
                                i < Math.ceil(STRATEGIES[s].cost / 2) ? "bg-amber-500" : "bg-zinc-800"
                              )} />
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={cn(
                             "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                             s === 'active-active' ? "bg-rose-500/10 text-rose-400" : 
                             s === 'backup-restore' ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                           )}>
                             {s === 'active-active' ? 'High' : s === 'backup-restore' ? 'Low' : 'Medium'}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right Column: Metrics & Logs */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Live Metrics */}
            <div className="grid grid-cols-1 gap-4">
              <MetricCard 
                icon={Clock} 
                label="Target RTO" 
                value={STRATEGIES[strategy].rto} 
                subValue="Recovery Time Objective"
                colorClass="bg-blue-500"
              />
              <MetricCard 
                icon={Database} 
                label="Target RPO" 
                value={STRATEGIES[strategy].rpo} 
                subValue="Recovery Point Objective"
                colorClass="bg-emerald-500"
              />
              <MetricCard 
                icon={DollarSign} 
                label="Relative Cost" 
                value={`${STRATEGIES[strategy].cost}/10`} 
                subValue="Infrastructure & Ops"
                colorClass="bg-amber-500"
              />
            </div>

            {/* Pros & Cons */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Advantages</h4>
                <ul className="space-y-3">
                  {STRATEGIES[strategy].pros.map((pro, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-6 border-t border-white/5">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Trade-offs</h4>
                <ul className="space-y-3">
                  {STRATEGIES[strategy].cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* System Logs */}
            <div className="bg-black border border-white/5 rounded-3xl p-6 font-mono text-[11px]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-zinc-500 uppercase tracking-widest font-bold">System Logs</h4>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>
              <div className="space-y-2 h-40 overflow-y-auto scrollbar-hide">
                {logs.map((log, i) => (
                  <div key={i} className={cn(
                    "flex gap-2",
                    i === 0 ? "text-zinc-100" : "text-zinc-600"
                  )}>
                    <span className="text-zinc-700">[{new Date().toLocaleTimeString([], {hour12: false})}]</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 mt-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-zinc-500 text-sm">
            &copy; 2026 AWS Disaster Recovery Simulator. Built for experimentation.
          </p>
          <div className="flex items-center gap-6 text-zinc-500 text-sm">
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">AWS Well-Architected</a>
            <a href="#" className="hover:text-white transition-colors">CloudFormation Templates</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
