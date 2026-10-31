'use client';
import { useMemo } from 'react';
import { FaFireAlt } from 'react-icons/fa';
import { analytics } from '../../lib/viewings/domain.mjs';

export default function ViewingAnalytics({ viewings }) {
  const stats = useMemo(() => {
    const { top, ranking } = analytics(viewings);
    return { mostViewed: top, ranking: ranking.filter(unit => unit.visits >= 5) };
  }, [viewings]);
  return (
<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                {/* 1. MOST VIEWED CARD */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden min-h-[300px]">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><FaFireAlt size={150} /></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{stats.mostViewed ? 'Most completed visits' : 'Building the picture'}</span>
                            <FaFireAlt className="text-orange-400" />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-1">{stats.mostViewed?.unit || 'Not enough visits yet'}</h2>
                        <p className="text-sm font-medium text-purple-200 mb-6">{stats.mostViewed ? stats.mostViewed.visits + ' completed visits · all time' : 'A property needs at least 5 completed visits to qualify for ranking.'}</p>
                        {stats.mostViewed && <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-purple-200">Recommendation</p>
                            <p className="text-xs font-bold leading-relaxed">Arrange regular cleaning and keep maintenance up to date for this frequently viewed property.</p>
                        </div>}
                    </div>
                </div>

                {/* 2. RANKING LIST */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 mb-6">Completed Visit Ranking</h3><p className="text-xs text-slate-500 mb-6">All time · minimum 5 completed visits per property. Cancelled bookings, pending bookings and no-shows do not count.</p>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {stats.ranking.length === 0 && <p className="text-sm text-slate-500">No properties qualify yet. Rankings appear once a property reaches 5 completed visits.</p>}{stats.ranking.map((item, index) => (
                            <div key={item.unit} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${index === 0 ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-500'}`}>{index + 1}</div>
                                    <span className="text-sm font-black uppercase text-slate-700">{item.unit}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-lg font-black text-purple-600">{item.visits}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Completed visits</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
  );
}
