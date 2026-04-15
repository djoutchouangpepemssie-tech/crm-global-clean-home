import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, RefreshCw, User, FileText, Euro, X, Check, Trash2, Download, Send, Eye } from 'lucide-react';
import BACKEND_URL from '../../../config.js';
const API = `${BACKEND_URL}/api/payroll-rh`;

const TABS = [
  { id: 'employees', label: '👥 Intervenants' },
  { id: 'payslips', label: '💰 Fiches de paie' },
  { id: 'contracts', label: '📋 Contrats' },
  { id: 'expenses', label: '🧾 Notes de frais' },
];

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const fmt = v => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(v||0);
const fmtPct = v => `${v}%`;

/* ── UI primitives ── */
function Modal({title,onClose,children,wide=false}){
  return(
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border-default)',width:'100%',maxWidth:wide?'720px':'560px',maxHeight:'92vh',overflow:'auto',boxShadow:'var(--shadow-dropdown)'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border-default)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'var(--bg-card)',zIndex:1}}>
          <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--text-primary)',margin:0,fontSize:'16px'}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'4px',borderRadius:'6px'}}><X size={18}/></button>
        </div>
        <div style={{padding:'20px'}}>{children}</div>
      </div>
    </div>
  );
}

function F({label,required,children}){
  return(
    <div style={{marginBottom:'14px'}}>
      <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'var(--text-secondary)',marginBottom:'5px'}}>
        {label}{required&&<span style={{color:'#ef4444',marginLeft:'2px'}}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle={width:'100%',padding:'9px 12px',background:'var(--bg-input)',border:'1px solid var(--border-input)',borderRadius:'var(--radius-md)',color:'var(--text-primary)',fontSize:'13px',outline:'none',boxSizing:'border-box'};
const selectStyle={...inputStyle};

function Inp({value,onChange,type='text',placeholder,min,step}){
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} min={min} step={step} style={inputStyle}/>;
}
function Sel({value,onChange,options}){
  return <select value={value} onChange={e=>onChange(e.target.value)} style={selectStyle}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}
function Txt({value,onChange,placeholder,rows=3}){
  return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...inputStyle,minHeight:`${rows*28}px`,resize:'vertical'}}/>;
}

function Btn({children,onClick,variant='primary',disabled,small}){
  const s={primary:{background:'var(--brand)',color:'#fff',border:'none'},secondary:{background:'var(--bg-muted)',color:'var(--text-secondary)',border:'1px solid var(--border-default)'},danger:{background:'#ef4444',color:'#fff',border:'none'},success:{background:'#10b981',color:'#fff',border:'none'}};
  return(
    <button onClick={onClick} disabled={disabled} style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:small?'6px 12px':'9px 18px',borderRadius:'var(--radius-md)',fontSize:small?'12px':'13px',fontWeight:600,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.6:1,transition:'all 0.15s',...s[variant]}}>
      {children}
    </button>
  );
}

function Grid({cols=2,children}){
  return <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:'0 14px'}}>{children}</div>;
}

function Section({title,children}){
  return(
    <div style={{marginBottom:'20px'}}>
      <div style={{fontSize:'11px',fontWeight:700,color:'var(--brand)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'12px',paddingBottom:'6px',borderBottom:'2px solid var(--brand-light)'}}>{title}</div>
      {children}
    </div>
  );
}

function Badge({label,color}){
  const colors={green:{bg:'#d1fae5',text:'#065f46'},amber:{bg:'#fef3c7',text:'#92400e'},red:{bg:'#fee2e2',text:'#991b1b'},blue:{bg:'#dbeafe',text:'#1e40af'},gray:{bg:'var(--bg-muted)',text:'var(--text-muted)'}};
  const c=colors[color]||colors.gray;
  return <span style={{padding:'2px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:600,background:c.bg,color:c.text}}>{label}</span>;
}

/* ══════════════════════════════════════════════════
   EMPLOYEES TAB
══════════════════════════════════════════════════ */
function EmployeesTab(){
  const [list,setList]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({full_name:'',email:'',phone:'',address:'',numero_secu:'',function:'Agent de nettoyage',base_salary:'',hire_date:new Date().toISOString().split('T')[0],notes:'',status:'active'});

  const load=useCallback(async()=>{
    setLoading(true);
    try{const{data}=await axios.get(`${API}/employees`,{withCredentials:true});setList(Array.isArray(data)?data:data.items||[]);}catch{toast.error('Erreur chargement intervenants');}
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  const set=k=>v=>setForm(p=>({...p,[k]:v}));

  const handleCreate=async()=>{
    if(!form.full_name||!form.email)return toast.error('Nom et email requis');
    if(!form.numero_secu||form.numero_secu.replace(/\s/g,'').length<13)return toast.error('N° Sécurité Sociale invalide (15 chiffres requis)');
    setSaving(true);
    try{
      await axios.post(`${API}/employees`,{...form,base_salary:parseFloat(form.base_salary)||0},{withCredentials:true});
      toast.success('Intervenant créé avec succès');
      setModal(false);
      setForm({full_name:'',email:'',phone:'',address:'',numero_secu:'',function:'Agent de nettoyage',base_salary:'',hire_date:new Date().toISOString().split('T')[0],notes:'',status:'active'});
      load();
    }catch(e){toast.error(e.response?.data?.detail||'Erreur création');}
    setSaving(false);
  };

  const handleDelete=async id=>{
    if(!window.confirm('Supprimer cet intervenant ?'))return;
    try{await axios.delete(`${API}/employees/${id}`,{withCredentials:true});toast.success('Supprimé');load();}catch{toast.error('Erreur suppression');}
  };

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <div>
          <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--text-primary)',margin:0,fontSize:'18px'}}>{list.length} Intervenant{list.length>1?'s':''}</h3>
          <p style={{color:'var(--text-muted)',margin:'2px 0 0',fontSize:'12px'}}>Gestion des employés et intervenants</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <Btn variant="secondary" onClick={load} small><RefreshCw size={13}/></Btn>
          <Btn onClick={()=>setModal(true)}><Plus size={14}/>Nouvel intervenant</Btn>
        </div>
      </div>

      {loading?<p style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>Chargement...</p>:
       list.length===0?(
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)',background:'var(--bg-muted)',borderRadius:'var(--radius-lg)',border:'1px dashed var(--border-strong)'}}>
          <User size={40} style={{margin:'0 auto 12px',opacity:0.3,display:'block'}}/>
          <p style={{margin:0,fontWeight:600}}>Aucun intervenant</p>
          <p style={{margin:'4px 0 0',fontSize:'12px'}}>Ajoutez votre premier intervenant</p>
        </div>
       ):(
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {list.map(emp=>(
            <div key={emp.employee_id} style={{background:'var(--bg-card)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-md)',padding:'14px 16px',display:'flex',alignItems:'center',gap:'14px'}}>
              <div style={{width:'42px',height:'42px',borderRadius:'50%',background:'var(--brand-light)',color:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'14px',flexShrink:0}}>
                {emp.full_name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:600,color:'var(--text-primary)',margin:0,fontSize:'14px'}}>{emp.full_name}</p>
                <p style={{color:'var(--text-muted)',margin:'2px 0 0',fontSize:'12px'}}>{emp.function} · {emp.email}</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                {emp.base_salary>0&&<span style={{fontSize:'13px',fontWeight:600,color:'var(--brand)'}}>{fmt(emp.base_salary)}/mois</span>}
                <Badge label={emp.status==='active'?'Actif':'Inactif'} color={emp.status==='active'?'green':'gray'}/>
                <button onClick={()=>handleDelete(emp.employee_id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',padding:'4px'}}><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
       )
      }

      {modal&&(
        <Modal title="Nouvel intervenant" onClose={()=>setModal(false)} wide>
          <Section title="Identité">
            <Grid cols={2}>
              <F label="Nom complet" required><Inp value={form.full_name} onChange={set('full_name')} placeholder="Marie Dupont"/></F>
              <F label="N° Sécurité Sociale" required><Inp value={form.numero_secu} onChange={set('numero_secu')} placeholder="1 85 05 75 108 080 42"/></F>
            </Grid>
          </Section>
          <Section title="Contact">
            <Grid cols={2}>
              <F label="Email professionnel" required><Inp value={form.email} onChange={set('email')} type="email" placeholder="marie@exemple.com"/></F>
              <F label="Téléphone"><Inp value={form.phone} onChange={set('phone')} placeholder="+33 6 12 34 56 78"/></F>
            </Grid>
            <F label="Adresse"><Inp value={form.address} onChange={set('address')} placeholder="15 rue de la Paix, 75001 Paris"/></F>
          </Section>
          <Section title="Poste & Rémunération">
            <Grid cols={2}>
              <F label="Fonction">
                <Sel value={form.function} onChange={set('function')} options={[
                  {value:'Agent de nettoyage',label:'Agent de nettoyage'},
                  {value:'Agent de nettoyage qualifié',label:'Agent qualifié'},
                  {value:'Chef d\'équipe',label:"Chef d'équipe"},
                  {value:'Responsable de secteur',label:'Responsable de secteur'},
                  {value:'Technicien de surface',label:'Technicien de surface'},
                ]}/>
              </F>
              <F label="Salaire brut mensuel (€)"><Inp value={form.base_salary} onChange={set('base_salary')} type="number" min="0" step="0.01" placeholder="1800"/></F>
            </Grid>
            <Grid cols={2}>
              <F label="Date d'embauche"><Inp value={form.hire_date} onChange={set('hire_date')} type="date"/></F>
              <F label="Statut">
                <Sel value={form.status} onChange={set('status')} options={[{value:'active',label:'Actif'},{value:'suspended',label:'Suspendu'},{value:'left',label:'Parti'}]}/>
              </F>
            </Grid>
          </Section>
          <Section title="Notes">
            <F label="Observations"><Txt value={form.notes} onChange={set('notes')} placeholder="Observations, compétences particulières..."/></F>
          </Section>
          <div style={{display:'flex',justifyContent:'flex-end',gap:'8px',paddingTop:'8px',borderTop:'1px solid var(--border-default)'}}>
            <Btn variant="secondary" onClick={()=>setModal(false)}>Annuler</Btn>
            <Btn onClick={handleCreate} disabled={saving}><Check size={14}/>{saving?'Création...':'Créer l\'intervenant'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PAYSLIPS TAB
══════════════════════════════════════════════════ */
function PayslipsTab(){
  const [list,setList]=useState([]);
  const [employees,setEmployees]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [preview,setPreview]=useState(null);
  const [sending,setSending]=useState(null);
  const [saving,setSaving]=useState(false);
  const now=new Date();
  const [form,setForm]=useState({employee_id:'',period_month:now.getMonth()+1,period_year:now.getFullYear(),salary_brut_override:'',notes:''});

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const[p,e]=await Promise.all([
        axios.get(`${API}/payslips`,{withCredentials:true}),
        axios.get(`${API}/employees`,{withCredentials:true}),
      ]);
      setList(Array.isArray(p.data)?p.data:p.data.items||[]);
      setEmployees(Array.isArray(e.data)?e.data:e.data.items||[]);
    }catch{toast.error('Erreur chargement');}
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  const set=k=>v=>setForm(p=>({...p,[k]:v}));

  // Calcul prévisualisation côté client
  const calcPreview=(brut)=>{
    if(!brut||brut<=0)return null;
    const pass=3864;
    const t1=Math.min(brut,pass);
    const baseCsg=brut*0.9825;
    const retraite=Math.round(t1*0.0315*100)/100;
    const vieillP=Math.round(t1*0.0690*100)/100;
    const vieillD=Math.round(brut*0.0040*100)/100;
    const csgD=Math.round(baseCsg*0.0680*100)/100;
    const csgND=Math.round(baseCsg*0.0240*100)/100;
    const crds=Math.round(baseCsg*0.0050*100)/100;
    const prev=Math.round(brut*0.0070*100)/100;
    const totalCotis=Math.round((retraite+vieillP+vieillD+csgD+csgND+crds+prev)*100)/100;
    const netAvant=Math.round((brut-totalCotis)*100)/100;
    const pas=Math.round(netAvant*0.11*100)/100;
    const net=Math.round((netAvant-pas)*100)/100;
    const totalPat=Math.round(brut*0.3920*100)/100;
    return{brut,retraite,vieillP,vieillD,csgD,csgND,crds,prev,totalCotis,netAvant,pas,net,totalPat,coutTotal:brut+totalPat};
  };

  const brutVal=parseFloat(form.salary_brut_override)||0;
  const prevData=brutVal>0?calcPreview(brutVal):null;

  const handleCreate=async()=>{
    if(!form.employee_id)return toast.error('Sélectionnez un intervenant');
    setSaving(true);
    try{
      const payload={employee_id:form.employee_id,period_month:parseInt(form.period_month),period_year:parseInt(form.period_year),notes:form.notes};
      if(form.salary_brut_override)payload.salary_brut_override=parseFloat(form.salary_brut_override);
      await axios.post(`${API}/payslips`,payload,{withCredentials:true});
      toast.success('Fiche de paie créée !');
      setModal(false);
      setForm({employee_id:'',period_month:now.getMonth()+1,period_year:now.getFullYear(),salary_brut_override:'',notes:''});
      load();
    }catch(e){toast.error(e.response?.data?.detail||'Erreur');}
    setSaving(false);
  };

  const handleDownload=async(id,name,month,year)=>{
    try{
      const res=await axios.get(`${API}/payslips/${id}/pdf`,{responseType:'blob',withCredentials:true});
      const url=URL.createObjectURL(res.data);
      const a=document.createElement('a');a.href=url;a.download=`bulletin_paie_${name}_${month.toString().padStart(2,'0')}_${year}.pdf`;a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    }catch{toast.error('Erreur téléchargement PDF');}
  };

  const handleSendEmail=async(id,empName)=>{
    if(!window.confirm(`Envoyer la fiche de paie de ${empName} par email ?`))return;
    setSending(id);
    try{
      const{data}=await axios.post(`${API}/payslips/${id}/send-email`,{},{withCredentials:true});
      toast.success(data.message||'Email envoyé !');
    }catch(e){toast.error(e.response?.data?.detail||'Erreur envoi email');}
    setSending(null);
  };

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <div>
          <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--text-primary)',margin:0,fontSize:'18px'}}>{list.length} Fiche{list.length>1?'s':''} de paie</h3>
          <p style={{color:'var(--text-muted)',margin:'2px 0 0',fontSize:'12px'}}>Bulletins de salaire — Conformes droit français 2024</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <Btn variant="secondary" onClick={load} small><RefreshCw size={13}/></Btn>
          <Btn onClick={()=>setModal(true)}><Plus size={14}/>Nouvelle fiche</Btn>
        </div>
      </div>

      {loading?<p style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>Chargement...</p>:
       list.length===0?(
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)',background:'var(--bg-muted)',borderRadius:'var(--radius-lg)',border:'1px dashed var(--border-strong)'}}>
          <FileText size={40} style={{margin:'0 auto 12px',opacity:0.3,display:'block'}}/>
          <p style={{margin:0,fontWeight:600}}>Aucune fiche de paie</p>
        </div>
       ):(
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--bg-muted)'}}>
                {['Intervenant','Période','Brut','Cotisations','Net à payer','Statut','Actions'].map(h=>(
                  <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:'11px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(p=>(
                <tr key={p.payslip_id} style={{borderBottom:'1px solid var(--border-default)'}}>
                  <td style={{padding:'12px',fontSize:'13px',fontWeight:500,color:'var(--text-primary)'}}>{p.employee_name}</td>
                  <td style={{padding:'12px',fontSize:'13px',color:'var(--text-secondary)'}}>{MONTHS[p.period_month-1]} {p.period_year}</td>
                  <td style={{padding:'12px',fontSize:'13px'}}>{fmt(p.salary_brut)}</td>
                  <td style={{padding:'12px',fontSize:'13px',color:'#ef4444'}}>- {fmt(p.total_cotisations_sal||p.social_charges)}</td>
                  <td style={{padding:'12px',fontSize:'14px',fontWeight:700,color:'var(--brand)'}}>{fmt(p.salary_net)}</td>
                  <td style={{padding:'12px'}}>
                    <Badge label={p.status==='paid'?'Payée':'En attente'} color={p.status==='paid'?'green':'amber'}/>
                  </td>
                  <td style={{padding:'12px'}}>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button onClick={()=>handleDownload(p.payslip_id,p.employee_name,p.period_month,p.period_year)}
                        title="Télécharger PDF"
                        style={{background:'var(--brand-light)',color:'var(--brand)',border:'none',borderRadius:'6px',padding:'5px 8px',cursor:'pointer',display:'flex',alignItems:'center',gap:'3px',fontSize:'11px',fontWeight:600}}>
                        <Download size={12}/>PDF
                      </button>
                      <button onClick={()=>handleSendEmail(p.payslip_id,p.employee_name)}
                        disabled={sending===p.payslip_id}
                        title="Envoyer par email"
                        style={{background:'#d1fae5',color:'#065f46',border:'none',borderRadius:'6px',padding:'5px 8px',cursor:'pointer',display:'flex',alignItems:'center',gap:'3px',fontSize:'11px',fontWeight:600,opacity:sending===p.payslip_id?0.6:1}}>
                        <Send size={12}/>{sending===p.payslid_id?'...':'Email'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
       )
      }

      {modal&&(
        <Modal title="Nouvelle fiche de paie" onClose={()=>setModal(false)} wide>
          <Section title="Intervenant & Période">
            <F label="Intervenant" required>
              <Sel value={form.employee_id} onChange={v=>setForm(p=>({...p,employee_id:v}))} options={[{value:'',label:'-- Sélectionner un intervenant --'},...employees.map(e=>({value:e.employee_id,label:`${e.full_name} — ${e.function||''}${e.base_salary?` (${fmt(e.base_salary)}/mois)`:''}`}))]}/>
            </F>
            <Grid cols={3}>
              <F label="Mois">
                <Sel value={form.period_month} onChange={v=>setForm(p=>({...p,period_month:v}))} options={MONTHS.map((m,i)=>({value:i+1,label:m}))}/>
              </F>
              <F label="Année"><Inp value={form.period_year} onChange={v=>setForm(p=>({...p,period_year:v}))} type="number" min="2020"/></F>
              <F label="Salaire brut (€) — optionnel"><Inp value={form.salary_brut_override} onChange={v=>setForm(p=>({...p,salary_brut_override:v}))} type="number" min="0" step="0.01" placeholder="Auto depuis contrat"/></F>
            </Grid>
          </Section>

          {prevData&&(
            <Section title="Prévisualisation des calculs — Taux URSSAF 2024">
              <div style={{background:'var(--bg-muted)',borderRadius:'var(--radius-md)',padding:'16px',fontSize:'12px'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'#1e3a5f',color:'white'}}>
                      <th style={{padding:'8px 10px',textAlign:'left',fontSize:'11px'}}>Rubrique</th>
                      <th style={{padding:'8px 10px',textAlign:'right',fontSize:'11px'}}>Taux</th>
                      <th style={{padding:'8px 10px',textAlign:'right',fontSize:'11px'}}>Salarié</th>
                      <th style={{padding:'8px 10px',textAlign:'right',fontSize:'11px'}}>Patronal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Retraite complémentaire AGIRC-ARRCO','3,15%',prevData.retraite,'4,86%'],
                      ['Assurance vieillesse (plafonnée)','6,90%',prevData.vieillP,'8,45%'],
                      ['Assurance vieillesse (déplafonnée)','0,40%',prevData.vieillD,'1,90%'],
                      ['Maladie-Maternité','—','0,00 €','13,00%'],
                      ['Allocations familiales','—','0,00 €','5,25%'],
                      ['Accidents du travail','—','0,00 €','2,30%'],
                      ['Assurance chômage','—','0,00 €','4,05%'],
                      ['Prévoyance','0,70%',prevData.prev,'—'],
                      ['CSG déductible','6,80%',prevData.csgD,'—'],
                      ['CSG non déductible','2,40%',prevData.csgND,'—'],
                      ['CRDS','0,50%',prevData.crds,'—'],
                    ].map(([name,rate,sal,pat],i)=>(
                      <tr key={i} style={{background:i%2===0?'white':'var(--bg-muted)'}}>
                        <td style={{padding:'6px 10px',fontSize:'11px',color:'var(--text-secondary)'}}>{name}</td>
                        <td style={{padding:'6px 10px',fontSize:'11px',textAlign:'right',color:'var(--text-muted)'}}>{rate}</td>
                        <td style={{padding:'6px 10px',fontSize:'11px',textAlign:'right',color:'#ef4444'}}>{typeof sal==='number'?`- ${fmt(sal)}`:sal}</td>
                        <td style={{padding:'6px 10px',fontSize:'11px',textAlign:'right',color:'var(--text-muted)'}}>{pat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{marginTop:'12px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                  {[
                    ['Salaire brut',fmt(prevData.brut),'var(--text-primary)'],
                    ['Total cotisations',`- ${fmt(prevData.totalCotis)}`,'#ef4444'],
                    ['Net avant PAS',fmt(prevData.netAvant),'var(--text-secondary)'],
                    ['Prélèvement source (11%)',`- ${fmt(prevData.pas)}`,'#f59e0b'],
                    ['NET À PAYER',fmt(prevData.net),'var(--brand)'],
                    ['Coût total employeur',fmt(prevData.coutTotal),'var(--text-muted)'],
                  ].map(([k,v,c])=>(
                    <div key={k} style={{background:'var(--bg-card)',borderRadius:'8px',padding:'10px 12px',border:'1px solid var(--border-default)'}}>
                      <p style={{fontSize:'10px',color:'var(--text-muted)',margin:'0 0 3px',textTransform:'uppercase',letterSpacing:'0.05em'}}>{k}</p>
                      <p style={{fontSize:'15px',fontWeight:700,color:c,margin:0,fontFamily:'var(--font-display)'}}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          <Section title="Notes">
            <F label="Observations"><Txt value={form.notes} onChange={v=>setForm(p=>({...p,notes:v}))} placeholder="Notes optionnelles (primes, absences, etc.)"/></F>
          </Section>
          <div style={{display:'flex',justifyContent:'flex-end',gap:'8px',paddingTop:'8px',borderTop:'1px solid var(--border-default)'}}>
            <Btn variant="secondary" onClick={()=>setModal(false)}>Annuler</Btn>
            <Btn onClick={handleCreate} disabled={saving}><Check size={14}/>{saving?'Création...':'Créer la fiche de paie'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   CONTRACTS TAB
══════════════════════════════════════════════════ */
function ContractsTab(){
  const [list,setList]=useState([]);
  const [employees,setEmployees]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({employee_id:'',contract_type:'CDI',function:'Agent de nettoyage',salary_brut:'',start_date:new Date().toISOString().split('T')[0],end_date:'',hours_per_week:'35',special_clauses:''});

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const[c,e]=await Promise.all([
        axios.get(`${API}/contracts`,{withCredentials:true}),
        axios.get(`${API}/employees`,{withCredentials:true}),
      ]);
      setList(Array.isArray(c.data)?c.data:c.data.items||[]);
      setEmployees(Array.isArray(e.data)?e.data:e.data.items||[]);
    }catch{toast.error('Erreur chargement');}
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  const set=k=>v=>setForm(p=>({...p,[k]:v}));

  const handleCreate=async()=>{
    if(!form.employee_id||!form.salary_brut)return toast.error('Intervenant et salaire requis');
    if(form.contract_type==='CDD'&&!form.end_date)return toast.error('Date de fin requise pour un CDD');
    setSaving(true);
    try{
      await axios.post(`${API}/contracts`,{...form,salary_brut:parseFloat(form.salary_brut),hours_per_week:parseFloat(form.hours_per_week)},{withCredentials:true});
      toast.success('Contrat créé avec succès');
      setModal(false);
      load();
    }catch(e){toast.error(e.response?.data?.detail||'Erreur création');}
    setSaving(false);
  };

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <div>
          <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--text-primary)',margin:0,fontSize:'18px'}}>{list.length} Contrat{list.length>1?'s':''}</h3>
          <p style={{color:'var(--text-muted)',margin:'2px 0 0',fontSize:'12px'}}>CDI, CDD, Contrats de travail</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <Btn variant="secondary" onClick={load} small><RefreshCw size={13}/></Btn>
          <Btn onClick={()=>setModal(true)}><Plus size={14}/>Nouveau contrat</Btn>
        </div>
      </div>

      {loading?<p style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>Chargement...</p>:
       list.length===0?(
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)',background:'var(--bg-muted)',borderRadius:'var(--radius-lg)',border:'1px dashed var(--border-strong)'}}>
          <FileText size={40} style={{margin:'0 auto 12px',opacity:0.3,display:'block'}}/>
          <p style={{margin:0,fontWeight:600}}>Aucun contrat</p>
        </div>
       ):(
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {list.map(c=>(
            <div key={c.contract_id} style={{background:'var(--bg-card)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-md)',padding:'14px 16px',display:'flex',alignItems:'center',gap:'14px'}}>
              <div style={{width:'42px',height:'42px',borderRadius:'var(--radius-md)',background:'var(--brand-light)',color:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <FileText size={18}/>
              </div>
              <div style={{flex:1}}>
                <p style={{fontWeight:600,color:'var(--text-primary)',margin:0,fontSize:'13px'}}>{c.employee_name||c.employee_id}</p>
                <p style={{color:'var(--text-muted)',margin:'2px 0 0',fontSize:'11px'}}>{c.function} · {c.hours_per_week}h/semaine · Début: {c.start_date?.split('T')[0]}</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'14px',fontWeight:700,color:'var(--brand)'}}>{fmt(c.salary_brut)}/mois</span>
                <Badge label={c.contract_type} color={c.contract_type==='CDI'?'green':'blue'}/>
                <Badge label={c.status==='active'?'Actif':c.status==='terminated'?'Résilié':'En cours'} color={c.status==='active'?'green':c.status==='terminated'?'red':'amber'}/>
              </div>
            </div>
          ))}
        </div>
       )
      }

      {modal&&(
        <Modal title="Nouveau contrat de travail" onClose={()=>setModal(false)} wide>
          <Section title="Parties contractantes">
            <F label="Employeur">
              <input value="Global Clean Home — 231 rue Saint-Honoré, 75001 Paris" readOnly style={{...inputStyle,background:'var(--bg-muted)',color:'var(--text-muted)'}}/>
            </F>
            <F label="Salarié" required>
              <Sel value={form.employee_id} onChange={set('employee_id')} options={[{value:'',label:'-- Sélectionner un intervenant --'},...employees.map(e=>({value:e.employee_id,label:e.full_name}))]}/>
            </F>
          </Section>
          <Section title="Nature du contrat">
            <Grid cols={2}>
              <F label="Type de contrat" required>
                <Sel value={form.contract_type} onChange={set('contract_type')} options={[
                  {value:'CDI',label:'CDI — Contrat à Durée Indéterminée'},
                  {value:'CDD',label:'CDD — Contrat à Durée Déterminée'},
                  {value:'Temps partiel',label:'Temps partiel'},
                  {value:'Stage',label:'Convention de stage'},
                  {value:'Alternance',label:"Contrat d'alternance"},
                ]}/>
              </F>
              <F label="Fonction / Qualification">
                <Sel value={form.function} onChange={set('function')} options={[
                  {value:'Agent de nettoyage',label:'Agent de nettoyage (Coeff. 120)'},
                  {value:'Agent de nettoyage qualifié',label:'Agent qualifié (Coeff. 150)'},
                  {value:"Chef d'équipe",label:"Chef d'équipe (Coeff. 180)"},
                  {value:'Responsable de secteur',label:'Responsable de secteur (Coeff. 210)'},
                  {value:'Technicien de surface',label:'Technicien de surface (Coeff. 155)'},
                ]}/>
              </F>
            </Grid>
          </Section>
          <Section title="Durée & Horaires">
            <Grid cols={3}>
              <F label="Date de début" required><Inp value={form.start_date} onChange={set('start_date')} type="date"/></F>
              <F label={`Date de fin${form.contract_type==='CDD'?' *':''}`}>
                <Inp value={form.end_date} onChange={set('end_date')} type="date"/>
              </F>
              <F label="Heures/semaine"><Inp value={form.hours_per_week} onChange={set('hours_per_week')} type="number" min="1" max="48" step="0.5"/></F>
            </Grid>
          </Section>
          <Section title="Rémunération">
            <Grid cols={2}>
              <F label="Salaire brut mensuel (€)" required><Inp value={form.salary_brut} onChange={set('salary_brut')} type="number" min="0" step="0.01" placeholder="1801.80 (SMIC 2024)"/></F>
              <div style={{paddingTop:'20px'}}>
                {form.salary_brut&&parseFloat(form.salary_brut)>0&&(
                  <div style={{background:'var(--brand-light)',borderRadius:'8px',padding:'10px 12px',fontSize:'12px'}}>
                    <p style={{margin:'0 0 2px',color:'var(--text-secondary)'}}>Net estimé après charges</p>
                    <p style={{margin:0,fontWeight:700,color:'var(--brand)',fontSize:'16px'}}>{fmt(parseFloat(form.salary_brut)*0.5165)}</p>
                    <p style={{margin:'2px 0 0',fontSize:'10px',color:'var(--text-muted)'}}>Coût employeur: {fmt(parseFloat(form.salary_brut)*1.39)}</p>
                  </div>
                )}
              </div>
            </Grid>
          </Section>
          <Section title="Clauses particulières">
            <F label="Clauses spéciales (période d'essai, mobilité, etc.)">
              <Txt value={form.special_clauses} onChange={set('special_clauses')} rows={4}
                placeholder={`Exemple:\n- Période d'essai : 2 mois renouvelable une fois\n- Lieu de travail principal : Paris et région Île-de-France\n- Convention collective : Propreté et services associés (IDCC 3043)`}/>
            </F>
          </Section>
          <div style={{background:'#fef3c7',borderRadius:'8px',padding:'12px',marginBottom:'16px',fontSize:'12px',color:'#92400e'}}>
            ⚠️ Ce contrat est généré conformément au Code du travail et à la <strong>Convention Collective de la Propreté (IDCC 3043)</strong>. Vérifiez les mentions légales avant signature.
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:'8px',paddingTop:'8px',borderTop:'1px solid var(--border-default)'}}>
            <Btn variant="secondary" onClick={()=>setModal(false)}>Annuler</Btn>
            <Btn onClick={handleCreate} disabled={saving}><Check size={14}/>{saving?'Création...':'Créer le contrat'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   EXPENSES TAB
══════════════════════════════════════════════════ */
function ExpensesTab(){
  const [list,setList]=useState([]);
  const [employees,setEmployees]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({employee_id:'',period_start:new Date().toISOString().split('T')[0],period_end:new Date().toISOString().split('T')[0],notes:'',items:[{date:new Date().toISOString().split('T')[0],category:'transport',description:'',amount_ht:'',tva_rate:'20'}]});

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const[r,e]=await Promise.all([
        axios.get(`${API}/expense-reports`,{withCredentials:true}),
        axios.get(`${API}/employees`,{withCredentials:true}),
      ]);
      setList(Array.isArray(r.data)?r.data:r.data.items||[]);
      setEmployees(Array.isArray(e.data)?e.data:e.data.items||[]);
    }catch{toast.error('Erreur chargement');}
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  const addItem=()=>setForm(p=>({...p,items:[...p.items,{date:new Date().toISOString().split('T')[0],category:'transport',description:'',amount_ht:'',tva_rate:'20'}]}));
  const removeItem=i=>setForm(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)}));
  const setItem=(i,k,v)=>setForm(p=>({...p,items:p.items.map((item,idx)=>idx===i?{...item,[k]:v}:item)}));

  const totalHT=form.items.reduce((s,i)=>s+(parseFloat(i.amount_ht)||0),0);
  const totalTTC=form.items.reduce((s,i)=>{const ht=parseFloat(i.amount_ht)||0;const tva=parseFloat(i.tva_rate)||0;return s+ht*(1+tva/100);},0);

  const handleCreate=async()=>{
    if(!form.employee_id)return toast.error('Sélectionnez un intervenant');
    if(form.items.length===0||!form.items.some(i=>i.description&&i.amount_ht))return toast.error('Ajoutez au moins une ligne de frais');
    setSaving(true);
    try{
      await axios.post(`${API}/expense-reports`,{...form,items:form.items.map(i=>({...i,amount_ht:parseFloat(i.amount_ht)||0,tva_rate:parseFloat(i.tva_rate)||20}))},{withCredentials:true});
      toast.success('Note de frais créée !');
      setModal(false);
      load();
    }catch(e){toast.error(e.response?.data?.detail||'Erreur');}
    setSaving(false);
  };

  const catLabels={transport:'🚗 Transport',lodging:'🏨 Hébergement',meals:'🍽️ Repas',other:'📎 Autre'};

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <div>
          <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--text-primary)',margin:0,fontSize:'18px'}}>{list.length} Note{list.length>1?'s':''} de frais</h3>
          <p style={{color:'var(--text-muted)',margin:'2px 0 0',fontSize:'12px'}}>Notes de frais professionnels</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <Btn variant="secondary" onClick={load} small><RefreshCw size={13}/></Btn>
          <Btn onClick={()=>setModal(true)}><Plus size={14}/>Nouvelle note</Btn>
        </div>
      </div>

      {loading?<p style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>Chargement...</p>:
       list.length===0?(
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)',background:'var(--bg-muted)',borderRadius:'var(--radius-lg)',border:'1px dashed var(--border-strong)'}}>
          <Euro size={40} style={{margin:'0 auto 12px',opacity:0.3,display:'block'}}/>
          <p style={{margin:0,fontWeight:600}}>Aucune note de frais</p>
        </div>
       ):(
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {list.map(r=>(
            <div key={r.report_id} style={{background:'var(--bg-card)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-md)',padding:'14px 16px',display:'flex',alignItems:'center',gap:'14px'}}>
              <div style={{flex:1}}>
                <p style={{fontWeight:600,color:'var(--text-primary)',margin:0,fontSize:'13px'}}>{r.employee_name||r.employee_id}</p>
                <p style={{color:'var(--text-muted)',margin:'2px 0 0',fontSize:'11px'}}>{r.period_start?.split('T')[0]} → {r.period_end?.split('T')[0]} · {r.items?.length||0} ligne{r.items?.length>1?'s':''}</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'14px',fontWeight:700,color:'var(--brand)'}}>{fmt(r.total_ttc)}</span>
                <Badge label={r.status==='validated'?'Validée':r.status==='rejected'?'Rejetée':'En attente'} color={r.status==='validated'?'green':r.status==='rejected'?'red':'amber'}/>
              </div>
            </div>
          ))}
        </div>
       )
      }

      {modal&&(
        <Modal title="Nouvelle note de frais" onClose={()=>setModal(false)} wide>
          <Section title="Informations générales">
            <F label="Intervenant" required>
              <Sel value={form.employee_id} onChange={v=>setForm(p=>({...p,employee_id:v}))} options={[{value:'',label:'-- Sélectionner --'},...employees.map(e=>({value:e.employee_id,label:e.full_name}))]}/>
            </F>
            <Grid cols={2}>
              <F label="Période du"><Inp value={form.period_start} onChange={v=>setForm(p=>({...p,period_start:v}))} type="date"/></F>
              <F label="Au"><Inp value={form.period_end} onChange={v=>setForm(p=>({...p,period_end:v}))} type="date"/></F>
            </Grid>
          </Section>
          <Section title="Lignes de frais">
            {form.items.map((item,i)=>(
              <div key={i} style={{background:'var(--bg-muted)',borderRadius:'8px',padding:'12px',marginBottom:'10px',position:'relative'}}>
                <Grid cols={2}>
                  <F label="Date"><Inp value={item.date} onChange={v=>setItem(i,'date',v)} type="date"/></F>
                  <F label="Catégorie">
                    <Sel value={item.category} onChange={v=>setItem(i,'category',v)} options={Object.entries(catLabels).map(([k,v])=>({value:k,label:v}))}/>
                  </F>
                </Grid>
                <F label="Description *"><Inp value={item.description} onChange={v=>setItem(i,'description',v)} placeholder="Ex: Trajet Paris-Versailles pour intervention"/></F>
                <Grid cols={2}>
                  <F label="Montant HT (€) *"><Inp value={item.amount_ht} onChange={v=>setItem(i,'amount_ht',v)} type="number" min="0" step="0.01" placeholder="45.00"/></F>
                  <F label="TVA (%)">
                    <Sel value={item.tva_rate} onChange={v=>setItem(i,'tva_rate',v)} options={[{value:'0',label:'0% (exonéré)'},{value:'5.5',label:'5,5%'},{value:'10',label:'10%'},{value:'20',label:'20% (standard)'}]}/>
                  </F>
                </Grid>
                {item.amount_ht&&parseFloat(item.amount_ht)>0&&(
                  <p style={{fontSize:'11px',color:'var(--text-muted)',margin:0}}>
                    TTC: {fmt(parseFloat(item.amount_ht)*(1+parseFloat(item.tva_rate||0)/100))}
                  </p>
                )}
                {form.items.length>1&&(
                  <button onClick={()=>removeItem(i)} style={{position:'absolute',top:'8px',right:'8px',background:'none',border:'none',cursor:'pointer',color:'#ef4444'}}><X size={14}/></button>
                )}
              </div>
            ))}
            <Btn variant="secondary" onClick={addItem} small><Plus size={12}/>Ajouter une ligne</Btn>
            {totalHT>0&&(
              <div style={{marginTop:'12px',background:'var(--brand-light)',borderRadius:'8px',padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>Total HT: <strong>{fmt(totalHT)}</strong></span>
                <span style={{fontSize:'14px',fontWeight:700,color:'var(--brand)'}}>Total TTC: {fmt(totalTTC)}</span>
              </div>
            )}
          </Section>
          <Section title="Notes">
            <F label="Observations"><Txt value={form.notes} onChange={v=>setForm(p=>({...p,notes:v}))} placeholder="Justificatifs joints, contexte..."/></F>
          </Section>
          <div style={{display:'flex',justifyContent:'flex-end',gap:'8px',paddingTop:'8px',borderTop:'1px solid var(--border-default)'}}>
            <Btn variant="secondary" onClick={()=>setModal(false)}>Annuler</Btn>
            <Btn onClick={handleCreate} disabled={saving}><Check size={14}/>{saving?'Création...':'Créer la note de frais'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
export default function PayrollRHModule(){
  const [tab,setTab]=useState('employees');
  return(
    <div style={{padding:'24px',background:'var(--bg-app)',minHeight:'100%'}}>
      <div style={{marginBottom:'24px'}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:'22px',fontWeight:700,color:'var(--text-primary)',margin:'0 0 4px'}}>Paie & Ressources Humaines</h2>
        <p style={{color:'var(--text-muted)',margin:0,fontSize:'13px'}}>Gestion conforme au droit du travail français — Convention Collective Propreté (IDCC 3043)</p>
      </div>
      <div style={{display:'flex',gap:'4px',background:'var(--bg-muted)',borderRadius:'var(--radius-lg)',padding:'4px',marginBottom:'24px',overflowX:'auto',width:'fit-content'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'8px 18px',borderRadius:'var(--radius-md)',fontSize:'13px',fontWeight:600,border:'none',cursor:'pointer',whiteSpace:'nowrap',background:tab===t.id?'var(--bg-card)':'transparent',color:tab===t.id?'var(--text-primary)':'var(--text-muted)',boxShadow:tab===t.id?'var(--shadow-card)':'none',transition:'all 0.15s'}}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==='employees'&&<EmployeesTab/>}
      {tab==='payslips'&&<PayslipsTab/>}
      {tab==='contracts'&&<ContractsTab/>}
      {tab==='expenses'&&<ExpensesTab/>}
    </div>
  );
}
