import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api'
import { Link } from 'react-router-dom'

function MemberPill({m, rank, variant}){
  const isAlta = (m.wars_without_play||0) >= 3
  const isOblig = (m.consecutive||0) >= 4
  return <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${variant==='equipo' ? 'bg-white border-zinc-200 hover:border-violet-300 hover:shadow-sm' : 'bg-white border-zinc-100 hover:border-violet-200 hover:bg-violet-50/50'}`}>
    {rank && <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${rank<=3 ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow' : 'bg-zinc-900 text-white'}`}>{rank}</div>}
    {!rank && <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">{m.name.slice(0,2).toUpperCase()}</div>}
    {rank && <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[11px] font-bold shrink-0">{m.name.slice(0,2).toUpperCase()}</div>}
    <div className="flex-1 min-w-0">
      <Link to={'/miembros/'+encodeURIComponent(m.tag)} className="text-sm font-semibold leading-none truncate hover:text-violet-700">{m.name}</Link>
      <div className="font-mono text-[11px] text-zinc-500 truncate">{m.tag}</div>
      <div className="flex gap-1 mt-1 flex-wrap">
        {isAlta && <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">ALTA {m.wars_without_play} sin jugar</span>}
        {isOblig && <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">4 consec</span>}
        {!isAlta && !isOblig && <span className="text-[10px] bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded-full">{m.wars_without_play} sin jugar · {m.consecutive} consec</span>}
        {m.war_preference==='OUT' && <span className="text-[10px] bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded-full">OUT</span>}
      </div>
    </div>
    <div className="text-right shrink-0 hidden sm:block">
      <div className="text-xs font-medium">{m.wars_without_play} gap</div>
      <div className="text-[11px] text-zinc-500">{m.last_war_at ? new Date(m.last_war_at).toLocaleDateString() : 'sin guerra'}</div>
    </div>
  </div>
}

export default function Rotation(){
  const [teamSize,setTeamSize]=useState(15)
  const [copied,setCopied]=useState(false)
  const {data, refetch, isFetching} = useQuery({queryKey:['rotation',teamSize], queryFn: async()=> (await api.get('/rotation?teamSize='+teamSize)).data, enabled:false})

  const equipo = data?.equipo || data?.sorted?.slice(0, data?.teamSize||teamSize) || []
  const banca = data?.banca || data?.sorted?.slice(data?.teamSize||teamSize) || []

  const copyEquipo = async()=>{
    if(!equipo.length) return
    const text = equipo.map(m=> `${m.name} ${m.tag}`).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(()=>setCopied(false),2000)
  }

  return <div className="space-y-6">
    <div>
      <h1 className="page-title text-[26px]">Rotación</h1>
      <p className="page-subtitle">Propuesta explicable según §13 · Prioriza descanso y equidad · <b className="text-zinc-700">Equipo = los {teamSize} que debes agregar a guerra</b></p>
    </div>

    <div className="card p-5 flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">Team size</label>
        <select value={teamSize} onChange={e=>setTeamSize(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 outline-none">
          {[5,10,15,20,25,30,50].map(n=> <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <button onClick={()=>refetch()} disabled={isFetching} className="btn-primary disabled:opacity-50 flex items-center gap-2">
        {isFetching && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
        {isFetching?'Calculando...':'Proponer rotación'}
      </button>
      <span className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-full">Criterio: sinJugar ↓ , consec ↑ , última guerra ↑ , fallos ↑</span>
    </div>

    {!data && <div className="card p-12 text-center"><div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto text-xl">⟡</div><div className="font-semibold mt-3">Sin propuesta</div><div className="text-sm text-zinc-500">Elige team size y pulsa Proponer · Ej: 5 → verás los 5 que entran</div></div>}

    {data && <>
      {/* Equipo destacado */}
      <div className="card overflow-hidden border-violet-200 shadow-[0_8px_32px_rgba(124,58,237,0.12)]">
        <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-white text-violet-700 flex items-center justify-center font-black text-sm">⚔</span>
                <h2 className="text-lg font-black tracking-tight">Equipo para guerra · {equipo.length} / {data.teamSize}</h2>
                <span className="bg-white/20 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold border border-white/20">PROPUESTO</span>
              </div>
              <p className="text-sm text-violet-100 mt-1">Estos son los <b className="text-white">{equipo.length}</b> que debes agregar si tu guerra es de {data.teamSize}. Prioriza descanso.</p>
            </div>
            <button onClick={copyEquipo} className="bg-white text-violet-700 hover:bg-violet-50 px-4 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-colors">
              {copied ? '✓ Copiado' : '⎘ Copiar lista'}
            </button>
          </div>
        </div>

        <div className="p-5">
          {equipo.length===0 ? <div className="text-sm text-zinc-500 text-center py-6">Sin miembros para armar equipo</div> :
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {equipo.map((m,i)=> <MemberPill key={m.tag} m={m} rank={i+1} variant="equipo" />)}
            </div>
          }
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="badge bg-amber-100 text-amber-800 border border-amber-200">Alta ≥3 sin jugar</span>
            <span className="badge bg-zinc-900 text-white">Media</span>
            <span className="badge bg-red-100 text-red-800 border border-red-200">Obligatoria 4 consec</span>
            <span className="ml-auto text-zinc-500">Orden: descansados primero</span>
          </div>
        </div>
      </div>

      {/* Banca */}
      {banca.length>0 && <div className="card p-5">
        <div className="flex items-center gap-2 font-semibold">Banca <span className="badge bg-zinc-100 border border-zinc-200">{banca.length}</span> <span className="text-xs font-normal text-zinc-500">— quedan fuera de esta guerra</span></div>
        <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {banca.map((m,i)=> <MemberPill key={m.tag} m={m} rank={equipo.length+i+1} />)}
        </div>
      </div>}

      {/* Desglose 3 buckets */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-5 border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/50">
          <div className="flex items-center gap-2 font-bold text-amber-900"><span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm">↑</span> Alta <span className="badge bg-amber-500 text-white">{data.alta?.length||0}</span></div>
          <div className="text-xs text-amber-700 mt-1">≥3 guerras sin jugar · Prioridad descanso</div>
          <div className="mt-4 space-y-2">{data.alta?.length ? data.alta.map(m=> <MemberPill key={m.tag} m={m} />) : <div className="text-sm text-amber-700/60 bg-white/60 rounded-xl p-3 text-center border border-dashed border-amber-200">Sin candidatos</div>}</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 font-bold"><span className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center text-sm">◈</span> Media <span className="badge bg-zinc-900 text-white">{data.media?.length||0}</span></div>
          <div className="text-xs text-zinc-500 mt-1">Rotación normal</div>
          <div className="mt-4 space-y-2 max-h-[320px] overflow-auto pr-1">{data.media?.map(m=> <MemberPill key={m.tag} m={m} />)}</div>
        </div>
        <div className="card p-5 border-red-200 bg-gradient-to-br from-red-50/80 to-orange-50/50">
          <div className="flex items-center gap-2 font-bold text-red-900"><span className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center text-sm">⟡</span> Obligatoria <span className="badge bg-red-500 text-white">{data.rotacion_obligatoria?.length||0}</span></div>
          <div className="text-xs text-red-700 mt-1">4 guerras consecutivas · Debe rotar</div>
          <div className="mt-4 space-y-2">{data.rotacion_obligatoria?.length ? data.rotacion_obligatoria.map(m=> <div key={m.tag} className="flex items-center gap-2 bg-white border border-red-200 rounded-xl px-3 py-2"><div className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center text-[11px] font-bold">{m.name.slice(0,2).toUpperCase()}</div><div className="font-semibold text-sm">{m.name}</div><span className="ml-auto badge bg-red-500 text-white">4 consec</span></div>) : <div className="text-sm text-red-700/60 bg-white/60 rounded-xl p-3 text-center border border-dashed border-red-200">Sin rotación obligatoria</div>}</div>
        </div>
      </div>
    </>}
  </div>
}
