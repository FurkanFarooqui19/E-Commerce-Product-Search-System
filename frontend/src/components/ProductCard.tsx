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

  // Format relevance score percentage for bar
  const scorePercent = Math.min(Math.max(Math.round(score * 100), 5), 100);

  // Score badge style
  const getScoreBadge = () => {
    if (score >= 0.75) {
      return {
        text: "text-emerald-700 dark:text-emerald-400 font-semibold",
        bar: "bg-emerald-500",
        bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50",
        track: "bg-emerald-200/70 dark:bg-surface-well",
      };
    } else if (score >= 0.45) {
      return {
        text: "text-primary dark:text-primary-light font-semibold",
        bar: "bg-primary",
        bg: "bg-blue-50 dark:bg-primary-dark/20 border-blue-200 dark:border-primary-dark/40",
        track: "bg-blue-200/70 dark:bg-surface-well",
      };
    } else {
      return {
        text: "text-amber-700 dark:text-amber-400 font-semibold",
        bar: "bg-amber-500",
        bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50",
        track: "bg-amber-200/70 dark:bg-surface-well",
      };
    }
  };

  // Rank badge styling
  const getRankBadgeStyle = (r: number) => {
    if (r === 1) {
      return "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300 font-bold";
    }
    if (r === 2) {
      return "bg-slate-200/70 dark:bg-slate-300/15 border-slate-300 dark:border-slate-300/40 text-slate-700 dark:text-slate-200 font-bold";
    }
    if (r === 3) {
      return "bg-amber-700/15 border-amber-600/40 text-amber-700 dark:text-amber-200 font-bold";
    }
    return "bg-surface-muted border-border text-slate-600 dark:text-slate-400 font-medium";
  };

  const badge = getScoreBadge();
  const imageUrl = getProductImage(product);

  return (
    <div
      onClick={() => onSelect(product)}
      className="group surface-card surface-card-hover rounded-xl p-4 cursor-pointer flex flex-col justify-between transition-colors relative"
    >
      <div>
        {/* Top Meta: Rank & Score Gauge */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-3">
          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
            <span
              className={`flex items-center justify-center h-5 px-1.5 rounded border text-[10px] sm:text-[11px] font-mono tracking-tight flex-shrink-0 ${getRankBadgeStyle(
                rank
              )}`}
            >
              #{rank}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono font-medium tracking-wider text-slate-500 dark:text-slate-400 uppercase truncate max-w-[90px] xs:max-w-[120px]">
              {product.brand}
            </span>
          </div>

          <div
            className={`flex items-center space-x-1.5 sm:space-x-2 px-1.5 sm:px-2 py-0.5 rounded border text-[10px] sm:text-[11px] font-mono flex-shrink-0 ${badge.bg}`}
          >
            <div className={`w-7 sm:w-10 h-1.5 ${badge.track} rounded-full overflow-hidden`}>
              <div
                className={`h-full ${badge.bar} rounded-full transition-all`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <span className={badge.text}>{score.toFixed(3)}</span>
          </div>
        </div>

        {/* Product Image Container */}
        <div className="relative w-full h-40 mb-3 rounded-lg bg-surface-well border border-border/80 overflow-hidden flex items-center justify-center p-3 group-hover:border-slate-400 dark:group-hover:border-slate-600 transition-colors">
          <img
            src={imageUrl}
            alt={product.name}
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
            loading="lazy"
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
          />

          {/* Stock badge overlay */}
          <div className="absolute bottom-2 left-2">
            {product.stock > 10 ? (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-surface-elevated/90 border border-border text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span>In Stock ({product.stock})</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-surface-elevated/90 border border-amber-600/40 text-[10px] text-amber-600 dark:text-amber-300 font-mono">
                <AlertTriangle className="h-2.5 w-2.5" />
                <span>Low ({product.stock})</span>
              </span>
            )}
          </div>
        </div>

        {/* Product Title */}
        <h3 className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-primary dark:group-hover:text-primary-light transition-colors line-clamp-2 mb-1.5 leading-snug tracking-tight">
          {product.name}
        </h3>

        {/* Description Snippet */}
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed font-sans">
          {product.description}
        </p>

        {/* Key Specs chips */}
        {product.specifications && product.specifications.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.specifications.slice(0, 2).map((spec, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted border border-border text-slate-700 dark:text-slate-300 font-mono"
              >
                <span className="text-slate-400 dark:text-slate-500">{spec.key}:</span> {spec.value}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer: Price, Rating, Category & Inspect */}
      <div className="pt-3 border-t border-border flex items-center justify-between mt-1">
        <div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider flex items-center space-x-1 truncate max-w-[110px] xs:max-w-[140px]">
            <Layers className="h-2.5 w-2.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <span className="truncate">{product.category?.name || "General"}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-display tracking-tight">
            ₹{product.price.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-surface-muted border border-border px-1.5 py-0.5 rounded text-xs font-medium text-amber-600 dark:text-amber-300 font-mono">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{product.rating.toFixed(1)}</span>
          </div>

          <div className="h-6 w-6 rounded bg-surface-muted border border-border flex items-center justify-center text-slate-400 group-hover:border-primary/50 group-hover:text-primary dark:group-hover:text-primary-light transition-colors">
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
