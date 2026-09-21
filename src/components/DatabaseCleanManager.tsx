import { useState } from 'react';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShoppingBag, 
  FileQuestion, 
  ShieldCheck,
  UploadCloud
} from 'lucide-react';
import { 
  scanDatabaseForOrphansAndStaleData, 
  executeDatabaseCleanup, 
  DatabaseScanResult 
} from '../firebase';
import { runBase64Migration } from '../services/migrateBase64ToStorage';
import { fixAllStorageCache } from '../services/fixStorageCache';
import { useAppStore } from '../store';

export function DatabaseCleanManager() {
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isFixingCache, setIsFixingCache] = useState(false);

  const handleFixStorageCache = async () => {
    setIsFixingCache(true);
    try {
      const count = await fixAllStorageCache();
      alert(`Fix Image Cache Complete!\nUpdated cacheControl metadata on ${count} files in Firebase Storage.`);
    } catch (err: any) {
      console.error('Fix image cache error:', err);
      alert(`Error fixing storage cache: ${err?.message || err}`);
    } finally {
      setIsFixingCache(false);
    }
  };
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [migrationSummary, setMigrationSummary] = useState<string | null>(null);

  const [scanResult, setScanResult] = useState<DatabaseScanResult | null>(null);
  const [cleanupSummary, setCleanupSummary] = useState<{
    cleanedOrders: number;
    cleanedCarts: number;
    cleanedPhotos: number;
  } | null>(null);

  const handleRunMigration = async () => {
    const confirmed = window.confirm(
      'RUN BASE64 STORAGE MIGRATION\n\n' +
      'This tool will scan Firestore collections (photos, catalog_photos, categories, subCategories, showroomVideos).\n' +
      'Any inline Base64 data URIs will be converted to Blob, compressed, uploaded to Firebase Storage, and updated to clean Storage URLs in Firestore.\n\n' +
      'Proceed with migration?'
    );
    if (!confirmed) return;

    setIsMigrating(true);
    setMigrationLogs([]);
    setMigrationSummary(null);

    try {
      const res = await runBase64Migration((msg) => {
        setMigrationLogs((prev) => [...prev, msg]);
      });
      setMigrationSummary(`Migration Finished! Scanned: ${res.totalDocsScanned} docs, Migrated: ${res.totalDocsMigrated} docs.`);
    } catch (err: any) {
      console.error('Migration error:', err);
      setMigrationLogs((prev) => [...prev, `CRITICAL ERROR: ${err?.message || err}`]);
      setMigrationSummary('Migration failed. Check console or logs.');
    } finally {
      setIsMigrating(false);
    }
  };

  const deleteOrderInStore = useAppStore(state => state.deleteOrder);
  const deletePhotoInStore = useAppStore(state => state.deletePhoto);

  const handleScan = async () => {
    setIsScanning(true);
    setCleanupSummary(null);
    try {
      const res = await scanDatabaseForOrphansAndStaleData();
      setScanResult(res);
    } catch (err) {
      console.error('Database scan failed:', err);
      alert('Failed to scan database. Check console logs for details.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleClean = async () => {
    // If not scanned yet, do a quick scan first
    let currentResult = scanResult;
    if (!currentResult) {
      setIsScanning(true);
      try {
        currentResult = await scanDatabaseForOrphansAndStaleData();
        setScanResult(currentResult);
      } catch (e) {
        setIsScanning(false);
        alert('Could not complete database scan prior to cleanup.');
        return;
      }
      setIsScanning(false);
    }

    if (!currentResult || currentResult.totalFound === 0) {
      alert('Database is already clean! No orphaned orders or empty/stale carts detected.');
      return;
    }

    const confirmed = window.confirm(
      `SAFE DATABASE CLEANUP CONFIRMATION\n\n` +
      `The scanner found ${currentResult.totalFound} stale or orphaned records:\n` +
      `• ${currentResult.orphanedOrders.length} Orphaned Orders (No matching customer profile)\n` +
      `• ${currentResult.abandonedCarts.length} Abandoned/Empty Carts (>24h old or empty)\n` +
      `• ${currentResult.invalidPhotos.length} Corrupted Product Records (Missing SKU or image)\n\n` +
      `Do you want to permanently prune these orphaned entries to keep the database optimized and conflict-free?`
    );

    if (!confirmed) return;

    setIsCleaning(true);
    try {
      const summary = await executeDatabaseCleanup(currentResult);
      
      // Also update local store if any were present in local memory
      currentResult.orphanedOrders.forEach(o => deleteOrderInStore(o.id));
      currentResult.invalidPhotos.forEach(p => deletePhotoInStore(p.id, p.photoCode));

      setCleanupSummary(summary);
      setScanResult(null);
    } catch (err: any) {
      console.error('Database cleanup error:', err);
      alert(`Cleanup error: ${err?.message || 'Failed to prune database items.'}`);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 sm:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Database className="text-amber-400" size={20} />
            Safe Database Cleanup Scanner
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Detects and prunes orphaned orders with deleted customers, empty/abandoned carts (&gt;24h old), and corrupt records.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleFixStorageCache}
            disabled={isFixingCache || isMigrating || isScanning || isCleaning}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition shadow-md disabled:opacity-50"
          >
            <ShieldCheck size={14} className={isFixingCache ? 'animate-spin' : ''} />
            <span>{isFixingCache ? 'Fixing Cache...' : 'Fix Image Cache'}</span>
          </button>

          <button
            onClick={handleRunMigration}
            disabled={isMigrating || isScanning || isCleaning}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black transition shadow-md disabled:opacity-50"
          >
            <UploadCloud size={14} className={isMigrating ? 'animate-bounce' : ''} />
            <span>{isMigrating ? 'Migrating...' : 'Run Base64 Migration'}</span>
          </button>

          <button
            onClick={handleScan}
            disabled={isScanning || isCleaning || isMigrating}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
            <span>{isScanning ? 'Scanning...' : 'Scan Database'}</span>
          </button>

          <button
            onClick={handleClean}
            disabled={isCleaning || isScanning || isMigrating}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl text-xs font-black transition shadow-md disabled:opacity-50"
          >
            <Trash2 size={14} className={isCleaning ? 'animate-spin' : ''} />
            <span>{isCleaning ? 'Cleaning...' : 'Clean Database'}</span>
          </button>
        </div>
      </div>

      {/* Migration Progress Log Panel */}
      {(isMigrating || migrationLogs.length > 0) && (
        <div className="my-4 p-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <UploadCloud size={14} />
              Base64 Migration Live Logs
            </span>
            {migrationSummary && (
              <span className="text-xs font-bold text-emerald-400">{migrationSummary}</span>
            )}
          </div>
          <div className="font-mono text-[11px] bg-black/80 p-3 rounded-xl max-h-48 overflow-y-auto space-y-1 text-slate-300 border border-slate-800 scrollbar-thin">
            {migrationLogs.map((log, i) => (
              <div key={i} className={log.includes('ERROR') ? 'text-red-400' : log.includes('Successfully') ? 'text-emerald-400' : 'text-slate-300'}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Notification */}
      {cleanupSummary && (
        <div className="my-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1">
          <div className="flex items-center gap-2 font-black text-sm">
            <CheckCircle2 size={18} />
            <span>Database Cleanup Completed Successfully!</span>
          </div>
          <p className="text-xs text-emerald-400 pl-6">
            Pruned {cleanupSummary.cleanedOrders} orphaned orders, {cleanupSummary.cleanedCarts} abandoned carts, and {cleanupSummary.cleanedPhotos} corrupted records.
          </p>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-amber-400" />
              Orphaned Orders
            </span>
            <span className="text-brand-gold font-mono text-sm">
              {scanResult ? scanResult.orphanedOrders.length : '-'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">Orders with deleted or missing customer profiles</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-purple-400" />
              Abandoned Carts
            </span>
            <span className="text-purple-300 font-mono text-sm">
              {scanResult ? scanResult.abandonedCarts.length : '-'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">Empty carts or older than 24 hours</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <FileQuestion size={14} className="text-cyan-400" />
              Corrupt Photo Records
            </span>
            <span className="text-cyan-300 font-mono text-sm">
              {scanResult ? scanResult.invalidPhotos.length : '-'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">Products missing SKU or image URI</p>
        </div>
      </div>

      {/* Scan Details or Guide */}
      <div className="flex-1 space-y-4">
        {!scanResult ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
            <ShieldCheck size={40} className="mx-auto text-amber-400/80 mb-3" />
            <h3 className="font-bold text-white text-sm">Safe & Non-Destructive Scanning</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Click <strong>"Scan Database"</strong> to check for orphaned orders, empty carts, and stale records without modifying anything. Or click <strong>"Clean Database"</strong> to scan and prompt for immediate pruning.
            </p>
          </div>
        ) : scanResult.totalFound === 0 ? (
          <div className="text-center py-12 px-4 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl">
            <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
            <h3 className="font-bold text-white text-sm">Database Is In Pristine Condition</h3>
            <p className="text-xs text-emerald-300/80 max-w-md mx-auto mt-1">
              Zero orphaned orders, empty carts, or broken records were found. No cleanup is required at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                Detected Issues ({scanResult.totalFound})
              </h3>
              <span className="text-[11px] text-slate-500">
                Scanned {new Date(scanResult.scannedAt).toLocaleTimeString()}
              </span>
            </div>

            {/* List of Orphaned Orders */}
            {scanResult.orphanedOrders.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Orphaned Orders ({scanResult.orphanedOrders.length})
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {scanResult.orphanedOrders.map(o => (
                    <div key={o.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-white">{o.orderNumber || o.id}</span>
                        <span className="text-slate-400 ml-2">Shop: {o.shopName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        Missing Cust ID: {o.customerId || o.customerCode || 'None'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List of Abandoned Carts */}
            {scanResult.abandonedCarts.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  Abandoned Carts ({scanResult.abandonedCarts.length})
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {scanResult.abandonedCarts.map(c => (
                    <div key={c.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-white">{c.id}</span>
                        <span className="text-slate-400 ml-2">({c.collectionName})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {c.reason} • {c.itemsCount} items
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List of Corrupt Photos */}
            {scanResult.invalidPhotos.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  Corrupted Product Records ({scanResult.invalidPhotos.length})
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {scanResult.invalidPhotos.map(p => (
                    <div key={p.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-white">{p.id}</span>
                        <span className="text-slate-400 ml-2">SKU: {p.photoCode}</span>
                      </div>
                      <span className="text-[10px] text-amber-400">
                        {p.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
