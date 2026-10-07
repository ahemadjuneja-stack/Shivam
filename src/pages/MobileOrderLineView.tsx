import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Smartphone, 
  Monitor,
  ShoppingBag
} from 'lucide-react';
import { OrderTimeline } from '../components/OrderTimeline';
import { useAppStore } from '../store';
import { formatOrderTime12Hour } from '../utils';

export const MobileOrderLineView: React.FC = () => {
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const [deviceFrame, setDeviceFrame] = useState(true);

  const currentTime = formatOrderTime12Hour(Date.now());

  return (
    <div className="w-full min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-start py-4 px-2 sm:px-6">
      
      {/* Top Controls Bar */}
      <div className="w-full max-w-5xl mb-4 flex items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 transition"
          >
            <ArrowLeft size={14} />
            <span>Admin Dashboard</span>
          </Link>
          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-black tracking-wider uppercase text-slate-200">
              Mobile APK Order Line View
            </span>
          </div>
        </div>

        {/* Right Switchers: Toggle Device Frame & Link to Showroom */}
        <div className="flex items-center gap-2">
          <Link
            to="/app"
            className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl transition"
          >
            <ShoppingBag size={14} />
            <span>Showroom App</span>
          </Link>
          
          <button
            type="button"
            onClick={() => setDeviceFrame(!deviceFrame)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
              deviceFrame 
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {deviceFrame ? <Smartphone size={14} /> : <Monitor size={14} />}
            <span className="hidden sm:inline">{deviceFrame ? 'Mobile Device Frame' : 'Full Screen'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Device Frame or Full Screen */}
      <div className={`w-full flex justify-center transition-all ${deviceFrame ? 'max-w-[420px]' : 'max-w-4xl'}`}>
        
        {deviceFrame ? (
          /* Android Mobile Phone Shell */
          <div className="w-full h-[840px] bg-black rounded-[48px] p-3 shadow-2xl ring-1 ring-slate-800/80 flex flex-col border-4 border-slate-800 overflow-hidden relative">
            
            {/* Top Speaker / Ear Piece */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-slate-800 rounded-full z-40" />

            {/* Android Screen Display */}
            <div className="w-full h-full bg-[#040812] rounded-[38px] flex flex-col overflow-hidden relative border border-slate-900">
              
              {/* ANDROID TOP STATUS BAR */}
              <div className="h-7 bg-slate-950 px-5 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-white/5 flex-shrink-0 z-30">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-200">{currentTime}</span>
                  <span className="text-[9px] text-amber-400 font-bold tracking-wider">APK</span>
                </div>

                {/* Front Camera Punch-hole indicator */}
                <div className="w-3 h-3 rounded-full bg-black border border-slate-800 shadow-inner flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-slate-800" />
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-[10px] font-black text-amber-400">5G</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold">92%</span>
                    <div className="w-3.5 h-2 rounded-[2px] border border-slate-400 p-[1px] flex">
                      <div className="h-full w-[85%] bg-emerald-400 rounded-[1px]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* APP HEADER */}
              <div className="bg-slate-900/90 border-b border-slate-800 px-3.5 py-2 flex items-center justify-between flex-shrink-0 z-20">
                <div className="flex items-center gap-2">
                  <img src="/icon.svg" alt="SHIVAM" className="w-6 h-6 rounded-lg shadow-sm" />
                  <div>
                    <h1 className="text-xs font-black tracking-wider text-white">SHIVAM ORDERS</h1>
                    <p className="text-[9px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></span>
                      LIVE FEED
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-amber-300 font-bold">
                    {currentCustomer ? currentCustomer.customerCode : 'APK-CLIENT'}
                  </span>
                </div>
              </div>

              {/* LIVE ORDER TIMELINE BODY */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <OrderTimeline mode="mobile" compact={false} />
              </div>

              {/* ANDROID BOTTOM GESTURE PILL BAR */}
              <div className="h-4 bg-slate-950 flex items-center justify-center flex-shrink-0 z-20">
                <div className="w-24 h-1 bg-slate-700 rounded-full" />
              </div>

            </div>
          </div>
        ) : (
          /* Full Screen Responsive Layout */
          <div className="w-full h-[780px] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <OrderTimeline mode="dashboard" />
          </div>
        )}

      </div>

    </div>
  );
};

export default MobileOrderLineView;
