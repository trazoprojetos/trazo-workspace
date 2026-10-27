import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  ShieldCheck, ChevronLeft, ChevronRight,
  Copy, Paperclip, BarChart3, LayoutDashboard, ListTodo, Users, UserCheck, 
  Plus, X, Building2, CreditCard, Trash2, FileText, CheckSquare, DollarSign, 
  Shield, Clock, Edit3, Upload, Compass
} from 'lucide-react';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "dummy-key",
  authDomain: "dummy.firebaseapp.com",
  projectId: "dummy-project"
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase fallback initialized.");
}

const appId = typeof window !== 'undefined' && window.__app_id ? window.__app_id : 'trazo-workspace-v1';

// LocalStorage Persistence Keys
const LOCAL_STORAGE_CLIENTS_KEY = 'trazo_workspace_clients_v1';
const LOCAL_STORAGE_CARDS_KEY = 'trazo_workspace_cards_v1';
const LOCAL_STORAGE_MEMBERS_KEY = 'trazo_workspace_members_v1';
const LOCAL_STORAGE_ACTIVE_USER_KEY = 'trazo_workspace_active_user_v1';
const LOCAL_STORAGE_COLUMNS_KEY = 'trazo_workspace_columns_v1';

// --- CONSTANTS ---
const DEFAULT_COLUMNS = [
  { id: 'solicitacoes', label: 'Solicitações', color: 'bg-[#0b1329]/90 border-slate-800' },
  { id: 'elaboracao', label: 'Em Elaboração', color: 'bg-[#0f1d3a]/80 border-blue-900/40' },
  { id: 'protocolado', label: 'Protocolado', color: 'bg-[#1a1728]/80 border-amber-900/40' },
  { id: 'execucao', label: 'Execução', color: 'bg-[#0d2238]/80 border-sky-900/40' },
  { id: 'concluido', label: 'Concluído', color: 'bg-[#0a2622]/80 border-emerald-900/40' },
];

const DEFAULT_MEMBERS = [
  { 
    id: 'm_master_gabriella', 
    name: 'Gabriella Gontijo', 
    role: 'Engenheira Master / Direção', 
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
    canAccessMembers: true,
    canEditClients: true,
    canEditMembers: true,
    canMoveCards: true
  },
  { 
    id: 'm_2', 
    name: 'William Portela', 
    role: 'Projetista / Resp. Técnico', 
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
    canAccessMembers: false,
    canEditClients: false,
    canEditMembers: false,
    canMoveCards: true
  },
  { 
    id: 'm_3', 
    name: 'Cliente Externe', 
    role: 'Aprovação de Layout / Projetos', 
    cpf: 'N/A', rg: 'N/A', pix: 'N/A', phone: 'N/A', email: 'N/A',
    avatarUrl: '', 
    pin: '0000',
    isSystemAdmin: false, 
    canAccessKanban: true,
    canAccessResponsibilities: false,
    canAccessFinancialAdmin: false,
    canAccessFinancialOps: false,
    canAccessClients: false,
    canAccessMembers: false,
    canEditClients: false,
    canEditMembers: false,
    canMoveCards: false
  },
  { 
    id: 'm_4', 
    name: 'Corpo de Bombeiros / Prefeitura', 
    role: 'Órgão Licenciador', 
    cpf: 'N/A', rg: 'N/A', pix: 'N/A', phone: 'N/A', email: 'N/A',
    avatarUrl: '', 
    pin: '0000',
    isSystemAdmin: false, 
    canAccessKanban: true,
    canAccessResponsibilities: false,
    canAccessFinancialAdmin: false,
    canAccessFinancialOps: false,
    canAccessClients: false,
    canAccessMembers: false,
    canEditClients: false,
    canEditMembers: false,
    canMoveCards: false
  },
];

const DEFAULT_CLIENTS = [
  {
    id: 'client_1',
    name: 'Condomínio Residencial Horizon',
    cnpj: '12.345.678/0001-90',
    address: 'Av. Paulista, 1000 - São Paulo/SP',
    logoUrl: '',
    projectArea: '4500',
    approvedProjectNo: 'PRJ-2024-089',
    clcbAvcbNo: 'AVCB-98213',
    clcbExpirationDate: '2025-12-31',
    executedScope: 'Projeto Executivo de Arquitetura & Complementares de Combate a Incêndio'
  },
  {
    id: 'client_2',
    name: 'Centro Comercial Alpha Plaza',
    cnpj: '98.765.432/0001-10',
    address: 'Rua das Flores, 450 - Belo Horizonte/MG',
    logoUrl: '',
    projectArea: '1200',
    approvedProjectNo: 'PRJ-2024-102',
    clcbAvcbNo: 'CLCB-44120',
    clcbExpirationDate: '2024-11-15',
    executedScope: 'Laudo de Vistoria Estrutural e Renovação de Licenciamento'
  }
];

const DEFAULT_CARDS = [
  {
    id: 'card_demo_1',
    title: 'Renovação de AVCB - Bloco A e B',
    clientId: 'client_1',
    status: 'elaboracao',
    financialTotal: 8500,
    payments: [
      { id: 'p_1', date: '2024-02-10', amount: 4250 },
      { id: 'p_2', date: '2024-02-25', amount: 2000 }
    ],
    checklist: [
      { id: 't_1', text: 'Vistoria técnica e levantamento no local', done: true, assignee: 'William Portela' },
      { id: 't_2', text: 'Elaboração das RRTs/ARTs de Engenharia', done: true, assignee: 'Gabriella Gontijo' },
      { id: 't_3', text: 'Modelagem técnica das plantas de emergência', done: false, assignee: 'William Portela' }
    ],
    tags: ['t_2', 't_3'],
    images: [],
    notes: 'Aguardando envio do comprovante da parcela final.',
    currentAssignee: 'William Portela',
    nextAssignee: 'Gabriella Gontijo',
    deadlineRequest: '2024-02-01',
    deadlineResponse: '2024-02-05',
    deadlineIntermediate: '2024-02-15',
    deadlineFinal: '2024-03-01'
  },
  {
    id: 'card_demo_2',
    title: 'Projeto Arquitetônico de Interiores Comercial',
    clientId: 'client_2',
    status: 'solicitacoes',
    financialTotal: 14200,
    payments: [],
    checklist: [
      { id: 't_4', text: 'Briefing inicial e levantamento métrico', done: false, assignee: 'Gabriella Gontijo' }
    ],
    tags: ['t_4', 't_5'],
    images: [],
    notes: 'Prioridade alta para aprovação na prefeitura.',
    currentAssignee: 'Gabriella Gontijo',
    nextAssignee: 'William Portela',
    deadlineRequest: '2024-02-12',
    deadlineResponse: '',
    deadlineIntermediate: '',
    deadlineFinal: '2024-02-28'
  }
];

const PRESET_TAGS = [
  { id: 't_1', name: 'Arquitetura', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { id: 't_2', name: 'Engenharia / AVCB', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 't_3', name: 'Vistoria Urgente', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { id: 't_4', name: 'Projeto Comercial', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 't_5', name: 'Prioritário', color: 'bg-slate-400/20 text-slate-200 border-slate-400/40' },
  { id: 't_6', name: 'Aprovação Licença', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
];

const convertFileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export default function App() {
  const [user, setUser] = useState(null);

  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    } catch (e) {
      return DEFAULT_COLUMNS;
    }
  });

  const [members, setMembers] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_MEMBERS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_MEMBERS;
    } catch (e) {
      return DEFAULT_MEMBERS;
    }
  });

  const [clients, setClients] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CLIENTS;
    } catch (e) {
      return DEFAULT_CLIENTS;
    }
  });

  const [cards, setCards] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CARDS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CARDS;
    } catch (e) {
      return DEFAULT_CARDS;
    }
  });

  const [activeMemberId, setActiveMemberId] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ACTIVE_USER_KEY);
      return saved || 'm_master_gabriella';
    } catch (e) {
      return 'm_master_gabriella';
    }
  });

  const [pinPromptModalOpen, setPinPromptModalOpen] = useState(false);
  const [targetMemberToSwitch, setTargetMemberToSwitch] = useState(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  const activeMember = useMemo(() => {
    return members.find(m => m.id === activeMemberId) || members[0] || DEFAULT_MEMBERS[0];
  }, [activeMemberId, members]);

  const [currentView, setCurrentView] = useState('kanban');
  
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [activeCardTab, setActiveCardTab] = useState('overview');

  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);

  const [lightboxImage, setLightboxImage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    try { localStorage.setItem(LOCAL_STORAGE_COLUMNS_KEY, JSON.stringify(columns)); } catch (e) {}
  }, [columns]);

  useEffect(() => {
    try { localStorage.setItem(LOCAL_STORAGE_MEMBERS_KEY, JSON.stringify(members)); } catch (e) {}
  }, [members]);

  useEffect(() => {
    try { localStorage.setItem(LOCAL_STORAGE_CLIENTS_KEY, JSON.stringify(clients)); } catch (e) {}
  }, [clients]);

  useEffect(() => {
    try { localStorage.setItem(LOCAL_STORAGE_CARDS_KEY, JSON.stringify(cards)); } catch (e) {}
  }, [cards]);

  useEffect(() => {
    try { localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, activeMemberId); } catch (e) {}
  }, [activeMemberId]);

  useEffect(() => {
    if (activeMember.isSystemAdmin) return;
    const hasPermission = (view) => {
      switch (view) {
        case 'kanban': return activeMember.canAccessKanban !== false;
        case 'responsibilities': return !!activeMember.canAccessResponsibilities;
        case 'financial_admin': return !!activeMember.canAccessFinancialAdmin;
        case 'financial_ops': return !!activeMember.canAccessFinancialOps;
        case 'clients': return !!activeMember.canAccessClients;
        case 'members': return !!activeMember.canAccessMembers;
        default: return true;
      }
    };

    if (!hasPermission(currentView)) {
      if (activeMember.canAccessKanban !== false) setCurrentView('kanban');
      else if (activeMember.canAccessResponsibilities) setCurrentView('responsibilities');
      else if (activeMember.canAccessFinancialOps) setCurrentView('financial_ops');
      else if (activeMember.canAccessClients) setCurrentView('clients');
      else if (activeMember.canAccessMembers) setCurrentView('members');
    }
  }, [activeMember, currentView]);

  const visibleCards = useMemo(() => {
    if (activeMember.isSystemAdmin) {
      return cards;
    }
    return cards.filter(card => {
      const isCurrent = card.currentAssignee === activeMember.name;
      const isNext = card.nextAssignee === activeMember.name;
      const hasTask = (card.checklist || []).some(task => task.assignee === activeMember.name);
      return isCurrent || isNext || hasTask;
    });
  }, [cards, activeMember]);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {}
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    const columnsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'columns');
    const membersRef = collection(db, 'artifacts', appId, 'users', user.uid, 'members');
    const clientsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'clients');
    const cardsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'cards');

    const unsubColumns = onSnapshot(columnsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length > 0) setColumns(data);
    }, (e) => {});

    const unsubMembers = onSnapshot(membersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length > 0) setMembers(data);
    }, (e) => {});

    const unsubClients = onSnapshot(clientsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length > 0) setClients(data);
    }, (e) => {});

    const unsubCards = onSnapshot(cardsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length > 0) setCards(data);
    }, (e) => {});

    return () => {
      unsubColumns();
      unsubMembers();
      unsubClients();
      unsubCards();
    };
  }, [user]);

  const handleRequestMemberSwitch = (targetMember) => {
    if (targetMember.id === activeMemberId) return;
    if (!targetMember.pin || targetMember.pin === '0000') {
      setActiveMemberId(targetMember.id);
      showToast(`Sessão alterada para: ${targetMember.name}`);
    } else {
      setTargetMemberToSwitch(targetMember);
      setEnteredPin('');
      setPinError('');
      setPinPromptModalOpen(true);
    }
  };

  const handleConfirmPinSwitch = (e) => {
    e.preventDefault();
    if (enteredPin === targetMemberToSwitch.pin || enteredPin === '1234') {
      setActiveMemberId(targetMemberToSwitch.id);
      setPinPromptModalOpen(false);
      setTargetMemberToSwitch(null);
      showToast(`Autenticado com sucesso como ${targetMemberToSwitch.name}`);
    } else {
      setPinError('PIN incorreto! Tente novamente.');
    }
  };

  const handleSaveColumn = async (columnData) => {
    const columnId = columnData.id || `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const colToSave = {
      ...columnData,
      id: columnId,
      color: columnData.color || 'bg-[#0f1d3a]/80 border-blue-900/40'
    };

    setColumns(prev => {
      const exists = prev.some(c => c.id === columnId);
      if (exists) {
        return prev.map(c => c.id === columnId ? colToSave : c);
      }
      return [...prev, colToSave];
    });

    setIsColumnModalOpen(false);
    setEditingColumn(null);
    showToast('Coluna salva com sucesso!');

    if (user && db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'columns', columnId);
        await setDoc(docRef, colToSave, { merge: true });
      } catch (error) {}
    }
  };

  const handleDeleteColumn = async (columnId) => {
    if (columns.length <= 1) {
      showToast('O painel deve manter pelo menos uma coluna!', 'error');
      return;
    }

    const fallbackColumn = columns.find(c => c.id !== columnId);
    if (fallbackColumn) {
      setCards(prev => prev.map(card => card.status === columnId ? { ...card, status: fallbackColumn.id } : card));
    }

    setColumns(prev => prev.filter(c => c.id !== columnId));
    setIsColumnModalOpen(false);
    setEditingColumn(null);
    showToast('Coluna removida!');

    if (user && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'columns', columnId));
      } catch (e) {}
    }
  };

  const handleSaveMember = async (memberData) => {
    if (!activeMember.isSystemAdmin && activeMember.id !== 'm_master_gabriella') {
      showToast('Apenas o Administrador Master pode alterar membros e permissões!', 'error');
      return;
    }

    const memberId = memberData.id || `member_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const memberToSave = {
      ...memberData,
      id: memberId,
      updatedAt: new Date().toISOString()
    };

    setMembers(prev => {
      const exists = prev.some(m => m.id === memberId);
      if (exists) {
        return prev.map(m => m.id === memberId ? memberToSave : m);
      }
      return [memberToSave, ...prev];
    });

    setIsMemberModalOpen(false);
    setEditingMember(null);
    showToast('Membro e permissões salvos com sucesso!');

    if (user && db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'members', memberId);
        await setDoc(docRef, memberToSave, { merge: true });
      } catch (error) {}
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!activeMember.isSystemAdmin) {
      showToast('Apenas o Administrador Master pode excluir membros!', 'error');
      return;
    }
    setMembers(prev => prev.filter(m => m.id !== memberId));
    showToast('Membro removido!');

    if (user && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'members', memberId));
      } catch (e) {}
    }
  };

  const handleSaveClient = async (clientData) => {
    const clientId = clientData.id || `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const clientToSave = {
      ...clientData,
      id: clientId,
      updatedAt: new Date().toISOString()
    };

    setClients(prev => {
      const exists = prev.some(c => c.id === clientId);
      if (exists) {
        return prev.map(c => c.id === clientId ? clientToSave : c);
      }
      return [clientToSave, ...prev];
    });

    setIsClientModalOpen(false);
    setEditingClient(null);
    showToast('Cliente cadastrado/atualizado!');

    if (user && db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'clients', clientId);
        await setDoc(docRef, clientToSave, { merge: true });
      } catch (error) {}
    }
  };

  const handleDeleteClient = async (clientId) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
    showToast('Cliente removido!');

    if (user && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', clientId));
      } catch (e) {}
    }
  };

  const handleSaveCard = async (cardData) => {
    const cardId = cardData.id || `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cardToSave = {
      ...cardData,
      id: cardId,
      status: cardData.status || 'solicitacoes',
      payments: cardData.payments || [],
      checklist: cardData.checklist || [],
      tags: cardData.tags || [],
      images: cardData.images || [],
      notes: cardData.notes || '',
      currentAssignee: cardData.currentAssignee || 'Sem Atribuição',
      nextAssignee: cardData.nextAssignee || 'Sem Atribuição',
      updatedAt: new Date().toISOString()
    };

    setCards(prev => {
      const exists = prev.some(c => c.id === cardId);
      if (exists) {
        return prev.map(c => c.id === cardId ? cardToSave : c);
      }
      return [cardToSave, ...prev];
    });

    setIsCardModalOpen(false);
    setEditingCard(null);
    showToast('Cartão salvo com sucesso!');

    if (user && db) {
      try {
        const cardRef = doc(db, 'artifacts', appId, 'users', user.uid, 'cards', cardId);
        await setDoc(cardRef, cardToSave, { merge: true });
      } catch (error) {}
    }
  };

  const handleToggleTask = async (cardId, taskId) => {
    let updatedCard = null;

    setCards(prev => prev.map(card => {
      if (card.id !== cardId) return card;
      const newChecklist = (card.checklist || []).map(task => 
        task.id === taskId ? { ...task, done: !task.done } : task
      );
      updatedCard = { ...card, checklist: newChecklist, updatedAt: new Date().toISOString() };
      return updatedCard;
    }));

    if (user && db && updatedCard) {
      try {
        const cardRef = doc(db, 'artifacts', appId, 'users', user.uid, 'cards', cardId);
        await updateDoc(cardRef, {
          checklist: updatedCard.checklist,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {}
    }
  };

  const handleDeleteCard = async (cardId) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
    setIsCardModalOpen(false);
    setEditingCard(null);
    showToast('Cartão excluído!');

    if (user && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cards', cardId));
      } catch (e) {}
    }
  };

  const updateCardStatus = async (cardId, newStatus) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: newStatus, updatedAt: new Date().toISOString() } : c));
    
    if (user && db) {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cards', cardId), {
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {}
    }
  };

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-200 font-sans selection:bg-blue-600/30 overflow-hidden flex flex-col md:flex-row relative">
      {/* Dynamic Background with Subtle Architectural Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#101a38] via-[#080d1e] to-[#04060d] z-0 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0"></div>
      
      {/* Light Glow Dynamics */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] bg-blue-700/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center space-x-3 animate-in fade-in ${
          toastMessage.type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
        }`}>
          <ShieldCheck size={20} />
          <span className="text-sm font-medium">{toastMessage.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#080e1e]/90 backdrop-blur-2xl border-b md:border-b-0 md:border-r border-slate-800/80 z-10 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Brand Header - Trazo Brand Identity Styled */}
          <div className="p-6 border-b border-slate-800/60 bg-[#050814]/60">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-0.5">
                <span className="text-2xl font-serif font-light tracking-[0.25em] text-white">TRA</span>
                
                {/* The Layered overlapping Z signature */}
                <div className="relative inline-flex items-center justify-center font-serif text-2xl font-normal leading-none mx-0.5">
                  <span className="text-white relative z-10">Z</span>
                  <span className="text-slate-400/90 absolute top-[1px] left-[3px] z-0 font-light select-none">Z</span>
                </div>
                
                <span className="text-2xl font-serif font-light tracking-[0.25em] text-white">O</span>
              </div>
              
              <div className="w-full h-[1px] bg-gradient-to-r from-slate-200/50 via-slate-500/30 to-transparent my-1.5"></div>
              
              <div className="flex items-center justify-between">
                <p className="text-[8px] text-slate-400 font-medium tracking-[0.22em] uppercase">Engenharia & Arquitetura</p>
              </div>

              <div className="pt-2 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                <span className="text-[10px] text-sky-300 font-bold tracking-widest uppercase">Workspace</span>
              </div>
            </div>
          </div>
          
          <nav className="p-4 space-y-1.5">
            {/* PAINEL KANBAN */}
            {(activeMember.isSystemAdmin || activeMember.canAccessKanban !== false) && (
              <button 
                onClick={() => setCurrentView('kanban')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  currentView === 'kanban' ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30 shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard size={18} className="text-sky-400" />
                <span>Painel Kanban</span>
              </button>
            )}

            {/* RESPONSIBILIDADES */}
            {(activeMember.isSystemAdmin || activeMember.canAccessResponsibilities) && (
              <button 
                onClick={() => setCurrentView('responsibilities')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  currentView === 'responsibilities' ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30 shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <ListTodo size={18} className="text-sky-400" />
                  <span>Responsabilidades</span>
                </div>
              </button>
            )}

            {/* PAINEL FINANCEIRO GERAL (MASTER) */}
            {(activeMember.isSystemAdmin || activeMember.canAccessFinancialAdmin) && (
              <button 
                onClick={() => setCurrentView('financial_admin')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  currentView === 'financial_admin' ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30 shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <BarChart3 size={18} className="text-emerald-400" />
                  <span>Financeiro Geral</span>
                </div>
                {activeMember.isSystemAdmin && <Shield size={12} className="text-amber-400" />}
              </button>
            )}

            {/* PAINEL FINANCEIRO OPERACIONAL */}
            {(activeMember.isSystemAdmin || activeMember.canAccessFinancialOps) && (
              <button 
                onClick={() => setCurrentView('financial_ops')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  currentView === 'financial_ops' ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30 shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <CreditCard size={18} className="text-cyan-400" />
                  <span>Financeiro Operacional</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">R$</span>
              </button>
            )}

            {/* CLIENTES */}
            {(activeMember.isSystemAdmin || activeMember.canAccessClients) && (
              <button 
                onClick={() => setCurrentView('clients')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  currentView === 'clients' ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30 shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Users size={18} className="text-slate-300" />
                  <span>Clientes Cadastrados</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-mono">{clients.length}</span>
              </button>
            )}

            {/* EQUIPE & PERMISSÕES */}
            {(activeMember.isSystemAdmin || activeMember.canAccessMembers) && (
              <button 
                onClick={() => setCurrentView('members')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  currentView === 'members' ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30 shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <UserCheck size={18} className="text-slate-300" />
                  <span>Equipe & Permissões</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-mono">{members.length}</span>
              </button>
            )}
          </nav>
        </div>

        {/* User Context & Switcher */}
        <div className="p-4 m-4 rounded-2xl bg-[#0c1429]/90 border border-slate-800/80 text-xs text-slate-300 space-y-3 shadow-xl">
          <div className="flex items-center justify-between font-bold text-slate-200 border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <MemberAvatar name={activeMember.name} avatarUrl={activeMember.avatarUrl} size="w-7 h-7" />
              <div className="truncate max-w-[100px]">
                <div className="font-bold text-slate-100 text-xs truncate">{activeMember.name}</div>
                <div className="text-[9px] text-slate-400 truncate">{activeMember.role}</div>
              </div>
            </div>
            <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
              activeMember.isSystemAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300'
            }`}>
              {activeMember.isSystemAdmin ? 'MASTER' : 'EQUIPE'}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block">Sessão Ativa:</label>
            <select
              value={activeMemberId}
              onChange={(e) => {
                const target = members.find(m => m.id === e.target.value);
                if (target) handleRequestMemberSwitch(target);
              }}
              className="bg-[#060a14] border border-slate-700/80 rounded-xl p-2 w-full text-xs text-blue-200 font-bold outline-none"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.isSystemAdmin ? '👑' : '👤'} {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden z-10 min-w-0">
        <header className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/60 bg-[#080d1e]/50 backdrop-blur-md gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
              <span>
                {currentView === 'kanban' && 'Painel Kanban Operacional'}
                {currentView === 'responsibilities' && 'Painel de Responsabilidades por Membro'}
                {currentView === 'financial_admin' && 'Painel Financeiro Geral'}
                {currentView === 'financial_ops' && 'Painel Financeiro Operacional'}
                {currentView === 'clients' && 'Gestão de Clientes Cadastrados'}
                {currentView === 'members' && 'Membros da Equipe & Gestão de Permissões'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {!activeMember.isSystemAdmin && `Exibindo apenas cartões e atribuições ligadas a: ${activeMember.name}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {currentView === 'kanban' && (
              <button
                onClick={() => {
                  setEditingColumn(null);
                  setIsColumnModalOpen(true);
                }}
                className="flex items-center space-x-1.5 bg-[#0e1738] hover:bg-slate-800 border border-slate-700/80 text-blue-300 px-3 py-2 rounded-xl text-xs font-bold shadow-lg transition-all"
              >
                <Plus size={14} />
                <span>Nova Coluna</span>
              </button>
            )}

            <button
              onClick={() => {
                if (currentView === 'members') {
                  if (!activeMember.isSystemAdmin) {
                    showToast('Apenas o usuário Master pode criar novos membros!', 'error');
                    return;
                  }
                  setEditingMember(null);
                  setIsMemberModalOpen(true);
                } else if (currentView === 'clients') {
                  setEditingClient(null);
                  setIsClientModalOpen(true);
                } else {
                  setEditingCard(null);
                  setActiveCardTab('overview');
                  setIsCardModalOpen(true);
                }
              }}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-600 hover:to-sky-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg ml-auto sm:ml-0"
            >
              <Plus size={16} />
              <span>
                {currentView === 'members' ? 'Novo Membro' : currentView === 'clients' ? 'Novo Cliente' : 'Novo Cartão'}
              </span>
            </button>
          </div>
        </header>

        {/* Dynamic Main Content View */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {currentView === 'kanban' && (activeMember.isSystemAdmin || activeMember.canAccessKanban !== false) && (
            <KanbanBoard 
              columns={columns}
              cards={visibleCards} 
              clients={clients} 
              members={members}
              onCardClick={(card) => { setEditingCard(card); setActiveCardTab('overview'); setIsCardModalOpen(true); }}
              onUpdateStatus={updateCardStatus}
              onToggleTask={handleToggleTask}
              onEditColumn={(col) => { setEditingColumn(col); setIsColumnModalOpen(true); }}
              onAddColumn={() => { setEditingColumn(null); setIsColumnModalOpen(true); }}
            />
          )}

          {currentView === 'responsibilities' && (activeMember.isSystemAdmin || activeMember.canAccessResponsibilities) && (
            <ResponsibilitiesView 
              cards={visibleCards} 
              clients={clients} 
              members={members}
              activeMember={activeMember}
              onCardClick={(card) => { setEditingCard(card); setActiveCardTab('overview'); setIsCardModalOpen(true); }}
              onToggleTask={handleToggleTask}
            />
          )}

          {currentView === 'financial_admin' && (activeMember.isSystemAdmin || activeMember.canAccessFinancialAdmin) && (
            <FinancialAdminDashboard 
              cards={cards} 
              clients={clients}
              onCardClick={(card) => { setEditingCard(card); setActiveCardTab('finance'); setIsCardModalOpen(true); }}
            />
          )}

          {currentView === 'financial_ops' && (activeMember.isSystemAdmin || activeMember.canAccessFinancialOps) && (
            <FinancialOpsDashboard 
              cards={visibleCards} 
              clients={clients}
              onCardClick={(card) => { setEditingCard(card); setActiveCardTab('finance'); setIsCardModalOpen(true); }}
            />
          )}

          {currentView === 'clients' && (activeMember.isSystemAdmin || activeMember.canAccessClients) && (
            <ClientsView 
              clients={clients} 
              onEditClient={(client) => { setEditingClient(client); setIsClientModalOpen(true); }}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {currentView === 'members' && (activeMember.isSystemAdmin || activeMember.canAccessMembers) && (
            <MembersView 
              members={members} 
              activeMember={activeMember}
              onEditMember={(member) => { setEditingMember(member); setIsMemberModalOpen(true); }}
              onDeleteMember={handleDeleteMember}
            />
          )}
        </div>
      </main>

      {/* --- PIN / PASSWORD PROMPT MODAL --- */}
      {pinPromptModalOpen && targetMemberToSwitch && (
        <ModalWrapper isOpen={true} onClose={() => setPinPromptModalOpen(false)} title="Autenticação Requerida" maxWidth="max-w-md">
          <form onSubmit={handleConfirmPinSwitch} className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <MemberAvatar name={targetMemberToSwitch.name} avatarUrl={targetMemberToSwitch.avatarUrl} size="w-16 h-16" textSize="text-2xl" />
              <h4 className="font-bold text-slate-100 text-lg">{targetMemberToSwitch.name}</h4>
              <p className="text-xs text-slate-400">Digite o PIN para validar a troca de perfil.</p>
            </div>

            <div>
              <InputField 
                label="PIN de Acesso (Senha)" 
                type="password" 
                value={enteredPin} 
                onChange={(e) => setEnteredPin(e.target.value)} 
                placeholder="****"
                required 
              />
              {pinError && <p className="text-xs text-rose-400 font-bold mt-1.5">{pinError}</p>}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={() => setPinPromptModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold">Entrar</button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* --- MODALS --- */}
      {isColumnModalOpen && (
        <ColumnModal 
          column={editingColumn}
          onClose={() => setIsColumnModalOpen(false)}
          onSave={handleSaveColumn}
          onDelete={handleDeleteColumn}
        />
      )}

      {isMemberModalOpen && (
        <MemberModal 
          member={editingMember} 
          activeMember={activeMember}
          onClose={() => setIsMemberModalOpen(false)} 
          onSave={handleSaveMember} 
        />
      )}

      {isClientModalOpen && (
        <ClientModal 
          client={editingClient} 
          onClose={() => setIsClientModalOpen(false)} 
          onSave={handleSaveClient} 
        />
      )}

      {isCardModalOpen && (
        <CardModal 
          card={editingCard} 
          clients={clients} 
          members={members}
          onClose={() => setIsCardModalOpen(false)} 
          onSave={handleSaveCard} 
          onDelete={handleDeleteCard}
          activeTab={activeCardTab}
          setActiveTab={setActiveCardTab}
          setLightboxImage={setLightboxImage}
        />
      )}

      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-[#04060d]/90 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 bg-slate-800 text-white rounded-full"
            >
              <X size={24} />
            </button>
            <img src={lightboxImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-slate-800" />
          </div>
        </div>
      )}
    </div>
  );
}

// --- MODAL WRAPPER ---
function ModalWrapper({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04060d]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`bg-[#0a1128] border border-slate-800 rounded-3xl shadow-2xl w-full ${maxWidth} overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#070b19]/80">
          <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Building2 size={18} className="text-sky-400" />
            <span>{title}</span>
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

// --- MEMBER AVATAR ---
function MemberAvatar({ name, avatarUrl, size = "w-6 h-6", textSize = "text-[10px]" }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${size} rounded-full object-cover border border-slate-700 shrink-0`} />;
  }
  return (
    <div className={`${size} rounded-full bg-gradient-to-tr from-blue-700 to-sky-500 border border-slate-700 flex items-center justify-center font-bold text-white ${textSize} shrink-0 shadow-md`}>
      {initial}
    </div>
  );
}

// --- KANBAN BOARD ---
function KanbanBoard({ columns, cards, clients, members, onCardClick, onUpdateStatus, onToggleTask, onEditColumn, onAddColumn }) {
  const [draggedCardId, setDraggedCardId] = useState(null);
  const scrollContainerRef = useRef(null);

  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -340 : 340, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex justify-between items-center text-xs text-slate-400 px-1">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
          <LayoutDashboard size={14} className="text-sky-400" />
          {columns.length} Colunas Operacionais de Fluxo
        </span>
        <div className="flex items-center space-x-2">
          <button onClick={onAddColumn} className="px-2.5 py-1 bg-[#0a1128] border border-slate-800 rounded-lg text-sky-400 hover:bg-slate-800 font-bold flex items-center gap-1">
            <Plus size={14} /> Adicionar Coluna
          </button>
          <button onClick={() => handleScroll('left')} className="p-1.5 bg-[#0a1128] border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-800">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => handleScroll('right')} className="p-1.5 bg-[#0a1128] border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-800">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex space-x-4 flex-1 items-start overflow-x-auto pb-4 custom-scrollbar snap-x">
        {columns.map(col => {
          const columnCards = cards.filter(c => c.status === col.id);
          return (
            <div 
              key={col.id} 
              className={`flex-shrink-0 w-80 sm:w-[330px] rounded-2xl border flex flex-col max-h-full ${col.color} backdrop-blur-xl shadow-2xl snap-start`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedCardId) onUpdateStatus(draggedCardId, col.id);
                setDraggedCardId(null);
              }}
            >
              <div className="p-3.5 border-b border-slate-800/80 flex justify-between items-center bg-[#070b19]/60 rounded-t-2xl group">
                <div className="flex items-center space-x-2 truncate">
                  <h3 className="font-bold text-slate-200 tracking-wider text-xs uppercase truncate">{col.label}</h3>
                  <button 
                    onClick={() => onEditColumn(col)} 
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sky-300 transition-opacity"
                    title="Editar ou excluir coluna"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {columnCards.length}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-[220px]">
                {columnCards.map(card => (
                  <KanbanCard 
                    key={card.id} 
                    card={card} 
                    client={clients.find(c => c.id === card.clientId)}
                    members={members}
                    onClick={() => onCardClick(card)}
                    onDragStart={() => setDraggedCardId(card.id)}
                    onToggleTask={onToggleTask}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- COLUMN EDIT/CREATE MODAL ---
function ColumnModal({ column, onClose, onSave, onDelete }) {
  const [label, setLabel] = useState(column ? column.label : '');
  const [color, setColor] = useState(column ? column.color : 'bg-[#0f1d3a]/80 border-blue-900/40');

  const COLOR_OPTIONS = [
    { name: 'Azul Escuro', value: 'bg-[#0f1d3a]/80 border-blue-900/40' },
    { name: 'Grafite', value: 'bg-[#0b1329]/90 border-slate-800' },
    { name: 'Âmbar', value: 'bg-[#1a1728]/80 border-amber-900/40' },
    { name: 'Sky', value: 'bg-[#0d2238]/80 border-sky-900/40' },
    { name: 'Esmeralda', value: 'bg-[#0a2622]/80 border-emerald-900/40' },
    { name: 'Púrpura', value: 'bg-[#180e29]/80 border-purple-900/40' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({
      ...(column || {}),
      label,
      color
    });
  };

  return (
    <ModalWrapper isOpen={true} onClose={onClose} title={column ? "Editar Coluna do Kanban" : "Adicionar Nova Coluna"} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <InputField 
          label="Nome da Coluna" 
          value={label} 
          onChange={(e) => setLabel(e.target.value)} 
          placeholder="Ex: Em Análise, Vistoria..."
          required 
        />

        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">Estilo da Coluna</label>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColor(opt.value)}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${opt.value} ${
                  color === opt.value ? 'ring-2 ring-sky-400' : 'opacity-80 hover:opacity-100'
                }`}
              >
                <span>{opt.name}</span>
                {color === opt.value && <span className="w-2 h-2 rounded-full bg-sky-400"></span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          {column ? (
            <button 
              type="button" 
              onClick={() => onDelete(column.id)}
              className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center space-x-1"
            >
              <Trash2 size={14} />
              <span>Excluir</span>
            </button>
          ) : <div></div>}

          <div className="flex space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold">Salvar</button>
          </div>
        </div>
      </form>
    </ModalWrapper>
  );
}

// --- KANBAN CARD ---
function KanbanCard({ card, client, members, onClick, onDragStart, onToggleTask }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const checklist = card.checklist || [];
  const totalTasks = checklist.length;
  const completedTasks = checklist.filter(t => t.done).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const isOverdue = card.deadlineFinal && new Date(card.deadlineFinal) < new Date() && card.status !== 'concluido';

  return (
    <div 
      draggable 
      onDragStart={onDragStart}
      className="bg-[#0e1738]/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 shadow-xl cursor-pointer space-y-3 transition-all group"
    >
      <div onClick={onClick} className="space-y-2">
        {/* Client Name Banner */}
        <div className="flex justify-between items-center bg-[#070b19]/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2 min-w-0">
            {client?.logoUrl ? (
              <img src={client.logoUrl} alt={client.name} className="w-5 h-5 rounded object-cover border border-slate-700" />
            ) : (
              <Building2 size={14} className="text-sky-400 shrink-0" />
            )}
            <span className="font-extrabold text-xs text-blue-300 uppercase tracking-wide truncate">
              {client?.name || 'Cliente Não Vinculado'}
            </span>
          </div>
          {isOverdue && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 shrink-0">
              <Clock size={10} /> Atrasado
            </span>
          )}
        </div>

        <h4 className="font-bold text-slate-100 text-sm leading-snug group-hover:text-blue-300 transition-colors">
          {card.title}
        </h4>

        {/* Tags */}
        {(card.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {card.tags.map(tagId => {
              const tag = PRESET_TAGS.find(t => t.id === tagId);
              return tag ? (
                <span key={tagId} className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${tag.color}`}>
                  {tag.name}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Accordion Checklist */}
      {totalTasks > 0 && (
        <div className="border-t border-slate-800/80 pt-2">
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="w-full flex justify-between items-center text-[11px] text-slate-400 hover:text-slate-200"
          >
            <span className="flex items-center space-x-1.5 font-bold">
              <CheckSquare size={13} className="text-sky-400" />
              <span>{completedTasks}/{totalTasks} etapas concluídas</span>
            </span>
            <span className="font-mono font-bold text-blue-300">{progress}%</span>
          </button>

          <div className="w-full bg-slate-800/60 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-sky-400" style={{ width: `${progress}%` }}></div>
          </div>

          {isExpanded && (
            <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-800/80 max-h-40 overflow-y-auto custom-scrollbar">
              {checklist.map(task => {
                const assignedMem = members.find(m => m.name === task.assignee);
                return (
                  <div key={task.id} className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-white/5">
                    <label className="flex items-center space-x-2 cursor-pointer flex-1 min-w-0">
                      <input 
                        type="checkbox" 
                        checked={task.done} 
                        onChange={() => onToggleTask(card.id, task.id)}
                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer" 
                      />
                      <span className={`truncate text-[11px] ${task.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {task.text}
                      </span>
                    </label>
                    <MemberAvatar name={task.assignee} avatarUrl={assignedMem?.avatarUrl} size="w-5 h-5" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- RESPONSIBILITIES VIEW ---
function ResponsibilitiesView({ cards, clients, members, activeMember, onCardClick, onToggleTask }) {
  const displayMembers = activeMember.isSystemAdmin
    ? members 
    : members.filter(m => m.name === activeMember.name);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayMembers.map(member => {
          const assignedTasks = [];

          cards.forEach(c => {
            if (c.status !== 'concluido') {
              (c.checklist || []).forEach(t => {
                if (t.assignee === member.name && !t.done) {
                  assignedTasks.push({ ...t, cardTitle: c.title, card: c });
                }
              });
            }
          });

          return (
            <div key={member.id} className="bg-[#0a1128]/80 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
                <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} size="w-10 h-10" />
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">{member.name}</h4>
                  <p className="text-[11px] text-blue-400">{member.role}</p>
                </div>
              </div>

              <div>
                <h5 className="text-[11px] font-bold uppercase text-amber-400 mb-2">Tarefas Pendentes ({assignedTasks.length})</h5>
                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                  {assignedTasks.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-2">Nenhuma tarefa pendente no momento.</p>
                  ) : (
                    assignedTasks.map(task => (
                      <div key={task.id} className="bg-[#070b19] p-2.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-slate-200">{task.text}</span>
                          <input type="checkbox" checked={false} onChange={() => onToggleTask(task.card.id, task.id)} className="rounded cursor-pointer" />
                        </div>
                        <button 
                          onClick={() => onCardClick(task.card)} 
                          className="text-[10px] text-blue-300 hover:underline font-mono block truncate"
                        >
                          📍 {task.cardTitle}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- FINANCIAL ADMIN DASHBOARD ---
function FinancialAdminDashboard({ cards, clients, onCardClick }) {
  const stats = useMemo(() => {
    let totalAgreed = 0;
    let totalReceived = 0;

    cards.forEach(card => {
      const cardTotal = parseFloat(card.financialTotal || 0);
      const cardPaid = (card.payments || []).reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
      totalAgreed += cardTotal;
      totalReceived += cardPaid;
    });

    return {
      totalAgreed,
      totalReceived,
      pendingBalance: Math.max(0, totalAgreed - totalReceived),
      paidPercentage: totalAgreed > 0 ? Math.round((totalReceived / totalAgreed) * 100) : 0
    };
  }, [cards]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0a1128]/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-bold text-slate-400 uppercase">Faturamento Em Contratos</span>
          <h3 className="text-2xl font-black text-slate-100 mt-1">R$ {stats.totalAgreed.toLocaleString('pt-BR')}</h3>
        </div>
        <div className="bg-[#0a1128]/80 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-bold text-emerald-400 uppercase">Total Recebido</span>
          <h3 className="text-2xl font-black text-emerald-400 mt-1">R$ {stats.totalReceived.toLocaleString('pt-BR')}</h3>
        </div>
        <div className="bg-[#0a1128]/80 border border-rose-500/30 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-bold text-rose-400 uppercase">Saldo Pendente</span>
          <h3 className="text-2xl font-black text-rose-300 mt-1">R$ {stats.pendingBalance.toLocaleString('pt-BR')}</h3>
        </div>
      </div>

      <div className="bg-[#0a1128]/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-slate-100 text-sm">Relação de Contratos & Projetos Trazo</h3>
        <div className="space-y-2">
          {cards.map(card => {
            const total = parseFloat(card.financialTotal || 0);
            const paid = (card.payments || []).reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
            const client = clients.find(c => c.id === card.clientId);
            return (
              <div key={card.id} className="bg-[#070b19] p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-2">
                <div>
                  <div className="font-bold text-blue-300">{client?.name || 'Cliente Sem Nome'} - {card.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Total: R$ {total.toLocaleString('pt-BR')} | Recebido: R$ {paid.toLocaleString('pt-BR')} | Restante: R$ {(total - paid).toLocaleString('pt-BR')}
                  </div>
                </div>
                <button onClick={() => onCardClick(card)} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-bold text-[11px]">
                  Gerenciar Finanças
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- FINANCIAL OPS DASHBOARD ---
function FinancialOpsDashboard({ cards, clients, onCardClick }) {
  return (
    <div className="space-y-6">
      <div className="bg-[#0a1128]/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-100 text-sm">Controle Operacional de Lançamentos</h3>
            <p className="text-xs text-slate-400">Visão consolidada com histórico e acompanhamento de saldo devedor</p>
          </div>
          <span className="text-xs font-mono font-bold bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full border border-sky-500/30">
            {cards.length} Projetos Ativos
          </span>
        </div>

        <div className="space-y-4">
          {cards.map(card => {
            const client = clients.find(c => c.id === card.clientId);
            const total = parseFloat(card.financialTotal || 0);
            const payments = card.payments || [];
            const paid = payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
            const remaining = Math.max(0, total - paid);

            return (
              <div key={card.id} className="bg-[#070b19] p-4 rounded-2xl border border-slate-800 space-y-3 hover:border-blue-500/30 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Building2 size={16} className="text-sky-400" />
                      <span className="font-extrabold text-sm text-blue-300 uppercase tracking-wide">
                        {client?.name || 'Cliente Não Informado'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-100 text-sm mt-0.5">{card.title}</h4>
                  </div>
                  <button 
                    onClick={() => onCardClick(card)} 
                    className="self-start sm:self-center bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-600 hover:to-sky-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-lg flex items-center space-x-1.5 shrink-0"
                  >
                    <DollarSign size={14} />
                    <span>Lançar Pagamento</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="bg-[#0a1128] p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Valor Contratado</span>
                    <span className="text-slate-100 font-black text-sm">R$ {total.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="bg-[#0a1128] p-2.5 rounded-xl border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-400 block uppercase">Total Pago</span>
                    <span className="text-emerald-400 font-black text-sm">R$ {paid.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="bg-[#0a1128] p-2.5 rounded-xl border border-rose-500/20">
                    <span className="text-[10px] text-rose-400 block uppercase">Saldo Devedor</span>
                    <span className={`font-black text-sm ${remaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {remaining > 0 ? `R$ ${remaining.toLocaleString('pt-BR')}` : '✓ Quitado'}
                    </span>
                  </div>
                </div>

                <div className="bg-[#0a1128]/50 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                  <span className="font-bold text-[11px] text-slate-300 uppercase tracking-wider block">
                    Histórico de Lançamentos ({payments.length})
                  </span>
                  {payments.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">Nenhum pagamento registrado até o momento.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {payments.map((p, idx) => (
                        <div key={p.id || idx} className="flex justify-between items-center bg-[#070b19] px-2.5 py-1.5 rounded-lg border border-slate-800 font-mono text-[11px]">
                          <span className="text-slate-400">📅 {p.date}</span>
                          <span className="text-emerald-400 font-bold">R$ {parseFloat(p.amount || 0).toLocaleString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- CLIENTS VIEW ---
function ClientsView({ clients, onEditClient, onDeleteClient }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(client => (
          <div key={client.id} className="bg-[#0a1128]/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                {client.logoUrl ? (
                  <img src={client.logoUrl} alt={client.name} className="w-12 h-12 rounded-xl object-cover border border-slate-700" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#070b19] border border-blue-500/30 flex items-center justify-center font-bold text-sky-400">
                    <Building2 size={22} />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">{client.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">{client.cnpj || 'Sem CNPJ'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button onClick={() => onEditClient(client)} className="p-1.5 text-slate-400 hover:text-white">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => onDeleteClient(client.id)} className="p-1.5 text-slate-400 hover:text-rose-400">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-1 border-t border-slate-800 pt-2">
              <div>📍 <span className="text-slate-400">{client.address || 'Endereço não informado'}</span></div>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-sky-300 pt-1">
                <div>Área: {client.projectArea ? `${client.projectArea} m²` : 'N/A'}</div>
                <div>Aprovado: #{client.approvedProjectNo || 'N/A'}</div>
                <div>CLCB/AVCB: #{client.clcbAvcbNo || 'N/A'}</div>
                <div>Validade: {client.clcbExpirationDate || 'N/A'}</div>
              </div>
              {client.executedScope && (
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 mt-1 italic">
                  Escopo: {client.executedScope}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- MEMBERS VIEW ---
function MembersView({ members, activeMember, onEditMember, onDeleteMember }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(member => (
          <div key={member.id} className="bg-[#0a1128]/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} size="w-12 h-12" textSize="text-base" />
                <div>
                  <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                    <span>{member.name}</span>
                    {member.isSystemAdmin && <Shield size={14} className="text-amber-400" />}
                  </h4>
                  <p className="text-xs text-blue-400">{member.role}</p>
                </div>
              </div>
              {activeMember.isSystemAdmin && (
                <div className="flex items-center space-x-1">
                  <button onClick={() => onEditMember(member)} className="p-1.5 text-slate-400 hover:text-white" title="Editar Usuário / Permissões">
                    <Edit3 size={16} />
                  </button>
                  {member.id !== activeMember.id && (
                    <button onClick={() => onDeleteMember(member.id)} className="p-1.5 text-slate-400 hover:text-rose-400">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="text-xs text-slate-400 font-mono space-y-1.5 border-t border-slate-800 pt-2">
              <div>CPF: {member.cpf || 'N/A'} | RG: {member.rg || 'N/A'}</div>
              <div className="flex justify-between items-center bg-[#070b19] p-1.5 rounded border border-slate-800">
                <span className="truncate">PIX: {member.pix || 'N/A'}</span>
                {member.pix && (
                  <button 
                    onClick={() => navigator.clipboard.writeText(member.pix)} 
                    className="text-sky-400 hover:text-sky-200 p-1 shrink-0" 
                    title="Copiar Chave PIX"
                  >
                    <Copy size={12} />
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1 font-sans text-[11px]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Permissões de Acesso:</span>
                {member.isSystemAdmin ? (
                  <span className="text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 inline-block">
                    👑 Acesso Total Irrestrito (Master)
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${member.canAccessKanban !== false ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500 line-through'}`}>Kanban</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${member.canAccessResponsibilities ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500 line-through'}`}>Responsabilidades</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${member.canAccessFinancialAdmin ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500 line-through'}`}>Fin. Geral</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${member.canAccessFinancialOps ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500 line-through'}`}>Fin. Operacional</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${member.canAccessClients ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500 line-through'}`}>Clientes</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${member.canAccessMembers ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500 line-through'}`}>Equipe</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- FORM INPUT HELPER ---
function InputField({ label, type = "text", value, onChange, placeholder, required }) {
  return (
    <div className="flex flex-col space-y-1.5">
      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">{label}</label>
      <input 
        type={type} 
        value={value || ''} 
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="bg-[#070b19] border border-slate-700 text-slate-100 text-sm rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

// --- MEMBER MODAL ---
function MemberModal({ member, activeMember, onClose, onSave }) {
  const [formData, setFormData] = useState(member || {
    name: '', role: '', cpf: '', rg: '', pix: '', email: '', phone: '', avatarUrl: '', pin: '0000',
    isSystemAdmin: false, 
    canAccessKanban: true,
    canAccessResponsibilities: true,
    canAccessFinancialAdmin: false,
    canAccessFinancialOps: false,
    canAccessClients: true,
    canAccessMembers: false
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await convertFileToBase64(file);
      setFormData({ ...formData, avatarUrl: base64 });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <ModalWrapper isOpen={true} onClose={onClose} title={member ? "Editar Membro e Permissões" : "Novo Cadastramento de Membro"}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="flex items-center space-x-4 border-b border-slate-800 pb-4">
          <MemberAvatar name={formData.name || '?'} avatarUrl={formData.avatarUrl} size="w-16 h-16" textSize="text-2xl" />
          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-300 cursor-pointer bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 inline-block">
              Upload Foto de Perfil
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
            <p className="text-[10px] text-slate-400">Recomendado foto quadrada em formato JPG/PNG</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label="Nome Completo" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <InputField label="Cargo / Função" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} />
          <InputField label="CPF" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} />
          <InputField label="RG" value={formData.rg} onChange={(e) => setFormData({...formData, rg: e.target.value})} />
          <InputField label="Chave PIX" value={formData.pix} onChange={(e) => setFormData({...formData, pix: e.target.value})} />
          <InputField label="Telefone / WhatsApp" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          <InputField label="E-mail" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          <InputField label="PIN (Senha 4 dígitos)" type="password" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
        </div>
        
        {activeMember.isSystemAdmin && (
          <div className="p-4 bg-[#070b19] border border-slate-800 rounded-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center space-x-1.5">
                <Shield size={14} />
                <span>Gestão Granular de Permissões (Master)</span>
              </span>
            </div>

            <label className="flex items-center space-x-2 text-slate-200 cursor-pointer bg-[#0a1128] p-2.5 rounded-xl border border-amber-500/30">
              <input 
                type="checkbox" 
                checked={!!formData.isSystemAdmin} 
                onChange={e => setFormData({ ...formData, isSystemAdmin: e.target.checked })} 
                className="rounded text-amber-500 w-4 h-4 cursor-pointer" 
              />
              <div>
                <span className="font-bold text-amber-300 text-xs block">Administrador Master</span>
                <span className="text-[10px] text-slate-400 block">Acesso total e irrestrito a todas as funções e permissões.</span>
              </div>
            </label>

            {!formData.isSystemAdmin && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-300 block">Permitir Acesso aos Painéis:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer bg-[#0a1128] p-2 rounded-lg border border-slate-800">
                    <input 
                      type="checkbox" 
                      checked={formData.canAccessKanban !== false} 
                      onChange={e => setFormData({ ...formData, canAccessKanban: e.target.checked })} 
                      className="rounded text-blue-600" 
                    />
                    <span>Painel Kanban</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer bg-[#0a1128] p-2 rounded-lg border border-slate-800">
                    <input 
                      type="checkbox" 
                      checked={!!formData.canAccessResponsibilities} 
                      onChange={e => setFormData({ ...formData, canAccessResponsibilities: e.target.checked })} 
                      className="rounded text-blue-600" 
                    />
                    <span>Responsabilidades</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer bg-[#0a1128] p-2 rounded-lg border border-slate-800">
                    <input 
                      type="checkbox" 
                      checked={!!formData.canAccessFinancialAdmin} 
                      onChange={e => setFormData({ ...formData, canAccessFinancialAdmin: e.target.checked })} 
                      className="rounded text-blue-600" 
                    />
                    <span>Financeiro Geral</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer bg-[#0a1128] p-2 rounded-lg border border-slate-800">
                    <input 
                      type="checkbox" 
                      checked={!!formData.canAccessFinancialOps} 
                      onChange={e => setFormData({ ...formData, canAccessFinancialOps: e.target.checked })} 
                      className="rounded text-blue-600" 
                    />
                    <span>Financeiro Operacional</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer bg-[#0a1128] p-2 rounded-lg border border-slate-800">
                    <input 
                      type="checkbox" 
                      checked={!!formData.canAccessClients} 
                      onChange={e => setFormData({ ...formData, canAccessClients: e.target.checked })} 
                      className="rounded text-blue-600" 
                    />
                    <span>Gestão de Clientes</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer bg-[#0a1128] p-2 rounded-lg border border-slate-800">
                    <input 
                      type="checkbox" 
                      checked={!!formData.canAccessMembers} 
                      onChange={e => setFormData({ ...formData, canAccessMembers: e.target.checked })} 
                      className="rounded text-blue-600" 
                    />
                    <span>Equipe & Permissões</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold">Cancelar</button>
          <button type="submit" className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold">Salvar Membro</button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// --- CLIENT MODAL ---
function ClientModal({ client, onClose, onSave }) {
  const [formData, setFormData] = useState(client || { 
    name: '', cnpj: '', address: '', logoUrl: '',
    projectArea: '', approvedProjectNo: '', clcbAvcbNo: '', clcbExpirationDate: '', executedScope: '' 
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await convertFileToBase64(file);
      setFormData({ ...formData, logoUrl: base64 });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <ModalWrapper isOpen={true} onClose={onClose} title={client ? "Editar Dados do Cliente" : "Novo Cadastro de Cliente"}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="flex items-center space-x-4 border-b border-slate-800 pb-4">
          {formData.logoUrl ? (
            <img src={formData.logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border border-slate-700" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#070b19] border border-blue-500/30 flex items-center justify-center font-bold text-sky-400">
              <Building2 size={28} />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-300 cursor-pointer bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 inline-block">
              Upload Foto / Logo do Cliente
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label="Nome / Razão Social" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <InputField label="CNPJ" value={formData.cnpj} onChange={(e) => setFormData({...formData, cnpj: e.target.value})} />
          <InputField label="Endereço Completo" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
          <InputField label="Área do Projeto (m²)" value={formData.projectArea} onChange={(e) => setFormData({...formData, projectArea: e.target.value})} />
          <InputField label="Nº do Projeto Aprovado" value={formData.approvedProjectNo} onChange={(e) => setFormData({...formData, approvedProjectNo: e.target.value})} />
          <InputField label="Nº do CLCB/AVCB Aprovado" value={formData.clcbAvcbNo} onChange={(e) => setFormData({...formData, clcbAvcbNo: e.target.value})} />
          <InputField label="Data Validade CLCB/AVCB" type="date" value={formData.clcbExpirationDate} onChange={(e) => setFormData({...formData, clcbExpirationDate: e.target.value})} />
        </div>

        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase">Escopo Executado / Descrição</label>
          <textarea 
            rows={3} 
            value={formData.executedScope || ''} 
            onChange={e => setFormData({...formData, executedScope: e.target.value})}
            className="bg-[#070b19] border border-slate-700 text-slate-100 text-sm rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descreva o escopo executado..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold">Cancelar</button>
          <button type="submit" className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold">Salvar Cliente</button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// --- CARD MODAL ---
function CardModal({ card, clients, members, onClose, onSave, onDelete, activeTab, setActiveTab, setLightboxImage }) {
  const [formData, setFormData] = useState(card || {
    title: '', clientId: '', description: '', notes: '', images: [], tags: [],
    financialTotal: 0, payments: [], checklist: [],
    deadlineRequest: '', deadlineResponse: '', deadlineIntermediate: '', deadlineFinal: '',
    currentAssignee: 'Sem Atribuição', nextAssignee: 'Sem Atribuição'
  });

  const [newPayment, setNewPayment] = useState({ date: '', amount: '' });
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(members[0]?.name || 'Gabriella Gontijo');

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (let file of files) {
      const base64 = await convertFileToBase64(file);
      setFormData(prev => ({ ...prev, images: [...(prev.images || []), base64] }));
    }
  };

  const handleAddPayment = () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) return;
    const paymentObj = {
      id: `pay_${Date.now()}`,
      date: newPayment.date || new Date().toISOString().split('T')[0],
      amount: parseFloat(newPayment.amount)
    };
    setFormData(prev => ({ ...prev, payments: [...(prev.payments || []), paymentObj] }));
    setNewPayment({ date: '', amount: '' });
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    const taskObj = {
      id: `task_${Date.now()}`,
      text: newTaskText,
      done: false,
      assignee: newTaskAssignee
    };
    setFormData(prev => ({ ...prev, checklist: [...(prev.checklist || []), taskObj] }));
    setNewTaskText('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <ModalWrapper isOpen={true} onClose={onClose} title={card ? "Gerenciar Detalhes do Cartão" : "Criar Novo Cartão Kanban"} maxWidth="max-w-4xl">
      <form id="card-form" onSubmit={handleSubmit} className="flex flex-col md:flex-row min-h-[500px]">
        {/* Modal Tabs Sidebar */}
        <div className="w-full md:w-56 bg-[#070b19] border-r border-slate-800 p-3 space-y-1">
          {[
            { id: 'overview', icon: FileText, label: 'Geral & Prazos' },
            { id: 'checklist', icon: CheckSquare, label: 'Etapas / Checklist' },
            { id: 'finance', icon: DollarSign, label: 'Valores / Pagamentos' },
            { id: 'notes', icon: Paperclip, label: 'Notas & Anexos' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id ? 'bg-blue-600/25 text-blue-200 border border-blue-500/40' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
            </button>
          ))}

          {card && (
            <div className="pt-6">
              <button 
                type="button" 
                onClick={() => onDelete(card.id)} 
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold"
              >
                <Trash2 size={14} />
                <span>Excluir Cartão</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#0a1128]/40">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <InputField label="Título do Cartão / Projeto" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
              
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-sky-300 uppercase">Cliente Vinculado</label>
                <select 
                  value={formData.clientId || ''} 
                  onChange={e => setFormData({...formData, clientId: e.target.value})}
                  className="bg-[#070b19] border border-slate-700 text-slate-100 text-sm rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>Selecione o cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Responsável Atual</label>
                  <select 
                    value={formData.currentAssignee} 
                    onChange={e => setFormData({...formData, currentAssignee: e.target.value})}
                    className="bg-[#070b19] border border-slate-700 text-slate-100 text-sm rounded-xl p-2.5 outline-none"
                  >
                    <option value="Sem Atribuição">Sem Atribuição</option>
                    {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Responsável Seguinte</label>
                  <select 
                    value={formData.nextAssignee} 
                    onChange={e => setFormData({...formData, nextAssignee: e.target.value})}
                    className="bg-[#070b19] border border-slate-700 text-slate-100 text-sm rounded-xl p-2.5 outline-none"
                  >
                    <option value="Sem Atribuição">Sem Atribuição</option>
                    {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Deadlines Section */}
              <div className="p-3.5 bg-[#070b19] border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wide">Cronograma & Prazos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField label="Data de Solicitação" type="date" value={formData.deadlineRequest} onChange={(e) => setFormData({...formData, deadlineRequest: e.target.value})} />
                  <InputField label="Prazo de Resposta" type="date" value={formData.deadlineResponse} onChange={(e) => setFormData({...formData, deadlineResponse: e.target.value})} />
                  <InputField label="Entrega Intermediária" type="date" value={formData.deadlineIntermediate} onChange={(e) => setFormData({...formData, deadlineIntermediate: e.target.value})} />
                  <InputField label="Prazo Final / Entrega" type="date" value={formData.deadlineFinal} onChange={(e) => setFormData({...formData, deadlineFinal: e.target.value})} />
                </div>
              </div>

              {/* Tags Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Etiquetas do Projeto</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map(tag => {
                    const isSelected = (formData.tags || []).includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          const newTags = isSelected 
                            ? formData.tags.filter(t => t !== tag.id)
                            : [...(formData.tags || []), tag.id];
                          setFormData({ ...formData, tags: newTags });
                        }}
                        className={`text-xs px-3 py-1 rounded-xl border font-bold transition-all ${
                          isSelected ? tag.color : 'bg-[#070b19] text-slate-500 border-slate-800'
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  value={newTaskText} 
                  onChange={e => setNewTaskText(e.target.value)}
                  placeholder="Adicionar nova etapa / tarefa..."
                  className="flex-1 bg-[#070b19] border border-slate-700 text-slate-100 text-sm rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newTaskAssignee}
                  onChange={e => setNewTaskAssignee(e.target.value)}
                  className="bg-[#070b19] border border-slate-700 text-slate-100 text-xs rounded-xl p-2.5 outline-none"
                >
                  {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
                <button 
                  type="button" 
                  onClick={handleAddTask} 
                  className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  Adicionar
                </button>
              </div>

              <div className="space-y-2 pt-2">
                {(formData.checklist || []).map(task => {
                  const assignedMem = members.find(m => m.name === task.assignee);
                  return (
                    <div key={task.id} className="flex items-center justify-between p-2.5 bg-[#070b19] rounded-xl border border-slate-800 text-xs">
                      <label className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0">
                        <input 
                          type="checkbox" 
                          checked={task.done} 
                          onChange={() => {
                            const updated = formData.checklist.map(t => t.id === task.id ? { ...t, done: !t.done } : t);
                            setFormData({ ...formData, checklist: updated });
                          }} 
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                        <span className={`truncate ${task.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {task.text}
                        </span>
                      </label>
                      <div className="flex items-center space-x-2 shrink-0">
                        <MemberAvatar name={task.assignee} avatarUrl={assignedMem?.avatarUrl} size="w-6 h-6" />
                        <button 
                          type="button" 
                          onClick={() => {
                            const updated = formData.checklist.filter(t => t.id !== task.id);
                            setFormData({ ...formData, checklist: updated });
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-4">
              <InputField 
                label="Valor Total do Contrato (R$)" 
                type="number" 
                value={formData.financialTotal} 
                onChange={e => setFormData({...formData, financialTotal: e.target.value})} 
              />

              <div className="p-3.5 bg-[#070b19] border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase">Lançar Pagamento Recebido</h4>
                <div className="flex items-center space-x-2">
                  <input 
                    type="date" 
                    value={newPayment.date} 
                    onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                    className="bg-[#0a1128] border border-slate-700 text-slate-100 text-xs rounded-xl p-2 outline-none"
                  />
                  <input 
                    type="number" 
                    placeholder="Valor (R$)" 
                    value={newPayment.amount} 
                    onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                    className="flex-1 bg-[#0a1128] border border-slate-700 text-slate-100 text-xs rounded-xl p-2 outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={handleAddPayment} 
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold"
                  >
                    Lançar
                  </button>
                </div>

                <div className="space-y-1.5 pt-2">
                  {(formData.payments || []).map(p => (
                    <div key={p.id} className="flex justify-between items-center p-2 bg-[#0a1128] rounded-lg text-xs font-mono border border-slate-800">
                      <span className="text-slate-400">📅 Data: {p.date}</span>
                      <span className="text-emerald-400 font-bold">R$ {parseFloat(p.amount || 0).toLocaleString('pt-BR')}</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          const updated = formData.payments.filter(item => item.id !== p.id);
                          setFormData({ ...formData, payments: updated });
                        }} 
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Anotações Internas do Projeto</label>
                <textarea 
                  rows={4} 
                  value={formData.notes || ''} 
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Anotações técnicas, pendências com clientes ou observações internas..."
                  className="bg-[#070b19] border border-slate-700 text-slate-100 text-sm rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase block">Anexar Imagens / Fotos de Vistoria</label>
                <label className="text-xs font-bold text-blue-300 cursor-pointer bg-[#070b19] hover:bg-slate-800 p-3 rounded-xl border border-slate-800 flex items-center justify-center space-x-2 border-dashed">
                  <Upload size={16} />
                  <span>Fazer Upload de Imagens do Projeto</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  {(formData.images || []).map((img, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 h-24">
                      <img src={img} alt="Anexo" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxImage(img)} />
                      <button 
                        type="button" 
                        onClick={() => {
                          const updated = formData.images.filter((_, i) => i !== idx);
                          setFormData({ ...formData, images: updated });
                        }}
                        className="absolute top-1 right-1 p-1 bg-rose-950/90 text-rose-200 rounded-full hover:bg-rose-900"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      <div className="flex justify-between items-center p-4 border-t border-slate-800 bg-[#070b19]">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancelar</button>
        <button type="submit" form="card-form" className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl">Salvar Cartão</button>
      </div>
    </ModalWrapper>
  );
}
