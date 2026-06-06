"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/supabase";
import {
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Loader2,
  History,
  Trash2,
  Pencil,
  X,
  Trophy,
  AlertTriangle,
} from "lucide-react";

type Mission = {
  id: string;
  created_at: string;
  mission_name: string;
  amount: number;
  player_name: string;
  byts: number;
  player_share: number; // Pourcentage du joueur qui a fait la mission (ex: 50, 75, 25)
  date: string;
};

const BYTE_VALUE = 50 / 8000; // 1 byte = 0.00625€

export default function Home() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'win' | 'loss' } | null>(null);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    byts: "",
    share: "50", // Valeur par défaut
    player: "Sami",
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    console.log("App betify-tracker v1.4.1 initialisée");
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
    } catch (err) {
      console.error("Erreur lors de la récupération des missions:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.amount) return;

    setIsSubmitting(true);
    const missionData = {
      mission_name: form.name,
      amount: parseFloat(form.amount),
      byts: parseInt(form.byts) || 0,
      player_share: parseInt(form.share),
      player_name: form.player,
      date: form.date,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("missions")
          .update(missionData)
          .eq("id", editingId);

        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase.from("missions").insert([missionData]);
        if (error) throw error;
      }

      const missionNet = missionData.amount + (missionData.byts * BYTE_VALUE);
      if (missionNet > 0) {
        setFeedback({ text: "voilààà GG champion, on vise le million", type: 'win' });
      } else if (missionNet < 0) {
        setFeedback({ text: "comportement inadmissible, tu tires l'équipe vers le bas", type: 'loss' });
      }
      setTimeout(() => setFeedback(null), 5000);

      setForm(prev => ({
        ...prev,
        name: "",
        amount: "",
        byts: "",
        share: "50",
      }));
      await fetchMissions();
    } catch (err: any) {
      console.error("Erreur Supabase:", err);
      alert(`Erreur : ${err.message || "Action impossible"}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditing(m: Mission) {
    setEditingId(m.id);
    setForm({
      name: m.mission_name,
      amount: m.amount.toString(),
      byts: (m.byts || 0).toString(),
      share: (m.player_share || 50).toString(),
      player: m.player_name,
      date: m.date,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteMission(id: string) {
    if (!confirm("Supprimer cette mission ?")) return;
    try {
      const { error } = await supabase.from("missions").delete().eq("id", id);
      if (error) throw error;
      await fetchMissions();
    } catch (err: any) {
      console.error("Erreur suppression:", err);
      alert("Erreur lors de la suppression.");
    }
  }

  async function resetHistory() {
    if (!confirm("⚠️ ATTENTION : Voulez-vous vraiment supprimer TOUT l'historique ?")) return;

    setIsSubmitting(true);
    try {
      // On utilise un filtre qui ne correspond à rien de précis mais autorise la suppression globale
      const { error } = await supabase.from("missions").delete().neq("id", "_none_");
      if (error) throw error;
      await fetchMissions();
    } catch (err: any) {
      console.error("Erreur lors du reset:", err);
      alert("Impossible de réinitialiser l'historique.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Mémorisation des calculs pour la performance
  const { totalBalance, totalByts, totalBytsValue, totalNet, splitAmount, debtMessage, groupedMissions, dailyRunningTotals } = useMemo(() => {
    let total = 0;
    let byts = 0;
    let netSami = 0;
    let netBrice = 0;
    let cashSamiHas = 0;
    let cashSamiShouldHave = 0;

    missions.forEach(m => {
      const amount = Number(m.amount || 0);
      const missionByts = Number(m.byts || 0);
      const missionBytsEuro = missionByts * BYTE_VALUE;
      const sharePct = m.player_share || 50; // Part du joueur qui a fait la mission

      total += amount;
      byts += missionByts;

      const ownerNet = (amount + missionBytsEuro) * (sharePct / 100);
      const otherNet = (amount + missionBytsEuro) * ((100 - sharePct) / 100);

      const ownerCashShare = amount * (sharePct / 100);
      const otherCashShare = amount * ((100 - sharePct) / 100);

      if (m.player_name === "Sami") {
        netSami += ownerNet;
        netBrice += otherNet;
        cashSamiHas += amount;
        cashSamiShouldHave += ownerCashShare;
      } else {
        netBrice += ownerNet;
        netSami += otherNet;
        cashSamiShouldHave += otherCashShare;
      }
    });

    const debt = cashSamiHas - cashSamiShouldHave;

    const debtMsg = Math.abs(debt) < 0.01
      ? "Équilibre Parfait"
      : debt > 0
        ? { text: `Sami doit ${debt.toFixed(2)}€ à Brice`, type: 'debt' }
        : { text: `Brice doit ${Math.abs(debt).toFixed(2)}€ à Sami`, type: 'debt' };

    const grouped = missions.reduce((groups: Record<string, Mission[]>, mission) => {
      const date = mission.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(mission);
      return groups;
    }, {} as Record<string, Mission[]>);

    // Calcul des totaux nets quotidiens et du cumul quotidien
    const sortedDates = Object.keys(grouped).sort((a, b) => a.localeCompare(b)); // Tri des dates par ordre croissant
    const cumulativeDailyNets: Record<string, number> = {};
    let currentCumulativeNet = 0;

    for (const date of sortedDates) {
      const dayMissions = grouped[date];
      const dayNet = dayMissions.reduce((acc, m) => acc + (Number(m.amount) + (Number(m.byts || 0) * BYTE_VALUE)), 0);
      currentCumulativeNet += dayNet;
      cumulativeDailyNets[date] = currentCumulativeNet;
    }

    // Les missions sont triées par date descendante pour l'affichage,
    // mais le cumul est calculé sur les dates ascendantes.
    // On utilisera cumulativeDailyNets[date] pour récupérer la bonne valeur.

    return {
      totalBalance: total,
      totalByts: byts,
      totalBytsValue: byts * BYTE_VALUE,
      totalNet: total + (byts * BYTE_VALUE),
      splitAmount: total / 2,
      debtMessage: debtMsg,
      groupedMissions: grouped,
      dailyRunningTotals: cumulativeDailyNets,
    };
  }, [missions]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-500/30">
      {/* Feedback Animation */}
      {feedback && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
          <div className={`${feedback.type === 'win' ? 'bg-green-500 border-green-400' : 'bg-red-600 border-red-500'} border-2 px-6 py-4 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center gap-3`}>
            {feedback.type === 'win' ? <Trophy className="text-white" /> : <AlertTriangle className="text-white" />}
            <span className="font-black italic uppercase tracking-tighter text-white whitespace-nowrap">
              {feedback.text}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-zinc-800 pb-8 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic text-yellow-500">
              BETIFY <span className="text-white">TRACKER</span>
            </h1>
            <p className="text-[8px] text-zinc-800 uppercase tracking-widest font-bold">Production v1.4.1</p>
            <p className="text-zinc-500 font-medium mt-1">Bilan Partagé : Sami & Brice</p>
            <p className="text-[10px] text-zinc-600 font-bold uppercase mt-2">{missions.length} Missions Enregistrées</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl min-w-[280px] flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Balance Collective</p>
            <p className="text-[10px] font-mono text-yellow-500/50">
              {totalByts.toLocaleString()} BYTS ({totalBytsValue.toFixed(2)}€)
            </p>
            <p className={`text-[10px] font-mono font-bold ${totalBalance >= 0 ? "text-zinc-500" : "text-red-500"}`}>
              Cash : {totalBalance > 0 ? "+" : ""}{totalBalance.toFixed(2)}€
            </p>
            <p className={`text-3xl font-mono font-bold mt-1 ${totalNet >= 0 ? "text-green-400" : "text-red-500"}`}>
              {totalNet > 0 ? "+" : ""}{totalNet.toFixed(2)}€
            </p>
            <p className="text-[8px] uppercase tracking-widest text-zinc-600 font-bold">Bénéfice Net Total</p>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-full text-blue-400">
              <Users size={24} />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Règlement des Comptes</p>
              <p className="text-lg font-bold leading-tight">
                {typeof debtMessage === 'string' ? debtMessage : debtMessage.text}
              </p>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
            <div className={`p-3 rounded-full bg-purple-500/10 text-purple-400`}>
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Cash (Collectif)</p>
              <p className={`text-2xl font-bold ${totalBalance >= 0 ? "text-green-400" : "text-red-500"}`}>
                {totalBalance.toFixed(2)}€
              </p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className={`p-4 md:p-6 rounded-3xl border flex flex-col gap-6 mb-12 shadow-2xl transition-all duration-300 ${editingId ? 'bg-zinc-800 border-yellow-500 ring-4 ring-yellow-500/10' : 'bg-zinc-900 border-zinc-700'}`}>
          {/* Ligne 1 : Détails principaux */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-[2] flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Mission</label>
              <input
                required
                className="bg-black/50 border border-zinc-800 rounded-xl p-4 outline-none text-white placeholder:text-zinc-700 focus:border-zinc-600 transition-colors"
                placeholder="Nom de la mission..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="md:w-32 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Cash €</label>
              <input
                required
                type="number"
                step="0.01"
                className="bg-black rounded-xl p-4 outline-none border border-zinc-800 focus:border-yellow-500 transition-colors font-mono font-bold text-yellow-500"
                placeholder="+/-"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="md:w-32 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Byts</label>
              <input
                required
                type="number"
                min="0"
                className="bg-black rounded-xl p-4 outline-none border border-zinc-800 focus:border-blue-500 transition-colors font-mono font-bold text-blue-400"
                placeholder="0"
                value={form.byts}
                onChange={(e) => setForm({ ...form, byts: e.target.value })}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Date & Joueur</label>
              <div className="flex gap-2">
                <input
                  required
                  type="date"
                  className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-4 outline-none font-bold text-xs uppercase text-zinc-400 focus:text-white transition-colors"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                <select
                  className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-4 outline-none font-bold text-xs uppercase"
                  value={form.player}
                  onChange={(e) => setForm({ ...form, player: e.target.value })}
                >
                  <option value="Sami">Sami</option>
                  <option value="Brice">Brice</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ligne 2 : Répartition et Validation */}
          <div className="flex flex-col md:flex-row gap-4 items-end justify-between border-t border-zinc-800/50 pt-5">
            <div className="flex flex-col gap-1.5 w-full md:w-auto">
              <label className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest px-1">Répartition des Gains (Split)</label>
              <select
                className="md:w-72 bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-4 outline-none font-bold text-xs uppercase text-white focus:border-yellow-500 transition-colors"
                value={form.share}
                onChange={(e) => setForm({ ...form, share: e.target.value })}
              >
                <option value="50">Split 50% / 50%</option>
                <option value="75">
                  {form.player === "Sami" ? "Sami 75% / Brice 25%" : "Brice 75% / Sami 25%"}
                </option>
                <option value="25">
                  {form.player === "Sami" ? "Sami 25% / Brice 75%" : "Brice 25% / Sami 75%"}
                </option>
              </select>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <button
                disabled={isSubmitting}
                className={`flex-1 md:flex-none ${editingId ? 'bg-blue-500 hover:bg-blue-400' : 'bg-yellow-500 hover:bg-yellow-400'} disabled:opacity-50 text-black font-black px-10 py-4 rounded-xl transition-all flex items-center justify-center gap-2`}
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : editingId ? <Pencil size={20} /> : <PlusCircle size={20} />}
                {editingId ? "MODIFIER LA MISSION" : "ENREGISTRER LA MISSION"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ name: "", amount: "", byts: "", share: "50", player: "Sami", date: new Date().toISOString().split('T')[0] });
                  }}
                  className="bg-zinc-700 hover:bg-zinc-600 text-white font-black px-4 py-4 rounded-xl transition-all flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Activity Log */}
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="flex items-center gap-2 text-xs font-black text-zinc-600 uppercase tracking-widest">
              <History size={14} /> Historique des Gains
            </h3>
            {missions.length > 0 && !editingId && (
              <button
                onClick={resetHistory}
                className="text-[10px] font-bold text-zinc-700 hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} /> REMETTRE À ZÉRO
              </button>
            )}
          </div>
          {loading ? (
            <div className="text-center py-20 text-zinc-700 italic animate-pulse">Synchronisation...</div>
          ) : (
            Object.entries(groupedMissions)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([date, dayMissions]) => {
              const dayCash = dayMissions.reduce((acc, m) => acc + Number(m.amount || 0), 0);
              const dayNet = dayMissions.reduce((acc, m) => acc + (Number(m.amount) + (Number(m.byts || 0) * BYTE_VALUE)), 0);
              const dayNetCumulated = dailyRunningTotals[date] || 0; // Net cumulé jusqu'à cette journée
              return (
                <div key={date} className="mb-8">
                  <div className="flex justify-between items-center px-2 mb-2">
                    <span className="text-zinc-400 font-bold text-sm">
                      {new Date(date).toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-bold ${dayNet >= 0 ? "text-green-500" : "text-red-500"}`}>
                        Bénéfice Jour : {dayNet > 0 ? "+" : ""}{dayNet.toFixed(2)}€
                      </span>
                      <div className="flex gap-2 items-center">
                        <span className="text-[9px] text-zinc-600 font-mono italic">Cash: {dayCash > 0 ? "+" : ""}{dayCash.toFixed(2)}€</span>
                        <span className="text-zinc-800 text-[10px]">|</span>
                        <span className={`text-[10px] font-mono font-bold ${dayNetCumulated >= 0 ? "text-green-400" : "text-red-500"}`}>
                          Net Cumulé : {dayNetCumulated > 0 ? "+" : ""}{dayNetCumulated.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {dayMissions.map((m) => {
                      const isSami = m.player_name.trim().toLowerCase() === "sami";
                      const currentPlayer = isSami ? "Sami" : "Brice";
                      const otherPlayer = isSami ? "Brice" : "Sami";
                      const sharePct = m.player_share || 50;
                      const otherSharePct = 100 - sharePct;

                      const ownerCashShare = Number(m.amount) * (sharePct / 100);
                      const otherCashShare = Number(m.amount) * (otherSharePct / 100);

                      const missionByts = Number(m.byts || 0);
                      const missionBytsEuro = missionByts * BYTE_VALUE;
                      const missionNet = Number(m.amount) + missionBytsEuro;

                      return (
                        <div key={m.id} className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-900 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${missionNet >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                              {missionNet >= 0 ? <TrendingUp size={18} className="text-green-500" /> : <TrendingDown size={18} className="text-red-500" />}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-200">{m.mission_name}</div>
                              <div className="flex gap-2 items-center mt-1">
                                <span className="text-[9px] bg-zinc-800 px-2 py-1 rounded text-zinc-400 font-black uppercase italic tracking-tighter">
                                  {sharePct === 50 ? `Split 50/50 (${currentPlayer})` : `${currentPlayer} ${sharePct}% / ${otherPlayer} ${otherSharePct}%`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-8 w-full sm:w-auto justify-between sm:justify-end">
                            {/* Colonne Byts */}
                            <div className="text-left sm:text-right">
                              <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">Récompense Byts</p>
                              <p className="font-mono text-xs text-blue-400 font-bold">{missionByts.toLocaleString()} ({missionBytsEuro.toFixed(2)}€)</p>
                            </div>

                            {/* Colonne Partage (Dettes) */}
                            <div className="text-left sm:text-right min-w-[150px]">
                              <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest whitespace-nowrap">
                                {otherCashShare >= 0 ? `Dû à ${otherPlayer}` : `Remboursement ${otherPlayer}`}
                              </p>
                              <p className={`font-mono text-[10px] font-bold leading-tight ${otherCashShare >= 0 ? "text-orange-400" : "text-zinc-400"}`}>
                                {Math.abs(otherCashShare).toFixed(2)}€
                              </p>
                            </div>

                            <div className="flex items-center gap-4 min-w-[180px] justify-end">
                              <div className="text-right">
                                <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">Total Euros</p>
                                <div className={`font-mono font-black text-lg ${m.amount >= 0 ? "text-green-400" : "text-red-500"}`}>
                                  {m.amount > 0 ? "+" : ""}{Number(m.amount).toFixed(2)}€
                                </div>
                              </div>

                              <div className="text-right border-l border-zinc-800 pl-4">
                                <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">Bénéfice Net</p>
                                <div className={`font-mono font-black text-lg ${missionNet >= 0 ? "text-green-400" : "text-red-500"}`}>
                                  {missionNet > 0 ? "+" : ""}{missionNet.toFixed(2)}€
                                </div>
                              </div>

                              <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEditing(m)}
                                  className="text-zinc-600 hover:text-blue-400 transition-colors p-2"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => deleteMission(m.id)}
                                  className="text-zinc-600 hover:text-red-500 transition-colors p-2"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
