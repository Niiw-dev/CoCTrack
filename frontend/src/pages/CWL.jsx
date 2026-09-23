import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import api from "../api"

export default function CWL(){
  const {data: groups, isLoading: lg} = useQuery({queryKey:["cwl-groups"], queryFn: async()=> (await api.get("/cwl/groups")).data})
  const {data: wars, isLoading: lw} = useQuery({queryKey:["cwl-wars"], queryFn: async()=> (await api.get("/cwl/wars")).data})
  const [selGroup, setSelGroup] = useState(null)
  const {data: groupDetail} = useQuery({queryKey:["cwl-group", selGroup], queryFn: async()=> (await api.get(`/cwl/groups/${selGroup}`)).data, enabled: !!selGroup})
  const [selWar, setSelWar] = useState(null)

  if(lg || lw) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin"></div></div>

  const isEmpty = (!groups || groups.length===0) && (!wars || wars.length===0)

  return <div className="space-y-6">
    <div>
      <h1 className="page-title text-[26px]">CWL <span className="text-zinc-400 font-normal">· Liga de Guerras</span></h1>
      <p className="page-subtitle">Temporada de 7 días · 15vs15 con bonus · Se captura automático vía <span className="font-mono text-xs bg-zinc-100 border px-1.5 py-0.5 rounded-full">currentwar/leaguegroup</span></p>
    </div>

    {isEmpty && <div className="card p-8 text-center border-amber-200 bg-amber-50/40">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center mx-auto text-xl shadow">♜</div>
      <div className="font-bold mt-3">Sin temporada CWL activa</div>
      <div className="text-sm text-zinc-600 mt-1 max-w-xl mx-auto">El clan no está en CWL actualmente o aún no se ha sincronizado durante CWL. Haz <b>Actualizar datos</b> cuando el clan esté en <span className="badge bg-zinc-900 text-white">preparation/inWar</span> de CWL — se guardarán `cwl_groups` y 7 `cwl_wars` (uno por día).</div>
      <div className="mt-4 inline-flex gap-2 text-xs">
        <span className="badge bg-white border border-zinc-200">Groups: {groups?.length||0}</span>
        <span className="badge bg-white border border-zinc-200">Wars: {wars?.length||0}</span>
      </div>
    </div>}

    {!isEmpty && <div className="grid md:grid-cols-3 gap-4">
      <div className="card p-5 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white border-0">
        <div className="text-xs uppercase tracking-widest text-white/60">Groups</div>
        <div className="text-3xl font-black mt-1">{groups?.length||0}</div>
        <div className="text-xs text-white/70 mt-1">Temporadas registradas</div>
      </div>
      <div className="card p-5">
        <div className="text-xs uppercase tracking-widest font-semibold text-zinc-500">Wars CWL</div>
        <div className="text-3xl font-black mt-1">{wars?.length||0}</div>
        <div className="text-xs text-zinc-500 mt-1">Guerras de liga</div>
      </div>
      <div className="card p-5 bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-0">
        <div className="text-xs uppercase tracking-widest text-white/70">Estado</div>
        <div className="text-lg font-bold mt-1">{groups?.[0]?.state || wars?.[0]?.state || '—'}</div>
        <div className="text-xs text-white/80 mt-1">{groups?.[0]?.tag || wars?.[0]?.war_tag || 'Sin datos'}</div>
      </div>
    </div>}

    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="font-semibold">Grupos CWL <span className="badge bg-zinc-900 text-white ml-1">{groups?.length||0}</span></div>
          <span className="text-xs text-zinc-500">Pulsa para ver wars del grupo</span>
        </div>
        {groups?.length===0 ? <div className="p-8 text-center text-sm text-zinc-500">Sin grupos</div> :
          <div className="overflow-auto max-h-[420px]">
            <table className="w-full text-sm">
              <thead><tr className="bg-zinc-50/80 border-b border-zinc-100 text-xs uppercase tracking-widest text-zinc-500"><th className="p-3 text-left font-semibold">Tag</th><th className="p-3">Estado</th><th className="p-3 text-left">Fecha</th><th className="p-3"></th></tr></thead>
              <tbody className="divide-y divide-zinc-100">{groups?.map(g=> <tr key={g.id} className={`hover:bg-violet-50/40 ${selGroup===g.id?'bg-violet-50/60':''}`}>
                <td className="p-3 font-mono text-xs bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-full inline-flex m-2">{g.tag}</td>
                <td className="p-3 text-center"><span className={`badge border text-xs ${g.state==='ended'?'bg-zinc-900 text-white border-zinc-900':g.state==='inWar'?'bg-emerald-500 text-white border-emerald-500':'bg-zinc-100 text-zinc-700'}`}>{g.state||'—'}</span></td>
                <td className="p-3 text-xs text-zinc-600">{g.created_at? new Date(g.created_at).toLocaleDateString():'—'}</td>
                <td className="p-3 text-right"><button onClick={()=>setSelGroup(g.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selGroup===g.id?'bg-zinc-900 text-white border-zinc-900':'bg-white hover:bg-zinc-900 hover:text-white border-zinc-200'}`}>Ver</button></td>
              </tr>)}</tbody>
            </table>
          </div>
        }
        {groupDetail && <div className="p-4 bg-violet-50/50 border-t border-violet-100">
          <div className="font-semibold text-sm">Grupo {groupDetail.group.tag} · {groupDetail.wars.length} wars</div>
          <div className="mt-3 space-y-1.5">{groupDetail.wars.map(w=> <div key={w.id} className="flex items-center justify-between bg-white border border-zinc-100 rounded-xl px-3 py-2 text-xs">
            <span className="font-mono bg-zinc-100 border px-2 py-0.5 rounded-full">{w.war_tag}</span>
            <span className={`badge border ${w.state==='warEnded'?'bg-zinc-900 text-white border-zinc-900':'bg-zinc-100'}`}>{w.state}</span>
            <span className="text-zinc-500">{w.end_time? new Date(w.end_time).toLocaleDateString():'—'}</span>
            <button onClick={()=>setSelWar(w.war_tag)} className="text-violet-600 hover:text-violet-700 font-semibold">Detalle</button>
          </div>)}
          </div>
          {groupDetail.raw?.season && <div className="text-xs text-violet-700 mt-2">Season: {groupDetail.raw.season} · Clans: {groupDetail.raw.clans?.length||0}</div>}
        </div>}
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="font-semibold">Wars CWL <span className="badge bg-zinc-900 text-white ml-1">{wars?.length||0}</span></div>
          <span className="text-xs text-zinc-500">Hasta 7 por temporada</span>
        </div>
        {wars?.length===0 ? <div className="p-8 text-center text-sm text-zinc-500">Sin wars CWL</div> :
          <div className="overflow-auto max-h-[420px]">
            <table className="w-full text-sm">
              <thead><tr className="bg-zinc-50/80 border-b border-zinc-100 text-xs uppercase tracking-widest text-zinc-500"><th className="p-3 text-left font-semibold">War Tag</th><th className="p-3">Estado</th><th className="p-3 text-left">Fin</th><th className="p-3"></th></tr></thead>
              <tbody className="divide-y divide-zinc-100">{wars?.map(w=> <tr key={w.id} className="hover:bg-zinc-50/60">
                <td className="p-3 font-mono text-xs bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-full inline-flex m-1">{w.war_tag}</td>
                <td className="p-3 text-center"><span className={`badge border text-xs ${w.state==='warEnded'?'bg-zinc-900 text-white border-zinc-900':w.state==='inWar'?'bg-emerald-500 text-white border-emerald-500':'bg-zinc-100'}`}>{w.state}</span></td>
                <td className="p-3 text-xs text-zinc-600">{w.end_time? new Date(w.end_time).toLocaleString():'—'}</td>
                <td className="p-3 text-right"><button onClick={()=>setSelWar(w.war_tag)} className="text-xs font-semibold text-violet-600 hover:text-violet-700">Ver JSON</button></td>
              </tr>)}</tbody>
            </table>
          </div>
        }
        {selWar && <div className="p-4 bg-zinc-50 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs font-bold">{selWar}</div>
            <button onClick={()=>setSelWar(null)} className="text-xs bg-white border border-zinc-200 px-2 py-1 rounded-full hover:bg-zinc-100">Cerrar ✕</button>
          </div>
          <div className="mt-2 text-xs font-mono bg-zinc-900 text-zinc-100 rounded-xl p-3 overflow-auto max-h-[280px] whitespace-pre-wrap break-all">
            {(() => {
              const w = wars?.find(x=>x.war_tag===selWar) || groupDetail?.wars.find(x=>x.war_tag===selWar)
              if(!w) return 'No encontrado'
              try { return JSON.stringify(JSON.parse(w.raw_json||'{}'), null, 2).slice(0,4000) } catch { return w.raw_json?.slice(0,4000)||'—' }
            })()}
          </div>
        </div>}
      </div>
    </div>

    <div className="card p-5">
      <div className="font-semibold text-sm">Cómo funciona CWL</div>
      <ol className="mt-3 grid md:grid-cols-3 gap-3 text-xs">
        <li className="bg-zinc-50 border border-zinc-100 rounded-xl p-3"><b>01</b> 7 días, 15vs15 diario → se guarda 1 `cwl_group` + 7 `cwl_wars`</li>
        <li className="bg-zinc-50 border border-zinc-100 rounded-xl p-3"><b>02</b> Sync cada hora en `inWar` captura `war_tag` y `end_time`</li>
        <li className="bg-zinc-50 border border-zinc-100 rounded-xl p-3"><b>03</b> Revisa `state: warEnded/inWar/preparation` y `raw_json` para estrellas</li>
      </ol>
    </div>
  </div>
}
