const { useState, useEffect, useRef, useMemo } = React;
const LucideIcons = window.lucide;

const firebaseConfig = {
  apiKey: "AIzaSyCEODV9lJYlpFcOen1qJGpwcABFxudAPf8",
  authDomain: "trazo-workspace.firebaseapp.com",
  projectId: "trazo-workspace",
  storageBucket: "trazo-workspace.firebasestorage.app",
  messagingSenderId: "794212882855",
  appId: "1:794212882855:web:f5a04f4129ac6d1b1c3e82"
};

let app, auth, db;
try {
  if (window.firebase) {
    app = window.firebase.initializeApp(firebaseConfig);
    auth = window.firebase.auth();
    db = window.firebase.firestore();
  }
} catch (e) {
  console.warn("Firebase initialized via fallback.");
}

const appId = 'trazo-workspace-v1';
const LOCAL_STORAGE_CLIENTS_KEY = 'trazo_clients_v1';
const LOCAL_STORAGE_CARDS_KEY = 'trazo_cards_v1';
const LOCAL_STORAGE_MEMBERS_KEY = 'trazo_members_v1';
const LOCAL_STORAGE_ACTIVE_USER_KEY = 'trazo_active_user_v1';
const LOCAL_STORAGE_COLUMNS_KEY = 'trazo_columns_v1';

const DEFAULT_COLUMNS = [
  { id: 'solicitacoes', label: 'Solicitações', color: 'bg-slate-900/80 border-slate-700' },
  { id: 'elaboracao', label: 'Em Elaboração', color: 'bg-blue-950/50 border-blue-800/60' },
  { id: 'protocolado', label: 'Protocolado', color: 'bg-amber-950/50 border-amber-800/60' },
  { id: 'execucao', label: 'Execução', color: 'bg-purple-950/50 border-purple-800/60' },
  { id: 'concluido', label: 'Concluído', color: 'bg-emerald-950/50 border-emerald-800/60' },
];

const DEFAULT_MEMBERS = [
  { 
    id: 'm_master_gabriella', 
    name: 'Gabriella Gontijo', 
    role: 'Engenheira / Gestora Master', 
    cpf: '000.000.000-01', 
    rg: 'MG-00.000.001', 
    pix: 'gabriella@trazo.com.br', 
    phone: '(31) 99999-8888',
    email: 'gabriella@trazo.com.br',
    avatarUrl: '', 
    pin: '1234',
    isSystemAdmin: true, 
    canAccessKanban: true,
    canAccessResponsibilities: true,
    canAccessFinancialAdmin: true,
    canAccessFinancialOps: true,
    canAccessClients: true,
    canAccessMembers: true
  },
  { 
    id: 'm_2', 
    name: 'William Portela', 
    role: 'Projetista / T. Técnico', 
    cpf: '000.000.000-02', 
    rg: 'SP-00.000.002', 
    pix: 'william@trazo.com.br', 
    phone: '(11) 98888-7777',
    email: 'william@trazo.com.br',
    avatarUrl: '', 
    pin: '0000',
    isSystemAdmin: false, 
    canAccessKanban: true,
    canAccessResponsibilities: true,
    canAccessFinancialAdmin: false,
    canAccessFinancialOps: true,
    canAccessClients: true,
    canAccessMembers: false
  }
];

const PRESET_TAGS = [
  { id: 't_1', name: 'CLCB', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { id: 't_2', name: 'AVCB', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { id: 't_3', name: 'Vistoria Urgente', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { id: 't_4', name: 'Projeto Comercial', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 't_5', name: 'VIP / Prioritário', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { id: 't_6', name: 'Aprovação Pendente', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
];

function App() {
  const [user, setUser] = useState(null);
  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    } catch (e) { return DEFAULT_COLUMNS; }
  });

  const [members, setMembers] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_MEMBERS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_MEMBERS;
    } catch (e) { return DEFAULT_MEMBERS; }
  });

  const [clients, setClients] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [cards, setCards] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CARDS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [activeMemberId, setActiveMemberId] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ACTIVE_USER_KEY);
      return saved || 'm_master_gabriella';
    } catch (e) { return 'm_master_gabriella'; }
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  const activeMember = useMemo(() => {
    return members.find(m => m.id === activeMemberId) || members[0] || DEFAULT_MEMBERS[0];
  }, [activeMemberId, members]);

  const [currentView, setCurrentView] = useState('kanban');
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const visibleCards = useMemo(() => {
    if (activeMember.isSystemAdmin) return cards;
    return cards.filter(card => {
      const isCurrent = card.currentAssignee === activeMember.name;
      const isNext = card.nextAssignee === activeMember.name;
      const hasTask = (card.checklist || []).some(task => task.assignee === activeMember.name);
      return isCurrent || isNext || hasTask;
    });
  }, [cards, activeMember]);

  useEffect(() => {
    if (!auth) return;
    auth.signInAnonymously().catch(() => {});
    const unsubscribe = auth.onAuthStateChanged((currentUser) => { setUser(currentUser); });
    return () => unsubscribe();
  }, []);

  const handleSaveCard = (cardData) => {
    const cardId = cardData.id || `card_${Date.now()}`;
    const cardToSave = {
      ...cardData,
      id: cardId,
      status: cardData.status || columns[0].id,
      payments: cardData.payments || [],
      checklist: cardData.checklist || [],
      tags: cardData.tags || [],
      images: cardData.images || [],
      updatedAt: new Date().toISOString()
    };
    setCards(prev => {
      const exists = prev.some(c => c.id === cardId);
      if (exists) return prev.map(c => c.id === cardId ? cardToSave : c);
      return [cardToSave, ...prev];
    });
    setIsCardModalOpen(false);
    setEditingCard(null);
    showToast('Cartão salvo com sucesso!');
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 font-sans flex flex-col md:flex-row relative">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border bg-emerald-950 border-emerald-500 text-emerald-200">
          {toastMessage.message}
        </div>
      )}

      <aside className="w-full md:w-64 bg-[#0a1128] border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-serif text-slate-100 tracking-widest">TRAZO</h1>
          <p className="text-[9px] text-slate-400 tracking-widest uppercase">Workspace Pro</p>
          <nav className="mt-6 space-y-2">
            <button onClick={() => setCurrentView('kanban')} className="w-full text-left px-4 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 text-sm font-bold">
              Painel Kanban
            </button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-800 bg-[#0a1128] flex justify-between items-center">
          <h2 className="text-xl font-bold">Painel Kanban Operacional</h2>
          <button onClick={() => { setEditingCard(null); setIsCardModalOpen(true); }} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-bold">
            + Novo Cartão
          </button>
        </header>

        <div className="flex-1 p-6 overflow-auto flex space-x-4">
          {columns.map(col => {
            const columnCards = visibleCards.filter(c => c.status === col.id);
            return (
              <div key={col.id} className="w-80 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col">
                <div className="p-3.5 border-b border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-xs uppercase">{col.label}</span>
                  <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full">{columnCards.length}</span>
                </div>
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {columnCards.map(card => (
                    <div key={card.id} onClick={() => { setEditingCard(card); setIsCardModalOpen(true); }} className="bg-[#0e1738] border border-slate-700 rounded-2xl p-4 cursor-pointer">
                      <h4 className="font-bold text-sm">{card.title}</h4>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="bg-[#0a1128] border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">Criar / Editar Cartão</h3>
            <input type="text" placeholder="Título do Cartão" id="modal-card-title" defaultValue={editingCard?.title || ''} className="bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl p-2.5 w-full outline-none" />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setIsCardModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancelar</button>
              <button onClick={() => {
                const title = document.getElementById('modal-card-title').value;
                if(title) handleSaveCard({ ...editingCard, title });
              }} className="px-5 py-2 bg-cyan-600 text-white text-xs font-bold rounded-xl">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.App = App;
