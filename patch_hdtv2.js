const fs = require('fs');

let code = fs.readFileSync('src/components/HDTVManager.tsx', 'utf8');

// Add imports
code = code.replace(
  /import \{ Upload, Trash2, Check, ArrowLeft, Tv, Link as LinkIcon, Edit2 \} from 'lucide-react';/,
  "import { Upload, Trash2, Check, ArrowLeft, Tv, Link as LinkIcon, Edit2 } from 'lucide-react';\nimport { saveLocalVideo, deleteLocalVideo } from '../services/localDB';\nimport { useVideoSrc } from '../hooks/useVideoSrc';"
);

// Add VideoPreview component
code = code.replace(
  /interface HDTVManagerProps \{/,
  `const VideoPreview = ({ videoUri }: { videoUri?: string }) => {
  const src = useVideoSrc(videoUri);
  return (
    <video
      src={src || undefined}
      className="w-full h-full object-cover"
      autoPlay
      loop
      muted
      playsInline
    />
  );
};

interface HDTVManagerProps {`
);

// Replace video tag in the map
code = code.replace(
  /<video\s*src=\{video\.videoUri \|\| undefined\}\s*className="w-full h-full object-cover"\s*autoPlay\s*loop\s*muted\s*playsInline\s*\/>/m,
  "<VideoPreview videoUri={video.videoUri} />"
);

// Update handleSaveUploads
const oldHandleSave = /const handleSaveUploads = \(\) => \{[\s\S]*?setOrderQuantity\(''\);\n  \};/;
const newHandleSave = `const handleSaveUploads = async () => {
    if (stagedFiles.length === 0) return;

    const newVideos: ShowroomVideo[] = [];
    for (let i = 0; i < stagedFiles.length; i++) {
      const file = stagedFiles[i];
      const videoId = \`vid-\${Date.now()}-\${i}\`;
      
      await saveLocalVideo(videoId, file);

      newVideos.push({
        id: videoId,
        title: file.name,
        videoUri: \`indexeddb://\${videoId}\`,
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
code = code.replace(oldHandleSave, newHandleSave);

// Update handleDelete
const oldHandleDelete = /const handleDelete = \(id: string\) => \{[\s\S]*?showToast\('Video deleted'\);\n    \}\n  \};/;
const newHandleDelete = `const handleDelete = async (id: string) => {
    if (window.confirm('Delete this video from HDTV?')) {
      const video = showroomVideos.find(v => v.id === id);
      if (video && video.videoUri.startsWith('indexeddb://')) {
        const localId = video.videoUri.replace('indexeddb://', '');
        await deleteLocalVideo(localId);
      }
      deleteShowroomVideo(id);
      showToast('Video deleted');
    }
  };`;
code = code.replace(oldHandleDelete, newHandleDelete);

fs.writeFileSync('src/components/HDTVManager.tsx', code);
