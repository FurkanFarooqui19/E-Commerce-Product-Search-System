import React from "react";
import { Star, ChevronRight, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import type { Product, SearchResultItem } from "../types";
import { getProductImage, FALLBACK_IMAGE } from "../utils/productImages";

interface ProductCardProps {
  item: SearchResultItem;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, onSelect }) => {
  const { rank, score, product } = item;

  // Format relevance score percentage
  const scorePercent = Math.min(Math.round(score * 100), 100);

  // Score color badge
  const getScoreBadge = () => {
    if (scorePercent >= 80) {
      return {
        bg: "bg-emerald-500/15 border-emerald-500/35 text-emerald-300",
        indicator: "bg-emerald-400",
      };
    } else if (scorePercent >= 50) {
      return {
        bg: "bg-indigo-500/15 border-indigo-500/35 text-indigo-200",
        indicator: "bg-indigo-400",
      };
    } else {
      return {
        bg: "bg-amber-500/15 border-amber-500/35 text-amber-300",
        indicator: "bg-amber-400",
      };
    }
  };

  // Rank badge styling for Top 3 vs standard
  const getRankBadgeStyle = (r: number) => {
    if (r === 1) {
      return "bg-gradient-to-r from-amber-500/25 to-yellow-500/25 border-amber-500/50 text-amber-200 font-bold shadow-sm shadow-amber-500/20";
    }
    if (r === 2) {
      return "bg-gradient-to-r from-slate-200/25 to-slate-400/25 border-slate-300/50 text-slate-100 font-bold";
    }
    if (r === 3) {
      return "bg-gradient-to-r from-amber-700/25 to-orange-700/25 border-amber-600/50 text-orange-200 font-bold";
    }
    return "bg-surface-well border-border text-slate-400 font-medium";
  };

  const badge = getScoreBadge();
  const imageUrl = getProductImage(product);

  return (
    <div
      onClick={() => onSelect(product)}
      className="group relative glass-panel glass-panel-hover rounded-2xl p-4 sm:p-5 cursor-pointer flex flex-col justify-between transition-all duration-300 overflow-hidden"
    >
      {/* Top subtle highlight line */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div>
        {/* Top Meta: Rank & Score Gauge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <span
              className={`flex items-center justify-center h-6 px-2 rounded-lg border text-xs font-mono tracking-tight ${getRankBadgeStyle(
                rank
              )}`}
            >
              #{rank}
            </span>
            <span className="text-[11px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
              {product.brand}
            </span>
          </div>

          <div
            className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-semibold ${badge.bg}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badge.indicator}`}></span>
            <span>Score: {score.toFixed(4)}</span>
          </div>
        </div>

        {/* Product Image Showcase Container */}
        <div className="relative w-full h-44 mb-3.5 rounded-xl bg-surface-well border border-border overflow-hidden flex items-center justify-center p-3 group-hover:border-indigo-500/40 transition-all duration-300 shadow-inner">
          <img
            src={imageUrl}
            alt={product.name}
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 rounded-lg drop-shadow-md"
          />

          {/* Stock badge overlay */}
          <div className="absolute bottom-2 left-2">
            {product.stock > 10 ? (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-surface-well/90 backdrop-blur-md border border-border text-[10px] text-emerald-300 font-mono">
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span>In Stock ({product.stock})</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-surface-well/90 backdrop-blur-md border border-amber-500/40 text-[10px] text-amber-300 font-mono">
                <AlertTriangle className="h-2.5 w-2.5" />
                <span>Low Stock ({product.stock})</span>
              </span>
            )}
          </div>
        </div>

        {/* Product Title */}
        <h3 className="font-display font-bold text-sm sm:text-base text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 mb-1.5 leading-snug tracking-tight">
          {product.name}
        </h3>

        {/* Description Snippet */}
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed font-sans">
          {product.description}
        </p>

        {/* Key Specs chips */}
        {product.specifications && product.specifications.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.specifications.slice(0, 2).map((spec, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-md bg-surface-muted border border-border text-slate-300 font-mono"
              >
                <span className="text-slate-500">{spec.key}:</span> {spec.value}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer: Price, Rating, Category & Inspect */}
      <div className="pt-3 border-t border-border flex items-center justify-between mt-1">
        <div>
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider flex items-center space-x-1">
            <Layers className="h-2.5 w-2.5 text-slate-500" />
            <span>{product.category?.name || "General"}</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono tracking-tight">
            ₹{product.price.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-amber-500/15 border border-amber-500/30 px-2 py-1 rounded-lg text-xs font-semibold text-amber-300 font-mono">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{product.rating.toFixed(1)}</span>
          </div>

          <div className="h-7 w-7 rounded-lg bg-surface-muted border border-border flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-500 group-hover:text-white transition-all text-slate-400 shadow-sm">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
