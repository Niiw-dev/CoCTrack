import { Routes, Route, Link, NavLink } from "react-router-dom"
import Dashboard from "./pages/Dashboard.jsx"
import Members from "./pages/Members.jsx"
import Wars from "./pages/Wars.jsx"
import Rotation from "./pages/Rotation.jsx"
import Capital from "./pages/Capital.jsx"
import History from "./pages/History.jsx"
import Rules from "./pages/Rules.jsx"
import Alerts from "./pages/Alerts.jsx"
import MemberDetail from "./pages/MemberDetail.jsx"
import CWL from "./pages/CWL.jsx"
import ClanGames from "./pages/ClanGames.jsx"
import { useState } from "react"

function Layout({children}){
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const nav = [
    ["/","Dashboard","◈"],
    ["/miembros","Miembros","◉"],
    ["/guerra","Guerra","⚔"],
    ["/rotacion","Rotación","⟡"],
    ["/capital","Capital","◆"],
    ["/cwl","CWL","♜"],
    ["/juegos","Juegos","🎮"],
    ["/historial","Historial","◎"],
    ["/reglas","Reglas","≡"],
    ["/alertas","Alertas","⚑"],
  ]
  return (
    <div className="min-h-screen w-full bg-[#f8f7f6] text-zinc-900 flex">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50" />
        <div className="absolute top-0 left-[300px] w-[700px] h-[400px] bg-gradient-to-br from-violet-200/25 to-indigo-200/25 rounded-full blur-3xl" />
      </div>

      {/* Sidebar desktop */}
      <aside className={`hidden lg:flex shrink-0 sticky top-0 h-screen flex-col border-r border-zinc-200/60 bg-white/80 backdrop-blur-xl transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>
        <div className={`px-4 py-5 border-b border-zinc-200/60 flex items-center ${collapsed ? 'justify-center' : 'justify-start'}`}>
          <Link to="/" className={`flex items-center gap-3 group ${collapsed ? 'justify-center' : 'justify-start'}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/20 group-hover:shadow-violet-600/30 transition-all shrink-0">
              <span className="text-white font-black text-sm tracking-tighter">CT</span>
            </div>
            {!collapsed && <div className="min-w-0 text-left">
              <div className="font-extrabold text-[15px] leading-none tracking-tight">CoCTrack</div>
              <div className="text-[11px] text-zinc-500 font-medium tracking-wide uppercase">War Management</div>
            </div>}
          </Link>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {nav.map(([to,label,icon])=>(
            <NavLink key={to} to={to} title={collapsed ? label : undefined} className={({isActive})=> `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${isActive ? "bg-zinc-900 text-white shadow-md" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"} ${collapsed ? 'justify-center px-2' : ''}`}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 bg-white/10">{icon}</span>
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>
        {!collapsed && <div className="p-4 border-t border-zinc-200/60">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-4 text-white">
            <div className="text-xs font-bold opacity-90">Sync activo</div>
            <div className="text-xs opacity-80 mt-1">Actualiza cada 10m</div>
            <div className="flex items-center gap-1.5 mt-2 text-xs"><span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> Conectado</div>
          </div>
          <div className="text-[11px] text-zinc-400 text-center mt-3">Clash of Clans · API oficial</div>
        </div>}
        {collapsed && <div className="p-2 border-t border-zinc-200/60 flex justify-center">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" title="Conectado"></span>
        </div>}
      </aside>

      {/* Mobile sidebar */}
      {open && <div className="fixed inset-0 z-30 lg:hidden">
        <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={()=>setOpen(false)}></div>
        <aside className="absolute left-0 top-0 w-[280px] h-full bg-white border-r border-zinc-200 flex flex-col">
          <div className="px-6 py-5 border-b border-zinc-200 flex items-center justify-between">
            <Link to="/" onClick={()=>setOpen(false)} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow"><span className="text-white font-black text-sm">CT</span></div>
              <div className="font-extrabold text-sm">CoCTrack</div>
            </Link>
            <button onClick={()=>setOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">✕</button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {nav.map(([to,label,icon])=>(
              <NavLink key={to} to={to} onClick={()=>setOpen(false)} className={({isActive})=> `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                <span className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-xs">{icon}</span>{label}
              </NavLink>
            ))}
          </nav>
        </aside>
      </div>}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 border-b border-zinc-200/60">
          <div className="w-full px-4 lg:px-8 py-3 flex items-center gap-3">
            <button onClick={()=>setOpen(true)} className="lg:hidden w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center">☰</button>
            <button onClick={()=>setCollapsed(!collapsed)} className="hidden lg:flex w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center" title={collapsed ? "Expandir menú" : "Colapsar menú"}>
              {collapsed ? "»" : "«"}
            </button>
            <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sync activo · {new Date().toLocaleDateString()}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <SyncButton/>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full px-4 lg:px-8 py-6 lg:py-8">{children}</main>
        <footer className="w-full py-6 text-center text-xs text-zinc-400 border-t border-zinc-200/50 bg-white/40 backdrop-blur-sm">
          CoCTrack · Clash of Clans · Datos actualizados vía API oficial
        </footer>
      </div>
    </div>
  )
}

import api from "./api"
import { useQueryClient } from "@tanstack/react-query"

function SyncButton(){
  const [loading,setLoading]=useState(false)
  const [msg,setMsg]=useState(null)
  const qc=useQueryClient()
  const doSync=async()=>{
    setLoading(true); setMsg(null)
    try{
      const r=await api.post("/sync",{clanTag:"#2U992RG2G"})
      setMsg("OK "+ (r.data.members_count??"")+" miembros")
      qc.invalidateQueries()
      setTimeout(()=>setMsg(null),4000)
    }catch(e){
      const d=e.response?.data
      if(e.response?.status===429) setMsg("Espera "+ Math.ceil(Number(d?.wait_minutes??10))+"m")
      else if(e.response?.status===504) setMsg("Timeout 504 — sync sigue en curso ~4m, recarga en 1m")
      else if(e.code==="ECONNABORTED" || e.message?.includes("timeout")) setMsg("Timeout — sync sigue en curso ~4m, recarga en 1m")
      else if(d?.error) setMsg(d.error)
      else if(d?.message) setMsg(d.message)
      else setMsg(e.message||"Error")
    } finally{setLoading(false)}
  }
  return <div className="flex items-center gap-2">
    <button onClick={doSync} disabled={loading} className="btn-primary flex items-center gap-2" title="Supabase pooler puede tardar ~4-5m">
      {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span>↻</span>}
      {loading?"Sincronizando... (Supabase ~4-5m)":"Actualizar datos"}
    </button>
    {msg && <span className={`text-xs px-3 py-1.5 rounded-full font-medium hidden sm:inline ${msg.startsWith("OK") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{msg}</span>}
  </div>
}

export default function App(){
  return <Layout>
    <Routes>
      <Route path="/" element={<Dashboard/>}/>
      <Route path="/miembros" element={<Members/>}/>
      <Route path="/miembros/:tag" element={<MemberDetail/>}/>
      <Route path="/guerra" element={<Wars/>}/>
      <Route path="/rotacion" element={<Rotation/>}/>
      <Route path="/capital" element={<Capital/>}/>
      <Route path="/cwl" element={<CWL/>}/>
      <Route path="/juegos" element={<ClanGames/>}/>
      <Route path="/historial" element={<History/>}/>
      <Route path="/reglas" element={<Rules/>}/>
      <Route path="/alertas" element={<Alerts/>}/>
    </Routes>
  </Layout>
}
