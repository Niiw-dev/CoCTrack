import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import api from "../api"

function estadoBadge(estado){
  const map={
    ACTIVO:'bg-emerald-500 text-white border-emerald-500',
    EN_RIESGO:'bg-amber-500 text-white border-amber-500',
    EXPULSABLE:'bg-red-500 text-white border-red-500',
  }
  return map[estado]||'bg-zinc-900 text-white border-zinc-900'
}

export default function MemberDetail(){
  const {tag} = useParams()
  const decoded = decodeURIComponent(tag)
  const {data, isLoading, error} = useQuery({
    queryKey: ["member", tag],
    queryFn: async()=> (await api.get("/members/"+encodeURIComponent(decoded))).data
  })
  if(isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin"></div></div>
  if(error) return <div className="card p-8 border-red-200 bg-red-50 text-red-700 text-sm">Error: {String(error.message)}</div>
  const {history=[], warnings=[], alerts=[], state, war_history=[], capital_history=[], cwl_history=[], clan_game_history=[], stats={}, days_inactive} = data || {}
  const playerName = history[0]?.player_name || data?.player_name || decoded
  const last = history[0]
  const estado = state?.estado_manual || state?.estado_auto || 'ACTIVO'
  return <div className="space-y-6">
    <Link to="/miembros" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"><span>←</span> Volver a Miembros</Link>

    <div className="card p-7 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
      <div className="relative flex gap-5 items-start">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 text-white flex items-center justify-center text-lg font-black shrink-0 shadow-lg">{playerName.slice(0,2).toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight">{playerName}</h1>
            <span className={`badge border text-xs font-bold ${estadoBadge(estado)}`}>{estado}</span>
            {(state?.war_preference||last?.war_preference||'in').toLowerCase()==='out' && <span className="badge bg-zinc-900 text-white border-zinc-900 text-xs font-bold">OUT · No quiere guerra</span>}
            {state?.estado_manual && <span className="badge bg-violet-50 text-violet-700 border border-violet-200 text-xs">Manual: {state.motivo_manual||'—'}</span>}
          </div>
          <div className="font-mono text-sm text-zinc-500 mt-1">{decoded}</div>
          {last && <div className="flex flex-wrap gap-2 mt-3">
            <span className="badge bg-amber-100 text-amber-800 border border-amber-200">⬡ TH{last.town_hall}</span>
            <span className="badge bg-zinc-100 text-zinc-700 border border-zinc-200">{last.role}</span>
            <span className="badge bg-violet-50 text-violet-700 border border-violet-200">{last.donations}/{last.donations_received} donaciones</span>
            <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">● {history.length} snapshots</span>
          </div>}
        </div>
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      <div className="card p-4">
        <div className="text-xs uppercase tracking-widest font-semibold text-zinc-500">Guerras</div>
        <div className="text-2xl font-black mt-1">{stats.wars_entered??war_history.length} <span className="text-sm font-normal text-zinc-500">/ {stats.wars_with_attack??0} con atk</span></div>
        <div className="text-xs text-zinc-500 mt-1">{stats.wars_missed??0} sin atacar · ★ {stats.stars_total??0}</div>
      </div>
      <div className="card p-4">
        <div className="text-xs uppercase tracking-widest font-semibold text-zinc-500">CWL</div>
        <div className="text-2xl font-black mt-1">{stats.cwl_total??cwl_history.length} <span className="text-sm font-normal text-zinc-500">/ {stats.cwl_with_attack??0} con atk</span></div>
        <div className="text-xs text-zinc-500 mt-1">Liga — cuenta para actividad</div>
      </div>
      <div className="card p-4">
        <div className="text-xs uppercase tracking-widest font-semibold text-zinc-500">Capital</div>
        <div className="text-2xl font-black mt-1">{stats.capital_total??0} <span className="text-sm font-normal text-zinc-500">/ 5</span></div>
        <div className="text-xs text-zinc-500 mt-1">{stats.capital_cumplidas??0} fines cumplidos</div>
      </div>
      <div className="card p-4">
        <div className="text-xs uppercase tracking-widest font-semibold text-zinc-500">Juegos</div>
        <div className="text-2xl font-black mt-1">{stats.clan_games_points??0} <span className="text-sm font-normal text-zinc-500">pts</span></div>
        <div className="text-xs text-zinc-500 mt-1">{stats.clan_games_cumplidas??0}/{stats.clan_games_total??0} cumplidos (≥4000)</div>
      </div>
      <div className="card p-4">
        <div className="text-xs uppercase tracking-widest font-semibold text-zinc-500">Inactividad</div>
        <div className="text-2xl font-black mt-1">{days_inactive!=null ? days_inactive+'d' : '—'}</div>
        <div className="text-xs text-zinc-500 mt-1">{days_inactive==null ? 'Sin actividad' : days_inactive<4 ? '✓ dentro de ventana 4d' : days_inactive>=9?'⚫ Expulsable':days_inactive>=6?'🔴 Riesgo':'🟡 Observación'} · guerra/CWL/juegos/capital</div>
      </div>
      <div className="card p-4">
        <div className="text-xs uppercase tracking-widest font-semibold text-zinc-500">Alertas</div>
        <div className="text-2xl font-black mt-1">{alerts.length} <span className="text-sm font-normal text-zinc-500">activos</span></div>
        <div className="flex gap-1 mt-2">
          {alerts.slice(0,3).map(a=> <span key={a.id} className={`w-2 h-2 rounded-full ${a.severidad==='CRITICA'?'bg-red-500':a.severidad==='ALTA'?'bg-orange-500':'bg-amber-400'}`}></span>)}
          {!alerts.length && <span className="text-xs text-emerald-600">✓ Limpio</span>}
        </div>
      </div>
    </div>

    <div className="grid lg:grid-cols-5 gap-6">
      {/* War history */}
      <div className="lg:col-span-3 card p-6">
        <div className="flex items-center justify-between">
          <div className="font-semibold flex items-center gap-2">⚔ Historial guerras <span className="text-xs bg-zinc-900 text-white px-2 py-1 rounded-full">{war_history.length}</span></div>
          <span className="text-xs text-zinc-500">Últimas 20</span>
        </div>
        {war_history.length===0 ? <div className="text-sm text-zinc-500 mt-4 bg-zinc-50 border border-dashed rounded-xl p-6 text-center">Sin participaciones registradas. Se llenará con syncs en inWar.</div> :
          <div className="mt-4 overflow-auto rounded-xl border border-zinc-100">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="p-3 text-left">Fecha</th><th className="p-2 text-center">Estado</th><th className="p-2 text-center">Ataques</th><th className="p-2 text-center">Estrellas</th><th className="p-2 text-center">Cumplió</th></tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {war_history.map(w=> <tr key={w.war_id} className="hover:bg-zinc-50/60">
                  <td className="p-3">
                    <div className="text-xs font-medium">{new Date(w.end_time).toLocaleDateString()}</div>
                    <div className="text-[11px] text-zinc-500">{w.state} · {w.result||'—'} · {w.team_size}v{w.team_size}</div>
                  </td>
                  <td className="p-2 text-center"><span className={`badge border text-[11px] ${w.state==='warEnded'?'bg-zinc-900 text-white border-zinc-900':w.state==='inWar'?'bg-emerald-500 text-white border-emerald-500':'bg-zinc-100 text-zinc-700'}`}>{w.state}</span></td>
                  <td className="p-2 text-center font-bold">{w.attacks_done}/{w.attacks_expected}</td>
                  <td className="p-2 text-center"><span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-bold">★ {w.stars}</span></td>
                  <td className="p-2 text-center"><span className={`badge border text-xs ${w.incumplio?'bg-red-50 text-red-700 border-red-200':'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{w.incumplio?'No':'Sí'}</span></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        }
      </div>

      {/* Capital + CWL + Juegos + alerts/warnings */}
      <div className="lg:col-span-2 space-y-5">
        <div className="card p-5">
          <div className="font-semibold text-sm flex items-center gap-2">◆ Historial capital <span className="badge bg-zinc-900 text-white text-xs">{capital_history.length}</span></div>
          {capital_history.length===0 ? <div className="text-sm text-zinc-500 mt-3 bg-zinc-50 rounded-xl p-4 text-center border border-dashed">Sin capital</div> :
            <div className="mt-3 space-y-2 max-h-[300px] overflow-auto pr-1">
              {capital_history.map(c=> <div key={c.season_id} className="flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2.5">
                <div>
                  <div className="text-xs font-medium">{new Date(c.start_time).toLocaleDateString()} → {c.end_time? new Date(c.end_time).toLocaleDateString():'—'}</div>
                  <div className="text-[11px] text-zinc-500">{c.season_state||'—'}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold px-2 py-1 rounded-full border ${c.cumplio?'bg-emerald-500 text-white border-emerald-500':'bg-amber-100 text-amber-800 border-amber-200'}`}>{c.attacks}/{c.attack_limit} {c.cumplio?'✓':'✗'}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">{c.capital_resources_looted} botín</div>
                </div>
              </div>)}
            </div>
          }
        </div>

        <div className="card p-5">
          <div className="font-semibold text-sm flex items-center gap-2">♜ Historial CWL <span className="badge bg-zinc-900 text-white text-xs">{cwl_history.length}</span></div>
          {cwl_history.length===0 ? <div className="text-sm text-zinc-500 mt-3 bg-zinc-50 rounded-xl p-4 text-center border border-dashed">Sin CWL</div> :
            <div className="mt-3 space-y-2 max-h-[260px] overflow-auto pr-1">
              {cwl_history.map(c=> <div key={c.cwl_war_id} className="flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2.5">
                <div>
                  <div className="text-xs font-medium">{c.end_time? new Date(c.end_time).toLocaleDateString():'—'} · {c.state}</div>
                  <div className="font-mono text-[11px] text-zinc-500">{c.war_tag}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold px-2 py-1 rounded-full border ${c.attacks_done>0?'bg-emerald-500 text-white border-emerald-500':'bg-red-50 text-red-700 border-red-200'}`}>{c.attacks_done} atk · ★{c.stars}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">{c.destruction?.toFixed(1)}% destr.</div>
                </div>
              </div>)}
            </div>
          }
        </div>

        <div className="card p-5">
          <div className="font-semibold text-sm flex items-center gap-2">🎮 Historial juegos <span className="badge bg-zinc-900 text-white text-xs">{clan_game_history.length}</span></div>
          {clan_game_history.length===0 ? <div className="text-sm text-zinc-500 mt-3 bg-zinc-50 rounded-xl p-4 text-center border border-dashed">Sin juegos — cuenta para evitar inactividad 4d</div> :
            <div className="mt-3 space-y-2 max-h-[260px] overflow-auto pr-1">
              {clan_game_history.map(c=> <div key={c.season_id} className="flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2.5">
                <div>
                  <div className="text-xs font-medium">{new Date(c.start_time).toLocaleDateString()} → {c.end_time? new Date(c.end_time).toLocaleDateString():'—'}</div>
                  <div className="text-[11px] text-zinc-500">{c.name||c.season_state||'—'} · req {c.points_required}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold px-2 py-1 rounded-full border ${c.cumplio?'bg-emerald-500 text-white border-emerald-500':'bg-amber-100 text-amber-800 border-amber-200'}`}>{c.points} pts {c.cumplio?'✓':'✗'}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">{c.tasks_completed} tareas</div>
                </div>
              </div>)}
            </div>
          }
        </div>

        <div className="card p-5">
          <div className="font-semibold text-sm flex items-center gap-2">⚑ Alertas <span className={`badge ${alerts.length?'bg-red-500 text-white':'bg-zinc-100 text-zinc-600'}`}>{alerts.length}</span></div>
          {alerts.length===0 ? <div className="text-sm text-zinc-500 mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">✓ Sin alertas</div> :
            <ul className="mt-3 space-y-2">
              {alerts.map(a=> <li key={a.id} className={`rounded-xl px-3 py-2.5 text-xs border ${a.severidad==="CRITICA"?"bg-red-50 border-red-200 text-red-800":a.severidad==="ALTA"?"bg-orange-50 border-orange-200 text-orange-800":"bg-amber-50 border-amber-200 text-amber-800"}`}>
                <div className="font-bold flex items-center gap-1.5">{a.tipo} <span className="badge bg-white/80 text-inherit border border-black/10 text-[10px]">{a.severidad}</span></div>
                <div className="mt-1 leading-relaxed opacity-90">{a.mensaje}</div>
                <div className="text-[11px] opacity-60 mt-1">{new Date(a.created_at).toLocaleDateString()}</div>
              </li>)}
            </ul>
          }
        </div>

        <div className="card p-5">
          <div className="font-semibold text-sm flex items-center gap-2">⚠ Warnings <span className={`badge ${warnings.length?'bg-amber-500 text-white':'bg-zinc-100 text-zinc-600'}`}>{warnings.length}</span></div>
          {warnings.length===0 ? <div className="text-sm text-zinc-500 mt-3 bg-zinc-50 rounded-xl p-3 text-center border border-dashed">Sin warnings</div> :
            <ul className="mt-3 space-y-2">
              {warnings.map(w=> <li key={w.id} className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs">
                <div className="font-semibold text-amber-900">{w.motivo}</div>
                <div className="text-amber-700 mt-1">{w.severidad} · vence {w.vence_en? new Date(w.vence_en).toLocaleDateString():"-"} · {w.estado}</div>
              </li>)}
            </ul>
          }
        </div>
      </div>
    </div>

    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="font-semibold flex items-center gap-2">Historial snapshots <span className="text-xs bg-zinc-900 text-white px-2 py-1 rounded-full">{history.length}</span></div>
        <div className="text-xs text-zinc-500">Evolución por sync</div>
      </div>
      {history.length===0 ? <div className="text-sm text-zinc-500 mt-6 text-center py-8 bg-zinc-50 rounded-2xl border border-dashed">Sin historial</div> :
        <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-auto pr-1">
          {history.map((h,i)=> (
            <div key={h.id} className="flex gap-3 p-3 border border-zinc-100 rounded-xl hover:bg-zinc-50/60 hover:border-violet-200 transition-colors bg-white">
              <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${i===0?'bg-violet-600 ring-4 ring-violet-100':'bg-zinc-300'}`}></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-zinc-900">{new Date(h.created_at).toLocaleString()}</div>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">TH{h.town_hall}</span>
                  <span className="text-xs bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-full">{h.donations}/{h.donations_received}</span>
                  <span className="text-xs bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-full">{h.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  </div>
}
