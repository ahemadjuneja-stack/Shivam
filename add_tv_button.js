const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

if (!code.includes('Tv,')) {
  code = code.replace(/import {([^}]*)Plus,([^}]*)} from 'lucide-react';/, "import {$1Plus, Tv,$2} from 'lucide-react';");
}

code = code.replace(
  /\{\/\* 2\. IMAGE ICON: Photos \& Media \(Changed to Showroom Videos\) \*\/\}/,
  "{/* 2.1 TV ICON: HDTV Video Slider Management */}\n" +
  "          <button\n" +
  "            onClick={() => setShowHDTVManager(true)}\n" +
  "            title=\"HDTV Video Management\"\n" +
  "            className=\"w-10 h-10 rounded-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-slate-800/80 active:scale-95 transition\"\n" +
  "          >\n" +
  "            <Tv size={20} />\n" +
  "          </button>\n" +
  "          \n" +
  "          {/* 2. IMAGE ICON: Catalog Gallery */}"
);

code = code.replace(
  /\{\/\* SCREEN: SHOWROOM VIDEO MANAGER \(Icon 2\) \*\/\}/,
  "{/* SCREEN: HDTV MANAGER */}\n" +
  "      {showHDTVManager && (\n" +
  "        <HDTVManager onClose={() => setShowHDTVManager(false)} />\n" +
  "      )}\n\n" +
  "      {/* SCREEN: SHOWROOM VIDEO MANAGER (Icon 2) */}"
);

if (!code.includes('HDTVManager')) {
  code = code.replace(
    /import \{ ShowroomVideoManager \} from '\.\.\/components\/ShowroomVideoManager';/,
    "import { ShowroomVideoManager } from '../components/ShowroomVideoManager';\nimport { HDTVManager } from '../components/HDTVManager';"
  );
}

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
