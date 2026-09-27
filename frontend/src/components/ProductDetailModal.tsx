import React, { useEffect } from "react";
import { X, Star, Layers, CheckCircle2, AlertTriangle, Cpu, Terminal } from "lucide-react";
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-surface-elevated border border-border-strong rounded-xl p-4 sm:p-6 shadow-modal overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-border">
          <div className="min-w-0 pr-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded bg-surface border border-border text-slate-700 dark:text-slate-300">
                {product.brand}
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-600 dark:text-slate-400 px-1.5 sm:px-2 py-0.5 rounded bg-surface border border-border truncate max-w-[150px]">
                {product.category?.name || "General"}
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-500">
                Doc #{product.id}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-sans font-bold text-slate-900 dark:text-white leading-snug break-words">
              {product.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 sm:p-2 rounded-lg bg-surface border border-border text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto py-3 sm:py-4 space-y-3.5 sm:space-y-4 flex-1 pr-1">
          {/* Image & Price Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Product Image */}
            <div className="h-44 sm:h-auto rounded-lg bg-surface-well border border-border overflow-hidden flex items-center justify-center p-3">
              <img
                src={imageUrl}
                alt={product.name}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Price & Specs Metrics */}
            <div className="sm:col-span-2 flex flex-col justify-between p-4 rounded-lg bg-surface border border-border space-y-3">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block mb-1">Catalog Price</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight flex items-baseline space-x-2">
                  <span>₹{product.price.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-sans font-normal">tax inclusive</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block mb-1">Customer Rating</span>
                  <div className="flex items-center space-x-1.5 bg-surface-muted border border-border px-2 py-1 rounded text-amber-600 dark:text-amber-300 font-bold text-xs font-mono">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{product.rating.toFixed(1)} / 5.0</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block mb-1">Corpus Stock</span>
                  {product.stock > 10 ? (
                    <div className="flex items-center space-x-1.5 bg-surface-muted border border-border px-2 py-1 rounded text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{product.stock} Units</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 bg-surface-muted border border-border px-2 py-1 rounded text-amber-600 dark:text-amber-400 font-mono text-xs">
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
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center space-x-1.5">
              <Layers className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              <span>Corpus Document Text</span>
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-surface-muted p-3.5 rounded-lg border border-border font-sans">
              {product.description}
            </p>
          </div>

          {/* Specifications Table */}
          {product.specifications && product.specifications.length > 0 && (
            <div>
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center space-x-1.5">
                <Cpu className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                <span>Indexed Key-Value Attributes</span>
              </h4>
              <div className="rounded-lg border border-border overflow-hidden bg-surface-muted">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-border">
                    {product.specifications.map((spec, idx) => (
                      <tr key={idx} className="hover:bg-surface/60 transition-colors">
                        <td className="py-2 px-3 font-mono font-medium text-slate-500 dark:text-slate-400 w-1/3 bg-surface/40">
                          {spec.key}
                        </td>
                        <td className="py-2 px-3 text-slate-800 dark:text-slate-200 font-mono">
                          {spec.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* IR Engine Indexing Weights Callout */}
          <div className="p-3 rounded-lg bg-surface border border-border text-[11px] text-slate-600 dark:text-slate-300 flex items-center space-x-2.5">
            <Terminal className="h-4 w-4 text-primary-light flex-shrink-0" />
            <span className="font-mono text-[11px]">
              Indexed weights: Name (3.0×) · Category (2.0×) · Description (1.5×) · Specs (1.0×)
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1">
            <span className="kbd-shortcut">ESC</span>
            <span>to close</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-elevated text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
