import { Star, ChevronRight } from "lucide-react";
import type { Product, SearchResultItem } from "../types";
import { getProductImage, FALLBACK_IMAGE } from "../utils/productImages";

interface ProductCardProps {
  item: SearchResultItem;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, onSelect }) => {
  const { rank, score, product } = item;

  // Format relevance score as a clean percentage or decimal score
  const scorePercent = Math.min(Math.round(score * 100), 100);

  // Score color badge
  const getScoreBadge = () => {
    if (scorePercent >= 80) {
      return {
        bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      };
    } else if (scorePercent >= 50) {
      return {
        bg: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
      };
    } else {
      return {
        bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
      };
    }
  };

  const badge = getScoreBadge();
  const imageUrl = getProductImage(product);

  return (
    <div
      onClick={() => onSelect(product)}
      className="glass-panel glass-panel-hover rounded-2xl p-4 sm:p-5 cursor-pointer flex flex-col justify-between group transition-all duration-300 overflow-hidden"
    >
      <div>
        {/* Top Meta: Rank & Score Gauge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-md bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300">
              #{rank}
            </span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {product.brand}
            </span>
          </div>

          <div
            className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border text-xs font-mono font-semibold ${badge.bg}`}
          >
            <span>Score</span>
            <span>{score.toFixed(4)}</span>
          </div>
        </div>

        {/* Product Image Container */}
        <div className="relative w-full h-44 mb-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 overflow-hidden flex items-center justify-center p-2 group-hover:border-indigo-500/40 transition-all">
          <img
            src={imageUrl}
            alt={product.name}
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 rounded-lg"
          />
        </div>

        {/* Product Title */}
        <h3 className="font-semibold text-sm sm:text-base text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 mb-1.5 leading-snug">
          {product.name}
        </h3>

        {/* Description Snippet */}
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {product.description}
        </p>

        {/* Key Specs chips */}
        {product.specifications && product.specifications.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.specifications.slice(0, 2).map((spec, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono"
              >
                <span className="text-slate-500">{spec.key}:</span> {spec.value}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer: Price, Rating, Category */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-1">
        <div>
          <div className="text-[11px] text-slate-400 font-medium">
            {product.category?.name || "General"}
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-100 font-mono">
            ₹{product.price.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg text-xs font-semibold text-amber-300">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{product.rating.toFixed(1)}</span>
          </div>

          <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all text-slate-400">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
