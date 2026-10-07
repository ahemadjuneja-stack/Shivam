const fs = require('fs');

let code = fs.readFileSync('src/components/HDTVManager.tsx', 'utf8');

// Add stagedFiles state
code = code.replace(
  /const \[linkUrl, setLinkUrl\] = useState\(''\);/,
  "const [linkUrl, setLinkUrl] = useState('');\n  const [stagedFiles, setStagedFiles] = useState<File[]>([]);"
);

// Replace handleFileChange and add handleSaveUploads
const oldHandleFileChangeRegex = /const handleFileChange = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?e\.target\.value = '';\n    setOrderQuantity\(''\);\n  \};/;

const newHandlers = `const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 100 * 1024 * 1024) {
        alert(\`File \${files[i].name} is larger than 100MB.\`);
        continue;
      }
      validFiles.push(files[i]);
    }
    
    if (validFiles.length > 0) {
      setStagedFiles(prev => [...prev, ...validFiles]);
    }
    e.target.value = '';
  };

  const handleSaveUploads = () => {
    if (stagedFiles.length === 0) return;

    const newVideos: ShowroomVideo[] = [];
    for (let i = 0; i < stagedFiles.length; i++) {
      const file = stagedFiles[i];
      const objectUrl = URL.createObjectURL(file);
      newVideos.push({
        id: \`vid-\${Date.now()}-\${i}\`,
        title: file.name,
        videoUri: objectUrl,
        fileSizeMb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
        uploadedAt: Date.now(),
        orderQuantity: orderQuantity.trim() || undefined
      });
    }

    addMultipleShowroomVideos(newVideos);
    showToast(\`Successfully saved \${newVideos.length} video(s)\`);
    setStagedFiles([]);
    setOrderQuantity('');
  };`;

code = code.replace(oldHandleFileChangeRegex, newHandlers);

// Replace the UI part
const oldUIUploadPartRegex = /<>\s*<div className="bg-\[#0b1329\] border border-slate-800 p-4 rounded-xl mb-2">[\s\S]*?<\/button>\s*<input\s*type="file"[\s\S]*?className="hidden"\s*\/>\s*<\/>/;

const newUIUploadPart = `<>
                  <div className="bg-[#0b1329] border border-slate-800 p-4 rounded-xl mb-2">
                     <p className="text-xs text-slate-400 text-center leading-relaxed">
                        Notice: Local uploads only play on this specific device. Use Video Link for public mobile access.
                     </p>
                  </div>

                  {stagedFiles.length > 0 && (
                    <div className="bg-[#050a17] border border-slate-800 rounded-xl p-3 mb-4 max-h-32 overflow-y-auto">
                      <p className="text-xs font-bold text-slate-400 mb-2">Selected Files ({stagedFiles.length}):</p>
                      <ul className="space-y-2">
                        {stagedFiles.map((f, i) => (
                          <li key={i} className="flex items-center justify-between text-xs text-slate-300">
                            <span className="truncate w-40" title={f.name}>{f.name}</span>
                            <button onClick={() => setStagedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">
                              <Trash2 size={12} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2 flex-col sm:flex-row">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <Upload size={18} /> Select Files
                    </button>

                    {stagedFiles.length > 0 && (
                      <button 
                        onClick={handleSaveUploads}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      >
                        <Check size={18} /> Save Videos
                      </button>
                    )}
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept="video/mp4,video/quicktime,video/webm"
                    className="hidden"
                  />
                </>`;

code = code.replace(oldUIUploadPartRegex, newUIUploadPart);

fs.writeFileSync('src/components/HDTVManager.tsx', code);
