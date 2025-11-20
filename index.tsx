
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Shield, Lock, Mail, Eye, EyeOff, Cpu, ArrowRight, AlertTriangle, 
  CheckCircle2, Terminal, User, Activity, LayoutDashboard, Server, 
  Database, Settings, LogOut, Bell, Search, Wifi, HardDrive, Battery,
  Globe, Power, RefreshCw, Filter, MoreHorizontal, PlayCircle, StopCircle
} from 'lucide-react';

// --- Types ---
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR';
  avatar?: string;
}

interface Device {
  id: string;
  name: string;
  ip: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'MAINTENANCE';
  cpu_load: number;
  temp: number;
  uptime: string;
}

type ViewState = 'AUTH' | 'DASHBOARD';
type NavItem = 'OVERVIEW' | 'DEVICES' | 'LOGS' | 'SETTINGS';

// --- Configuration ---
const API_URL = 'http://localhost:5000/api';

// --- Backend Adapter Pattern ---

interface BackendService {
  login: (email: string, password: string) => Promise<{token: string, user: UserProfile}>;
  register: (email: string, password: string, fullName: string) => Promise<{token: string, user: UserProfile}>;
  fetchSystemStats: () => Promise<any>;
  fetchLogs: () => Promise<any[]>;
  fetchDevices: () => Promise<Device[]>;
}

// 1. Mock Adapter (Simulation)
const MockAdapter: BackendService = {
  login: async (email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email.includes('@') && password.length >= 8) {
          resolve({
            token: 'mock-jwt-token-' + Math.random().toString(36),
            user: {
              id: 'usr_' + Math.random().toString(36).substr(2, 9),
              name: email.split('@')[0].toUpperCase(),
              email: email,
              role: email.includes('admin') ? 'ADMIN' : 'OPERATOR'
            }
          });
        } else {
          reject(new Error('INVALID CREDENTIALS'));
        }
      }, 1000);
    });
  },
  register: async (email, password, fullName) => {
     return new Promise((resolve) => {
        setTimeout(() => {
           resolve({
            token: 'mock-jwt-token-' + Math.random().toString(36),
             user: {
               id: 'usr_' + Math.random().toString(36).substr(2, 9),
               name: fullName.toUpperCase(),
               email: email,
               role: 'OPERATOR'
             }
           })
        }, 1500);
     })
  },
  fetchSystemStats: async () => {
    return {
      cpu: 42 + Math.floor(Math.random() * 15),
      memory: 64 + Math.floor(Math.random() * 10),
      network: 120 + Math.floor(Math.random() * 50),
      activeNodes: 24
    };
  },
  fetchLogs: async () => [
    { id: 1, time: '10:42:05', level: 'INFO', message: 'System startup sequence initiated.', source: 'KERNEL' },
    { id: 2, time: '10:42:08', level: 'SUCCESS', message: 'Database connection established (MySQL).', source: 'DB_SHARD_01' },
    { id: 3, time: '10:45:12', level: 'WARN', message: 'High latency detected on Node-04.', source: 'NET_WATCH' },
    { id: 4, time: '10:48:30', level: 'ERROR', message: 'Auth handshake failed: IP 192.168.1.44', source: 'SEC_GATE' },
    { id: 5, time: '10:50:01', level: 'INFO', message: 'Routine maintenance task scheduled.', source: 'SCHEDULER' },
    { id: 6, time: '10:51:15', level: 'INFO', message: 'API Gateway health check passed.', source: 'API_GW' },
    { id: 7, time: '10:52:20', level: 'WARN', message: 'Memory usage spike detected in container #442.', source: 'DOCKER' },
  ],
  fetchDevices: async () => [
    { id: 'DEV-001', name: 'Main Server Alpha', ip: '192.168.1.10', status: 'ONLINE', cpu_load: 45, temp: 62, uptime: '14d 2h' },
    { id: 'DEV-002', name: 'Backup Node B', ip: '192.168.1.11', status: 'ONLINE', cpu_load: 12, temp: 45, uptime: '4d 12h' },
    { id: 'DEV-003', name: 'Edge Gateway', ip: '192.168.1.20', status: 'ERROR', cpu_load: 98, temp: 85, uptime: '0d 4h' },
    { id: 'DEV-004', name: 'Analytics Engine', ip: '192.168.1.25', status: 'MAINTENANCE', cpu_load: 0, temp: 20, uptime: '0d 0h' },
    { id: 'DEV-005', name: 'Storage Cluster', ip: '192.168.1.30', status: 'ONLINE', cpu_load: 56, temp: 58, uptime: '45d 1h' },
  ]
};

// 2. Live Adapter (Real Server)
const LiveAdapter: BackendService = {
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Login Failed');
    return res.json();
  },
  register: async (email, password, fullName) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName })
    });
    if (!res.ok) throw new Error('Registration Failed');
    return res.json();
  },
  fetchSystemStats: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/system/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Stats fetch failed');
    return res.json();
  },
  fetchLogs: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/system/logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Logs fetch failed');
    return res.json();
  },
  fetchDevices: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/devices`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Devices fetch failed');
    return res.json();
  }
};

// --- Data Provider ---
const getBackend = (): BackendService => {
  const useLive = localStorage.getItem('use_live_backend') === 'true';
  return useLive ? LiveAdapter : MockAdapter;
};

// --- Shared Components ---

const Background = () => (
  <div className="fixed inset-0 z-0 pointer-events-none bg-cyber-bg">
    <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-[0.05]" />
    <div className="absolute inset-0 bg-cyber-gradient" />
    <div className="absolute inset-0 overflow-hidden opacity-10">
      <div className="w-full h-[2px] bg-cyber-primary shadow-[0_0_10px_#00f0ff] animate-scanline blur-[1px]" />
    </div>
  </div>
);

const Logo = ({ condensed = false }: { condensed?: boolean }) => (
  <div className={`flex items-center gap-3 select-none group ${condensed ? 'scale-90 origin-left' : ''}`}>
    <div className="relative flex items-center justify-center w-10 h-10 bg-cyber-primaryDim border border-cyber-primary/30 rounded clip-hex group-hover:border-cyber-primary/80 transition-colors duration-300">
      <Cpu className="w-5 h-5 text-cyber-primary" />
    </div>
    <div className="flex flex-col justify-center">
      <h1 className={`font-display font-bold tracking-wider text-cyber-text glow-text leading-none ${condensed ? 'text-xl' : 'text-2xl'}`}>
        AIMaintain<span className="text-cyber-primary">+</span>
      </h1>
    </div>
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  isLoading = false, 
  variant = 'primary',
  type = 'button',
  className = ''
}: { 
  children?: React.ReactNode; 
  onClick?: () => void; 
  isLoading?: boolean; 
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit';
  className?: string;
}) => {
  const baseStyles = "relative py-2.5 px-4 font-display text-xs font-bold tracking-wider uppercase clip-hex transition-all duration-200 flex items-center justify-center gap-2 group overflow-hidden select-none";
  
  const variants = {
    primary: "bg-cyber-primary/5 border border-cyber-primary text-cyber-primary hover:bg-cyber-primary hover:text-black hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]",
    secondary: "bg-transparent border border-cyber-muted text-cyber-muted hover:border-cyber-text hover:text-cyber-text",
    danger: "bg-cyber-alert/5 border border-cyber-alert text-cyber-alert hover:bg-cyber-alert hover:text-white hover:shadow-[0_0_20px_rgba(255,0,60,0.4)]"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading}
      className={`${baseStyles} ${variants[variant]} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
    >
      {isLoading ? (
        <>
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="animate-pulse">PROCESSING</span>
        </>
      ) : children}
    </button>
  );
};

// --- Auth Components ---

const InputField = ({ 
  label, type, placeholder, icon: Icon, value, onChange, error, id, showPasswordToggle = false
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="mb-5 group">
      <label htmlFor={id} className={`block text-[10px] font-mono tracking-wider mb-1.5 transition-colors ${isFocused || value ? 'text-cyber-primary' : 'text-cyber-muted'}`}>
        {label}
      </label>
      <div className="relative">
        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${isFocused ? 'text-cyber-primary' : 'text-cyber-muted'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full bg-cyber-card border rounded-sm py-3 pl-10 pr-10 text-sm text-cyber-text placeholder-slate-700 font-mono focus:outline-none focus:ring-1 transition-all duration-300 clip-hex ${error ? 'border-cyber-alert/60 focus:border-cyber-alert' : 'border-cyber-border focus:border-cyber-primary'}`}
          placeholder={placeholder}
        />
        {showPasswordToggle && (
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-cyber-muted hover:text-cyber-text">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-cyber-alert font-mono animate-pulse"><AlertTriangle className="w-3 h-3" /><span>{error}</span></div>}
    </div>
  );
};

const PasswordStrengthMeter = ({ password }: { password: string }) => {
  if (!password) return null;
  const checks = [password.length >= 8, /\d/.test(password), /[!@#$%^&*(),.?":{}|<>]/.test(password)];
  const strength = checks.filter(Boolean).length;
  
  const getColor = (index: number) => {
    if (strength === 1) return 'bg-cyber-alert';
    if (strength === 2) return 'bg-yellow-500';
    if (strength === 3) return 'bg-cyber-success';
    return 'bg-cyber-border';
  };

  return (
    <div className="mb-5 -mt-3 px-1">
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-[9px] font-mono text-cyber-muted tracking-widest">SECURITY LEVEL</span>
      </div>
      <div className="flex gap-1 h-0.5">
        {[0, 1, 2].map((index) => (
          <div key={index} className={`flex-1 transition-all duration-500 ${index < strength ? getColor(index) : 'bg-cyber-border/30'}`} />
        ))}
      </div>
    </div>
  );
};

const AuthScreen = ({ onLoginSuccess }: { onLoginSuccess: (user: UserProfile) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success' | null, message: string }>({ type: null, message: '' });
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [usingLive, setUsingLive] = useState(localStorage.getItem('use_live_backend') === 'true');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    if (errors[e.target.id]) setErrors(prev => ({ ...prev, [e.target.id]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setStatus({ type: null, message: '' });
    
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = "REQUIRED";
    if (isLogin && !formData.password) newErrors.password = "REQUIRED";
    if (!isLogin) {
      if (!formData.fullName) newErrors.fullName = "REQUIRED";
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "MISMATCH";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const api = getBackend();
      let response;
      if (isLogin) {
        response = await api.login(formData.email, formData.password);
      } else {
        response = await api.register(formData.email, formData.password, formData.fullName);
      }
      
      setStatus({ type: 'success', message: 'AUTHENTICATION SUCCESSFUL' });
      localStorage.setItem('token', response.token);
      setTimeout(() => onLoginSuccess(response.user), 800);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'CONNECTION FAILED' });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative">
      {/* Environment Indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-black/40 border border-cyber-border rounded-full">
         <div className={`w-2 h-2 rounded-full ${usingLive ? 'bg-cyber-success' : 'bg-yellow-500'} animate-pulse`} />
         <span className="text-[10px] font-mono text-cyber-muted">
            {usingLive ? 'LIVE SERVER' : 'SIMULATION MODE'}
         </span>
      </div>

      <div className="w-full max-w-[420px] z-10 perspective-[1000px]">
        <div className="bg-cyber-card/90 backdrop-blur-xl border border-cyber-border p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative overflow-hidden clip-hex">
          <div className="flex flex-col items-center relative z-10">
            <Logo />
            <div className="w-full mb-8 mt-6 flex bg-black/40 p-1.5 rounded clip-hex border border-cyber-border/50">
              <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 text-[10px] font-display font-bold tracking-widest transition-all rounded-sm clip-hex ${isLogin ? 'bg-cyber-primary text-black' : 'text-cyber-muted hover:text-white'}`}>LOGIN</button>
              <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 text-[10px] font-display font-bold tracking-widest transition-all rounded-sm clip-hex ${!isLogin ? 'bg-cyber-primary text-black' : 'text-cyber-muted hover:text-white'}`}>SIGN UP</button>
            </div>
          </div>

          {status.type && (
            <div className={`mb-6 p-3 border rounded-sm clip-hex flex items-center gap-3 ${status.type === 'error' ? 'bg-cyber-alert/10 border-cyber-alert/40 text-cyber-alert' : 'bg-cyber-success/10 border-cyber-success/40 text-cyber-success'}`}>
              {status.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span className="text-xs font-mono">{status.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-1 relative z-10">
            {!isLogin && <InputField id="fullName" type="text" label="OPERATOR ID" placeholder="JANE DOE" icon={User} value={formData.fullName} onChange={handleInputChange} error={errors.fullName} />}
            <InputField id="email" type="email" label="EMAIL ACCESS" placeholder="user@aimaintain.net" icon={Mail} value={formData.email} onChange={handleInputChange} error={errors.email} />
            <InputField id="password" type="password" label="PASSKEY" placeholder="••••••••" icon={Lock} showPasswordToggle value={formData.password} onChange={handleInputChange} error={errors.password} />
            {!isLogin && (
              <>
                <PasswordStrengthMeter password={formData.password} />
                <InputField id="confirmPassword" type="password" label="CONFIRM PASSKEY" placeholder="••••••••" icon={Shield} value={formData.confirmPassword} onChange={handleInputChange} error={errors.confirmPassword} />
              </>
            )}
            <div className="pt-4">
              <Button type="submit" isLoading={isLoading} className="w-full">{isLogin ? 'INITIALIZE LINK' : 'REGISTER UNIT'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Dashboard Panels ---

const StatCard = ({ label, value, unit, trend, status, icon: Icon }: any) => (
  <div className="bg-cyber-card/60 border border-cyber-border p-4 clip-hex relative overflow-hidden group hover:border-cyber-primary/50 transition-colors">
    <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
      <Icon className="w-8 h-8 text-cyber-primary" />
    </div>
    <div className="relative z-10">
      <div className="text-[10px] font-mono text-cyber-muted tracking-widest mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-display font-bold text-cyber-text">{value}</span>
        <span className="text-xs font-mono text-cyber-primary">{unit}</span>
      </div>
      <div className={`text-[10px] font-mono mt-2 flex items-center gap-1 ${status === 'good' ? 'text-cyber-success' : 'text-cyber-alert'}`}>
        <Activity className="w-3 h-3" />
        {trend}
      </div>
    </div>
    <div className="absolute bottom-0 left-0 h-0.5 bg-cyber-primary/20 w-full">
      <div className="h-full bg-cyber-primary shadow-[0_0_10px_#00f0ff] w-[70%] animate-pulse" />
    </div>
  </div>
);

const OverviewPanel = ({ stats, logs }: { stats: any, logs: any[] }) => (
  <div className="space-y-6">
    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="CPU LOAD" value={stats.cpu} unit="%" trend="+2.4%" status={stats.cpu > 80 ? 'bad' : 'good'} icon={Cpu} />
      <StatCard label="MEMORY USAGE" value={stats.memory} unit="%" trend="STABLE" status="good" icon={HardDrive} />
      <StatCard label="NETWORK I/O" value={stats.network} unit="MB/s" trend="+12.5%" status="good" icon={Wifi} />
      <StatCard label="ACTIVE NODES" value={stats.activeNodes} unit="/ 24" trend="ALL SYSTEMS GO" status="good" icon={Activity} />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
      {/* Live Terminal */}
      <div className="lg:col-span-2 bg-cyber-card/40 border border-cyber-border rounded-sm p-4 flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-display font-bold flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyber-primary" /> LIVE SYSTEM LOGS
          </h3>
          <span className="text-[9px] font-mono text-cyber-primary/70 animate-pulse">● REC</span>
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 pr-2 scrollbar-thin">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 p-2 hover:bg-white/5 rounded transition-colors border-l-2 border-transparent hover:border-cyber-primary">
              <span className="text-cyber-muted shrink-0">[{log.time}]</span>
              <span className={`shrink-0 w-16 font-bold ${log.level === 'ERROR' ? 'text-cyber-alert' : log.level === 'WARN' ? 'text-yellow-500' : 'text-cyber-success'}`}>
                {log.level}
              </span>
              <span className="text-cyber-text/80 truncate">{log.message}</span>
              <span className="ml-auto text-cyber-muted/50 text-[9px]">{log.source}</span>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%] opacity-20" />
      </div>

      {/* Device Status Summary */}
      <div className="bg-cyber-card/40 border border-cyber-border rounded-sm p-4 flex flex-col">
        <h3 className="text-xs font-display font-bold flex items-center gap-2 mb-4">
            <Server className="w-4 h-4 text-cyber-secondary" /> NODE HEALTH
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center justify-between p-3 bg-black/20 border border-cyber-border/50 rounded-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${i === 2 ? 'bg-cyber-alert' : 'bg-cyber-success'} shadow-[0_0_5px_currentColor]`} />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">SRV-UNIT-0{i}</span>
                    <span className="text-[9px] font-mono text-cyber-muted">IP: 192.168.1.{10+i}</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono bg-white/5 px-2 py-1 rounded">
                  {i === 2 ? 'ERR' : 'OK'}
                </div>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="mt-4 w-full !py-2 !text-[10px]">RUN DIAGNOSTICS</Button>
      </div>
    </div>
  </div>
);

const DevicesPanel = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const backend = getBackend();
    backend.fetchDevices().then(setDevices).finally(() => setLoading(false));
  }, []);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ONLINE': return 'text-cyber-success';
      case 'ERROR': return 'text-cyber-alert';
      case 'MAINTENANCE': return 'text-yellow-500';
      default: return 'text-cyber-muted';
    }
  };

  return (
    <div className="bg-cyber-card/40 border border-cyber-border rounded-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-display font-bold flex items-center gap-2">
          <Server className="w-5 h-5 text-cyber-primary" /> FLEET MANAGEMENT
        </h3>
        <Button variant="primary">ADD NEW NODE</Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="animate-spin w-8 h-8 text-cyber-primary" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-cyber-border/50 text-[10px] font-mono text-cyber-muted tracking-widest">
                <th className="p-4">DEVICE ID</th>
                <th className="p-4">IP ADDRESS</th>
                <th className="p-4">STATUS</th>
                <th className="p-4">LOAD</th>
                <th className="p-4">TEMP</th>
                <th className="p-4">UPTIME</th>
                <th className="p-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-xs font-mono">
              {devices.map((device) => (
                <tr key={device.id} className="border-b border-cyber-border/30 hover:bg-white/5 transition-colors">
                  <td className="p-4 font-bold text-cyber-text">{device.name} <span className="text-cyber-muted text-[10px] block">{device.id}</span></td>
                  <td className="p-4 text-cyber-primary">{device.ip}</td>
                  <td className={`p-4 font-bold ${getStatusColor(device.status)}`}>{device.status}</td>
                  <td className="p-4">
                     <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div className={`h-full ${device.cpu_load > 80 ? 'bg-cyber-alert' : 'bg-cyber-success'}`} style={{ width: `${device.cpu_load}%` }} />
                     </div>
                     <span className="text-[9px] mt-1 block">{device.cpu_load}%</span>
                  </td>
                  <td className="p-4">{device.temp}°C</td>
                  <td className="p-4 text-cyber-muted">{device.uptime}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button title="Restart" className="p-1.5 hover:text-cyber-primary transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                      <button title="Stop" className="p-1.5 hover:text-cyber-alert transition-colors"><StopCircle className="w-3.5 h-3.5" /></button>
                      <button title="More" className="p-1.5 hover:text-white transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const LogsPanel = ({ logs }: { logs: any[] }) => {
  const [filter, setFilter] = useState('');
  
  const filteredLogs = logs.filter(l => 
    l.message.toLowerCase().includes(filter.toLowerCase()) || 
    l.source.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-cyber-card/40 border border-cyber-border rounded-sm p-6 h-[calc(100vh-180px)] flex flex-col">
       <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-display font-bold flex items-center gap-2">
          <Database className="w-5 h-5 text-cyber-primary" /> SYSTEM ARCHIVE
        </h3>
        <div className="flex gap-3">
           <div className="relative">
             <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-cyber-muted" />
             <input 
                type="text" 
                placeholder="FILTER LOGS..." 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-black/30 border border-cyber-border rounded-sm py-1.5 pl-9 pr-4 text-xs font-mono focus:border-cyber-primary focus:outline-none"
             />
           </div>
           <Button variant="secondary" className="!py-1.5"><Filter className="w-3 h-3" /> FILTER</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 pr-2 bg-black/20 p-4 rounded-sm border border-cyber-border/30">
        {filteredLogs.map((log) => (
            <div key={log.id} className="grid grid-cols-12 gap-4 p-2 border-b border-cyber-border/10 hover:bg-white/5 transition-colors items-center">
              <span className="col-span-2 text-cyber-muted opacity-70">{log.time}</span>
              <span className={`col-span-1 font-bold ${log.level === 'ERROR' ? 'bg-cyber-alert/20 text-cyber-alert px-1 rounded text-center' : log.level === 'WARN' ? 'text-yellow-500' : 'text-cyber-success'}`}>
                {log.level}
              </span>
              <span className="col-span-2 text-cyber-secondary">{log.source}</span>
              <span className="col-span-7 text-cyber-text">{log.message}</span>
            </div>
        ))}
      </div>
    </div>
  );
};

const SettingsPanel = ({ onLogout }: { onLogout: () => void }) => {
  const [useLive, setUseLive] = useState(localStorage.getItem('use_live_backend') === 'true');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed' | 'idle'>('idle');

  const toggleBackend = () => {
    const newValue = !useLive;
    setUseLive(newValue);
    localStorage.setItem('use_live_backend', String(newValue));
    window.location.reload(); // Reload to reset backend instance
  };

  const testConnection = async () => {
    if (!useLive) return;
    setConnectionStatus('checking');
    try {
      // Simple health check (using stats as proxy)
      const res = await fetch(`${API_URL}/system/stats`, { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
      });
      if(res.ok) setConnectionStatus('connected');
      else throw new Error();
    } catch {
      setConnectionStatus('failed');
    }
  };

  useEffect(() => {
    if (useLive) testConnection();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-cyber-card/40 border border-cyber-border p-6 rounded-sm">
        <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyber-primary" /> NETWORK CONFIGURATION
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-black/20 border border-cyber-border/50 rounded-sm">
            <div className="flex flex-col">
               <span className="text-sm font-bold text-cyber-text">DATA SOURCE MODE</span>
               <span className="text-[10px] font-mono text-cyber-muted">SWITCH BETWEEN SIMULATION AND LIVE FLASK SERVER</span>
            </div>
            <button 
               onClick={toggleBackend}
               className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${useLive ? 'bg-cyber-success/20 border border-cyber-success' : 'bg-cyber-border border border-cyber-muted'}`}
            >
              <div className={`absolute top-1 left-1 w-3.5 h-3.5 rounded-full transition-transform duration-300 ${useLive ? 'translate-x-6 bg-cyber-success shadow-[0_0_8px_#10b981]' : 'bg-cyber-muted'}`} />
            </button>
          </div>

          {useLive && (
             <div className="p-4 bg-black/20 border border-cyber-border/50 rounded-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono text-cyber-muted">SERVER ENDPOINT</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-cyber-success' : connectionStatus === 'failed' ? 'bg-cyber-alert' : 'bg-yellow-500'}`} />
                    <span className="text-[10px] font-mono uppercase">{connectionStatus}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                   <div className="flex-1 bg-cyber-bg border border-cyber-border px-3 py-2 text-xs font-mono text-cyber-primary">
                      {API_URL}
                   </div>
                   <button onClick={testConnection} className="p-2 border border-cyber-border hover:border-cyber-primary text-cyber-primary transition-colors">
                      <RefreshCw className={`w-4 h-4 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
                   </button>
                </div>
             </div>
          )}
        </div>
      </div>

      <div className="bg-cyber-card/40 border border-cyber-border p-6 rounded-sm">
         <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2 text-cyber-alert">
          <Power className="w-5 h-5" /> DANGER ZONE
        </h3>
        <Button variant="danger" onClick={onLogout} className="w-full">TERMINATE SESSION & LOGOUT</Button>
      </div>
    </div>
  );
};

const DashboardScreen = ({ user, onLogout }: { user: UserProfile, onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<NavItem>('OVERVIEW');
  const [stats, setStats] = useState({ cpu: 0, memory: 0, network: 0, activeNodes: 0 });
  const [logs, setLogs] = useState<any[]>([]);
  const backend = useRef(getBackend());

  // Data Polling
  useEffect(() => {
    const fetchData = async () => {
       try {
         const s = await backend.current.fetchSystemStats();
         setStats(s);
         const l = await backend.current.fetchLogs();
         setLogs(l);
       } catch (e) {
         console.error("Sync failed", e);
       }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-cyber-bg text-cyber-text font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-cyber-border bg-cyber-card/50 flex flex-col backdrop-blur-sm z-20 hidden md:flex">
        <div className="p-6 border-b border-cyber-border/50">
          <Logo condensed />
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'OVERVIEW', icon: LayoutDashboard, label: 'COMMAND CENTER' },
            { id: 'DEVICES', icon: Server, label: 'DEVICE FLEET' },
            { id: 'LOGS', icon: Database, label: 'SYSTEM LOGS' },
            { id: 'SETTINGS', icon: Settings, label: 'CONFIGURATION' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavItem)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm clip-hex transition-all duration-200 group ${
                activeTab === item.id 
                  ? 'bg-cyber-primary/10 border border-cyber-primary/40 text-cyber-primary' 
                  : 'border border-transparent text-cyber-muted hover:text-cyber-text hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'animate-pulse' : ''}`} />
              <span className="text-[10px] font-display font-bold tracking-widest">{item.label}</span>
              {activeTab === item.id && <div className="ml-auto w-1.5 h-1.5 bg-cyber-primary rounded-full shadow-[0_0_5px_#00f0ff]" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-cyber-border/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 bg-cyber-secondary/20 rounded-full flex items-center justify-center border border-cyber-secondary">
              <User className="w-4 h-4 text-cyber-secondary" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold truncate">{user.name}</span>
              <span className="text-[9px] font-mono text-cyber-muted">{user.role} ACCESS</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-cyber-border bg-cyber-card/30 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
             <div className="md:hidden"><Logo condensed /></div>
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-cyber-bg border border-cyber-border rounded-full">
                <div className="w-2 h-2 bg-cyber-success rounded-full animate-pulse" />
                <span className="text-[10px] font-mono text-cyber-success tracking-wider">SYSTEM ONLINE</span>
             </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="SEARCH PROTOCOLS..." 
                className="bg-cyber-bg border border-cyber-border rounded-full py-1.5 pl-9 pr-4 text-xs font-mono focus:border-cyber-primary focus:outline-none w-48 transition-all focus:w-64"
              />
              <Search className="absolute left-3 top-1.5 w-3.5 h-3.5 text-cyber-muted" />
            </div>
            <button className="relative p-2 text-cyber-muted hover:text-cyber-primary transition-colors">
              <Bell className="w-5 h-5" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyber-alert rounded-full border border-black" />
            </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          <div className="max-w-6xl mx-auto">
             {/* Dynamic View Rendering */}
             {(() => {
                switch (activeTab) {
                   case 'OVERVIEW': return <OverviewPanel stats={stats} logs={logs} />;
                   case 'DEVICES': return <DevicesPanel />;
                   case 'LOGS': return <LogsPanel logs={logs} />;
                   case 'SETTINGS': return <SettingsPanel onLogout={onLogout} />;
                   default: return <OverviewPanel stats={stats} logs={logs} />;
                }
             })()}
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Main App Controller ---

const App = () => {
  const [view, setView] = useState<ViewState>('AUTH');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('token');
    if (token) {
      // In a real app, you would validate the token here.
      // For simulation, we assume it's valid if present.
      setTimeout(() => {
        // Mock User Reconstruction
        setUser({ 
           id: 'usr_restored', 
           name: 'OPERATOR', 
           email: 'session@restored', 
           role: 'OPERATOR' 
        });
        setView('DASHBOARD');
        setIsInitializing(false);
      }, 800);
    } else {
      setIsInitializing(false);
    }
  }, []);

  const handleLoginSuccess = (userData: UserProfile) => {
    setUser(userData);
    setView('DASHBOARD');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setView('AUTH');
  };

  if (isInitializing) {
    return (
       <div className="min-h-screen w-full bg-cyber-bg flex flex-col items-center justify-center relative overflow-hidden">
          <Background />
          <div className="relative z-10 flex flex-col items-center">
            <Cpu className="w-12 h-12 text-cyber-primary animate-pulse mb-4" />
            <div className="w-48 h-1 bg-cyber-border rounded-full overflow-hidden">
              <div className="h-full bg-cyber-primary animate-[loading_1s_ease-in-out_infinite]" />
            </div>
            <span className="mt-3 text-[10px] font-mono text-cyber-primary tracking-widest">INITIALIZING SYSTEM...</span>
          </div>
       </div>
    );
  }

  return (
    <>
      <Background />
      {view === 'AUTH' ? (
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        user && <DashboardScreen user={user} onLogout={handleLogout} />
      )}
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
