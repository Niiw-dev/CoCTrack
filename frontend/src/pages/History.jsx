import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import api from '../api'

export default function History(){
  const {data, isLoading} = useQuery({queryKey:['sync-logs'], queryFn: async()=> (await api.get('/sync-logs')).data})
  const [sort, setSort] = useState({field: 'started_at', dir: 'desc'})
  const sorted = useMemo(()=>{
    if(!data) return []
    const mul = sort.dir==='asc'?1:-1
    const copy=[...data]
    if(sort.field==='started_at') copy.sort((a,b)=> (new Date(a.started_at)-new Date(b.started_at))*mul)
    else if(sort.field==='status') copy.sort((a,b)=> (a.status||'').localeCompare(b.status||'')*mul)
    else if(sort.field==='clan_tag') copy.sort((a,b)=> (a.clan_tag||'').localeCompare(b.clan_tag||'')*mul)
    return copy
  },[data, sort])
  const handleSort = (field)=> setSort(prev=> prev.field===field ? {field, dir: prev.dir==='asc'?'desc':'asc'} : {field, dir: 'desc'})
  if(isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin"></div></div>
  return <div className="space-y-6">
    <div>
      <h1 className="page-title text-[26px]">Historial <span className="text-zinc-400 font-normal">· {data?.length||0} syncs</span></h1>
      <p className="page-subtitle">Registro de sincronizaciones con la API de Clash of Clans · Click para ordenar</p>
    </div>

    <div className="flex items-center gap-2">
      <button onClick={()=>handleSort('started_at')} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${sort.field==='started_at'?'bg-zinc-900 text-white border-zinc-900':'bg-white border-zinc-200 hover:border-zinc-300'}`}>Fecha {sort.field==='started_at'?(sort.dir==='asc'?'↑':'↓'):'↕'}</button>
      <button onClick={()=>handleSort('status')} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${sort.field==='status'?'bg-zinc-900 text-white border-zinc-900':'bg-white border-zinc-200 hover:border-zinc-300'}`}>Estado {sort.field==='status'?(sort.dir==='asc'?'↑':'↓'):'↕'}</button>
      <button onClick={()=>handleSort('clan_tag')} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${sort.field==='clan_tag'?'bg-zinc-900 text-white border-zinc-900':'bg-white border-zinc-200 hover:border-zinc-300'}`}>Clan {sort.field==='clan_tag'?(sort.dir==='asc'?'↑':'↓'):'↕'}</button>
      {sort.field && <button onClick={()=>setSort({field:'started_at', dir:'desc'})} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-full font-medium ml-auto">Limpiar filtros ✕</button>}
    </div>

    <div className="space-y-3">
      {sorted?.map(s=>{
        let p={}
        try{ p=typeof s.payload==='string'?JSON.parse(s.payload):s.payload||{} }catch{}
        const isOk=s.status==='OK'
        return <div key={s.id} className={`card p-5 flex gap-4 hover:shadow-medium transition-all ${isOk?'':'border-amber-200 bg-amber-50/30'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${isOk?'bg-emerald-500 text-white':'bg-amber-500 text-white'}`}>{isOk?'✓':'!'}</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge border ${isOk?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-amber-100 text-amber-800 border-amber-200'}`}>{s.status}</span>
              <span className="font-mono text-xs bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-full">{s.clan_tag}</span>
              <span className="text-xs text-zinc-500">{new Date(s.started_at).toLocaleString()}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.members!=null && <span className="text-xs bg-white border border-zinc-200 px-2.5 py-1 rounded-full">{p.members} miembros</span>}
              {p.wars_log!=null && <span className="text-xs bg-white border border-zinc-200 px-2.5 py-1 rounded-full">{p.wars_log} warLogs</span>}
              {p.capital_seasons!=null && <span className="text-xs bg-white border border-zinc-200 px-2.5 py-1 rounded-full">{p.capital_seasons} capital</span>}
              {p.alerts_inserted!=null && <span className="text-xs bg-violet-50 border border-violet-200 text-violet-700 px-2.5 py-1 rounded-full">⚑ {p.alerts_inserted}</span>}
            </div>
            <div className="mt-2 font-mono text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 truncate">{typeof s.payload==='string'? s.payload.slice(0,180): JSON.stringify(s.payload)?.slice(0,180)}</div>
          </div>
        </div>
      })}
      {!sorted?.length && <div className="card p-12 text-center text-sm text-zinc-500">Sin historial aún</div>}
    </div>
  </div>
}
