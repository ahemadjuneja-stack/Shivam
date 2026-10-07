import { WholesaleOrder } from '../types';
import { Printer, X, Share2 } from 'lucide-react';
import { resolveItemImage } from '../utils';

interface InvoiceChallanModalProps {
  order: WholesaleOrder | null;
  onClose: () => void;
}

export function InvoiceChallanModal({ order, onClose }: InvoiceChallanModalProps) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*SHIVAM WHOLESALE B2B SHOWROOM*\n` +
      `*Dispatch Challan & Packing Slip*\n\n` +
      `*Order No:* ${order.orderNumber}\n` +
      `*Shop Name:* ${order.shopName} (${order.cityName})\n` +
      `*Customer ID:* ${order.customerCode}\n` +
      `*Total Pieces:* ${order.totalItemsCount} pcs\n` +
      `*Status:* ${order.overallStatus.replace(/_/g, ' ')}\n\n` +
      `*Items Summary:*\n` +
      (order.items || []).map(i => `• ${i.photoCode} (Opt ${i.optionLetter}): ${i.quantity} pcs [${i.subCategoryName}]`).join('\n') +
      `\n\nThank you for your business with SHIVAM B2B!`
    );
    window.open(`https://wa.me/91${order.mobileNumber.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Wholesale Delivery Challan & Packing Slip
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95"
              title="Share slip on WhatsApp"
            >
              <Share2 size={13} />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition active:scale-95 shadow-md"
              title="Print Challan"
            >
              <Printer size={14} />
              <span>Print Slip</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Challan Document */}
        <div className="p-6 sm:p-8 bg-white text-slate-900 overflow-y-auto print:p-0 print:m-0" id="printable-slip">
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 font-black text-xl flex items-center justify-center">
                  S
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-wider uppercase text-slate-900 leading-none">
                    SHIVAM B2B SHOWROOM
                  </h1>
                  <p className="text-[11px] font-bold text-slate-600 tracking-wide mt-0.5">
                    WHOLESALE COSMETICS • IMITATION • HAIR ACCESSORIES
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                Wholesale Central Market, Ring Road, Gujarat / Mumbai <br />
                Support / Order Line: +91 98250 00000 • GST: 24AAACS0000A1Z5
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 text-xs font-black uppercase tracking-widest text-slate-800">
                DISPATCH CHALLAN
              </span>
              <div className="text-lg font-black font-mono mt-1 text-slate-900">
                {order.orderNumber}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Date: {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          {/* Client & Dispatch Details */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-xl p-4 mb-6 bg-slate-50/50">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                DISPATCHED TO (BUYER):
              </span>
              <div className="text-base font-black text-slate-900">{order.shopName}</div>
              <div className="text-xs text-slate-700 mt-0.5 font-bold">
                City: {order.cityName}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Contact: {order.mobileNumber}
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 mt-1">
                Customer Code: {order.customerCode}
              </div>
            </div>

            <div className="border-l border-slate-200 pl-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                PACKING & FULFILLMENT:
              </span>
              <div className="text-xs space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span>Overall Status:</span>
                  <span className="font-bold uppercase text-emerald-700">{order.overallStatus.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Order Lines:</span>
                  <span className="font-bold">{order.itemCount ?? order.items?.length ?? 0} lines</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                  <span>Total Pieces:</span>
                  <span className="font-mono text-sm">{order.totalQuantity ?? (order.items||[]).reduce((s,i)=>s+(Number(i.quantity)||0),0)} pcs</span>
                </div>
                {order.notes && order.notes !== 'No Note' && (
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Note:</span>
                    <span className="font-medium italic text-slate-800">{order.notes}</span>
                  </div>
                )}
                {order.voiceNoteUrl && (
                  <div className="flex justify-between text-emerald-700 font-bold text-[11px]">
                    <span>Voice Note:</span>
                    <span>Attached</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item Photo</th>
                  <th className="py-2.5 px-3">Photo Code</th>
                  <th className="py-2.5 px-3">Category / Subcategory</th>
                  <th className="py-2.5 px-3 text-center">Selected Option</th>
                  <th className="py-2.5 px-3 text-right">Wholesale Quantity</th>
                  <th className="py-2.5 px-3 text-center">Staff Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(order.items || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <img 
                        src={resolveItemImage(item) || item.imageUri || item.imageUrl || item.image} 
                        alt={item.photoCode} 
                        className="w-12 h-8 rounded object-cover border border-slate-300 bg-black"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-black text-slate-900 text-sm">
                      {item.photoCode}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.subCategoryName}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 font-bold font-mono rounded bg-amber-100 text-amber-900 border border-amber-300">
                        Option {item.optionLetter}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 text-sm">
                      {item.quantity} pcs
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="w-4 h-4 border-2 border-slate-400 rounded inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-900">
                  <td colSpan={5} className="py-3 px-3 text-right text-xs uppercase tracking-wider">
                    Total Wholesale Dispatch Quantity:
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-base text-slate-900">
                    {order.totalItemsCount} pcs
                  </td>
                  <td className="py-3 px-3 text-center text-[10px] text-slate-500">
                    VERIFIED
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Department Packing Verification Stamps */}
          <div className="grid grid-cols-3 gap-3 mb-6 text-xs">
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="font-bold text-slate-700 block text-[11px] mb-1">💎 Imitation</span>
              <div className="flex items-center justify-between text-slate-500">
                <span>Status:</span>
                <span className="font-bold text-slate-900">{order.imitationStatus}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="font-bold text-slate-700 block text-[11px] mb-1">💄 Cosmetics</span>
              <div className="flex items-center justify-between text-slate-500">
                <span>Status:</span>
                <span className="font-bold text-slate-900">{order.cosmeticsStatus}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="font-bold text-slate-700 block text-[11px] mb-1">🎀 Hair Accessories</span>
              <div className="flex items-center justify-between text-slate-500">
                <span>Status:</span>
                <span className="font-bold text-slate-900">{order.hairStatus}</span>
              </div>
            </div>
          </div>

          {/* Signatures & Terms */}
          <div className="border-t border-slate-300 pt-6 mt-6 flex justify-between items-end text-xs text-slate-600">
            <div className="max-w-xs space-y-1">
              <p className="font-bold text-slate-800">Dispatch Terms:</p>
              <p className="text-[11px] leading-relaxed">
                • Goods once dispatched cannot be returned without prior verification.<br />
                • Check package seal and carton count upon transport delivery.
              </p>
            </div>

            <div className="text-center">
              <div className="w-40 border-b border-slate-400 mb-2 h-10" />
              <p className="font-bold text-slate-800 text-xs uppercase">Authorized Signatory</p>
              <p className="text-[10px] text-slate-500">SHIVAM Wholesale Showroom</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
