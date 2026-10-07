const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

if (!code.includes('useVideoSrc')) {
  code = code.replace(
    /import React, \{ useState, useMemo, useEffect, useRef \} from 'react';/,
    "import React, { useState, useMemo, useEffect, useRef } from 'react';\nimport { useVideoSrc } from '../hooks/useVideoSrc';"
  );
  
  code = code.replace(
    /const activeVideoPhoto = videoList\[videoSlideIdx\] \|\| videoList\[0\];/,
    "const activeVideoPhoto = videoList[videoSlideIdx] || videoList[0];\n  const activeVideoSrc = useVideoSrc(activeVideoPhoto?.videoUri);"
  );
  
  code = code.replace(
    /src=\{activeVideoPhoto\.videoUri \|\| undefined\}/,
    "src={activeVideoSrc || undefined}"
  );
  
  fs.writeFileSync('src/pages/Home.tsx', code);
}
