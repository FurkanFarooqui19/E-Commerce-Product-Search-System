import React, { useEffect } from "react";
import { X, Star, Layers, CheckCircle2, Cpu, AlertTriangle, Tag, Sparkles } from "lucide-react";
import type { Product } from "../types";
import { getProductImage, FALLBACK_IMAGE } from "../utils/productImages";

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const imageUrl = getProductImage(product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-surface border border-border-strong rounded-3xl p-6 sm:p-8 shadow-glass-lg overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-border relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                {product.brand}
              </span>
              <span className="text-[11px] font-mono text-slate-300 px-2.5 py-0.5 rounded-md bg-surface-muted border border-border">
                {product.category?.name || "General"}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Doc ID #{product.id}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white leading-tight tracking-tight">
              {product.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close product modal"
            className="p-2 rounded-xl bg-surface-muted border border-border text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto py-5 space-y-5 flex-1 pr-1.5 relative z-10">
          {/* Image & Price Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Product Image */}
            <div className="h-48 sm:h-auto rounded-2xl bg-surface-well border border-border overflow-hidden flex items-center justify-center p-3 shadow-inner">
              <img
                src={imageUrl}
                alt={product.name}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
                className="w-full h-full object-contain rounded-xl drop-shadow-md"
              />
            </div>

            {/* Price & Specs Gauge */}
            <div className="sm:col-span-2 flex flex-col justify-between p-5 rounded-2xl bg-surface-muted border border-border space-y-4">
              <div>
                <span className="text-xs text-slate-400 font-mono block mb-1">Selling Price</span>
                <div className="text-3xl font-extrabold text-white font-mono tracking-tight flex items-baseline space-x-2">
                  <span>₹{product.price.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-slate-400 font-sans font-normal">incl. all taxes</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div>
                  <span className="text-[11px] text-slate-400 font-mono block mb-1">Customer Rating</span>
                  <div className="flex items-center space-x-1.5 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 rounded-xl text-amber-300 font-bold text-xs font-mono">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{product.rating.toFixed(1)} / 5.0</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-mono block mb-1">Inventory Status</span>
                  {product.stock > 10 ? (
                    <div className="flex items-center space-x-1.5 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl text-emerald-300 font-mono text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{product.stock} Units</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 rounded-xl text-amber-300 font-mono text-xs">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{product.stock} Units</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              <span>Corpus Document Description</span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-surface-well/70 p-4 rounded-2xl border border-border font-sans">
              {product.description}
            </p>
          </div>

          {/* Specifications Table */}
          {product.specifications && product.specifications.length > 0 && (
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                <span>Indexed Field Attributes & Specifications</span>
              </h4>
              <div className="rounded-2xl border border-border overflow-hidden bg-surface-well/60">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-border">
                    {product.specifications.map((spec, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-400 w-1/3 bg-surface-muted/60">
                          {spec.key}
                        </td>
                        <td className="py-2.5 px-4 text-slate-200 font-mono">
                          {spec.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Search Index Metadata Callout */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200 flex items-center space-x-2.5">
            <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0" />
            <span>
              This document is indexed in the inverted index across Name (3.0x), Description (1.5x), Category (2.0x), and Specs (1.0x).
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between relative z-10">
          <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5">
            <Tag className="h-3 w-3" />
            <span>Press Esc to close</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-muted border border-border hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
