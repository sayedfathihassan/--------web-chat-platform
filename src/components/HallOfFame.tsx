import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Trophy, Crown, Star } from 'lucide-react';
import { getGlobalRank } from '../lib/ranks';

export default function HallOfFame() {
  const [topGivers, setTopGivers] = useState<any[]>([]);

  useEffect(() => {
    async function fetchTopGivers() {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, total_gifts_sent, total_gifts_received')
        .order('total_gifts_sent', { ascending: false })
        .limit(3);
      if (data) setTopGivers(data);
    }
    fetchTopGivers();
  }, []);

  if (topGivers.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4e7c] p-4 rounded-[2rem] border-2 border-[#84a9d1] shadow-xl mb-6 overflow-hidden relative" dir="rtl">
      {/* Decorative background icons */}
      <Trophy className="absolute -left-4 -bottom-4 text-white/5 w-24 h-24 rotate-12" />
      <Crown className="absolute -right-4 -top-4 text-white/5 w-24 h-24 -rotate-12" />

      <h3 className="text-white text-sm font-black mb-4 flex items-center gap-2">
        <Trophy size={16} className="text-yellow-400" /> لوحة شرف الداعمين
      </h3>

      <div className="flex items-end justify-around gap-2 px-2">
        {topGivers.map((user, idx) => {
          const rank = getGlobalRank(user.total_gifts_sent || 0, user.total_gifts_received || 0);
          const pos = idx === 0 ? 1 : idx === 1 ? 2 : 3;
          
          return (
            <motion.div 
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col items-center flex-1 max-w-[100px]"
            >
              <div className="relative group cursor-pointer">
                {pos === 1 && (
                  <Crown size={20} className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] z-10" />
                )}
                <div className={`w-14 h-14 rounded-2xl p-0.5 ${
                  pos === 1 ? 'bg-yellow-400' : pos === 2 ? 'bg-slate-300' : 'bg-amber-600'
                } shadow-lg`}>
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      className="w-full h-full rounded-2xl bg-white object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center text-3xl">
                      {user.gender === 'girl' ? '👩' : '🧔'}
                    </div>
                  )}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow ${
                  pos === 1 ? 'bg-yellow-500' : pos === 2 ? 'bg-slate-500' : 'bg-amber-700'
                }`}>
                  {pos}
                </div>
              </div>

              <div className="mt-2 text-center">
                <div className="text-[10px] font-black text-white truncate w-full">{user.display_name}</div>
                <div className="text-[8px] font-bold" style={{ color: rank.color }}>{rank.name}</div>
                <div className="flex items-center justify-center gap-0.5 text-[9px] font-black text-white/70 mt-0.5">
                  <Star size={10} className="text-yellow-400" />
                   {(user.total_gifts_sent || 0).toLocaleString()}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
