import React from "react";
import { X, Star, Layers, CheckCircle2, Cpu } from "lucide-react";
import type { Product } from "../types";
import { getProductImage, FALLBACK_IMAGE } from "../utils/productImages";

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  if (!product) return null;

  const imageUrl = getProductImage(product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {product.brand}
              </span>
              <span className="text-xs text-slate-400 font-medium px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700/60">
                {product.category?.name || "General"}
              </span>
              <span className="text-xs font-mono text-slate-500">ID #{product.id}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
              {product.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto py-5 space-y-5 flex-1 pr-1">
          {/* Image & Key Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Product Image */}
            <div className="h-44 sm:h-auto rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden flex items-center justify-center p-3">
              <img
                src={imageUrl}
                alt={product.name}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            {/* Price & Rating Bar */}
            <div className="sm:col-span-2 flex flex-col justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">Price</span>
                <div className="text-2xl font-bold text-white font-mono flex items-center">
                  ₹{product.price.toLocaleString("en-IN")}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Customer Rating</span>
                  <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-amber-300 font-bold text-xs">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{product.rating.toFixed(1)} / 5.0</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Inventory</span>
                  <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-400 font-medium text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{product.stock} In Stock</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              <span>Product Description</span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
              {product.description}
            </p>
          </div>

          {/* Specifications Table */}
          {product.specifications && product.specifications.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                <span>Technical Specifications</span>
              </h4>
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-slate-800/60">
                    {product.specifications.map((spec, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="py-2 px-4 font-medium text-slate-400 w-1/3 bg-slate-900/40">
                          {spec.key}
                        </td>
                        <td className="py-2 px-4 text-slate-200 font-mono">
                          {spec.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
