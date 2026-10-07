const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Fix OrderCartItem structure and the parseInt error
code = code.replace(/subCategoryId: 'HDTV',/, "");
code = code.replace(/parseInt\(activeVideoPhoto.orderQuantity\) \|\| 1/, "parseInt(activeVideoPhoto.orderQuantity || '1') || 1");

fs.writeFileSync('src/pages/Home.tsx', code);
