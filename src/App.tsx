import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  Plus, Calendar, ChevronLeft, ChevronRight, Clock, BookOpen, 
  BarChart3, LayoutDashboard, Settings, History, X, Trash2,
  Code, Video, GraduationCap, Languages, Brain, Music, Palette, Dumbbell, Coffee
} from 'lucide-react';
import { 
  format, startOfWeek, endOfWeek, eachDayOfInterval, 
  addWeeks, subWeeks, isSameDay, parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StudyType, StudyLog, WeeklyData } from './types';
import { 
  fetchStudyTypes, createStudyType, fetchStudyLogs, 
  logStudyTime, fetchTotalStudyTime, fetchGlobalTotalStudyTime,
  deleteStudyType, deleteStudyLog
} from './services/api';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Code, Video, GraduationCap, Languages, Brain, Music, Palette, Dumbbell, Coffee
};

export default function App() {
  const [studyTypes, setStudyTypes] = useState<StudyType[]>([]);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedType, setSelectedType] = useState<StudyType | null>(null);
  const [totalMinutesDisplay, setTotalMinutesDisplay] = useState<number | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [logMinutes, setLogMinutes] = useState('');
  const [logTypeId, setLogTypeId] = useState('');
  const [logDate, setLogDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#3b82f6');
  const [newTypeIcon, setNewTypeIcon] = useState('BookOpen');

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  useEffect(() => {
    loadData();
  }, [currentWeekStart, selectedType]);

  useEffect(() => {
    if (selectedType) {
      fetchTotalStudyTime(selectedType.id).then(setTotalMinutesDisplay);
    } else {
      fetchGlobalTotalStudyTime().then(setTotalMinutesDisplay);
    }
  }, [selectedType, logs]);

  const loadData = async () => {
    setLoading(true);
    try {
      const types = await fetchStudyTypes();
      setStudyTypes(types);
      
      const startDate = format(currentWeekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      const studyLogs = await fetchStudyLogs(startDate, endDate, selectedType?.id);
      setLogs(studyLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTypeId || !logMinutes || !logDate) return;
    try {
      await logStudyTime(Number(logTypeId), Number(logMinutes), logDate);
      setIsLogModalOpen(false);
      setLogMinutes('');
      loadData();
    } catch (err) {
      alert("Erro ao registrar tempo");
    }
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName) return;
    try {
      await createStudyType(newTypeName, newTypeColor, newTypeIcon);
      setIsTypeModalOpen(false);
      setNewTypeName('');
      loadData();
    } catch (err) {
      alert("Erro ao criar tipo de estudo");
    }
  };

  const handleDeleteType = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este tipo de estudo? Todos os registros associados serão apagados.")) return;
    try {
      await deleteStudyType(id);
      if (selectedType?.id === id) setSelectedType(null);
      loadData();
    } catch (err) {
      alert("Erro ao excluir tipo de estudo");
    }
  };

  const handleDeleteLog = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este registro de tempo?")) return;
    try {
      await deleteStudyLog(id);
      loadData();
    } catch (err) {
      alert("Erro ao excluir registro");
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  const resetWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Prepare chart data
  const days = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
  const chartData: WeeklyData[] = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayLogs = logs.filter(l => l.date === dayStr);
    
    const data: WeeklyData = {
      date: dayStr,
      dayName: format(day, 'EEE', { locale: ptBR }),
      totalMinutes: dayLogs.reduce((acc, curr) => acc + curr.minutes, 0),
    };

    studyTypes.forEach(type => {
      data[type.name] = dayLogs
        .filter(l => l.study_type_id === type.id)
        .reduce((acc, curr) => acc + curr.minutes, 0);
    });

    return data;
  });

  const totalMinutes = logs.reduce((acc, curr) => acc + curr.minutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const typeDistribution = studyTypes.map(type => ({
    name: type.name,
    value: logs.filter(l => l.study_type_id === type.id).reduce((acc, curr) => acc + curr.minutes, 0),
    color: type.color
  })).filter(t => t.value > 0);

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      setSelectedDayDetail(data.activePayload[0].payload.date);
    }
  };

  const dayDetailLogs = selectedDayDetail ? logs.filter(l => l.date === selectedDayDetail) : [];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
            <Clock size={20} />
          </div>
          <h1 className="font-bold text-xl tracking-tight">Cronos</h1>
        </div>

        <nav className="flex flex-col gap-1">
          <button 
            onClick={() => setSelectedType(null)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
              !selectedType ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <LayoutDashboard size={18} />
            Geral
          </button>
          
          <div className="mt-4 mb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Tipos de Estudo
          </div>
          
          {studyTypes.map(type => {
            const IconComp = ICON_MAP[type.icon] || BookOpen;
            const isSelected = selectedType?.id === type.id;
            return (
              <div key={type.id} className="group relative">
                <button 
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                    isSelected ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-center w-5 h-5">
                    <IconComp size={18} style={{ color: isSelected ? 'white' : type.color }} />
                  </div>
                  <span className="flex-1 text-left truncate pr-6">{type.name}</span>
                </button>
                <button 
                  onClick={(e) => handleDeleteType(e, type.id)}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                    isSelected ? "text-white/40 hover:text-white hover:bg-white/10" : "text-slate-300 hover:text-red-500 hover:bg-red-50"
                  )}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          
          <button 
            onClick={() => setIsTypeModalOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all text-sm font-medium mt-2 border border-dashed border-slate-200"
          >
            <Plus size={18} />
            Novo Tipo
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-1">
              {selectedType ? `Estudo: ${selectedType.name}` : "Dashboard Geral"}
            </h2>
            <p className="text-slate-500 font-medium">
              Acompanhe seu progresso e mantenha o foco.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsLogModalOpen(true)}
              className="btn-primary flex items-center gap-2 shadow-lg shadow-slate-900/20"
            >
              <Plus size={18} />
              Lançar Horas
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="card p-6 flex items-center gap-5">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total na Semana</p>
              <p className="text-2xl font-bold text-slate-900">{hours}h {mins}m</p>
            </div>
          </div>

          <div className="card p-6 flex items-center gap-5">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <History size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Histórico</p>
              <p className="text-2xl font-bold text-slate-900">
                {totalMinutesDisplay !== null ? (
                  `${Math.floor(totalMinutesDisplay / 60)}h ${totalMinutesDisplay % 60}m`
                ) : (
                  "Calculando..."
                )}
              </p>
            </div>
          </div>

          <div className="card p-6 flex items-center gap-5">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Média Diária</p>
              <p className="text-2xl font-bold text-slate-900">
                {Math.floor(totalMinutes / 7)}m
              </p>
            </div>
          </div>
        </div>

        {/* Main Dashboard Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-lg">Atividade Semanal</h3>
                  <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200">
                    <button onClick={() => navigateWeek('prev')} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={resetWeek} className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-900">
                      {format(currentWeekStart, 'dd MMM', { locale: ptBR })} - {format(weekEnd, 'dd MMM', { locale: ptBR })}
                    </button>
                    <button onClick={() => navigateWeek('next')} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clique nas barras para detalhes</p>
              </div>

              <div className="h-[350px] w-full cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData} 
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    onClick={handleChartClick}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="dayName" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8f9fa' }}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                      }}
                    />
                    {selectedType ? (
                      <Bar dataKey={selectedType.name} fill={selectedType.color} radius={[6, 6, 0, 0]} barSize={40} />
                    ) : (
                      studyTypes.map(type => (
                        <Bar 
                          key={type.id} 
                          dataKey={type.name} 
                          stackId="a" 
                          fill={type.color} 
                          radius={[0, 0, 0, 0]} 
                          barSize={40} 
                        />
                      ))
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Day Detail View */}
            <AnimatePresence mode="wait">
              {selectedDayDetail && (
                <motion.div 
                  key={selectedDayDetail}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="card p-6 border-slate-900/10 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">
                      Detalhes de {format(parseISO(selectedDayDetail), "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </h3>
                    <button onClick={() => setSelectedDayDetail(null)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-all">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dayDetailLogs.length > 0 ? dayDetailLogs.map(log => {
                      const type = studyTypes.find(t => t.id === log.study_type_id);
                      const IconComp = type ? ICON_MAP[type.icon] : BookOpen;
                      return (
                        <div key={log.id} className="group bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: log.color }}>
                              {IconComp && <IconComp size={14} />}
                            </div>
                            <span className="font-bold text-slate-700">{log.type_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900">{log.minutes}m</span>
                            <button 
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-slate-400 text-sm col-span-2 text-center py-4">Nenhum estudo registrado para este dia.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recent Logs */}
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <History size={20} className="text-slate-400" />
                Registros Recentes
              </h3>
              <div className="space-y-4">
                {logs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    Nenhum registro encontrado para esta semana.
                  </div>
                ) : (
                  logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => {
                    const type = studyTypes.find(t => t.id === log.study_type_id);
                    const IconComp = type ? ICON_MAP[type.icon] : BookOpen;
                    return (
                      <div key={log.id} className="group flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: log.color }}>
                            {IconComp && <IconComp size={18} />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{log.type_name}</p>
                            <p className="text-xs text-slate-500 font-medium">
                              {format(parseISO(log.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-slate-900">{log.minutes} min</p>
                            <p className="text-xs text-slate-400 font-medium">Duração</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Widgets */}
          <div className="space-y-8">
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-6">Distribuição</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/30">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">Foco Total</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  "O sucesso é a soma de pequenos esforços repetidos dia após dia."
                </p>
                <button 
                  onClick={() => setIsLogModalOpen(true)}
                  className="w-full bg-white text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                >
                  Continuar Estudando
                </button>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </main>

      {/* Log Modal */}
      <AnimatePresence>
        {isLogModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLogModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Lançar Tempo</h3>
                <button onClick={() => setIsLogModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleLogTime} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo de Estudo</label>
                  <select 
                    required
                    value={logTypeId}
                    onChange={(e) => setLogTypeId(e.target.value)}
                    className="input-field appearance-none bg-slate-50 border-transparent focus:bg-white focus:border-slate-200"
                  >
                    <option value="">Selecione um tipo...</option>
                    {studyTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Minutos Estudados</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    placeholder="Ex: 45"
                    value={logMinutes}
                    onChange={(e) => setLogMinutes(e.target.value)}
                    className="input-field bg-slate-50 border-transparent focus:bg-white focus:border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data</label>
                  <input 
                    type="date" 
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="input-field bg-slate-50 border-transparent focus:bg-white focus:border-slate-200"
                  />
                </div>

                <button type="submit" className="w-full btn-primary py-4 text-lg shadow-lg shadow-slate-900/20 mt-4">
                  Salvar Registro
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Type Modal */}
      <AnimatePresence>
        {isTypeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTypeModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Novo Tipo de Estudo</h3>
                <button onClick={() => setIsTypeModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateType} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome da Categoria</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Programação, Inglês..."
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="input-field bg-slate-50 border-transparent focus:bg-white focus:border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ícone</label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.keys(ICON_MAP).map(iconName => {
                      const IconComp = ICON_MAP[iconName];
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setNewTypeIcon(iconName)}
                          className={cn(
                            "p-3 rounded-xl border flex items-center justify-center transition-all",
                            newTypeIcon === iconName ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-400 border-transparent hover:border-slate-200"
                          )}
                        >
                          <IconComp size={20} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cor de Identificação</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={newTypeColor}
                      onChange={(e) => setNewTypeColor(e.target.value)}
                      className="w-12 h-12 rounded-xl border-none cursor-pointer overflow-hidden p-0"
                    />
                    <span className="text-sm font-mono text-slate-500 uppercase">{newTypeColor}</span>
                  </div>
                </div>

                <button type="submit" className="w-full btn-primary py-4 text-lg shadow-lg shadow-slate-900/20 mt-4">
                  Criar Categoria
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
