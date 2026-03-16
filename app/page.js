"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Copy, Eye, EyeOff, ExternalLink, Plus, X, Trash2, Image as ImageIcon, Settings, Edit2, Lock, ShieldCheck, Link, FileText, Calendar, Search, Star, ChevronUp, ChevronDown, FolderOpen, FolderPlus, ArrowLeft, Folder, CheckCircle2, Circle, CheckSquare, MoveRight, ArrowDownUp, Menu, Home, ArchiveRestore, AlertOctagon } from 'lucide-react';

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subfolders, setSubfolders] = useState([]); 
  
  const [currentMenu, setCurrentMenu] = useState('home'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  const [filter, setFilter] = useState('전체');
  const [currentSubfolder, setCurrentSubfolder] = useState(null); 
  const [sortOrder, setSortOrder] = useState('desc');
  const [visibleCount, setVisibleCount] = useState(20);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isBatchMoveModalOpen, setIsBatchMoveModalOpen] = useState(false);
  const [batchTargetCat, setBatchTargetCat] = useState('');
  const [batchTargetSub, setBatchTargetSub] = useState('');

  const [showPw, setShowPw] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addStep, setAddStep] = useState('choice');
  const [searchTerm, setSearchTerm] = useState('');

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [authModal, setAuthModal] = useState({ open: false, type: '', target: null });
  const [authInput, setAuthInput] = useState('');

  const [isSubfolderModalOpen, setIsSubfolderModalOpen] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');

  const [clickCount, setClickCount] = useState(0);
  const [zoomedImage, setZoomedImage] = useState(null);

  const [newItem, setNewItem] = useState({
    title: '', category_id: '', subfolder_id: null, type: 'link', url: '', login_id: '', login_pw: '', content: '', image_url: ''
  });

  useEffect(() => { fetchInitialData(); }, []);

  async function fetchInitialData() {
    const { data: catData } = await supabase.from('categories').select('*').order('display_order');
    setCategories(catData || []);
    
    const { data: sfData } = await supabase.from('subfolders').select('*').order('created_at');
    setSubfolders(sfData || []);

    if (catData?.length > 0) {
      setNewItem(prev => ({ ...prev, category_id: catData[0].id }));
    }

    const { data: itemData } = await supabase.from('dashboard_items').select('*');
    setItems(itemData || []);
  }

  const handleTitleClick = () => {
    if (clickCount >= 4) {
      const secretCat = categories.find(c => c.name === '비밀창고');
      if (secretCat) handleCategoryClick(secretCat);
      else alert("쉿! 설정(⚙️)에서 이름이 '비밀창고'인 비밀 카테고리를 먼저 만들어주세요.");
      setClickCount(0);
    } else setClickCount(clickCount + 1);
  };

  const openAddModal = () => {
    setAddStep('choice');
    setIsModalOpen(true);
    const currentCategory = categories.find(c => c.name === filter);
    const defaultCategoryId = currentCategory ? currentCategory.id : (categories.length > 0 ? categories[0].id : '');
    setNewItem({ title: '', category_id: defaultCategoryId, subfolder_id: null, type: 'link', url: '', login_id: '', login_pw: '', content: '', image_url: '' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const fixUrl = (url) => {
    if (!url) return "";
    let trimmedUrl = url.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) return `https://${trimmedUrl}`;
    return trimmedUrl;
  };

  const handleCardClick = (item) => {
    if (currentMenu === 'trash') return;
    if (isSelectMode) {
      if (selectedItems.includes(item.id)) setSelectedItems(selectedItems.filter(id => id !== item.id));
      else setSelectedItems([...selectedItems, item.id]);
    } else {
      setEditingItem({ ...item });
      setIsDetailModalOpen(true);
    }
  };

  const toggleFavorite = async (e, item) => {
    e.stopPropagation();
    const { error } = await supabase.from('dashboard_items').update({ is_favorite: !item.is_favorite }).eq('id', item.id);
    if (!error) fetchInitialData();
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    const updatedUrl = fixUrl(editingItem.url);
    const { error } = await supabase.from('dashboard_items').update({ ...editingItem, url: updatedUrl }).eq('id', editingItem.id);
    if (error) alert('수정 실패!');
    else { setIsDetailModalOpen(false); fetchInitialData(); }
  };

  async function handleAddItem(e) {
    e.preventDefault();
    const finalItem = { ...newItem, url: fixUrl(newItem.url), title: newItem.title || (addStep === 'photo' ? '새 사진' : addStep === 'memo' ? '새 메모' : '새 링크') };
    const { error } = await supabase.from('dashboard_items').insert([finalItem]);
    if (error) alert('저장 실패: ' + error.message);
    else { setIsModalOpen(false); fetchInitialData(); }
  }

  const handleAuthConfirm = async (e) => {
    e.preventDefault();
    if (authInput === authModal.target.password) {
      if (authModal.type === 'view') {
        setFilter(authModal.target.name);
        setCurrentSubfolder(null); 
        setVisibleCount(20); 
      } else if (authModal.type === 'delete') {
        await supabase.from('categories').delete().eq('id', authModal.target.id);
        fetchInitialData();
      } else if (authModal.type === 'edit') setEditingCategory(authModal.target);
      setAuthModal({ open: false, type: '', target: null });
    } else alert("인증에 실패했습니다.");
  };

  const handleCategoryClick = (cat) => {
    setCurrentMenu('home');
    setCurrentSubfolder(null); 
    setVisibleCount(20);
    setIsSelectMode(false); setSelectedItems([]); 
    if (cat.is_private) {
      setAuthModal({ open: true, type: 'view', target: cat });
      setAuthInput('');
    } else setFilter(cat.name);
  };

  const handleCreateSubfolder = async (e) => {
    e.preventDefault();
    const activeCat = categories.find(c => c.name === filter);
    if (!activeCat) return;
    const { error } = await supabase.from('subfolders').insert([{ name: newSubfolderName, category_id: activeCat.id }]);
    if (!error) { setIsSubfolderModalOpen(false); setNewSubfolderName(''); fetchInitialData(); }
  };

  const handleDeleteSubfolder = async (e, id) => {
    e.stopPropagation();
    if (confirm('폴더를 삭제하시겠습니까?\n(폴더 안의 내용물은 카테고 메인으로 빠져나옵니다!)')) {
      await supabase.from('subfolders').delete().eq('id', id);
      fetchInitialData();
    }
  };

  async function handleDeleteCategory(id) {
    const cat = categories.find(c => c.id === id);
    if (cat.is_private) setAuthModal({ open: true, type: 'delete', target: cat });
    else if (confirm('카테고리를 삭제하면 포함된 모든 정보도 삭제됩니다.')) {
      await supabase.from('categories').delete().eq('id', id);
      fetchInitialData();
    }
  }

  const handleEditCategory = (cat) => {
    if (cat.is_private) { setAuthModal({ open: true, type: 'edit', target: cat }); setAuthInput(''); } 
    else setEditingCategory(cat);
  };

  async function handleSaveCategory(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name'); const icon = formData.get('icon') || '📁'; const is_private = formData.get('is_private') === 'on'; const password = formData.get('secret_key');
    if (editingCategory) await supabase.from('categories').update({ name, icon, is_private, password }).eq('id', editingCategory.id);
    else await supabase.from('categories').insert([{ name, icon, is_private, password, display_order: categories.length + 1 }]);
    setEditingCategory(null); e.target.reset(); fetchInitialData();
  }

  async function moveCategory(index, direction) {
    if (index + direction < 0 || index + direction >= categories.length) return;
    const newCategories = [...categories];
    const temp = newCategories[index]; newCategories[index] = newCategories[index + direction]; newCategories[index + direction] = temp;
    setCategories(newCategories);
    await Promise.all(newCategories.map((cat, i) => supabase.from('categories').update({ display_order: i + 1 }).eq('id', cat.id)));
    fetchInitialData();
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]; if (!file) return; setUploading(true);
    let fileExt = 'jpg'; if (file.name && file.name.includes('.')) fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`; const filePath = `uploads/${fileName}`;
    let { error } = await supabase.storage.from('images').upload(filePath, file);
    if (error) alert('업로드 실패: ' + error.message);
    else {
      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      if (isDetailModalOpen) setEditingItem({ ...editingItem, image_url: data.publicUrl });
      else setNewItem({ ...newItem, image_url: data.publicUrl, type: 'image' });
    }
    setUploading(false);
  }

  const handleCopyUrl = (e, url) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => alert('URL이 클립보드에 복사되었습니다! 📋')).catch(err => alert('복사에 실패했습니다.'));
  };

  async function handleSoftDelete(id) {
    if (confirm('휴지통으로 이동하시겠습니까?')) {
      await supabase.from('dashboard_items').update({ is_deleted: true }).eq('id', id);
      setIsDetailModalOpen(false); fetchInitialData();
    }
  }

  async function handleRestore(e, id) {
    e.stopPropagation();
    await supabase.from('dashboard_items').update({ is_deleted: false }).eq('id', id);
    fetchInitialData();
  }

  async function handleHardDelete(e, id) {
    e.stopPropagation();
    if (confirm('영구 삭제하면 다시는 복구할 수 없습니다. 삭제하시겠습니까?')) {
      await supabase.from('dashboard_items').delete().eq('id', id);
      fetchInitialData();
    }
  }

  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) return;
    if (confirm(`선택한 ${selectedItems.length}개의 항목을 휴지통으로 보내시겠습니까?`)) {
      await supabase.from('dashboard_items').update({ is_deleted: true }).in('id', selectedItems);
      setIsSelectMode(false); setSelectedItems([]); fetchInitialData();
    }
  };

  const handleEmptyTrash = async () => {
    if (confirm('휴지통에 있는 모든 항목을 영구 삭제하시겠습니까? (복구 불가)')) {
      await supabase.from('dashboard_items').delete().eq('is_deleted', true);
      fetchInitialData();
    }
  };

  const handleBatchMoveSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;
    const finalSubId = batchTargetSub === '' ? null : batchTargetSub;
    await supabase.from('dashboard_items').update({ category_id: batchTargetCat, subfolder_id: finalSubId }).in('id', selectedItems);
    setIsBatchMoveModalOpen(false); setIsSelectMode(false); setSelectedItems([]); fetchInitialData();
  };

  let processedItems = [...items];

  if (currentMenu === 'trash') {
    const lowerSearch = searchTerm.toLowerCase();
    processedItems = processedItems.filter(item => 
      item.is_deleted && 
      (item.title?.toLowerCase().includes(lowerSearch) || item.content?.toLowerCase().includes(lowerSearch))
    );
  } else {
    processedItems = processedItems.filter(item => {
      if (item.is_deleted) return false;

      const itemCat = categories.find(c => c.id === item.category_id);
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = item.title?.toLowerCase().includes(lowerSearch) || item.content?.toLowerCase().includes(lowerSearch);
      
      if (filter === '★즐겨찾기') return item.is_favorite && matchesSearch;
      if (filter === '전체') return (!itemCat?.is_private && itemCat?.name !== '비밀창고') && matchesSearch;
      if (itemCat?.name === filter) {
        if (currentSubfolder) return item.subfolder_id === currentSubfolder.id && matchesSearch;
        else return item.subfolder_id === null && matchesSearch;
      }
      return false;
    });
  }

  processedItems.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const totalItemsCount = processedItems.length;
  const displayedItems = processedItems.slice(0, visibleCount);

  return (
    <div className="flex h-screen bg-[#020617] text-gray-100 font-sans selection:bg-blue-500/30 overflow-hidden">
      
      <aside className={`fixed md:relative z-50 w-64 h-full bg-[#020617]/95 backdrop-blur-3xl border-r border-white/5 shadow-2xl transition-transform transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}>
        <div className="p-6 pt-14 md:pt-8 flex justify-between items-center">
          <h2 onClick={handleTitleClick} className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500 cursor-pointer">The Archive</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={24}/></button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => { setCurrentMenu('home'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${currentMenu === 'home' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Home size={20} /> 메인
          </button>
          <button 
            onClick={() => { setCurrentMenu('trash'); setCurrentSubfolder(null); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${currentMenu === 'trash' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Trash2 size={20} /> 휴지통
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={() => { setIsCategoryModalOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all">
            <Settings size={20} /> 카테고리 및 설정
          </button>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto relative bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pb-32 no-scrollbar">
        
        <header className="sticky top-0 z-30 flex flex-col items-center pt-4 md:pt-8 pb-4 bg-[#020617]/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl w-full px-4">
          
          <div className="flex justify-between items-center w-full max-w-5xl mb-4 md:hidden">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors"><Menu size={24} /></button>
            <h1 onClick={handleTitleClick} className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 drop-shadow-[0_10px_20px_rgba(255,255,255,0.15)] cursor-pointer select-none active:scale-95 transition-transform text-center flex-1">The Archive</h1>
            <div className="w-10"></div> 
          </div>

          {currentMenu === 'home' ? (
            <div className="flex justify-start md:justify-center items-center gap-2 w-[calc(100%+2rem)] md:w-full max-w-5xl overflow-x-auto no-scrollbar py-3 px-4 md:px-0 -mx-4 md:mx-0">
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setFilter('전체'); setCurrentSubfolder(null); setVisibleCount(20); }} className={`px-4 py-1.5 text-sm rounded-full transition-all ${filter === '전체' ? 'bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'bg-white/5 text-gray-400 backdrop-blur-lg border border-white/10 hover:bg-white/10'}`}>전체</button>
                <button onClick={() => { setFilter('★즐겨찾기'); setCurrentSubfolder(null); setVisibleCount(20); }} className={`px-4 py-1.5 text-sm rounded-full transition-all ${filter === '★즐겨찾기' ? 'bg-yellow-400 text-black font-bold shadow-[0_0_15px_rgba(250,204,21,0.4)] scale-105' : 'bg-white/5 text-yellow-500 backdrop-blur-lg border border-yellow-500/20 hover:bg-yellow-400/20'}`}>★ 즐겨찾기</button>
                
                {categories.filter(cat => cat.name !== '비밀창고').map(cat => (
                  <button key={cat.id} onClick={() => handleCategoryClick(cat)} className={`px-4 py-1.5 text-sm rounded-full transition-all flex items-center gap-1.5 ${filter === cat.name ? 'bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'bg-white/5 text-gray-400 backdrop-blur-lg border border-white/10 hover:bg-white/10'}`}>
                    {cat.icon} {cat.name} {cat.is_private && <Lock size={12} />}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-1 shrink-0 bg-white/5 p-1 rounded-full border border-white/10 ml-2">
                <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} className={`p-1.5 rounded-full transition-all ${sortOrder === 'desc' ? 'text-blue-400 bg-blue-500/10' : 'text-purple-400 bg-purple-500/10'}`} title="정렬 변경">
                  <ArrowDownUp size={16} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
                <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedItems([]); }} className={`p-1.5 rounded-full transition-all ${isSelectMode ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`} title="다중 선택 모드">
                  <CheckSquare size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center w-full max-w-5xl pb-2 md:pt-2">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-400"><Trash2 size={24}/> 휴지통</h2>
              <button onClick={handleEmptyTrash} disabled={totalItemsCount === 0} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <AlertOctagon size={16}/> 휴지통 비우기
              </button>
            </div>
          )}

          <div className="w-full max-w-5xl mt-2 px-4 md:px-0">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={18} />
              <input type="text" placeholder="제목이나 메모를 검색하세요" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:bg-white/10 focus:border-white/20 outline-none transition-all backdrop-blur-xl placeholder:text-gray-600" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={16} /></button>}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 px-6 max-w-7xl mx-auto">
          
          {currentMenu === 'home' && currentSubfolder && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mb-2 flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-[2rem] p-4 shadow-xl">
              <button onClick={() => setCurrentSubfolder(null)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-white/5 px-4 py-3 rounded-2xl"><ArrowLeft size={20} /> <span className="text-sm font-bold">카테고리로 나가기</span></button>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-white"><FolderOpen className="text-blue-400"/> {currentSubfolder.name}</h2>
            </div>
          )}

          {currentMenu === 'home' && filter !== '전체' && filter !== '★즐겨찾기' && !currentSubfolder && !isSelectMode && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-2 mb-2">
              {subfolders.filter(sf => sf.category_id === categories.find(c => c.name === filter)?.id).map(sf => (
                <div key={sf.id} onClick={() => setCurrentSubfolder(sf)} className="flex items-center justify-between bg-gray-900/50 hover:bg-gray-800 border border-gray-800 rounded-2xl p-4 cursor-pointer transition-all group shadow-sm">
                  <div className="flex items-center gap-3"><Folder className="text-blue-400 w-5 h-5" /><span className="font-bold text-gray-200">{sf.name}</span></div>
                  <button onClick={(e) => handleDeleteSubfolder(e, sf.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1" title="폴더 삭제"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}

          {displayedItems.map(item => {
            const isSelected = selectedItems.includes(item.id);
            return (
              <div 
                key={item.id} 
                onClick={() => handleCardClick(item)} 
                className={`border rounded-3xl p-6 shadow-xl relative group transition-all ${
                  currentMenu === 'trash' 
                    ? 'bg-red-950/20 border-red-900/30 opacity-70 hover:opacity-100 cursor-default'
                    : isSelectMode 
                      ? (isSelected ? 'bg-blue-900/30 border-blue-500 ring-2 ring-blue-500/50 cursor-pointer' : 'bg-gray-900/50 border-gray-800 hover:border-white/20 opacity-60 hover:opacity-100 cursor-pointer')
                      : 'bg-gray-900 border-gray-800 hover:border-white/20 cursor-pointer'
                }`}
              >
                {currentMenu === 'home' && isSelectMode && (
                  <div className="absolute top-5 left-5 z-10">{isSelected ? <CheckCircle2 className="text-blue-500 bg-black rounded-full" size={24} /> : <Circle className="text-gray-600 hover:text-white" size={24} />}</div>
                )}

                {currentMenu === 'home' && !isSelectMode && (
                  <button onClick={(e) => toggleFavorite(e, item)} className="absolute top-5 right-5 text-gray-600 hover:text-yellow-400 transition-colors z-10">
                    <Star size={22} fill={item.is_favorite ? "currentColor" : "none"} className={item.is_favorite ? "text-yellow-400" : ""} />
                  </button>
                )}

                {currentMenu === 'trash' && (
                  <div className="absolute top-5 right-5 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleRestore(e, item.id)} className="p-2 bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/40 transition-colors" title="복구하기"><ArchiveRestore size={18} /></button>
                    <button onClick={(e) => handleHardDelete(e, item.id)} className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40 transition-colors" title="영구 삭제"><Trash2 size={18} /></button>
                  </div>
                )}
                
                <div className={`mb-4 flex items-center gap-2 ${isSelectMode && currentMenu === 'home' ? 'ml-8' : ''}`}>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full">{categories.find(c => c.id === item.category_id)?.name}</span>
                  {item.subfolder_id && !currentSubfolder && (
                    <span className="text-[10px] font-bold tracking-widest uppercase text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full flex items-center gap-1"><Folder size={10}/> {subfolders.find(s => s.id === item.subfolder_id)?.name}</span>
                  )}
                  <div className="text-[9px] text-gray-600 font-mono">{new Date(item.created_at).toLocaleDateString()}</div>
                </div>

                {item.image_url && (
                  <img src={item.image_url} className={`w-full h-48 object-cover rounded-2xl mb-4 border border-gray-800 transition-opacity ${currentMenu === 'home' && !isSelectMode ? 'cursor-zoom-in hover:opacity-90' : ''}`} alt="uploaded" onClick={(e) => { if(currentMenu === 'home' && !isSelectMode){ e.stopPropagation(); setZoomedImage(item.image_url); } }} />
                )}
                
                <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${currentMenu === 'trash' ? 'text-gray-400 line-through' : ''}`}>
                  <span className="truncate">{item.title}</span>
                  {item.url && currentMenu === 'home' && !isSelectMode && (
                    <div className="flex items-center gap-2 ml-1 shrink-0">
                      <a href={item.url} target="_blank" onClick={(e) => e.stopPropagation()} title="새 창으로 열기"><ExternalLink size={18} className="text-gray-500 hover:text-white transition-colors" /></a>
                      <button onClick={(e) => handleCopyUrl(e, item.url)} title="URL 복사"><Copy size={18} className="text-gray-500 hover:text-blue-400 transition-colors" /></button>
                    </div>
                  )}
                </h3>
                {item.login_id && currentMenu === 'home' && <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-1"><Lock size={10}/> 계정 정보 포함됨</div>}
                {item.content && <p className={`text-sm mt-4 leading-relaxed line-clamp-2 ${currentMenu === 'trash' ? 'text-gray-600' : 'text-gray-400'}`}>{item.content}</p>}
              </div>
            );
          })}
        </div>

        {visibleCount < totalItemsCount && (
          <div className="flex justify-center mt-8 mb-16">
            <button onClick={() => setVisibleCount(prev => prev + 20)} className="bg-white/5 border border-white/10 text-gray-300 px-8 py-3 rounded-full font-bold hover:bg-white/10 hover:text-white transition-all backdrop-blur-md shadow-lg">
              더 보기 ({visibleCount} / {totalItemsCount})
            </button>
          </div>
        )}

        {totalItemsCount === 0 && (
          <div className="flex flex-col items-center justify-center mt-32 text-gray-500">
            {currentMenu === 'trash' ? <><ArchiveRestore size={48} className="mb-4 opacity-20"/> 휴지통이 비어있습니다.</> : <><FolderOpen size={48} className="mb-4 opacity-20"/> 여기는 텅 비어있네요. 기록을 시작해 보세요!</>}
          </div>
        )}
      </main>

      {currentMenu === 'home' && !isSelectMode && (
        <>
          {filter !== '전체' && filter !== '★즐겨찾기' && (
            <button onClick={() => setIsSubfolderModalOpen(true)} className="fixed bottom-28 right-10 w-12 h-12 bg-gray-800 border border-gray-700 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-700 active:scale-95 transition-all z-20 group" title="새 폴더 만들기">
              <FolderPlus size={20} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
            </button>
          )}
          <button onClick={openAddModal} className="fixed bottom-10 right-8 w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 z-20"><Plus size={32} /></button>
        </>
      )}

      {currentMenu === 'home' && isSelectMode && (
        <div className="fixed bottom-8 left-1/2 md:left-[calc(50%+8rem)] -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-full px-6 py-4 flex items-center gap-6 shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-50 animate-in slide-in-from-bottom-10 backdrop-blur-xl">
          <span className="text-white font-bold whitespace-nowrap"><span className="text-blue-400">{selectedItems.length}</span>개 선택됨</span>
          <div className="w-[1px] h-6 bg-gray-700"></div>
          <button onClick={() => setIsBatchMoveModalOpen(true)} disabled={selectedItems.length === 0} className={`flex items-center gap-2 font-bold transition-colors ${selectedItems.length > 0 ? 'text-white hover:text-blue-400' : 'text-gray-600'}`}><MoveRight size={18} /> 이동</button>
          <button onClick={handleBatchDelete} disabled={selectedItems.length === 0} className={`flex items-center gap-2 font-bold transition-colors ${selectedItems.length > 0 ? 'text-white hover:text-red-500' : 'text-gray-600'}`}><Trash2 size={18} /> 휴지통으로</button>
          <button onClick={() => { setIsSelectMode(false); setSelectedItems([]); }} className="p-2 bg-white/10 rounded-full text-gray-400 hover:text-white ml-2"><X size={16} /></button>
        </div>
      )}

      {isBatchMoveModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[110] flex items-center justify-center p-6 text-center">
          <div className="bg-gray-900 w-full max-sm rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <MoveRight className="text-blue-400 mx-auto mb-6" size={32} />
            <h2 className="text-2xl font-bold mb-2">어디로 옮길까요?</h2>
            <p className="text-gray-500 text-sm mb-6">{selectedItems.length}개의 기록을 선택하셨습니다.</p>
            <form onSubmit={handleBatchMoveSubmit} className="space-y-4 text-left">
              <div className="space-y-1"><label className="text-xs text-gray-500 ml-1">이동할 카테고리</label><select required className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={batchTargetCat} onChange={e => { setBatchTargetCat(e.target.value); setBatchTargetSub(''); }}><option value="" disabled>카테고리 선택</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              {batchTargetCat && (
                <div className="space-y-1"><label className="text-xs text-gray-500 ml-1">세부 폴더 (선택)</label><select className="w-full bg-black border border-blue-900/50 rounded-xl p-3 text-sm text-blue-100" value={batchTargetSub} onChange={e => setBatchTargetSub(e.target.value)}><option value="">📁 폴더 없이 메인에 두기</option>{subfolders.filter(sf => sf.category_id === batchTargetCat).map(sf => <option key={sf.id} value={sf.id}>{sf.name}</option>)}</select></div>
              )}
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsBatchMoveModalOpen(false)} className="flex-1 bg-gray-800 text-gray-300 font-bold p-4 rounded-2xl">취소</button><button type="submit" className="flex-1 bg-blue-600 text-white font-bold p-4 rounded-2xl">이동하기</button></div>
            </form>
          </div>
        </div>
      )}

      {/* 🔥 비밀 카테고리 잠금 해제 모달 (여기에 숫자 키패드 속성이 들어갔습니다!) */}
      {authModal.open && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-center">
          <div className="bg-gray-900 w-full max-sm rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <ShieldCheck className="text-blue-400 mx-auto mb-6" size={32} />
            <h2 className="text-2xl font-bold mb-2">{authModal.target.icon} {authModal.target.name}</h2>
            <form onSubmit={handleAuthConfirm} className="space-y-4">
              <input 
                autoFocus 
                type="password" 
                inputMode="numeric" 
                pattern="[0-9]*"
                placeholder="••••" 
                className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-center text-xl tracking-[0.5em] outline-none text-white" 
                value={authInput} 
                onChange={(e) => setAuthInput(e.target.value)} 
              />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAuthModal({ open: false, type: '', target: null })} className="flex-1 bg-gray-800 text-gray-300 font-bold p-4 rounded-2xl">취소</button>
                <button type="submit" className="flex-1 bg-white text-black font-bold p-4 rounded-2xl">확인</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔥 카테고리 추가/수정 모달 (비밀번호 설정할 때도 숫자 키패드가 뜹니다!) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-4 text-left">
          <div className="bg-gray-900 w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold">카테고리 관리</h2><button onClick={() => {setIsCategoryModalOpen(false); setEditingCategory(null);}}><X size={24} /></button></div>
            <form onSubmit={handleSaveCategory} className="mb-8 space-y-4">
              <div className="flex gap-2"><input name="icon" defaultValue={editingCategory?.icon} placeholder="📁" className="w-20 bg-black border border-gray-800 rounded-xl p-3 text-center text-white" /><input name="name" required defaultValue={editingCategory?.name} placeholder="카테고리 이름" className="flex-1 bg-black border border-gray-800 rounded-xl p-3 text-white" /></div>
              <div className="p-4 bg-black/50 rounded-2xl border border-gray-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="is_private" defaultChecked={editingCategory?.is_private} className="w-5 h-5 rounded bg-black text-white" />
                  <span className="text-sm font-medium text-gray-300">비밀 카테고리</span>
                </label>
                <input 
                  name="secret_key" 
                  type="password" 
                  inputMode="numeric" 
                  pattern="[0-9]*"
                  defaultValue={editingCategory?.password} 
                  placeholder="숫자 PIN 입력" 
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-sm text-white" 
                />
              </div>
              <button type="submit" className="w-full bg-white text-black font-bold p-3 rounded-xl">저장</button>
            </form>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {categories.map((cat, index) => (
                <div key={cat.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-lg flex items-center gap-2">{cat.icon} {cat.name} {cat.is_private && <Lock size={14} className="text-gray-500" />}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 bg-black/30 rounded-lg p-1"><button type="button" onClick={() => moveCategory(index, -1)} disabled={index === 0} className={`p-1 rounded hover:bg-white/10 ${index === 0 ? 'text-gray-700' : 'text-gray-400'}`}><ChevronUp size={16}/></button><button type="button" onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1} className={`p-1 rounded hover:bg-white/10 ${index === categories.length - 1 ? 'text-gray-700' : 'text-gray-400'}`}><ChevronDown size={16}/></button></div>
                    <div className="w-[1px] h-4 bg-gray-700 mx-1"></div>
                    <button onClick={() => handleEditCategory(cat)} className="text-gray-500 hover:text-blue-400"><Edit2 size={16} /></button><button onClick={() => handleDeleteCategory(cat.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {zoomedImage && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-5xl w-full flex justify-center"><button onClick={() => setZoomedImage(null)} className="absolute -top-14 right-0 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X size={24} /></button><img src={zoomedImage} alt="zoomed" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" /></div>
        </div>
      )}

    </div>
  );
}