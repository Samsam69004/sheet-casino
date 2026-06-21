// Betify Tracker v1.4.1 - Restored version
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/supabase";
import { PlusCircle, TrendingUp, History, Trash2, Loader2, Coins, Calculator, RefreshCcw } from "lucide-react";

// --- Types ---
type Mission = {
  id: string;
  description: string;
  cash_amount: number;
  byts_amount: number;
  player: "Sami" | "Brice";
  split_strategy: "50/50" | "sami75" | "brice75";
  date: string;
  created_at: string;
};

type MissionForm = {
  description: string;
  cash: string;
  byts: string;
  player: "Sami" | "Brice";
  split: "50/50" | "sami75" | "brice75";
  date: string;
};

function describeAppError(err: unknown) {
  if (err instanceof Error) {
    const parts = [err.name, err.message, err.cause instanceof Error ? err.cause.message : ""]
      .filter((part) => typeof part === "string" && part.trim().length > 0);

    if (parts.length > 0) {
      return parts.join(" | ");
    }

    return err.toString();
  }

  if (err && typeof err === "object") {
    const typedErr = err as Record<string, unknown>;
    const rawProps = new Set([
      ...Object.getOwnPropertyNames(err),
      ...Object.keys(typedErr)
    ]);

    const candidateValues = Array.from(rawProps)
      .map((key) => typedErr[key])
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    const parts = [
      typedErr.message,
      typedErr.code,
      typedErr.details,
      typedErr.hint,
      typedErr.error,
      typedErr.error_description,
      typedErr.status,
      typedErr.statusText,
      ...candidateValues
    ].filter((part): part is string => typeof part === "string" && part.trim().length > 0);

    if (parts.length > 0) {
      return parts.join(" | ");
    }

    const ctorName = (err as { constructor?: { name?: string } }).constructor?.name;
    if (ctorName && ctorName !== "Object") {
      return ctorName;
    }

    try {
      const stringified = JSON.stringify(err, Object.getOwnPropertyNames(err));
      if (stringified && stringified !== "{}") {
        return stringified;
      }
    } catch {
    }

    return "Erreur inconnue Supabase";
  }

  if (typeof err === "string" && err.trim()) {
    return err;
  }

  return "Erreur inconnue Supabase";
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState<MissionForm>({
    description: "",
    cash: "",
    byts: "0",
    player: "Sami",
    split: "50/50",
    date: new Date().toISOString().split("T")[0]
  });

  useEffect(() => {
    fetchMissions();
  }, []);

  async function fetchMissions() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setMissions(data);
    } catch {
      setErrorMessage("Impossible de charger les missions.");
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    let totalByts = 0;
    let totalCash = 0;
    let samiOwesBrice = 0;

    missions.forEach(m => {
      totalByts += m.byts_amount;
      totalCash += m.cash_amount;

      let ratios = { sami: 0.5, brice: 0.5 };
      if (m.split_strategy === "sami75") ratios = { sami: 0.75, brice: 0.25 };
      if (m.split_strategy === "brice75") ratios = { sami: 0.25, brice: 0.75 };

      if (m.player === "Sami") {
        samiOwesBrice += (m.cash_amount * ratios.brice);
      } else {
        samiOwesBrice -= (m.cash_amount * ratios.sami);
      }
    });

    return {
      totalByts,
      totalCash,
      netProfit: totalCash + (totalByts / 160),
      samiOwesBrice
    };
  }, [missions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description) return;

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("missions").insert([
        {
          description: form.description,
          cash_amount: parseFloat(form.cash) || 0,
          byts_amount: parseFloat(form.byts) || 0,
          player: form.player,
          split_strategy: form.split,
          date: form.date
        }
      ]);

      if (error) throw error;

      setForm({ ...form, description: "", cash: "", byts: "0" });
      await fetchMissions();
    } catch (err) {
      const message = describeAppError(err);
      setErrorMessage(`Impossible d'ajouter la mission. ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteMission = async (id: string) => {
    if (!confirm("Supprimer cette mission ?")) return;
    await supabase.from("missions").delete().eq("id", id);
    fetchMissions();
  };

  const resetTracker = async () => {
    if (!confirm("Voulez-vous vraiment remettre tous les compteurs à zéro ?")) return;
    try {
      await supabase.from("missions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await fetchMissions();
    } catch (err) {
      setErrorMessage(`Impossible de réinitialiser le tracker. ${describeAppError(err)}`);
    }
  };

  // Groupement par date avec calculs journaliers et cumulés
  const groupedMissions = useMemo(() => {
    const groups: Record<string, Mission[]> = {};
    const sorted = [...missions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningNet = 0;
    const dateStats: Record<string, { dayProfit: number, dayCash: number, netCumule: number }> = {};

    sorted.forEach(m => {
      if (!groups[m.date]) groups[m.date] = [];
      groups[m.date].push(m);

      const profit = m.cash_amount + (m.byts_amount / 160);
      runningNet += profit;

      if (!dateStats[m.date]) {
        dateStats[m.date] = { dayProfit: 0, dayCash: 0, netCumule: 0 };
      }
      dateStats[m.date].dayProfit += profit;
      dateStats[m.date].dayCash += m.cash_amount;
      dateStats[m.date].netCumule = runningNet;
    });

    const reversedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return { groups, reversedDates, dateStats };
  }, [missions]);

  const getLineDetails = (m: Mission) => {
    const bytsValue = m.byts_amount / 160;
    const net = m.cash_amount + bytsValue;

    let ratios = { sami: 0.5, brice: 0.5 };
    if (m.split_strategy === "sami75") ratios = { sami: 0.75, brice: 0.25 };
    if (m.split_strategy === "brice75") ratios = { sami: 0.25, brice: 0.75 };

    const other = m.player === "Sami" ? "Brice" : "Sami";
    const amountOwed = m.player === "Sami" ? (m.cash_amount * ratios.brice) : (m.cash_amount * ratios.sami);

    return { net, amountOwed, other, bytsValue };
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 border-b border-zinc-800 pb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic">
              BETIFY <span className="text-yellow-500">TRACKER</span>
            </h1>
            <p className="text-zinc-500 mt-2 font-bold text-xs uppercase tracking-widest">Production v1.4.1</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Bilan Partagé : Sami & Brice</p>
            <p className="text-xl font-mono font-black text-yellow-500">{missions.length} Missions Enregistrées</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Coins size={12}/> Balance Collective</p>
            <p className="text-xl font-mono font-bold mt-2">{totals.totalByts.toLocaleString()} BYTS <span className="text-zinc-500">({(totals.totalByts / 160).toFixed(2)}€)</span></p>
            <p className="text-sm text-zinc-400 mt-1">Total Cash (Collectif) : <span className={totals.totalCash >= 0 ? "text-green-500" : "text-red-500"}>{totals.totalCash.toFixed(2)}€</span></p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl border-l-4 border-l-yellow-500">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Bénéfice Net Total</p>
            <p className={`text-3xl font-mono font-black mt-1 ${totals.netProfit >= 0 ? "text-green-400" : "text-red-500"}`}>
              {totals.netProfit >= 0 ? "+" : ""}{totals.netProfit.toFixed(2)}€
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Calculator size={12}/> Règlement des Comptes</p>
            <p className="text-sm font-bold mt-2">
              {totals.samiOwesBrice > 0 ? `Sami doit ${Math.abs(totals.samiOwesBrice).toFixed(2)}€ à Brice` : totals.samiOwesBrice < 0 ? `Brice doit ${Math.abs(totals.samiOwesBrice).toFixed(2)}€ à Sami` : "Équilibre parfait"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 p-6 rounded-3xl mb-12 shadow-2xl">
          {errorMessage ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Mission</label>
              <input required className="bg-black border border-zinc-800 rounded-xl p-3 outline-none focus:border-yellow-500 transition-colors"
                placeholder="Nom de la mission..."
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Cash € +/-</label>
              <input type="number" step="0.01" className="bg-black border border-zinc-800 rounded-xl p-3 outline-none text-green-400 font-bold"
                value={form.cash}
                onChange={e => setForm({...form, cash: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Byts</label>
              <input type="number" className="bg-black border border-zinc-800 rounded-xl p-3 outline-none text-yellow-500 font-bold"
                value={form.byts}
                onChange={e => setForm({...form, byts: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Date & Joueur</label>
              <div className="flex gap-2">
                <input type="date" className="bg-black border border-zinc-800 rounded-xl p-3 text-xs flex-1 outline-none"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                />
                <select className="bg-black border border-zinc-800 rounded-xl p-3 text-xs font-bold outline-none"
                  value={form.player}
                  onChange={e => setForm({ ...form, player: e.target.value as MissionForm["player"] })}
                >
                  <option value="Sami">SAMI</option>
                  <option value="Brice">BRICE</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Répartition des Gains (Split)</label>
              <select className="bg-black border border-zinc-800 rounded-xl p-3 text-xs font-bold outline-none"
                value={form.split}
                onChange={e => setForm({ ...form, split: e.target.value as MissionForm["split"] })}
              >
                <option value="50/50">Split 50% / 50%</option>
                <option value="sami75">Sami 75% / Brice 25%</option>
                <option value="brice75">Brice 75% / Sami 25%</option>
              </select>
            </div>
          </div>
          <button disabled={isSubmitting} className="w-full bg-white hover:bg-yellow-500 hover:text-black text-black font-black px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <PlusCircle size={18} />}
            ENREGISTRER LA MISSION
          </button>
        </form>

        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="flex items-center gap-2 text-xs font-black text-zinc-600 uppercase tracking-widest"><History size={14} /> Historique des Gains</h3>
            <button onClick={resetTracker} className="text-[10px] font-bold text-zinc-700 hover:text-red-500 flex items-center gap-1 transition-colors"><RefreshCcw size={10}/> REMETTRE À ZÉRO</button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-zinc-700 animate-pulse italic">Chargement...</div>
          ) : (
            groupedMissions.reversedDates.map((date) => {
              const stats = groupedMissions.dateStats[date];
              const dateMissions = groupedMissions.groups[date];

              return (
                <div key={date} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="font-black text-sm text-zinc-200 capitalize">{new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    <div className="flex gap-4 text-[10px] font-bold uppercase tracking-tighter">
                      <span className={stats.dayProfit >= 0 ? "text-green-500" : "text-red-500"}>Bénéfice Jour : {stats.dayProfit >= 0 ? "+" : ""}{stats.dayProfit.toFixed(2)}€</span>
                      <span className="text-zinc-600">Cash: {stats.dayCash.toFixed(2)}€</span>
                      <span className="text-zinc-500">|</span>
                      <span className="text-yellow-500/70">Net Cumulé : {stats.netCumule >= 0 ? "+" : ""}{stats.netCumule.toFixed(2)}€</span>
                    </div>
                  </div>
                  {dateMissions.map(m => {
                    const { net, amountOwed } = getLineDetails(m);
                    return (
                      <div key={m.id} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 group hover:bg-zinc-900 transition-colors">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${m.cash_amount >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                            <TrendingUp size={20} className={m.cash_amount < 0 ? "rotate-180" : ""}/>
                          </div>
                          <div>
                            <p className="font-bold text-sm">{m.description}</p>
                            <p className="text-[10px] text-zinc-600 uppercase font-bold flex gap-2">
                              <span>{m.split_strategy === "50/50" ? `Split 50/50 (${m.player})` : m.split_strategy}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8 text-right">
                          <div>
                            <p className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">Récompense Byts</p>
                            <p className="font-mono text-xs">{m.byts_amount.toLocaleString()} ({(m.byts_amount/160).toFixed(2)}€)</p>
                            <p className="font-mono text-xs font-bold">{m.byts_amount.toLocaleString()} <span className="text-zinc-500">({(m.byts_amount / 160).toFixed(2)}€)</span></p>
                          </div>
                          <div>
                            <p className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">{m.player === "Sami" ? "Dû à Brice" : "Dû à Sami"}</p>
                            <p className="font-mono text-xs text-orange-400">{amountOwed.toFixed(2)}€</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">Total Euros</p>
                            <p className={`font-mono text-sm font-bold ${m.cash_amount >= 0 ? "text-green-400" : "text-red-400"}`}>{m.cash_amount >= 0 ? "+" : ""}{m.cash_amount.toFixed(2)}€</p>
                          </div>
                          <div className="border-l border-zinc-800 pl-4">
                            <p className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">Bénéfice Net</p>
                            <p className={`font-mono text-sm font-bold ${net >= 0 ? "text-green-400" : "text-red-400"}`}>{net >= 0 ? "+" : ""}{net.toFixed(2)}€</p>
                          </div>
                          <button onClick={() => deleteMission(m.id)} className="text-zinc-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
