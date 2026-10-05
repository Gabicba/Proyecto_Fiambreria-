import { useMemo, useState, type KeyboardEvent, type RefObject } from "react";
import type { Channel } from "@/types";
import { useApp } from "@/store/AppContext";
import { searchCatalog, type CatalogResult } from "@/utils/search";
import { normalizeText } from "@/utils/format";
import Chip from "@/components/base/Chip";

interface SearchPanelProps {
  channel: Channel;
  onPick: (result: CatalogResult) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onEmptySubmit?: () => void;
}

const stockTone = (stock: number | null) => {
  if (stock === null) return "accent" as const;
  if (stock < 0) return "danger" as const;
  if (stock === 0) return "warning" as const;
  return "neutral" as const;
};

const SearchPanel = ({ channel, onPick, inputRef, onEmptySubmit }: SearchPanelProps) => {
  const { state, productMap } = useApp();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const results = useMemo(
    () =>
      searchCatalog({
        query,
        products: state.products,
        combos: state.combos,
        categories: state.categories,
        productMap,
        rules: state.pricingRules,
        channel,
      }),
    [query, state.products, state.combos, state.categories, state.pricingRules, productMap, channel]
  );

  const exactBarcode = useMemo(() => {
    const raw = normalizeText(query).trim();
    if (!raw) return null;
    return (
      state.products.find(
        (p) =>
          normalizeText(p.barcode) === raw ||
          normalizeText(p.internalCode) === raw
      ) ?? null
    );
  }, [query, state.products]);

  const pick = (result: CatalogResult | undefined) => {
    if (!result) return;
    onPick(result);
    setQuery("");
    setIndex(0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim() === "") {
        onEmptySubmit?.();
        return;
      }
      if (exactBarcode) {
        pick({
          kind: "product",
          id: exactBarcode.id,
          name: exactBarcode.name,
          brand: exactBarcode.brand,
          unit: exactBarcode.unit,
          category: "",
          price: 0,
          priceLabel: "",
          stock: exactBarcode.stock,
          promo: null,
          score: 0,
        });
        return;
      }
      pick(results[index]);
    }
  };

  return (
    <section className="flex-1 min-w-0 flex flex-col bg-background-50 rounded-lg border border-background-200">
      <div className="p-4 border-b border-background-200">
        <div className="relative flex items-center">
          <i className="ri-search-line absolute left-4 text-foreground-400 text-lg" />
          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar producto, marca, codigo, combo... (ej: jam pal)"
            className="w-full h-14 pl-12 pr-28 rounded-md border border-background-300 bg-background-50 text-base text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
          <div className="absolute right-3 flex items-center gap-1 text-[11px] text-foreground-400">
            <span className="px-1.5 py-0.5 rounded border border-background-300">
              Enter
            </span>
            <span>agregar</span>
          </div>
        </div>
        {exactBarcode ? (
          <div className="mt-2 flex items-center gap-2 text-xs text-info">
            <i className="ri-barcode-line" />
            Codigo detectado: {exactBarcode.barcode || exactBarcode.internalCode}{" "}
            · Enter para agregar
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {query.trim() === "" ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-foreground-400 py-16">
            <i className="ri-barcode-box-line text-5xl" />
            <p className="mt-3 text-sm">
              Escribi para buscar. Podes usar palabras sueltas o en cualquier
              orden.
            </p>
            <p className="text-xs mt-1">
              Ej: <span className="font-medium">jam pal</span> encuentra Jamon
              Paladini.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-foreground-400 py-16">
            <i className="ri-emotion-sad-line text-5xl" />
            <p className="mt-3 text-sm">Sin resultados para {`"${query}"`}.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {results.map((result, i) => (
              <li key={`${result.kind}-${result.id}`}>
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => pick(result)}
                  className={`w-full text-left px-3 py-2.5 rounded-md border flex items-center gap-3 cursor-pointer transition-colors ${
                    i === index
                      ? "border-primary-300 bg-primary-50"
                      : "border-background-200 hover:bg-background-100"
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${
                      result.kind === "combo"
                        ? "bg-accent-100 text-accent-700"
                        : "bg-background-100 text-foreground-600"
                    }`}
                  >
                    <i
                      className={
                        result.kind === "combo"
                          ? "ri-gift-2-line text-lg"
                          : result.unit === "kg"
                            ? "ri-scales-3-line text-lg"
                            : "ri-shopping-bag-3-line text-lg"
                      }
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground-900 truncate">
                        {result.name}
                      </span>
                      {result.kind === "combo" ? (
                        <Chip tone="accent" icon="ri-gift-2-line">
                          COMBO
                        </Chip>
                      ) : null}
                      {result.promo ? (
                        <Chip tone="primary" icon="ri-price-tag-3-line">
                          {result.promo}
                        </Chip>
                      ) : null}
                    </span>
                    <span className="block text-xs text-foreground-500 truncate">
                      {result.brand}
                      {result.category ? ` · ${result.category}` : ""}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-sm font-semibold text-foreground-900 tabular-nums">
                      {result.priceLabel}
                    </span>
                    {result.stock !== null ? (
                      <Chip tone={stockTone(result.stock)}>
                        Stock {result.stock}
                      </Chip>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SearchPanel;