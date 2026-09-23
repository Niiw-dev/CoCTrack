import { useQuery } from "@tanstack/react-query"
import { useState, useMemo } from "react"
import api from "../api"

export default function Wars(){
  const {data: wars, isLoading} = useQuery({queryKey:["wars"], queryFn: async()=> (await api.get("/wars")).data})
  const [sel, setSel] = useState(null)
  const {data: detail} = useQuery({queryKey:["war", sel], queryFn: async()=> (await api.get("/wars/"+sel)).data, enabled: !!sel})
  const [sort, setSort] = useState({field: null, dir: 'desc'})
  const handleSort = (field)=> setSort(prev=> prev.field===field ? {field, dir: prev.dir==='asc'?'desc':'asc'} : {field, dir: field==='end_time'?'desc':'asc'})
  const sorted = useMemo(()=>{
    if(!wars) return []
    if(!sort.field) return wars
    const mul = sort.dir==='asc'?1:-1
    const copy=[...wars]
    if(sort.field==='end_time') copy.sort((a,b)=> (new Date(a.end_time)-new Date(b.end_time))*mul)
    else if(sort.field==='state') copy.sort((a,b)=> (a.state||'').localeCompare(b.state||'')*mul)
    else if(sort.field==='result') copy.sort((a,b)=> (a.result||'').localeCompare(b.result||'')*mul)
    else if(sort.field==='team_size') copy.sort((a,b)=> (a.team_size - b.team_size)*mul)
    return copy
  },[wars, sort])
  const SortIcon = ({field})=> sort.field!==field ? <span className="text-zinc-300 ml-1">↕</span> : <span className="ml-1 text-violet-600">{sort.dir==='asc'?'↑':'↓'}</span>
  if(isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin"></div></div>
  return <div className="space-y-6">
    <div>
      <h1 className="page-title text-[26px]">Guerras <span className="text-zinc-400 font-normal">· {wars?.length||0}</span></h1>
      <p className="page-subtitle">Participaciones reales capturadas cada hora en <span className="font-medium text-zinc-700">inWar</span> · WarLog histórico sin members aparece vacío · Click cabecera para ordenar</p>
    </div>

    {sort.field && <div className="flex items-center gap-2">
      <span className="text-xs bg-violet-50 border border-violet-200 text-violet-700 px-3 py-1.5 rounded-full">Orden: {sort.field} {sort.dir==='asc'?'↑':'↓'}</span>
      <button onClick={()=>setSort({field:null, dir:'desc'})} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-full font-medium">Limpiar filtros ✕</button>
    </div>}

    <div className="card overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-zinc-50/80 border-b border-zinc-100 text-xs uppercase tracking-widest text-zinc-500">
            <th onClick={()=>handleSort('end_time')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Fecha fin <SortIcon field="end_time"/></th>
            <th onClick={()=>handleSort('state')} className="p-4 font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Estado <SortIcon field="state"/></th>
            <th onClick={()=>handleSort('result')} className="p-4 font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Resultado <SortIcon field="result"/></th>
            <th onClick={()=>handleSort('team_size')} className="p-4 font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Team <SortIcon field="team_size"/></th>
            <th className="p-4 text-right"></th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-100">{sorted?.map(w=> <tr key={w.id} className={`hover:bg-zinc-50/60 transition-colors ${sel===w.id?'bg-violet-50/60':''}`}>
            <td className="p-4 font-medium">{new Date(w.end_time).toLocaleString()}</td>
            <td className="p-4"><span className={`badge border ${w.state==='warEnded'?'bg-zinc-900 text-white border-zinc-900':w.state==='inWar'?'bg-emerald-500 text-white border-emerald-500':w.state==='preparation'?'bg-amber-100 text-amber-800 border-amber-200':'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>{w.state}</span></td>
            <td className="p-4"><span className={`badge ${w.result==='won'?'bg-emerald-50 text-emerald-700 border border-emerald-200':w.result==='lost'?'bg-red-50 text-red-700 border border-red-200':'bg-zinc-50 text-zinc-600 border border-zinc-200'}`}>{w.result||"—"}</span></td>
            <td className="p-4"><span className="font-mono text-xs bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-full">{w.team_size}</span></td>
            <td className="p-4 text-right"><button onClick={()=>setSel(w.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${sel===w.id?'bg-zinc-900 text-white border-zinc-900':'bg-white hover:bg-zinc-900 hover:text-white border-zinc-200'}`}>{sel===w.id?'Seleccionada':'Ver detalle'}</button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>

    {detail && <div className="card p-6 animate-in">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Guerra #{detail.war.id} · <span className="badge bg-zinc-900 text-white">{detail.war.state}</span> <span className="text-zinc-500 font-normal ml-2">{detail.participations.length} participaciones</span></div>
        <button onClick={()=>setSel(null)} className="text-xs bg-zinc-100 hover:bg-zinc-200 px-3 py-1 rounded-full transition-colors">Cerrar ✕</button>
      </div>
      {detail.participations.length===0 ? <div className="text-sm text-zinc-500 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">Sin datos per-jugador (warLog pasado sin members). Se llenará con syncs en inWar.</div> :
        <div className="mt-4 overflow-auto rounded-xl border border-zinc-100">
          <table className="w-full text-sm"><thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="p-3 text-left">Jugador</th><th className="p-3">Hechos</th><th className="p-3">Esperados</th><th className="p-3">Estrellas</th><th className="p-3">Estado</th></tr></thead>
          <tbody className="divide-y divide-zinc-100">{detail.participations.map(p=> <tr key={p.player_tag} className="hover:bg-zinc-50/50">
            <td className="p-3 flex items-center gap-2"><span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded-full border">{p.player_tag}</span><span className="font-medium">{p.player_name||"—"}</span></td>
            <td className="p-3 text-center font-bold">{p.attacks_done}</td><td className="p-3 text-center text-zinc-500">{p.attacks_expected}</td><td className="p-3 text-center"><span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-bold">★ {p.stars}</span></td>
            <td className="p-3 text-center"><span className={`badge border ${p.incumplio?'bg-red-50 text-red-700 border-red-200':'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{p.incumplio?"Incumplió":"OK"}</span></td>
          </tr>)}</tbody></table>
        </div>
      }
    </div>}
  </div>
}
