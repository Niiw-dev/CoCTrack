import { useQuery } from "@tanstack/react-query"
import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import api from "../api"

export default function Capital(){
  const {data: seasons, isLoading} = useQuery({queryKey:["capital-seasons"], queryFn: async()=> (await api.get("/capital-seasons")).data})
  const [sel, setSel] = useState(null)
  const {data: detail} = useQuery({queryKey:["capital", sel], queryFn: async()=> (await api.get("/capital-seasons/"+sel)).data, enabled: !!sel})
  const [sort, setSort] = useState({field: null, dir: 'desc'})
  const handleSort = (field)=> setSort(prev=> prev.field===field ? {field, dir: prev.dir==='asc'?'desc':'asc'} : {field, dir: 'desc'})
  const sorted = useMemo(()=>{
    if(!seasons) return []
    if(!sort.field) return seasons
    const mul = sort.dir==='asc'?1:-1
    const copy=[...seasons]
    if(sort.field==='start_time') copy.sort((a,b)=> (new Date(a.start_time)-new Date(b.start_time))*mul)
    else if(sort.field==='end_time') copy.sort((a,b)=> (new Date(a.end_time||0)-new Date(b.end_time||0))*mul)
    else if(sort.field==='state') copy.sort((a,b)=> (a.state||'').localeCompare(b.state||'')*mul)
    return copy
  },[seasons, sort])
  const SortIcon = ({field})=> sort.field!==field ? <span className="text-zinc-300 ml-1">↕</span> : <span className="ml-1 text-violet-600">{sort.dir==='asc'?'↑':'↓'}</span>
  if(isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin"></div></div>
  return <div className="space-y-6">
    <div>
      <h1 className="page-title text-[26px]">Capital <span className="text-zinc-400 font-normal">· {seasons?.length||0}</span></h1>
      <p className="page-subtitle">≥5 ataques por fin de semana · Tendencia 75% en 3/4 · Click cabecera para ordenar</p>
    </div>

    {seasons?.length===0 && <div className="card p-8 text-center border-amber-200 bg-amber-50/50"><div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">◆</div><div className="font-semibold mt-3">Sin temporadas</div><div className="text-sm text-zinc-500">El clan aún no tiene capital registrado</div></div>}

    {sort.field && <div className="flex items-center gap-2">
      <span className="text-xs bg-violet-50 border border-violet-200 text-violet-700 px-3 py-1.5 rounded-full">Orden: {sort.field} {sort.dir==='asc'?'↑':'↓'}</span>
      <button onClick={()=>setSort({field:null, dir:'desc'})} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-full font-medium">Limpiar filtros ✕</button>
    </div>}

    <div className="card overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-zinc-50/80 border-b border-zinc-100 text-xs uppercase tracking-widest text-zinc-500">
            <th onClick={()=>handleSort('start_time')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Inicio <SortIcon field="start_time"/></th>
            <th onClick={()=>handleSort('end_time')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Fin <SortIcon field="end_time"/></th>
            <th onClick={()=>handleSort('state')} className="p-4 font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Estado <SortIcon field="state"/></th>
            <th className="p-4 text-right"></th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-100">{sorted?.map(s=> <tr key={s.id} className={`hover:bg-zinc-50/60 ${sel===s.id?'bg-violet-50/60':''}`}>
            <td className="p-4 font-medium">{s.start_time? new Date(s.start_time).toLocaleString():"—"}</td>
            <td className="p-4 text-zinc-600">{s.end_time? new Date(s.end_time).toLocaleString():"—"}</td>
            <td className="p-4 text-center"><span className="badge bg-zinc-900 text-white">{s.state||"—"}</span></td>
            <td className="p-4 text-right"><button onClick={()=>setSel(s.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${sel===s.id?'bg-zinc-900 text-white border-zinc-900':'bg-white hover:bg-zinc-900 hover:text-white border-zinc-200'}`}>{sel===s.id?'Seleccionada':'Ver'}</button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>

    {detail && <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Temporada #{detail.season.id} · <span className="text-zinc-500 font-normal">{detail.participations.length} participaciones</span></div>
        <button onClick={()=>setSel(null)} className="text-xs bg-zinc-100 hover:bg-zinc-200 px-3 py-1 rounded-full">Cerrar ✕</button>
      </div>
      {detail.participations.length===0 ? <div className="text-sm text-zinc-500 mt-4 bg-zinc-50 border border-dashed rounded-xl p-4 text-center">Sin participaciones</div> :
        <div className="mt-4 overflow-auto rounded-xl border border-zinc-100">
          <table className="w-full text-sm"><thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="p-3 text-left">Jugador</th><th className="p-3 text-center">Ataques</th><th className="p-3 text-center">Estado</th><th className="p-3 text-center">Botín</th></tr></thead>
          <tbody className="divide-y divide-zinc-100">{detail.participations.map(p=> <tr key={p.player_tag} className="hover:bg-zinc-50/50">
            <td className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold">{(p.player_name||p.player_tag).slice(0,2).toUpperCase()}</div>
                <div>
                  <Link to={'/miembros/'+encodeURIComponent(p.player_tag)} className="font-semibold hover:text-violet-700 text-sm">{p.player_name||p.player_tag}</Link>
                  <div className="font-mono text-[11px] text-zinc-500">{p.player_tag}</div>
                </div>
              </div>
            </td>
            <td className="p-3 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${p.cumplio?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-red-50 text-red-700 border-red-200'}`}>{p.attacks}/{p.attack_limit}</span></td>
            <td className="p-3 text-center"><span className={`badge border ${p.cumplio?'bg-emerald-500 text-white border-emerald-500':'bg-amber-100 text-amber-800 border-amber-200'}`}>{p.cumplio?"Cumplió":"Pendiente"}</span></td>
            <td className="p-3 text-center font-medium">{p.capital_resources_looted.toLocaleString()}</td>
          </tr>)}</tbody></table>
        </div>
      }
    </div>}
  </div>
}
