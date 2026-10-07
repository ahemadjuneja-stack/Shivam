import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCw, Move, Lock, AlertTriangle } from 'lucide-react';

interface ThumbnailCropModalProps {
  imageFile: File;
  targetTitle: string; // e.g. "Category: IMITATION" or "Subcategory: EARRINGS"
  onClose: () => void;
  onSave: (croppedDataUrl: string) => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const TARGET_WIDTH = 900;
const TARGET_HEIGHT = 500; // 9:5 Aspect Ratio (900 / 500 = 1.8)

export const ThumbnailCropModal: React.FC<ThumbnailCropModalProps> = ({
  imageFile,
  targetTitle,
  onClose,
  onSave,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileSizeMb, setFileSizeMb] = useState<string>('0');
  const [isOversized, setIsOversized] = useState(false);

  // Crop & Transform state
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Check file size and load image
  useEffect(() => {
    if (!imageFile) return;

    const sizeInMb = (imageFile.size / (1024 * 1024)).toFixed(2);
    setFileSizeMb(sizeInMb);

    if (imageFile.size > MAX_FILE_SIZE_BYTES) {
      setIsOversized(true);
      return;
    }

    setIsOversized(false);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  // When image loads, calculate initial center and minimum scale to cover 9:5
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imageRef.current = img;

    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    // Scale needed to cover the container (which is 9:5)
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    const coverScale = Math.max(scaleX, scaleY);

    setMinScale(coverScale);
    setScale(coverScale);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse / Touch Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile/trackpad
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Reset position & zoom
  const handleReset = () => {
    setScale(minScale);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  // Rotate 90 deg
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Export to exact 900 x 500 (9:5)
  const handleConfirmCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background with black in case of edge transparency
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    const img = imageRef.current;
    const container = containerRef.current;

    // Multiplier from UI container to 900x500 canvas
    const exportScale = TARGET_WIDTH / container.clientWidth;

    ctx.save();
    // Move to canvas center + translated offset
    ctx.translate(
      TARGET_WIDTH / 2 + position.x * exportScale,
      TARGET_HEIGHT / 2 + position.y * exportScale
    );

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply scale
    const drawWidth = img.naturalWidth * scale * exportScale;
    const drawHeight = img.naturalHeight * scale * exportScale;

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // High quality JPEG
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onSave(croppedDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Lock size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-black text-sm sm:text-base tracking-wide">
                  Lock 9:5 Thumbnail Size
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Strict 9:5 (900×500)
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {targetTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* File Size Check / Oversized Warning */}
        {isOversized ? (
          <div className="p-8 text-center space-y-4 flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertTriangle size={36} />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-lg font-bold text-white">File Size Exceeds 5 MB Limit</h3>
              <p className="text-xs text-red-300 font-semibold">
                Aapki image ka size <span className="font-mono underline">{fileSizeMb} MB</span> hai. 
                App ke standard ke mutabiq Thumbnail ka size maximum <span className="font-mono underline">5 MB</span> hi hona chahiye.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Kripya 5 MB se kam size ki image select karein.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700"
            >
              Choose Another Image
            </button>
          </div>
        ) : (
          <>
            {/* Modal Body: 9:5 Viewport */}
            <div className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-center bg-[#070b14] overflow-hidden">
              
              {/* Size & Ratio Specs Banner */}
              <div className="w-full mb-3 flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  File Size: {fileSizeMb} MB / Max 5 MB (Valid)
                </span>
                <span className="text-amber-300 font-mono font-bold">
                  Output: 900 × 500 px (9:5)
                </span>
              </div>

              {/* Strict 9:5 Viewport Box */}
              <div className="w-full relative flex items-center justify-center">
                <div
                  ref={containerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="w-full aspect-[9/5] max-h-[380px] bg-black rounded-xl overflow-hidden relative cursor-grab active:cursor-grabbing border-2 border-amber-500/80 shadow-2xl"
                  style={{ touchAction: 'none' }}
                >
                  {imageSrc && (
                    <img
                      src={imageSrc}
                      alt="Crop target"
                      onLoad={handleImageLoaded}
                      draggable={false}
                      className="absolute max-w-none origin-center pointer-events-none transition-transform duration-75"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
                      }}
                    />
                  )}

                  {/* 9:5 Frame Overlay Guidelines */}
                  <div className="absolute inset-0 pointer-events-none border border-white/20 grid grid-cols-3 grid-rows-3">
                    <div className="border-r border-b border-white/10" />
                    <div className="border-r border-b border-white/10" />
                    <div className="border-b border-white/10" />
                    <div className="border-r border-b border-white/10" />
                    <div className="border-r border-b border-white/10" />
                    <div className="border-b border-white/10" />
                    <div className="border-r border-white/10" />
                    <div className="border-r border-white/10" />
                    <div />
                  </div>

                  {/* Center Crosshair & Corner Badges */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-amber-400 font-bold border border-white/15">
                    9 : 5 Locked
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] text-white/70 flex items-center gap-1 pointer-events-none">
                    <Move size={11} />
                    <span>Drag to adjust position</span>
                  </div>
                </div>
              </div>

              {/* Interactive Zoom & Rotate Controls */}
              <div className="w-full mt-4 flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                {/* Zoom control */}
                <div className="flex items-center gap-2 flex-1">
                  <ZoomOut size={15} className="text-slate-400" />
                  <input
                    type="range"
                    min={minScale * 0.8}
                    max={minScale * 3.5}
                    step="0.01"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <ZoomIn size={15} className="text-slate-400" />
                  <span className="text-[11px] font-mono text-slate-300 w-10 text-right">
                    {Math.round((scale / minScale) * 100)}%
                  </span>
                </div>

                {/* Rotate & Reset Buttons */}
                <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Rotate 90 degrees"
                  >
                    <RotateCw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition"
                  >
                    Reset
                  </button>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Lock size={12} className="text-amber-400" />
                <span>Locked 9:5 ratio ensures uniform card display across the entire app.</span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCrop}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-1.5 shadow-lg transition active:scale-95"
                >
                  <Check size={16} />
                  <span>Lock & Save 9:5 Thumbnail</span>
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
