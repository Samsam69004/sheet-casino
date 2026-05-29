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
} from "lucide-react";

type Mission = {
  id: string;
  created_at: string;
  mission_name: string;
  amount: number;
  player_name: string;
  date: string;
};

export default function Home() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    player: "Sami",
    date: new Date().toISOString().split('T')[0]
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
    try {
      const { error } = await supabase.from("missions").insert([
        {
          mission_name: form.name,
          amount: parseFloat(form.amount),
          player_name: form.player,
          date: form.date,
        },
      ]);

      if (error) throw error;

      setForm(prev => ({
        ...prev,
        name: "",
        amount: "",
      }));
      await fetchMissions();
    } catch (err: any) {
      console.error("Erreur Supabase:", err);
      alert(`Erreur : ${err.message || "Impossible d'ajouter la mission"}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteMission(id: string) {
    if (!confirm("Supprimer cette mission ?")) return;
    const { error } = await supabase.from("missions").delete().eq("id", id);
    if (!error) fetchMissions();
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
  const { totalBalance, splitAmount, groupedMissions } = useMemo(() => {
    const total = missions.reduce((acc, m) => acc + Number(m.amount), 0);

    const grouped = missions.reduce((groups: Record<string, Mission[]>, mission) => {
      const date = mission.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(mission);
      return groups;
    }, {});

    return {
      totalBalance: total,
      splitAmount: total / 2,
      groupedMissions: grouped
    };
  }, [missions]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-500/30">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-zinc-800 pb-8 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic text-yellow-500">
              BETIFY <span className="text-white">TRACKER</span>
            </h1>
            <p className="text-zinc-500 font-medium mt-1">Bilan Partagé : Sami & Brice</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl min-w-[240px]">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Balance Collective</p>
            <p className={`text-3xl font-mono font-bold ${totalBalance >= 0 ? "text-green-400" : "text-red-500"}`}>
              {totalBalance > 0 ? "+" : ""}{totalBalance.toFixed(2)}€
            </p>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-full text-blue-400">
              <Users size={24} />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Part Individuelle (50%)</p>
              <p className="text-2xl font-bold">{splitAmount.toFixed(2)}€</p>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="bg-purple-500/10 p-3 rounded-full text-purple-400">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Missions Validées</p>
              <p className="text-2xl font-bold">{missions.length}</p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-900 p-2 rounded-2xl border border-zinc-700 flex flex-col md:flex-row gap-2 mb-12 shadow-2xl">
          <input
            required
            className="flex-[2] bg-transparent p-4 outline-none text-white placeholder:text-zinc-600"
            placeholder="Nom de la mission..."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            type="number"
            step="0.01"
            className="md:w-32 bg-black rounded-xl p-4 outline-none border border-zinc-800 focus:border-yellow-500 transition-colors font-mono font-bold text-yellow-500"
            placeholder="€ +/-"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <input
            required
            type="date"
            className="bg-black border border-zinc-800 rounded-xl px-4 py-4 outline-none font-bold text-xs uppercase text-zinc-400 focus:text-white transition-colors"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <select
            className="bg-black border border-zinc-800 rounded-xl px-4 py-4 outline-none font-bold text-xs uppercase"
            value={form.player}
            onChange={(e) => setForm({ ...form, player: e.target.value })}
          >
            <option value="Sami">Sami</option>
            <option value="Brice">Brice</option>
          </select>
          <button
            disabled={isSubmitting}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-black px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <PlusCircle size={20} />}
            AJOUTER
          </button>
        </form>

        {/* Activity Log */}
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="flex items-center gap-2 text-xs font-black text-zinc-600 uppercase tracking-widest">
              <History size={14} /> Historique des Gains
            </h3>
            {missions.length > 0 && (
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
            Object.entries(groupedMissions).map(([date, dayMissions]) => {
              const dayTotal = dayMissions.reduce((acc, m) => acc + Number(m.amount), 0);
              return (
                <div key={date} className="mb-8">
                  <div className="flex justify-between items-center px-2 mb-2">
                    <span className="text-zinc-400 font-bold text-sm">
                      {new Date(date).toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <span className={`text-sm font-bold ${dayTotal >= 0 ? "text-green-500" : "text-red-500"}`}>
                      Bilan : {dayTotal > 0 ? "+" : ""}{dayTotal.toFixed(2)}€
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dayMissions.map((m) => (
                      <div key={m.id} className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800/50 flex justify-between items-center hover:bg-zinc-900 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${m.amount >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                            {m.amount >= 0 ? <TrendingUp size={18} className="text-green-500" /> : <TrendingDown size={18} className="text-red-500" />}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-200">{m.mission_name}</div>
                            <div className="flex gap-2 items-center mt-1">
                              <span className="text-[9px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-black uppercase italic tracking-tighter">
                                {m.player_name}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`font-mono font-black text-xl ${m.amount >= 0 ? "text-green-400" : "text-red-500"}`}>
                            {m.amount > 0 ? "+" : ""}{Number(m.amount).toFixed(2)}€
                          </div>
                          <button
                            onClick={() => deleteMission(m.id)}
                            className="text-zinc-700 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
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
