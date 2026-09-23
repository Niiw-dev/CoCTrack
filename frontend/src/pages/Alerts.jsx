import { useQuery } from "@tanstack/react-query"
import { useState, useMemo } from "react"
import api from "../api"
import { Link } from "react-router-dom"

export default function Alerts(){
  const [filtro, setFiltro] = useState("")
  const {data, isLoading, refetch} = useQuery({
    queryKey:["alerts", filtro],
    queryFn: async()=> (await api.get("/alerts", {params: {tipo: filtro || undefined, limit: 100}})).data
  })
  const [sort, setSort] = useState({field: null, dir: 'desc'})
  const handleSort = (field)=> setSort(prev=> prev.field===field ? {field, dir: prev.dir==='asc'?'desc':'asc'} : {field, dir: 'asc'})
  const sorted = useMemo(()=>{
    if(!data) return []
    if(!sort.field) return data
    const mul = sort.dir==='asc'?1:-1
    const copy=[...data]
    const sevPri={CRITICA:0, ALTA:1, MEDIA:2, LEVE:3}
    if(sort.field==='player_tag') copy.sort((a,b)=> (a.player_tag||'').localeCompare(b.player_tag||'')*mul)
    else if(sort.field==='tipo') copy.sort((a,b)=> (a.tipo||'').localeCompare(b.tipo||'')*mul)
    else if(sort.field==='severidad') copy.sort((a,b)=> ((sevPri[a.severidad]??9)-(sevPri[b.severidad]??9))*mul)
    else if(sort.field==='created_at') copy.sort((a,b)=> (new Date(a.created_at)-new Date(b.created_at))*mul)
    else if(sort.field==='mensaje') copy.sort((a,b)=> (a.mensaje||'').localeCompare(b.mensaje||'')*mul)
    return copy
  },[data, sort])
  const SortIcon = ({field})=> sort.field!==field ? <span className="text-zinc-300 ml-1">↕</span> : <span className="ml-1 text-violet-600">{sort.dir==='asc'?'↑':'↓'}</span>

  if(isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin"></div></div>
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="page-title text-[26px]">Alertas <span className="text-zinc-400 font-normal">· {data?.length||0}</span></h1>
        <p className="page-subtitle">Seguimiento de inactividad y capital · Click cabecera para ordenar</p>
      </div>
      <div className="flex items-center gap-2">
        <select value={filtro} onChange={e=>setFiltro(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 outline-none">
          <option value="">Todas</option>
          <option value="EN_RIESGO">EN_RIESGO</option>
          <option value="NUNCA_ENTRO_GUERRA">NUNCA_ENTRO</option>
          <option value="NUNCA_ATACO_GUERRA">NUNCA_ATACO</option>
          <option value="INACTIVO_GUERRAS_PASADAS">INACTIVO_PASADAS</option>
          <option value="CAPITAL">CAPITAL</option>
          <option value="INGRESO_RECIENTE">INGRESO_RECIENTE</option>
        </select>
        <button onClick={()=>refetch()} className="bg-white border border-zinc-200 hover:border-zinc-300 px-3 py-2 rounded-xl text-sm font-medium transition-colors">↻ Recargar</button>
      </div>
    </div>

    {sort.field && <div className="flex items-center gap-2">
      <span className="text-xs bg-violet-50 border border-violet-200 text-violet-700 px-3 py-1.5 rounded-full">Orden: {sort.field} {sort.dir==='asc'?'↑':'↓'}</span>
      <button onClick={()=>setSort({field:null, dir:'desc'})} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-full font-medium">Limpiar filtros ✕</button>
    </div>}

    <div className="card overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-zinc-50/80 border-b border-zinc-100 text-xs uppercase tracking-widest text-zinc-500">
            <th onClick={()=>handleSort('player_tag')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Jugador <SortIcon field="player_tag"/></th>
            <th onClick={()=>handleSort('tipo')} className="p-4 font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Tipo <SortIcon field="tipo"/></th>
            <th onClick={()=>handleSort('severidad')} className="p-4 font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Severidad <SortIcon field="severidad"/></th>
            <th onClick={()=>handleSort('mensaje')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Mensaje <SortIcon field="mensaje"/></th>
            <th onClick={()=>handleSort('created_at')} className="p-4 font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Fecha <SortIcon field="created_at"/></th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-100">{sorted?.map(a=> <tr key={a.id} className="hover:bg-zinc-50/60 transition-colors">
            <td className="p-4"><Link to={"/miembros/"+encodeURIComponent(a.player_tag)} className="font-mono text-xs bg-zinc-100 hover:bg-violet-100 hover:text-violet-700 border border-zinc-200 px-2.5 py-1 rounded-full transition-colors inline-block">{a.player_tag}</Link></td>
            <td className="p-4"><span className="badge bg-zinc-900 text-white text-xs">{a.tipo}</span></td>
            <td className="p-4 text-center"><span className={`badge border text-xs ${a.severidad==="CRITICA"?"bg-red-500 text-white border-red-500":a.severidad==="ALTA"?"bg-orange-500 text-white border-orange-500":a.severidad==="MEDIA"?"bg-amber-100 text-amber-800 border-amber-200":"bg-zinc-100 text-zinc-700 border-zinc-200"}`}>{a.severidad}</span></td>
            <td className="p-4 max-w-[360px]"><div className="text-zinc-700 leading-relaxed truncate">{a.mensaje}</div></td>
            <td className="p-4 text-xs text-zinc-500 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
          </tr>)}</tbody>
        </table>
        {sorted?.length===0 && <div className="p-12 text-center"><div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">✓</div><div className="text-sm text-zinc-500 mt-3">Sin alertas — todo en orden</div></div>}
      </div>
    </div>
  </div>
}
