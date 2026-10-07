const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Insert the order button after slide dots
const searchStr = `</button>\n                {/* Slide Dots */}`;
const replacement = `</button>
                {/* Order Button (if quantity is set) */}
                {activeVideoPhoto.orderQuantity && (
                  <div className="absolute top-4 right-4 z-20">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        useAppStore.getState().addToCart({
                          id: 'hdtv-' + Date.now(),
                          categoryId: activeVideoPhoto.categoryId || 'GENERAL',
                          subCategoryId: 'HDTV',
                          subCategoryName: 'Showroom Video',
                          photoId: activeVideoPhoto.id,
                          photoCode: 'HDTV: ' + (activeVideoPhoto.title || 'Video'),
                          imageUri: activeVideoPhoto.thumbnailUri || 'https://images.unsplash.com/photo-1572911425175-6815f9175440?q=80&w=200&auto=format&fit=crop',
                          optionLetter: 'A',
                          quantity: parseInt(activeVideoPhoto.orderQuantity) || 1
                        });
                        alert('Added to cart: ' + activeVideoPhoto.orderQuantity + ' pieces');
                      }}
                      className="bg-brand-gold hover:bg-yellow-400 text-black font-black px-4 py-2 rounded-lg shadow-[0_4px_12px_rgba(255,215,0,0.4)] flex items-center gap-2 transform transition hover:scale-105 active:scale-95 border-2 border-white/20"
                    >
                      <span className="uppercase text-sm">Order {activeVideoPhoto.orderQuantity} Pcs</span>
                    </button>
                  </div>
                )}
                
                {/* Slide Dots */}`;

if (!code.includes('Order Button (if quantity is set)')) {
  code = code.replace(searchStr, replacement);
  fs.writeFileSync('src/pages/Home.tsx', code);
}
