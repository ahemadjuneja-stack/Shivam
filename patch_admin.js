const fs = require('fs');

let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

if (!code.includes('import { HDTVManager }')) {
  code = code.replace(
    /import \{ ShowroomVideoManager \} from '\.\.\/components\/ShowroomVideoManager';/,
    "import { ShowroomVideoManager } from '../components/ShowroomVideoManager';\nimport { HDTVManager } from '../components/HDTVManager';"
  );
}

if (!code.includes('const [showHDTVManager')) {
  code = code.replace(
    /const \[showVideoManager, setShowVideoManager\] = useState\(false\);/,
    "const [showVideoManager, setShowVideoManager] = useState(false);\n  const [showHDTVManager, setShowHDTVManager] = useState(false);"
  );
}

if (!code.includes('import {') || (!code.includes('Tv,') && !code.includes(', Tv'))) {
  code = code.replace(
    /import \{([^\}]*)Plus,([^\}]*)\} from 'lucide-react';/,
    "import {$1Plus, Tv,$2} from 'lucide-react';"
  );
}

if (!code.includes('HDTV Video Slider Management')) {
  code = code.replace(
    /\{\/\* 2\. IMAGE ICON: Photos \& Media \(Changed to Showroom Videos\) \*\/\}/,
    `{/* 2.1 TV ICON: HDTV Video Slider Management */}
          <button
            onClick={() => setShowHDTVManager(true)}
            title="HDTV Video Management"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-slate-800/80 active:scale-95 transition"
          >
            <Tv size={20} />
          </button>
          
          {/* 2. IMAGE ICON: Catalog Gallery */}`
  );
}

if (!code.includes('<HDTVManager onClose={() => setShowHDTVManager(false)} />')) {
  code = code.replace(
    /\{\/\* SCREEN: SHOWROOM VIDEO MANAGER \(Icon 2\) \*\/\}/,
    `{/* SCREEN: HDTV MANAGER */}
      {showHDTVManager && (
        <HDTVManager onClose={() => setShowHDTVManager(false)} />
      )}

      {/* SCREEN: SHOWROOM VIDEO MANAGER (Icon 2) */}`
  );
}

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
