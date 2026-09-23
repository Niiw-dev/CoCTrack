import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import api from '../api'

export default function Rules(){
  const {data, isLoading} = useQuery({queryKey:['rules'], queryFn: async()=> (await api.get('/rules')).data})
  const [sort, setSort] = useState({field: null, dir: 'asc'})
  const handleSort = (field)=> setSort(prev=> prev.field===field ? {field, dir: prev.dir==='asc'?'desc':'asc'} : {field, dir: 'asc'})
  const sorted = useMemo(()=>{
    if(!data) return []
    if(!sort.field) return data
    const mul = sort.dir==='asc'?1:-1
    const copy=[...data]
    if(sort.field==='key') copy.sort((a,b)=> (a.key||'').localeCompare(b.key||'')*mul)
    else if(sort.field==='description') copy.sort((a,b)=> (a.description||'').localeCompare(b.description||'')*mul)
    else if(sort.field==='value') copy.sort((a,b)=> String(a.value||'').localeCompare(String(b.value||''))*mul)
    return copy
  },[data, sort])
  const SortIcon = ({field})=> sort.field!==field ? <span className="text-zinc-300 ml-1">↕</span> : <span className="ml-1 text-violet-600">{sort.dir==='asc'?'↑':'↓'}</span>
  if(isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin"></div></div>
  return <div className="space-y-6">
    <div>
      <h1 className="page-title text-[26px]">Reglas</h1>
      <p className="page-subtitle">Configuración congelada del sistema · War, Capital e Inactividad · Click cabecera para ordenar</p>
    </div>

    <div className="grid md:grid-cols-3 gap-4">
      {[
        {k:'Rotación', d:'4 consecutivas', v:'§13', c:'from-violet-500 to-indigo-500'},
        {k:'Capital', d:'5/5 ataques + 75% 3/4', v:'§19', c:'from-amber-500 to-orange-500'},
        {k:'Inactividad', d:'3/6/9 días', v:'§20', c:'from-emerald-500 to-teal-500'},
      ].map(x=> <div key={x.k} className={`card p-5 text-white bg-gradient-to-br ${x.c} border-0`}>
        <div className="text-white/80 text-xs uppercase tracking-widest font-semibold">{x.v}</div>
        <div className="font-bold text-lg mt-1">{x.k}</div>
        <div className="text-white/90 text-sm">{x.d}</div>
      </div>)}
    </div>

    {sort.field && <div className="flex items-center gap-2">
      <span className="text-xs bg-violet-50 border border-violet-200 text-violet-700 px-3 py-1.5 rounded-full">Orden: {sort.field} {sort.dir==='asc'?'↑':'↓'}</span>
      <button onClick={()=>setSort({field:null, dir:'asc'})} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-full font-medium">Limpiar filtros ✕</button>
    </div>}

    <div className="card overflow-hidden">
      <div className="p-5 border-b border-zinc-100">
        <div className="font-semibold">Reglas configurables <span className="badge bg-zinc-900 text-white ml-2">{data?.length||0}</span></div>
        <div className="text-xs text-zinc-500 mt-1">Valores editables vía seeder · Require migración para cambios</div>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-zinc-50/80 border-b border-zinc-100 text-xs uppercase tracking-widest text-zinc-500">
            <th onClick={()=>handleSort('key')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Key <SortIcon field="key"/></th>
            <th onClick={()=>handleSort('description')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Descripción <SortIcon field="description"/></th>
            <th onClick={()=>handleSort('value')} className="p-4 font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Valor <SortIcon field="value"/></th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-100">
            {sorted?.map(r=>{
              let v=r.value
              try{ const j=JSON.parse(r.value); v= typeof j==='string'? j : JSON.stringify(j)}catch{}
              return <tr key={r.id} className="hover:bg-zinc-50/60">
                <td className="p-4"><span className="font-mono text-xs bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-full">{r.key}</span></td>
                <td className="p-4 text-zinc-700">{r.description}</td>
                <td className="p-4 text-center"><span className="badge bg-violet-50 text-violet-700 border border-violet-200 font-mono">{String(v)}</span></td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
}
