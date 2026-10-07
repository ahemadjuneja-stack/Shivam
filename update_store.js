const fs = require('fs');

let code = fs.readFileSync('src/store/index.ts', 'utf8');

// Add to AppState interface
code = code.replace(
  /deleteShowroomVideo: \(videoId: string\) => void;/,
  "deleteShowroomVideo: (videoId: string) => void;\n  updateShowroomVideo: (videoId: string, updates: Partial<ShowroomVideo>) => void;"
);

// Add to store implementation
code = code.replace(
  /deleteShowroomVideo: \(videoId\) => \{[\s\S]*?\},/,
  `deleteShowroomVideo: (videoId) => {
        deleteShowroomVideoFromFirebase(videoId);
        set((state) => ({
          showroomVideos: (state.showroomVideos || []).filter(v => v.id !== videoId)
        }));
      },
      updateShowroomVideo: (videoId, updates) => {
        set((state) => {
          const updatedVideos = (state.showroomVideos || []).map(v => 
            v.id === videoId ? { ...v, ...updates } : v
          );
          const videoToUpdate = updatedVideos.find(v => v.id === videoId);
          if (videoToUpdate) {
            syncShowroomVideoToFirebase(videoToUpdate);
          }
          return { showroomVideos: updatedVideos };
        });
      },`
);

fs.writeFileSync('src/store/index.ts', code);
