import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Brain, Mail, Target, Zap, Send, Copy, Check, AlertTriangle, Users, ArrowUpRight, Phone, BarChart3, TrendingUp, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const TABS = [
  {id:'insights', label:'Insights', icon:Brain},
  {id:'email', label:'Email IA', icon:Mail},
  {id:'scripts', label:'Scripts appels', icon:Phone},
  {id:'diagnostic', label:'Diagnostic', icon:BarChart3},
  {id:'segments', label:'Segments', icon:Target},
];

const CONTEXTS = [
  {id:'relance', label:'Relance prospect', icon:'📧'},
  {id:'devis_envoye', label:'Devis envoye', icon:'📄'},
  {id:'suivi', label:'Suivi client', icon:'⭐'},
];

const TONES = [
  {id:'professionnel', label:'Pro', emoji:'👔'},
  {id:'amical', label:'Amical', emoji:'😊'},
  {id:'urgent', label:'Urgent', emoji:'🚨'},
];

const SCRIPT_CONTEXTS = [
  {id:'premier_contact', label:'Premier contact', emoji:'👋', desc:'Appel apres reception du lead'},
  {id:'relance_devis', label:'Relance devis', emoji:'📄', desc:'Lead qui n a pas repondu au devis'},
  {id:'objection_prix', label:'Objection prix', emoji:'💰', desc:'Client qui trouve trop cher'},
  {id:'rdv_confirmation', label:'Confirmation RDV', emoji:'📅', desc:'Confirmer une intervention'},
  {id:'upsell', label:'Upsell service', emoji:'⬆️', desc:'Proposer service supplementaire'},
];

function generateScript(lead, context) {
  const prenom = lead?.name?.split(' ')[0] || 'Monsieur/Madame';
  const service = lead?.service_type || 'nettoyage';
  const score = lead?.score || 50;
  
  const scripts = {
    premier_contact: `SCRIPT — PREMIER CONTACT
━━━━━━━━━━━━━━━━━━━━━━

INTRODUCTION (15 sec)
"Bonjour, je cherche bien a parler a ${prenom} ? [...] Parfait ! Je suis Merylis de Global Clean Home. Vous avez effectue une demande sur notre site pour ${service}, c'est bien ca ?"

QUALIFICATION (30 sec)
"Super ! Pour vous preparer un devis parfait, j'aurais juste 2-3 questions rapides si vous avez une minute ?"
→ "Vous avez une surface approximative ?"
→ "C'est pour une intervention unique ou reguliere ?"
→ "Vous avez une date en tete ?"

PROPOSITION DE VALEUR (20 sec)
"Parfait. Ce que je vous propose : je vous envoie un devis detaille sous 2h avec nos tarifs transparents. On a plus de 150 avis 5 etoiles sur Google et on garantit le resultat ou on revient gratuitement."

CLOSING (15 sec)
"Je vous envoie ca sur ${lead?.email || 'votre email'} ? Et si ca vous convient, on peut bloquer un creneau tout de suite pour ne pas vous faire attendre."

OBJECTIONS PROBABLES${score < 50 ? ' (lead froid — soyez patient)' : ' (lead chaud — soyez direct)'}
→ "Je reflechis encore" → "Je comprends tout a fait. Je vous envoie le devis et je vous rappelle dans 48h, ca vous va ?"
→ "C'est combien ?" → "Ca depend de votre surface. Dans mon devis je vous donne un prix fixe garanti sans surprise."
→ "J'ai deja quelqu'un" → "Super ! Et si je vous prepare un devis comparatif gratuit, histoire que vous ayez un point de comparaison ?"`,

    relance_devis: `SCRIPT — RELANCE DEVIS
━━━━━━━━━━━━━━━━━━━━━━

ACCROCHE (10 sec)
"Bonjour ${prenom}, c'est Merylis de Global Clean Home. Je vous appelle au sujet du devis que je vous ai envoye pour ${service}. Vous avez eu l'occasion d'y jeter un oeil ?"

SI OUI — TRAITEMENT (30 sec)
→ "Il vous convient ?" → Closer sur date
→ "Trop cher" → "Je peux vous proposer un geste commercial de 10% si on confirme cette semaine"
→ "Pas encore decide" → "Qu'est-ce qui vous ferait prendre votre decision ?"

SI NON — RECUPERATION (20 sec)
"Pas de souci ! Je vous le resends maintenant. Vous avez une adresse email a jour ? [...] Je vous l'envoie et je vous donne 5 minutes pour y jeter un oeil. Je peux vous rappeler dans 10 minutes ?"

CLOSING FORT
"On a encore 2 creneaux libres cette semaine. Si vous confirmez aujourd'hui, je vous bloque l'un d'eux. Ca vous interesse ?"`,

    objection_prix: `SCRIPT — OBJECTION PRIX
━━━━━━━━━━━━━━━━━━━━━━

REPONSE EMPATHIQUE (ne jamais defendre le prix directement)
"Je comprends tout a fait ${prenom}. Le prix est toujours un critere important."

QUESTIONNEMENT
"Vous avez deja compare avec d'autres prestataires ?" 
→ Si oui : "Et qu'est-ce qui vous a fait nous contacter quand meme ?"

VALEUR vs PRIX
"Ce qui fait notre difference : on garantit le resultat. Si vous n'etes pas satisfait a 100%, on revient gratuitement sans discussion. C'est ca qui justifie nos tarifs."

CONCESSION STRATEGIQUE
"Ce que je peux faire : pour votre premiere intervention, je vous offre 10% de remise. Ca fait ${service === 'menage-domicile' ? '135EUR' : '81EUR'} au lieu du tarif normal. Et si vous aimez le resultat — ce qui sera le cas — on etablit un tarif fidele pour les prochaines fois."

ALTERNATIVE
"Sinon, je peux vous proposer un service plus basique a tarif reduit pour commencer. Vous voulez qu'on voit ca ensemble ?"`,

    rdv_confirmation: `SCRIPT — CONFIRMATION RDV
━━━━━━━━━━━━━━━━━━━━━━

INTRODUCTION (10 sec)
"Bonjour ${prenom}, c'est Merylis de Global Clean Home. Je vous appelle pour confirmer votre intervention de ${service} prevue [DATE] a [HEURE]."

CONFIRMATION DETAILS
"Notre equipe sera chez vous entre [HEURE] et [HEURE+1h]. Juste pour etre sur : l'adresse c'est bien [ADRESSE] ?"

PREPARATION CLIENT
"Quelques conseils pour que l'intervention se passe parfaitement :
→ Si possible, dégagez légèrement l'acces
→ Notre equipe apporte tout le materiel et les produits
→ Comptez environ [DUREE] pour ${service}"

UPSELL DOUX
"Au fait, pendant qu'on y est — vous avez d'autres pieces ou on pourrait vous aider ? On a souvent des creneaux libres dans la journee."

CLOSING
"Parfait ! A [DATE] alors. N'hesitez pas a m'appeler si quoi que ce soit. Bonne journee !"`,

    upsell: `SCRIPT — UPSELL SERVICE
━━━━━━━━━━━━━━━━━━━━━━

TIMING IDEAL : Apres une intervention reussie

INTRODUCTION
"Bonjour ${prenom}, c'est Merylis. L'intervention s'est bien passee ? Votre [TECHNICIEN] m'a dit que vous etiez satisfait, ca me fait vraiment plaisir !"

TRANSITION NATURELLE
"En faisant le nettoyage, notre equipe a remarque que [votre canape/vos matelas/vos tapis] auraient besoin d'un peu d'attention. Vous y aviez pense ?"

PROPOSITION
"On a justement une offre speciale ce mois-ci pour les clients fidelesÉ Si vous combinez ${service} + [SERVICE COMPLEMENTAIRE], je vous fais un forfait a [PRIX] au lieu de [PRIX NORMAL]. Ca represente une economie de [ECONOMIE]EUR."

OBJECTION "Je verrai plus tard"
"Je comprends. Je vous envoie le detail par email pour que vous y reflechissiez. Et si ca vous interesse avant fin du mois, ce tarif est garanti."`,
  };
  
  return scripts[context] || scripts.premier_contact;
}

const AICenter = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('insights');
  const [insights, setInsights] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState('');
  const [context, setContext] = useState('relance');
  const [tone, setTone] = useState('professionnel');
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [scriptContext, setScriptContext] = useState('premier_contact');
  const [selectedLeadForScript, setSelectedLeadForScript] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');

  useEffect(() => { fetchInsights(); fetchLeads(); }, []);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await axios.get(API_URL + '/ai/insights', { withCredentials: true });
      setInsights(res.data);
    } catch {} finally { setLoadingInsights(false); }
  };

  const fetchLeads = async () => {
    try {
      const res = await axios.get(API_URL + '/leads?limit=50', { withCredentials: true });
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  const handleGenerate = async () => {
    if (!selectedLead) { toast.error('Selectionnez un lead'); return; }
    setGenerating(true);
    try {
      const res = await axios.post(API_URL + '/ai/generate-email', { lead_id: selectedLead, context, tone }, { withCredentials: true });
      setGeneratedEmail(res.data);
      toast.success('Email genere !');
    } catch { toast.error('Erreur'); } finally { setGenerating(false); }
  };

  const handleSend = async () => {
    if (!generatedEmail || !selectedLead) return;
    setSending(true);
    try {
      await axios.post(API_URL + '/ai/send-email/' + selectedLead, generatedEmail, { withCredentials: true });
      toast.success('Email envoye !'); setGeneratedEmail(null);
    } catch { toast.error('Erreur'); } finally { setSending(false); }
  };

  const handleScoreAll = async () => {
    setScoring(true);
    try {
      const res = await axios.post(API_URL + '/ai/score-batch', {}, { withCredentials: true });
      toast.success(res.data.updated + ' leads re-scores !'); fetchInsights();
    } catch { toast.error('Erreur'); } finally { setScoring(false); }
  };

  const handleGenerateScript = () => {
    const lead = leads.find(l => l.lead_id === selectedLeadForScript);
    const script = generateScript(lead, scriptContext);
    setGeneratedScript(script);
  };

  const segs = insights?.segments || {};

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:"Manrope,sans-serif"}}>Centre IA</h1>
          </div>
          <p className="text-slate-500 text-sm">Scoring, emails, scripts d appels et diagnostic campagnes</p>
        </div>
        <button onClick={handleScoreAll} disabled={scoring}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm disabled:opacity-60">
          {scoring ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Brain className="w-4 h-4" />}
          Re-scorer tous les leads
        </button>
      </div>

      <div className="flex gap-1 bg-white/3 rounded-2xl border border-white/5 p-1.5 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={"flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap " +
              (activeTab === tab.id ? "bg-violet-600 text-white" : "text-slate-500 hover:text-slate-300")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* INSIGHTS */}
      {activeTab === "insights" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              {key:"hot", label:"Leads chauds", emoji:"🔥", color:"#f43f5e"},
              {key:"warm", label:"Leads tiedies", emoji:"♨️", color:"#f59e0b"},
              {key:"cold", label:"Leads froids", emoji:"❄️", color:"#60a5fa"},
            ].map(seg => (
              <div key={seg.key} className="section-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{seg.emoji}</span>
                  <span className="text-3xl font-black" style={{color:seg.color}}>{segs[seg.key]?.count || 0}</span>
                </div>
                <p className="font-bold text-slate-200">{seg.label}</p>
                <p className="text-xs text-slate-500 mb-3">Score moy: {segs[seg.key]?.avg_score || 0}/100</p>
                <button onClick={() => navigate("/leads")} style={{background:seg.color+"20",color:seg.color}}
                  className="w-full py-2 rounded-xl text-xs font-semibold">Voir ces leads →</button>
              </div>
            ))}
          </div>
          {(insights?.urgent_leads || []).length > 0 && (
            <div className="section-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-semibold text-slate-200">Leads chauds sans reponse</h3>
              </div>
              {insights.urgent_leads.map((lead, i) => (
                <div key={i} onClick={() => navigate("/leads/"+lead.lead_id)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 hover:bg-rose-500/10 cursor-pointer transition-all mb-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-300 font-bold text-sm">
                    {(lead.name||"?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-200">{lead.name}</p>
                    <p className="text-xs text-slate-500">Sans reponse {lead.hours}h</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">Score {lead.score}</span>
                  <ArrowUpRight className="w-4 h-4 text-rose-400" />
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {label:"Total leads", value:insights?.total_leads||0, icon:Users, color:"#a78bfa"},
              {label:"Score moyen", value:(insights?.avg_score||0)+"/100", icon:Target, color:"#60a5fa"},
              {label:"Leads chauds", value:segs.hot?.count||0, icon:Zap, color:"#f43f5e"},
              {label:"A relancer", value:insights?.urgent_leads?.length||0, icon:AlertTriangle, color:"#f59e0b"},
            ].map((m,i) => (
              <div key={i} className="metric-card">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{background:m.color+"15",border:"1px solid "+m.color+"30"}}>
                  <m.icon className="w-4 h-4" style={{color:m.color}} />
                </div>
                <p className="text-2xl font-bold text-slate-100">{m.value}</p>
                <p className="text-xs text-slate-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EMAIL IA */}
      {activeTab === "email" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="section-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" /> Generateur email IA
            </h3>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Lead cible</label>
              <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
                <option value="" className="bg-slate-800">Selectionnez un lead...</option>
                {leads.map(l => <option key={l.lead_id} value={l.lead_id} className="bg-slate-800">{l.name} — {l.service_type}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Contexte</label>
              <div className="space-y-2">
                {CONTEXTS.map(c => (
                  <button key={c.id} onClick={() => setContext(c.id)}
                    className={"w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all " +
                      (context===c.id?"border-violet-500 bg-violet-500/10":"border-white/5 hover:border-white/15")}>
                    <span className="text-xl">{c.icon}</span>
                    <span className="text-sm font-semibold text-slate-200">{c.label}</span>
                    {context===c.id && <Check className="w-4 h-4 text-violet-400 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Ton</label>
              <div className="flex gap-2">
                {TONES.map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)}
                    className={"flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all " +
                      (tone===t.id?"border-violet-500 bg-violet-500/10":"border-white/5 hover:border-white/15")}>
                    <span className="text-xl">{t.emoji}</span>
                    <span className="text-xs font-semibold text-slate-300">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleGenerate} disabled={generating||!selectedLead}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Generation..." : "Generer email"}
            </button>
          </div>
          <div className="section-card p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" /> Apercu email
            </h3>
            {generatedEmail ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">OBJET</label>
                  <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-sm text-slate-200 flex-1">{generatedEmail.subject}</p>
                    <button onClick={() => {navigator.clipboard.writeText(generatedEmail.subject);toast.success("Copie!");}} className="text-slate-500 hover:text-slate-300">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">CORPS</label>
                  <textarea value={generatedEmail.body} onChange={e => setGeneratedEmail(prev => ({...prev, body: e.target.value}))}
                    rows={10} className="w-full px-4 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm resize-none focus:outline-none focus:border-violet-500 font-mono leading-relaxed" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => {navigator.clipboard.writeText(generatedEmail.body);toast.success("Copie!");}}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm">
                    <Copy className="w-4 h-4" /> Copier
                  </button>
                  <button onClick={handleSend} disabled={sending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm disabled:opacity-60">
                    {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                    Envoyer
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-slate-600">
                <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm">Selectionnez un lead et generez un email</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCRIPTS APPELS */}
      {activeTab === "scripts" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="section-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-400" /> Generateur de scripts d appels
            </h3>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Lead cible (optionnel)</label>
              <select value={selectedLeadForScript} onChange={e => setSelectedLeadForScript(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
                <option value="" className="bg-slate-800">Script generique</option>
                {leads.map(l => <option key={l.lead_id} value={l.lead_id} className="bg-slate-800">{l.name} — {l.service_type} (score: {l.score||0})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">Contexte d appel</label>
              <div className="space-y-2">
                {SCRIPT_CONTEXTS.map(c => (
                  <button key={c.id} onClick={() => setScriptContext(c.id)}
                    className={"w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all " +
                      (scriptContext===c.id?"border-blue-500 bg-blue-500/10":"border-white/5 hover:border-white/15")}>
                    <span className="text-xl">{c.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{c.label}</p>
                      <p className="text-xs text-slate-500">{c.desc}</p>
                    </div>
                    {scriptContext===c.id && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleGenerateScript}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" /> Generer le script
            </button>
          </div>

          <div className="section-card p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-400" /> Script d appel
            </h3>
            {generatedScript ? (
              <div className="space-y-3">
                <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-white/3 p-4 rounded-xl border border-white/5 font-mono overflow-y-auto" style={{maxHeight:"420px"}}>
                  {generatedScript}
                </pre>
                <button onClick={() => {navigator.clipboard.writeText(generatedScript); toast.success("Script copie !");}}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm hover:bg-white/10">
                  <Copy className="w-4 h-4" /> Copier le script
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-slate-600">
                <Phone className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm mb-1">Aucun script genere</p>
                <p className="text-xs text-center max-w-xs">Selectionnez un contexte et generez votre script d appel personnalise</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIAGNOSTIC */}
      {activeTab === "diagnostic" && (
        <div className="space-y-5">
          <div className="section-card p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">Diagnostic IA — Performance globale</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                {
                  canal:"Google Ads", score:72, color:"#4285f4", emoji:"🔍",
                  points_forts:["ROAS 5.7x — excellent","Top 3 sur mots-cles cibles","CPL maitrise a 26EUR"],
                  points_faibles:["Budget sous-optimise sur mobile","Taux de conversion landing page a 3.2% (objectif 5%)"],
                  recommandation:"Augmentez le budget de 20% sur les campagnes Search et ajoutez des extensions d annonces avec les avis clients.",
                },
                {
                  canal:"Facebook Ads", score:38, color:"#1877f2", emoji:"📘",
                  points_forts:["Bonne portee sur 35-55 ans","Creatifs visuels performants"],
                  points_faibles:["ROAS 2.75x insuffisant (objectif 4x)","CPA trop eleve a 44EUR","Ciblage trop large"],
                  recommandation:"Reduisez le budget de 40%. Ciblez uniquement les audiences de retargeting et les lookalike des clients existants.",
                },
                {
                  canal:"SEO Organique", score:85, color:"#34d399", emoji:"🔎",
                  points_forts:["Top 10 sur 8 mots-cles cles","Trafic en hausse de 12%","Cout d acquisition excellent (7.9EUR)"],
                  points_faibles:["3 pages sans meta description","Vitesse mobile a ameliorer"],
                  recommandation:"Investissez dans 2 articles de blog/mois sur les mots-cles longue traine. ROI SEO est votre meilleur canal.",
                },
                {
                  canal:"Bouche a oreille", score:95, color:"#a78bfa", emoji:"🤝",
                  points_forts:["Marge nette 75% — le meilleur canal","CPA = 0EUR","Clients tres fideles"],
                  points_faibles:["Volume trop faible (22 leads/mois)","Pas de systeme de parrainage structure"],
                  recommandation:"Lancez un programme de parrainage : 20EUR de remise pour le parrain et 10% pour le filleul. Objectif : doubler ce canal.",
                },
              ].map((d,i) => (
                <div key={i} className="p-4 rounded-2xl border" style={{background:d.color+"05",borderColor:d.color+"20"}}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{d.emoji}</span>
                      <span className="font-bold text-slate-200">{d.canal}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:d.score+"%",background:d.color}} />
                      </div>
                      <span className="text-sm font-black" style={{color:d.color}}>{d.score}/100</span>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    {d.points_forts.map((p,j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="text-emerald-400">✓</span>{p}
                      </div>
                    ))}
                    {d.points_faibles.map((p,j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="text-rose-400">✗</span>{p}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-xl" style={{background:d.color+"10",border:"1px solid "+d.color+"20"}}>
                    <p className="text-[10px] font-bold mb-1" style={{color:d.color}}>RECOMMANDATION IA</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{d.recommandation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-slate-200">Actions prioritaires cette semaine</h3>
            </div>
            <div className="space-y-3">
              {[
                {emoji:"1️⃣", color:"#f43f5e", action:"Relancer les 3 leads chauds sans reponse depuis 48h", impact:"Potentiel +2 clients", effort:"15 min"},
                {emoji:"2️⃣", color:"#f59e0b", action:"Reduire budget Facebook Ads de 40% et rediriger vers Google", impact:"+320EUR de marge/mois", effort:"5 min"},
                {emoji:"3️⃣", color:"#34d399", action:"Ajouter meta descriptions sur 3 pages SEO", impact:"+15% de CTR estime", effort:"30 min"},
                {emoji:"4️⃣", color:"#60a5fa", action:"Envoyer email de suivi aux 8 clients satisfaits ce mois", impact:"Programme parrainage potentiel", effort:"10 min"},
              ].map((a,i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/3 border border-white/5">
                  <span className="text-2xl flex-shrink-0">{a.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-200">{a.action}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{a.impact}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-white/5 text-slate-400 flex-shrink-0">{a.effort}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEGMENTS */}
      {activeTab === "segments" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            {key:"hot", label:"Leads chauds (75-100)", emoji:"🔥", color:"#f43f5e", strategy:"Appelez dans les 30 min. Devis personnalise immediat. Offre speciale limitee."},
            {key:"warm", label:"Leads tiedies (55-74)", emoji:"♨️", color:"#f59e0b", strategy:"Devis sous 2h. Relance J+1 et J+3. Remise de 10% si reponse sous 48h."},
            {key:"lukewarm", label:"Leads neutres (35-54)", emoji:"⚖️", color:"#a78bfa", strategy:"Sequence email 7 jours. Temoignages clients. Rappel personnalise."},
            {key:"cold", label:"Leads froids (0-34)", emoji:"❄️", color:"#60a5fa", strategy:"Nurturing long terme. Newsletter mensuelle. Reactivation a J+30."},
          ].map(seg => (
            <div key={seg.key} className="section-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{seg.emoji}</span>
                <div>
                  <p className="font-bold text-slate-200">{seg.label}</p>
                  <p className="text-2xl font-black" style={{color:seg.color}}>{segs[seg.key]?.count||0} leads</p>
                </div>
              </div>
              <div className="p-3 rounded-xl mb-3" style={{background:seg.color+"10",border:"1px solid "+seg.color+"20"}}>
                <p className="text-xs font-semibold mb-1" style={{color:seg.color}}>Strategie recommandee</p>
                <p className="text-xs text-slate-400 leading-relaxed">{seg.strategy}</p>
              </div>
              <button onClick={() => navigate("/leads")} style={{background:seg.color+"15",color:seg.color}}
                className="w-full py-2.5 rounded-xl text-sm font-semibold">Voir ces leads →</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AICenter;
