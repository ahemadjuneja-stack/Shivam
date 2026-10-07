const fs = require('fs');

let code = fs.readFileSync('src/components/CategoryManager.tsx', 'utf8');

// Add delete confirmation state
code = code.replace(
  /const \[subNameInput, setSubNameInput\] = useState\(''\);/,
  `const [subNameInput, setSubNameInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'CATEGORY' | 'SUBCATEGORY'; id: string; name: string } | null>(null);`
);

// Replace category delete trigger
code = code.replace(
  /<button onClick=\{\(\) => deleteCategory\(selectedCategory\.id\)\} className="p-1 hover:bg-black\/10 rounded text-red-900"><Trash2 size=\{16\} \/><\/button>/,
  `<button onClick={() => setDeleteConfirm({ type: 'CATEGORY', id: selectedCategory.id, name: selectedCategory.displayName })} className="p-1 hover:bg-black/10 rounded text-red-900"><Trash2 size={16} /></button>`
);

// Replace subcategory delete trigger
code = code.replace(
  /<button onClick=\{\(\) => deleteSubCategory\(selectedSubcategory\.id\)\} className="p-1 hover:bg-black\/10 rounded text-red-200"><Trash2 size=\{16\} \/><\/button>/,
  `<button onClick={() => setDeleteConfirm({ type: 'SUBCATEGORY', id: selectedSubcategory.id, name: selectedSubcategory.name })} className="p-1 hover:bg-black/10 rounded text-red-200"><Trash2 size={16} /></button>`
);

// Add the modal JSX right before the final closing </div>
const modalJsx = `
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
              Are you sure you want to delete this {deleteConfirm.type === 'CATEGORY' ? 'Category' : 'Subcategory'}: <strong className="text-white uppercase font-bold">"{deleteConfirm.name}"</strong>? All associated items may be affected.
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
};
`;

// Replace last closing tags
code = code.replace(/\s*\);\s*\};\s*$/, modalJsx);

fs.writeFileSync('src/components/CategoryManager.tsx', code);
console.log("CategoryManager delete popup added!");
