import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import api from '../api'
import { Link } from 'react-router-dom'

const roleStyles = {
  leader: 'bg-amber-100 text-amber-800 border-amber-200',
  coLeader: 'bg-violet-100 text-violet-800 border-violet-200',
  admin: 'bg-violet-100 text-violet-800 border-violet-200',
  member: 'bg-zinc-100 text-zinc-700 border-zinc-200',
}
function roleLabel(role){ const m={leader:'Líder', coLeader:'Colíder', admin:'Colíder', member:'Miembro'}; return m[role]||role }

export default function Members(){
  const {data, isLoading} = useQuery({queryKey:['members'], queryFn: async()=> (await api.get('/members')).data})
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({field: null, dir: 'desc'})

  const handleSort = (field)=>{
    setSort(prev=>{
      if(prev.field===field) return {field, dir: prev.dir==='asc'?'desc':'asc'}
      const defaultDir = field==='name' || field==='role' ? 'asc' : 'desc'
      return {field, dir: defaultDir}
    })
  }

  const filtered = useMemo(()=>{
    if(!data) return []
    let r = [...data]
    if(search.trim()){
      const q = search.toLowerCase()
      r = r.filter(m=> m.player_name.toLowerCase().includes(q) || m.player_tag.toLowerCase().includes(q))
    }
    const {field, dir} = sort
    if(!field) return r
    const mul = dir==='asc'?1:-1
    if(field==='th') r.sort((a,b)=> (a.town_hall - b.town_hall)*mul)
    else if(field==='donations') r.sort((a,b)=> (a.donations - b.donations)*mul)
    else if(field==='name') r.sort((a,b)=> a.player_name.localeCompare(b.player_name)*mul)
    else if(field==='role'){
      const pri={leader:0, coLeader:1, admin:1, member:2}
      r.sort((a,b)=> ((pri[a.role]??9)-(pri[b.role]??9))*mul)
    }
    else if(field==='estado'){
      const pri={EXPULSABLE:0, EN_RIESGO:1, ACTIVO:2}
      r.sort((a,b)=> ((pri[a.estado_auto||'ACTIVO']??9)-(pri[b.estado_auto||'ACTIVO']??9))*mul)
    }
    return r
  },[data,search,sort])

  const SortIcon = ({field})=>{
    if(sort.field!==field) return <span className="text-zinc-300 ml-1">↕</span>
    return <span className="ml-1 text-violet-600">{sort.dir==='asc'?'↑':'↓'}</span>
  }

  if(isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin"></div></div>
  if(!data || data.length===0) return <div className="card p-12 text-center"><div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-xl">◉</div><div className="font-semibold mt-3">Sin miembros</div><div className="text-sm text-zinc-500">Sincroniza primero para cargar el roster</div></div>

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="page-title text-[26px]">Miembros</h1>
        <p className="page-subtitle">{filtered.length} / {data.length} jugadores {search && `· filtro "${search}"`} {sort.field && `· orden ${sort.field} ${sort.dir}`}</p>
      </div>
      <div className="hidden md:flex items-center gap-2 text-xs">
        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">● En clan</span>
        <span className="badge bg-zinc-50 text-zinc-600 border border-zinc-200">{data.filter(m=>m.role!=='member').length} líderes</span>
      </div>
    </div>

    <div className="card p-4 flex flex-wrap gap-3 items-center">
      <div className="flex-1 min-w-[220px] relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">⌕</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o tag (#TAG)" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 outline-none" />
        {search && <button onClick={()=>setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded-full">✕</button>}
      </div>
      <span className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-full hidden sm:inline">Click en cabecera para ordenar</span>
      {(search.trim() || sort.field) && <button onClick={()=>{setSearch(''); setSort({field:null, dir:'desc'})}} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-full font-medium transition-colors">Limpiar filtros ✕</button>}
      <span className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-full">{filtered.length} resultados</span>
    </div>

    <div className="card overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50/80 border-b border-zinc-100 text-xs uppercase tracking-widest text-zinc-500">
              <th onClick={()=>handleSort('name')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Jugador <SortIcon field="name"/></th>
              <th onClick={()=>handleSort('th')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">TH <SortIcon field="th"/></th>
              <th onClick={()=>handleSort('role')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Rol <SortIcon field="role"/></th>
              <th onClick={()=>handleSort('donations')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Donaciones <SortIcon field="donations"/></th>
              <th onClick={()=>handleSort('estado')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Estado <SortIcon field="estado"/></th>
              <th className="p-4 text-right font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map(m=> (
              <tr key={m.player_tag} className="group hover:bg-violet-50/40 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {m.player_name.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <Link to={'/miembros/'+encodeURIComponent(m.player_tag)} className="font-semibold text-zinc-900 group-hover:text-violet-700 transition-colors">{m.player_name}</Link>
                      <div className="font-mono text-xs text-zinc-500">{m.player_tag}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4"><span className="inline-flex items-center gap-1.5 bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold">⬡ TH{m.town_hall}</span></td>
                <td className="p-4"><span className={`badge border ${roleStyles[m.role]||roleStyles.member}`}>{roleLabel(m.role)}</span></td>
                <td className="p-4">
                  <div className="font-medium text-zinc-900">{m.donations.toLocaleString()} <span className="text-zinc-400 font-normal">/</span> {m.donations_received.toLocaleString()}</div>
                  <div className="w-24 h-1.5 bg-zinc-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full" style={{width: `${Math.min(100, (m.donations/Math.max(1,m.donations_received))*50 + 30)}%`}} />
                  </div>
                </td>
                <td className="p-4"><div className="flex items-center gap-1.5 flex-wrap">{(()=>{ const e=m.estado_manual||m.estado_auto||'ACTIVO'; const cls={ACTIVO:'bg-emerald-50 text-emerald-700 border-emerald-200',EN_RIESGO:'bg-amber-100 text-amber-800 border-amber-200',EXPULSABLE:'bg-red-50 text-red-700 border-red-200'}[e]||'bg-zinc-100 text-zinc-700 border-zinc-200'; const dot={ACTIVO:'bg-emerald-500',EN_RIESGO:'bg-amber-500',EXPULSABLE:'bg-red-500'}[e]||'bg-zinc-400'; return <><span className={`badge border ${cls}`}><span className={`w-1.5 h-1.5 rounded-full ${dot} mr-1.5`}></span>{e}</span>{(m.war_preference||'in').toLowerCase()==='out' && <span className="badge bg-zinc-900 text-white border-zinc-900 text-[10px]">OUT</span>}</> })()}</div></td>
                <td className="p-4 text-right"><Link to={'/miembros/'+encodeURIComponent(m.player_tag)} className="text-xs font-semibold bg-white group-hover:bg-zinc-900 group-hover:text-white border border-zinc-200 group-hover:border-zinc-900 text-violet-600 px-3 py-1.5 rounded-full transition-all inline-block">Ver perfil →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0 && <div className="p-12 text-center"><div className="text-sm text-zinc-500">Sin resultados para "{search}"</div><button onClick={()=>setSearch('')} className="mt-2 text-xs bg-zinc-900 text-white px-3 py-1.5 rounded-full">Limpiar filtro</button></div>}
      </div>
    </div>
  </div>
}
