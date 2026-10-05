import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Combo, PricingRule } from "@/types";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import IconButton from "@/components/base/IconButton";
import ComboModal from "./components/ComboModal";
import TierRuleModal from "./components/TierRuleModal";
import OfferModal from "./components/OfferModal";
import {
  comboEstimatedCost,
  offerEndModeOf,
  offerRemaining,
  offerStatus,
  type OfferStatus,
} from "@/utils/pricing";
import { toCurrency, toNumber } from "@/utils/format";

type Tab = "all" | "combos" | "tiers" | "offers";

const tabs: { id: Tab; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "combos", label: "Combos" },
  { id: "tiers", label: "Precios por cantidad" },
  { id: "offers", label: "Ofertas temporales" },
];

const channelLabel = (channel: PricingRule["channel"]): string =>
  channel === "retail" ? "Minorista" : channel === "wholesale" ? "Mayorista" : "Ambos";

const offerStatusTone = (
  status: OfferStatus
): "success" | "warning" | "danger" | "neutral" => {
  if (status === "activa") return "success";
  if (status === "agotada") return "warning";
  if (status === "vencida") return "danger";
  return "neutral";
};

const offerStatusLabel = (status: OfferStatus): string => {
  switch (status) {
    case "activa":
      return "Activa";
    case "agotada":
      return "Agotada";
    case "vencida":
      return "Vencida";
    default:
      return "Pausada";
  }
};

const PromotionsPage = () => {
  const {
    state,
    productMap,
    saveCombo,
    deleteCombo,
    savePricingRule,
    deletePricingRule,
  } = useApp();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("all");

  const [comboOpen, setComboOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [presetProductId, setPresetProductId] = useState<string | undefined>();

  const [tierOpen, setTierOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [presetTierProductId, setPresetTierProductId] = useState<string | undefined>();

  const [offerOpen, setOfferOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PricingRule | null>(null);
  const [presetOfferProductId, setPresetOfferProductId] = useState<
    string | undefined
  >();

  useEffect(() => {
    const combo = searchParams.get("combo");
    const tier = searchParams.get("tier");
    const offer = searchParams.get("offer");
    if (combo) {
      setPresetProductId(combo);
      setEditingCombo(null);
      setComboOpen(true);
      setSearchParams({}, { replace: true });
    } else if (tier) {
      setPresetTierProductId(tier);
      setEditingRule(null);
      setTierOpen(true);
      setSearchParams({}, { replace: true });
    } else if (offer) {
      setPresetOfferProductId(offer);
      setEditingOffer(null);
      setOfferOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const tierRules = useMemo(
    () => state.pricingRules.filter((r) => r.type !== "temporal-offer"),
    [state.pricingRules]
  );
  const offerRules = useMemo(
    () => state.pricingRules.filter((r) => r.type === "temporal-offer"),
    [state.pricingRules]
  );

  const productName = (id: string): string =>
    productMap.get(id)?.name ?? "Producto";

  const showCombos = tab === "all" || tab === "combos";
  const showTiers = tab === "all" || tab === "tiers";
  const showOffers = tab === "all" || tab === "offers";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-background-200 bg-background-50 p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center p-1 rounded-full bg-background-100 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                tab === t.id
                  ? "bg-primary-500 text-background-50"
                  : "text-foreground-600 hover:text-foreground-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto flex-wrap">
          <Button
            variant="outline"
            icon="ri-price-tag-3-line"
            onClick={() => {
              setEditingRule(null);
              setTierOpen(true);
            }}
          >
            Nuevo precio por cantidad
          </Button>
          <Button
            variant="outline"
            icon="ri-flashlight-line"
            onClick={() => {
              setEditingOffer(null);
              setPresetOfferProductId(undefined);
              setOfferOpen(true);
            }}
          >
            Nueva oferta
          </Button>
          <Button
            icon="ri-gift-2-line"
            onClick={() => {
              setEditingCombo(null);
              setPresetProductId(undefined);
              setComboOpen(true);
            }}
          >
            Nuevo combo
          </Button>
        </div>
      </div>

      {showCombos ? (
        <section className="rounded-lg border border-background-200 bg-background-50">
          <div className="px-4 py-3 border-b border-background-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground-950">
              Combos y packs ({state.combos.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
            {state.combos.map((combo) => {
              const cost = comboEstimatedCost(combo, productMap);
              const profit = combo.price - cost;
              return (
                <div
                  key={combo.id}
                  className="rounded-md border border-background-200 p-4 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-8 h-8 rounded-md bg-accent-100 text-accent-700 flex items-center justify-center">
                        <i className="ri-gift-2-line" />
                      </span>
                      <span className="font-medium text-foreground-900">
                        {combo.name}
                      </span>
                    </div>
                    <Chip tone={combo.active ? "success" : "neutral"}>
                      {combo.active ? "Activo" : "Inactivo"}
                    </Chip>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Chip tone="secondary">{channelLabel(combo.channel)}</Chip>
                    <Chip tone="neutral">
                      {combo.components.length} componentes
                    </Chip>
                  </div>
                  <ul className="mt-3 text-xs text-foreground-600 space-y-1 flex-1">
                    {combo.components.map((c) => {
                      const p = productMap.get(c.productId);
                      return (
                        <li key={c.productId} className="flex justify-between gap-2">
                          <span className="truncate">
                            {p?.name ?? c.productId}
                          </span>
                          <span className="tabular-nums shrink-0">
                            {toNumber(c.quantity, p?.unit === "kg" ? 3 : 0)}{" "}
                            {p?.unit === "kg" ? "kg" : "un"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground-950 tabular-nums">
                        {toCurrency(combo.price)}
                      </p>
                      <p
                        className={`text-xs ${
                          profit < 0 ? "text-danger" : "text-success"
                        }`}
                      >
                        Ganancia {toCurrency(profit)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        icon={combo.active ? "ri-toggle-fill" : "ri-toggle-line"}
                        label={combo.active ? "Desactivar combo" : "Activar combo"}
                        onClick={() => saveCombo({ ...combo, active: !combo.active })}
                      />
                      <IconButton
                        icon="ri-edit-line"
                        label="Editar combo"
                        onClick={() => {
                          setEditingCombo(combo);
                          setPresetProductId(undefined);
                          setComboOpen(true);
                        }}
                      />
                      <IconButton
                        icon="ri-delete-bin-6-line"
                        label="Eliminar combo"
                        tone="danger"
                        onClick={() => {
                          deleteCombo(combo.id);
                          notify("Combo eliminado", "info", combo.name);
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {state.combos.length === 0 ? (
              <p className="text-sm text-foreground-400 col-span-full py-8 text-center">
                Todavia no hay combos.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {showTiers ? (
        <section className="rounded-lg border border-background-200 bg-background-50">
          <div className="px-4 py-3 border-b border-background-200">
            <h3 className="text-sm font-semibold text-foreground-950">
              Precios por cantidad y escalonados por kg ({tierRules.length})
            </h3>
          </div>
          <div className="divide-y divide-background-100">
            {tierRules.map((rule) => {
              const product = productMap.get(rule.productId);
              return (
                <div key={rule.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground-900">
                          {productName(rule.productId)}
                        </span>
                        <Chip tone="primary" icon="ri-price-tag-3-line">
                          {rule.label}
                        </Chip>
                        <Chip
                          tone={rule.type === "kg-tier" ? "accent" : "secondary"}
                        >
                          {rule.type === "kg-tier"
                            ? "Escalonado por kg"
                            : "Por cantidad"}
                        </Chip>
                        <Chip tone="neutral">{channelLabel(rule.channel)}</Chip>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rule.tiers.map((t) => (
                          <span
                            key={t.id}
                            className="px-2.5 py-1 rounded-md bg-background-100 text-xs text-foreground-700 tabular-nums"
                          >
                            {rule.type === "kg-tier"
                              ? `${t.from.toFixed(3)}–${
                                  t.to === null ? "∞" : t.to.toFixed(3)
                                } kg`
                              : `${t.from}–${t.to === null ? "∞" : t.to} un`}{" "}
                            → {toCurrency(t.price)}
                            {rule.type === "kg-tier" ? "/kg" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        icon={rule.active ? "ri-toggle-fill" : "ri-toggle-line"}
                        label={rule.active ? "Desactivar regla" : "Activar regla"}
                        onClick={() => savePricingRule({ ...rule, active: !rule.active })}
                      />
                      <IconButton
                        icon="ri-edit-line"
                        label="Editar regla de precio"
                        onClick={() => {
                          setEditingRule(rule);
                          setTierOpen(true);
                        }}
                      />
                      <IconButton
                        icon="ri-delete-bin-6-line"
                        label="Eliminar regla de precio"
                        tone="danger"
                        onClick={() => deletePricingRule(rule.id)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {tierRules.length === 0 ? (
              <p className="text-sm text-foreground-400 py-8 text-center">
                Todavia no hay precios por cantidad configurados.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {showOffers ? (
        <section className="rounded-lg border border-background-200 bg-background-50">
          <div className="px-4 py-3 border-b border-background-200">
            <h3 className="text-sm font-semibold text-foreground-950">
              Ofertas temporales ({offerRules.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
            {offerRules.map((rule) => (
              <div key={rule.id} className="rounded-md border border-background-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground-900">
                    {productName(rule.productId)}
                  </span>
                  <Chip
                    tone={offerStatusTone(
                      offerStatus(rule, productMap.get(rule.productId))
                    )}
                  >
                    {offerStatusLabel(
                      offerStatus(rule, productMap.get(rule.productId))
                    )}
                  </Chip>
                </div>
                <p className="text-xs text-foreground-500 mt-1">{rule.label}</p>
                <p className="mt-2 text-xl font-semibold text-primary-600 tabular-nums">
                  {toCurrency(rule.offerPrice ?? 0)}
                </p>
                <div className="mt-2 text-xs text-foreground-500 space-y-0.5">
                  <p>
                    Vigencia:{" "}
                    {rule.endDate
                      ? new Date(rule.endDate).toLocaleDateString("es-AR")
                      : offerEndModeOf(rule) === "stock"
                        ? "hasta agotar stock"
                        : "sin fecha"}
                  </p>
                  {rule.maxUnits !== null ? (
                    <>
                      <p>
                        Cupo inicial:{" "}
                        {toNumber(
                          rule.maxUnits,
                          productMap.get(rule.productId)?.unit === "kg" ? 3 : 0
                        )}{" "}
                        {productMap.get(rule.productId)?.unit === "kg" ? "kg" : "un"}
                      </p>
                      <p>
                        Consumido:{" "}
                        {toNumber(
                          rule.consumedUnits,
                          productMap.get(rule.productId)?.unit === "kg" ? 3 : 0
                        )}{" "}
                        · Restante:{" "}
                        {toNumber(
                          offerRemaining(rule) ?? 0,
                          productMap.get(rule.productId)?.unit === "kg" ? 3 : 0
                        )}
                      </p>
                    </>
                  ) : offerEndModeOf(rule) === "stock" ? (
                    <p>Sin cupo: aplica mientras haya stock físico.</p>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon="ri-edit-line"
                    onClick={() => {
                      setEditingOffer(rule);
                      setOfferOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="ri-delete-bin-6-line"
                    onClick={() => deletePricingRule(rule.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
            {offerRules.length === 0 ? (
              <p className="text-sm text-foreground-400 col-span-full py-8 text-center">
                Todavia no hay ofertas temporales.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <ComboModal
        open={comboOpen}
        onClose={() => {
          setComboOpen(false);
          setPresetProductId(undefined);
        }}
        combo={editingCombo}
        presetProductId={presetProductId}
        onSaved={(combo) => {
          saveCombo(combo);
          setComboOpen(false);
          setPresetProductId(undefined);
          notify("Combo guardado", "success", combo.name);
        }}
      />

      <TierRuleModal
        open={tierOpen}
        onClose={() => {
          setTierOpen(false);
          setPresetTierProductId(undefined);
        }}
        rule={editingRule}
        presetProductId={presetTierProductId}
        onSaved={(rule) => {
          savePricingRule(rule);
          setTierOpen(false);
          setPresetTierProductId(undefined);
          notify("Tramos guardados", "success", productName(rule.productId));
        }}
      />

      <OfferModal
        open={offerOpen}
        onClose={() => {
          setOfferOpen(false);
          setPresetOfferProductId(undefined);
        }}
        rule={editingOffer}
        presetProductId={presetOfferProductId}
        onSaved={(rule) => {
          savePricingRule(rule);
          setOfferOpen(false);
          setPresetOfferProductId(undefined);
          notify("Oferta guardada", "success", productName(rule.productId));
        }}
      />
    </div>
  );
};

export default PromotionsPage;