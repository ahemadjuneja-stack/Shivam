const fs = require('fs');

let code = fs.readFileSync('src/components/CategoryManager.tsx', 'utf8');

// Clean up duplicate endings if any
code = code.replace(/([\s\S]*?}\s*\);\s*\};\s*)([\s\S]*)/, '$1');

// Add delete confirmation state right after the component declaration starts
code = code.replace(
  /export const CategoryManager: React\.FC<CategoryManagerProps> = \(\{ onClose \} \) => \{/,
  `export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'CATEGORY' | 'SUBCATEGORY'; id: string; name: string } | null>(null);`
);

// Replace category delete button
code = code.replace(
  /<button onClick=\{\(\) => deleteCategory\(selectedCategory\.id\)\} className="p-1 hover:bg-black\/10 rounded text-red-900"><Trash2 size=\{16\} \/><\/button>/,
  `<button onClick={() => setDeleteConfirm({ type: 'CATEGORY', id: selectedCategory.id, name: selectedCategory.displayName })} className="p-1 hover:bg-black/10 rounded text-red-900"><Trash2 size={16} /></button>`
);

// Replace subcategory delete button
code = code.replace(
  /<button onClick=\{\(\) => deleteSubCategory\(selectedSubcategory\.id\)\} className="p-1 hover:bg-black\/10 rounded text-red-200"><Trash2 size=\{16\} \/><\/button>/,
  `<button onClick={() => setDeleteConfirm({ type: 'SUBCATEGORY', id: selectedSubcategory.id, name: selectedSubcategory.name })} className="p-1 hover:bg-black/10 rounded text-red-200"><Trash2 size={16} /></button>`
);

// Insert modal just before the last return closing </div>
const targetSubStr = `    </div>\n  );\n};`;
const replacementSubStr = `
      {/* Red Confirmation Popup Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-red-500/50 rounded-2xl max-w-md w-full p-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Confirm Deletion</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-300 mb-6 bg-red-500/5 border border-red-500/20 p-4 rounded-xl leading-relaxed">
              Are you sure you want to delete this {deleteConfirm.type === 'CATEGORY' ? 'Category' : 'Subcategory'}: <strong className="text-white uppercase font-bold">"{deleteConfirm.name}"</strong>? All associated items will be deleted.
            </p>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (deleteConfirm.type === 'CATEGORY') {
                    deleteCategory(deleteConfirm.id);
                  } else {
                    deleteSubCategory(deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition shadow-[0_4px_15px_rgba(239,68,68,0.4)]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};`;

// Replace the very last occurrence
const lastIdx = code.lastIndexOf(targetSubStr);
if (lastIdx !== -1) {
  code = code.substring(0, lastIdx) + replacementSubStr + code.substring(lastIdx + targetSubStr.length);
}

fs.writeFileSync('src/components/CategoryManager.tsx', code);
console.log("Safe patch applied successfully!");
