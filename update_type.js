const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace(
  /export interface ShowroomVideo \{[\s\S]*?\}/,
  "export interface ShowroomVideo {\n" +
  "  id: string;\n" +
  "  title: string;\n" +
  "  videoUri: string;\n" +
  "  thumbnailUri?: string;\n" +
  "  categoryId?: string;\n" +
  "  categoryName?: string;\n" +
  "  fileSizeMb?: number;\n" +
  "  orderQuantity?: string;\n" +
  "  uploadedAt: number;\n" +
  "}"
);
fs.writeFileSync('src/types.ts', code);
