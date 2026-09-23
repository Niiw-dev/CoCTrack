import { useQuery } from "@tanstack/react-query"
import api from "../api"
import { Link } from "react-router-dom"

export default function Dashboard(){
  const {data, isLoading, error} = useQuery({queryKey:["dashboard"], queryFn: async()=> (await api.get("/dashboard")).data, refetchInterval: 10000})
  const {data: allAlerts} = useQuery({queryKey:["alerts-count"], queryFn: async()=> (await api.get("/alerts",{params:{limit:100}})).data, refetchInterval: 10000})
  const {data: members} = useQuery({queryKey:["dash-members"], queryFn: async()=> (await api.get("/members")).data, refetchInterval: 10000})
  const {data: wars} = useQuery({queryKey:["dash-wars"], queryFn: async()=> (await api.get("/wars")).data, refetchInterval: 10000})
  const {data: capital} = useQuery({queryKey:["dash-capital"], queryFn: async()=> (await api.get("/capital-seasons")).data, refetchInterval: 10000})
  const {data: cwl} = useQuery({queryKey:["dash-cwl"], queryFn: async()=> (await api.get("/cwl/groups")).data, refetchInterval: 10000})

  if(isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin"></div></div>
  if(error) return <div className="card p-8 text-center"><div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3">◈</div><p className="text-sm text-zinc-600">Sin datos: haz sync primero.</p></div>
  const clan=data?.clan_snapshot
  let payload={}
  try{ payload=JSON.parse(data?.last_sync?.payload||'{}')}catch{}
  const estadoCounts = members ? {
    activo: members.filter(m=> (m.estado_auto||'ACTIVO')==='ACTIVO').length,
    riesgo: members.filter(m=> (m.estado_auto||'ACTIVO')==='EN_RIESGO').length,
    expulsable: members.filter(m=> (m.estado_auto||'ACTIVO')==='EXPULSABLE').length,
    out: members.filter(m=> (m.war_preference||'in').toLowerCase()==='out').length,
  } : null

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="page-title text-[28px]">Dashboard</h1>
        <p className="page-subtitle">Visión general del clan y actividad reciente · Actualiza cada 10s</p>
      </div>
      <Link to="/rotacion" className="btn-primary hidden md:inline-flex">⚔ Ver rotación →</Link>
    </div>

    {!clan && <div className="card p-6 flex gap-4 items-start border-amber-200 bg-amber-50/60">
      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">⚑</div>
      <div><div className="font-semibold text-amber-900">Sin sincronización</div><div className="text-sm text-amber-700 mt-1">Pulsa <b>Actualizar datos</b> arriba. Configura <span className="font-mono bg-white px-1.5 py-0.5 rounded border">COC_API_TOKEN</span> en <span className="font-mono">backend/.env</span></div></div>
    </div>}

    {clan && <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-6 relative overflow-hidden card-hover">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="text-xs font-semibold tracking-widest uppercase text-zinc-400">Clan</div>
          <div className="mt-3 font-bold text-lg leading-tight">{clan.clan_name} <span className="font-normal text-zinc-500">· Nv {clan.clan_level}</span></div>
          <div className="mt-2 inline-flex items-center gap-2 bg-zinc-900 text-white text-xs font-medium px-3 py-1.5 rounded-full">{clan.members_count}/50 miembros</div>
          <div className="text-xs text-zinc-500 mt-3 flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Sync {new Date(clan.synced_at).toLocaleString()}</div>
          <div className="mt-3 flex gap-1.5">
            <Link to="/miembros" className="text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-2.5 py-1 rounded-full font-medium">Miembros →</Link>
            <Link to="/guerra" className="text-xs bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-full">Guerra →</Link>
          </div>
        </div>

        <div className="card p-6 card-hover">
          <div className="text-xs font-semibold tracking-widest uppercase text-zinc-400">Último sync</div>
          {!data.last_sync ? <div className="text-sm text-zinc-500 mt-3">—</div> :
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${data.last_sync.status==='OK'?'bg-emerald-500 text-white':'bg-amber-500 text-white'}`}>{data.last_sync.status}</span>
                <span className="text-xs text-zinc-500">{new Date(data.last_sync.finished_at||data.last_sync.started_at).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-zinc-50 rounded-xl py-2"><div className="text-lg font-bold">{payload.members??'-'}</div><div className="text-[11px] uppercase tracking-wide text-zinc-500">Miembros</div></div>
                <div className="bg-zinc-50 rounded-xl py-2"><div className="text-lg font-bold">{payload.wars_log??0}</div><div className="text-[11px] uppercase tracking-wide text-zinc-500">Wars</div></div>
                <div className="bg-zinc-50 rounded-xl py-2"><div className="text-lg font-bold">{payload.capital_seasons??0}</div><div className="text-[11px] uppercase tracking-wide text-zinc-500">Capital</div></div>
              </div>
              <div className="text-xs text-zinc-500">Guerra <b className="text-zinc-700">{payload.war_state||'-'}</b> · {payload.wars_inserted??0} nuevas</div>
              {payload.alerts_inserted!=null && <div className="text-xs"><span className="badge bg-violet-50 text-violet-700 border border-violet-200">⚑ {payload.alerts_inserted} alertas</span> <span className="badge bg-amber-50 text-amber-700 border border-amber-200 ml-1">⚠ {payload.warnings_inserted} warnings</span></div>}
            </div>
          }
        </div>

        <div className="card p-6 card-hover">
          <div className="flex items-start justify-between">
            <div className="text-xs font-semibold tracking-widest uppercase text-zinc-400">Alertas</div>
            <Link to="/alertas" className="text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-full transition-colors">Ver todas →</Link>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-3xl font-black">{data.alerts?.length||0}</div>
            <div className="text-sm text-zinc-500">pendientes <span className="text-zinc-300">/</span> {allAlerts?.length||0} totales</div>
          </div>
          {data.alerts?.length ? <ul className="mt-4 space-y-2">
            {data.alerts.slice(0,3).map(a=> <li key={a.id} className="flex gap-2 text-xs bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100"><span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.severidad==='CRITICA'?'bg-red-500':a.severidad==='ALTA'?'bg-orange-500':'bg-amber-400'}`}></span><span className="text-zinc-700 line-clamp-2">{a.mensaje||a.tipo}</span></li>)}
          </ul> : <div className="mt-4 text-sm text-zinc-400 bg-zinc-50 rounded-xl p-3 text-center border border-dashed">Sin alertas pendientes ✓</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-xs font-semibold tracking-widest uppercase text-zinc-400">Miembros por estado</div>
          {estadoCounts ? <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span>Activo</span><span className="font-bold">{estadoCounts.activo}</span></div>
            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500" style={{width: `${members.length? (estadoCounts.activo/members.length*100):0}%`}}></div>
              <div className="bg-amber-500" style={{width: `${members.length? (estadoCounts.riesgo/members.length*100):0}%`}}></div>
              <div className="bg-red-500" style={{width: `${members.length? (estadoCounts.expulsable/members.length*100):0}%`}}></div>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="badge bg-amber-100 text-amber-800 border-amber-200">Riesgo {estadoCounts.riesgo}</span>
              <span className="badge bg-red-50 text-red-700 border-red-200">Exp. {estadoCounts.expulsable}</span>
              {estadoCounts.out>0 && <span className="badge bg-zinc-900 text-white">OUT {estadoCounts.out}</span>}
            </div>
          </div> : <div className="text-xs text-zinc-500 mt-3">—</div>}
          <Link to="/miembros" className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 inline-block">Ver miembros →</Link>
        </div>

        <div className="card p-5">
          <div className="text-xs font-semibold tracking-widest uppercase text-zinc-400">Capital</div>
          <div className="text-2xl font-black mt-2">{capital?.length||0} <span className="text-sm font-normal text-zinc-500">temporadas</span></div>
          <div className="text-xs text-zinc-500 mt-1">≥5 ataques / finde</div>
          <div className="mt-3 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{width: `${Math.min(100, (capital?.length||0)*30)}%`}}></div>
          </div>
          <Link to="/capital" className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 inline-block">Ver capital →</Link>
        </div>

        <div className="card p-5">
          <div className="text-xs font-semibold tracking-widest uppercase text-zinc-400">CWL</div>
          <div className="text-2xl font-black mt-2">{cwl?.length||0} <span className="text-sm font-normal text-zinc-500">groups</span></div>
          <div className="text-xs text-zinc-500 mt-1">{wars?.filter(w=>w.state==='warEnded').length||0} guerras terminadas</div>
          <div className="mt-3 flex gap-1.5">
            <span className="badge bg-violet-50 text-violet-700 border-violet-200">♜ {cwl?.length||0}</span>
            <span className="badge bg-zinc-50 border-zinc-200">{wars?.length||0} wars</span>
          </div>
          <Link to="/cwl" className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 inline-block">Ver CWL →</Link>
        </div>

        <div className="card p-5 bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-0">
          <div className="text-xs uppercase tracking-widest text-white/70 font-semibold">Rotación</div>
          <div className="font-bold mt-2">¿Quién va a guerra?</div>
          <div className="text-xs text-white/80 mt-1">Prioriza descanso + OUT último</div>
          <Link to="/rotacion" className="mt-3 inline-block bg-white text-violet-700 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-violet-50">Proponer equipo →</Link>
        </div>
      </div>
    </>}

    <div className="card p-6">
      <div className="font-semibold flex items-center gap-2">Cómo usar <span className="text-xs font-normal bg-zinc-100 px-2 py-1 rounded-full">3 pasos</span></div>
      <ol className="mt-4 grid md:grid-cols-3 gap-4">
        {[
          ["01","Configura token","Añade COC_API_TOKEN y COC_CLAN_TAG en backend/.env"],
          ["02","Sincroniza","Pulsa Actualizar datos (throttle 10m)"],
          ["03","Explora","Revisa Miembros, Rotación, CWL y Guerra"],
        ].map(([n,t,d])=> (
          <li key={n} className="flex gap-3 bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">{n}</div>
            <div><div className="font-semibold text-sm">{t}</div><div className="text-xs text-zinc-500 mt-1 leading-relaxed">{d}</div></div>
          </li>
        ))}
      </ol>
    </div>
  </div>
}
