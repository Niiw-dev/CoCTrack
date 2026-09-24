import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import api from "../api"

export default function ClanGames(){
  const qc = useQueryClient()
  const {data: seasons, isLoading} = useQuery({queryKey:["clan-games"], queryFn: async()=> (await api.get("/clan-games")).data})
  const [sel, setSel] = useState(null)
  const {data: detail} = useQuery({queryKey:["clan-game", sel], queryFn: async()=> (await api.get("/clan-games/"+sel)).data, enabled: !!sel})
  const [sort, setSort] = useState({field:null, dir:'desc'})
  const handleSort = (field)=> setSort(prev=> prev.field===field ? {field, dir: prev.dir==='asc'?'desc':'asc'} : {field, dir:'desc'})
  const sorted = useMemo(()=>{
    if(!seasons) return []
    if(!sort.field) return seasons
    const mul = sort.dir==='asc'?1:-1
    const copy=[...seasons]
    if(sort.field==='start_time') copy.sort((a,b)=> (new Date(a.start_time)-new Date(b.start_time))*mul)
    else if(sort.field==='points_required') copy.sort((a,b)=> (a.points_required-b.points_required)*mul)
    else if(sort.field==='total_points') copy.sort((a,b)=> (a.total_points-b.total_points)*mul)
    return copy
  },[seasons, sort])
  const SortIcon = ({field})=> sort.field!==field ? <span className="text-zinc-300 ml-1">↕</span> : <span className="ml-1 text-violet-600">{sort.dir==='asc'?'↑':'↓'}</span>

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({start_time:'', end_time:'', points_required:4000, name:'', participationsText:''})
  const [msg, setMsg] = useState(null)
  const createMut = useMutation({
    mutationFn: async(payload)=> (await api.post("/clan-games", payload)).data,
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:["clan-games"]}); setMsg("Temporada creada"); setFormOpen(false); setTimeout(()=>setMsg(null),3000)},
    onError: (e)=> setMsg(e.response?.data?.error || e.response?.data?.message || e.message)
  })
  const handleCreate = ()=>{
    let parts=[]
    if(form.participationsText.trim()){
      // formato: #TAG puntos, una por línea. Ej: #ABC123 4000
      parts = form.participationsText.split('\n').map(l=>l.trim()).filter(Boolean).map(line=>{
        const [tag, pts, tasks] = line.split(/[\s,;]+/)
        return {player_tag: tag, points: parseInt(pts||0), tasks_completed: parseInt(tasks||0)}
      }).filter(p=>p.player_tag?.startsWith('#'))
    }
    createMut.mutate({
      start_time: form.start_time || new Date().toISOString(),
      end_time: form.end_time || null,
      points_required: parseInt(form.points_required)||4000,
      name: form.name || null,
      participations: parts
    })
  }

  const deleteMut = useMutation({
    mutationFn: async(id)=> (await api.delete("/clan-games/"+id)).data,
    onSuccess: ()=> qc.invalidateQueries({queryKey:["clan-games"]})
  })

  if(isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin"></div></div>
  return <div className="space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="page-title text-[26px]">Juegos del Clan <span className="text-zinc-400 font-normal">· {seasons?.length||0}</span></h1>
        <p className="page-subtitle">Carga manual (API no expone juegos) · ≥4000 pts para cumplir · Participar cada 4d en cualquiera: guerra/CWL/juegos/capital evita inactividad</p>
      </div>
      <button onClick={()=>setFormOpen(!formOpen)} className="btn-primary px-4 py-2 text-sm shrink-0">{formOpen?'Cerrar':'＋ Nueva temporada'}</button>
    </div>

    {msg && <div className={`text-sm px-4 py-2 rounded-xl border ${msg.includes('creada')?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>{msg}</div>}

    {formOpen && <div className="card p-6 space-y-4">
      <div className="font-semibold">Nueva temporada</div>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm">Inicio <input type="datetime-local" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})} className="w-full border rounded-xl px-3 py-2 mt-1"/></label>
        <label className="text-sm">Fin <input type="datetime-local" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})} className="w-full border rounded-xl px-3 py-2 mt-1"/></label>
        <label className="text-sm">Puntos requeridos <input type="number" value={form.points_required} onChange={e=>setForm({...form,points_required:e.target.value})} className="w-full border rounded-xl px-3 py-2 mt-1"/></label>
        <label className="text-sm">Nombre <input placeholder="Juegos Mayo 2026" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full border rounded-xl px-3 py-2 mt-1"/></label>
      </div>
      <label className="text-sm block">Participaciones (una por línea: <span className="font-mono bg-zinc-100 px-1 rounded">#TAG puntos [tareas]</span>)
        <textarea rows={5} placeholder={"#ABC123 4000 8\n#DEF456 1500 3"} value={form.participationsText} onChange={e=>setForm({...form,participationsText:e.target.value})} className="w-full border rounded-xl px-3 py-2 mt-1 font-mono text-sm"/>
      </label>
      <div className="flex gap-2">
        <button onClick={handleCreate} disabled={createMut.isPending} className="bg-zinc-900 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50">{createMut.isPending?'Guardando...':'Guardar temporada'}</button>
        <button onClick={()=>setFormOpen(false)} className="bg-zinc-100 hover:bg-zinc-200 px-5 py-2 rounded-xl text-sm">Cancelar</button>
      </div>
      <div className="text-xs text-zinc-500 bg-violet-50 border border-violet-200 rounded-xl p-3">Tip: pega desde Excel con formato <span className="font-mono">#TAG TAB puntos</span>. Los que tengan ≥ {form.points_required||4000} pts marcarán como <span className="font-semibold">Cumplió</span> y reinician contador de inactividad 4 días.</div>
    </div>}

    {seasons?.length===0 && !formOpen && <div className="card p-8 text-center border-violet-200 bg-violet-50/50"><div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto">🎮</div><div className="font-semibold mt-3">Sin temporadas</div><div className="text-sm text-zinc-500">Crea la primera temporada con el botón superior. La API oficial no da juegos, por eso es manual.</div></div>}

    {sort.field && <div className="flex items-center gap-2">
      <span className="text-xs bg-violet-50 border border-violet-200 text-violet-700 px-3 py-1.5 rounded-full">Orden: {sort.field} {sort.dir==='asc'?'↑':'↓'}</span>
      <button onClick={()=>setSort({field:null, dir:'desc'})} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-full font-medium">Limpiar filtros ✕</button>
    </div>}

    <div className="card overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-zinc-50/80 border-b border-zinc-100 text-xs uppercase tracking-widest text-zinc-500">
            <th onClick={()=>handleSort('start_time')} className="p-4 text-left font-semibold cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Inicio <SortIcon field="start_time"/></th>
            <th className="p-4 text-left">Fin</th>
            <th className="p-4 text-left">Nombre</th>
            <th onClick={()=>handleSort('points_required')} className="p-4 text-center cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Req <SortIcon field="points_required"/></th>
            <th onClick={()=>handleSort('total_points')} className="p-4 text-center cursor-pointer hover:text-zinc-900 hover:bg-zinc-100 select-none">Total pts <SortIcon field="total_points"/></th>
            <th className="p-4 text-right"></th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-100">{sorted?.map(s=> <tr key={s.id} className={`hover:bg-zinc-50/60 ${sel===s.id?'bg-violet-50/60':''}`}>
            <td className="p-4 font-medium">{s.start_time? new Date(s.start_time).toLocaleString():"—"}</td>
            <td className="p-4 text-zinc-600">{s.end_time? new Date(s.end_time).toLocaleString():"—"}</td>
            <td className="p-4">{s.name||"—"}</td>
            <td className="p-4 text-center"><span className="badge bg-zinc-900 text-white">{s.points_required}</span></td>
            <td className="p-4 text-center font-bold">{Number(s.total_points).toLocaleString()}</td>
            <td className="p-4 text-right flex gap-1 justify-end">
              <button onClick={()=>setSel(s.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${sel===s.id?'bg-zinc-900 text-white border-zinc-900':'bg-white hover:bg-zinc-900 hover:text-white border-zinc-200'}`}>{sel===s.id?'Seleccionada':'Ver'}</button>
              <button onClick={()=>{if(confirm('¿Borrar temporada?')) deleteMut.mutate(s.id)}} className="px-2 py-1.5 rounded-full text-xs border border-red-200 text-red-600 hover:bg-red-50">✕</button>
            </td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>

    {detail && <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Temporada #{detail.season.id} · {detail.season.name} · <span className="text-zinc-500 font-normal">{detail.participations.length} participaciones</span> · Req {detail.season.points_required}</div>
        <button onClick={()=>setSel(null)} className="text-xs bg-zinc-100 hover:bg-zinc-200 px-3 py-1 rounded-full">Cerrar ✕</button>
      </div>
      {detail.participations.length===0 ? <div className="text-sm text-zinc-500 mt-4 bg-zinc-50 border border-dashed rounded-xl p-4 text-center">Sin participaciones — añade con formato #TAG puntos</div> :
        <div className="mt-4 overflow-auto rounded-xl border border-zinc-100">
          <table className="w-full text-sm"><thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="p-3 text-left">Jugador</th><th className="p-3 text-center">Puntos</th><th className="p-3 text-center">Tareas</th><th className="p-3 text-center">Estado</th></tr></thead>
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
            <td className="p-3 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${p.cumplio?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>{p.points} / {detail.season.points_required}</span></td>
            <td className="p-3 text-center">{p.tasks_completed}</td>
            <td className="p-3 text-center"><span className={`badge border ${p.cumplio?'bg-emerald-500 text-white border-emerald-500':'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>{p.cumplio?"Cumplió":"Pendiente"}</span></td>
          </tr>)}</tbody></table>
        </div>
      }
    </div>}
  </div>
}
