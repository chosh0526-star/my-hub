"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Copy, ExternalLink, Plus, X, Trash2, Image as ImageIcon, Settings, Edit2, 
  Lock, ShieldCheck, Link, FileText, Calendar, Search, Star, ChevronUp, ChevronDown, 
  FolderOpen, FolderPlus, ArrowLeft, Folder, CheckCircle2, Circle, CheckSquare, 
  MoveRight, ArrowDownUp, Menu, Home, ArchiveRestore, AlertOctagon, Mail, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';

export default function Dashboard() {
  // 1. 상태 관리 (State)
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subfolders, setSubfolders] = useState([]); 
  
  const [currentMenu, setCurrentMenu] = useState('home'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  const [filter, setFilter] = useState('전체');
  const [currentSubfolder, setCurrentSubfolder] = useState(null); 
  const [sortOrder, setSortOrder] = useState('desc');
  const [visibleCount, setVisibleCount] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isBatchMoveModalOpen, setIsBatchMoveModalOpen] = useState(false);
  const [batchTargetCat, setBatchTargetCat] = useState('');
  const [batchTargetSub, setBatchTargetSub] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addStep, setAddStep] = useState('choice');
  const [uploading, setUploading] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [authModal, setAuthModal] = useState({ open: false, type: '', target: null });
  const [authInput, setAuthInput] = useState('');

  const [isSubfolderModalOpen, setIsSubfolderModalOpen] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');

  const [clickCount, setClickCount] = useState(0);

  // 대화면 슬라이드 전용 상태
  const [zoomedData, setZoomedData] = useState(null); 
  
  // 모바일 스와이프(터치) 상태 관리
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // 다중 이미지 상태 (입력/수정용)
  const [newItemImages, setNewItemImages] = useState([]); 
  const [editingItemImages, setEditingItemImages] = useState([]); 

  const [newItem, setNewItem] = useState({
    title: '', category_id: '', subfolder_id: null, type: 'link', url: '', login_id: '', login_pw: '', content: ''
  });

  // 2. 초기 데이터 로드
  useEffect(() => { 
    fetchInitialData(); 
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('url');
    const sharedTitle = params.get('title'); 
    
    if (sharedUrl) {
      setIsModalOpen(true); 
      setAddStep('url');    
      setNewItem(prev => ({ 
        ...prev, 
        url: sharedUrl,
        title: sharedTitle ? sharedTitle : '' 
      }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  async function fetchInitialData() {
    const { data: catData } = await supabase.from('categories').select('*').order('display_order');
    setCategories(catData || []);
    
    const { data: sfData } = await supabase.from('subfolders').select('*').order('created_at');
    setSubfolders(sfData || []);

    if (catData?.length > 0) {
      setNewItem(prev => ({ ...prev, category_id: catData[0].id }));
    }

    // 아이템과 다중 이미지를 함께 불러오기
    const { data: itemData, error } = await supabase
      .from('dashboard_items')
      .select('*, item_images (*)')
      .order('created_at', { ascending: false });
    
    if(!error && itemData) {
      const sortedItemData = itemData.map(item => ({
        ...item,
        item_images: (item.item_images || []).sort((a, b) => a.display_order - b.display_order)
      }));
      setItems(sortedItemData);
    }
  }

  // 3. 주요 기능 함수들
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
    setNewItem({ title: '', category_id: defaultCategoryId, subfolder_id: null, type: 'link', url: '', login_id: '', login_pw: '', content: '' });
    setNewItemImages([]);
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
      let correctedType = item.type;
      if (correctedType === 'link' && !item.url && !item.login_id && !item.login_pw && item.content) {
        correctedType = 'memo';
      }
      setEditingItem({ ...item, type: correctedType });
      setEditingItemImages(item.item_images || []);
      setIsDetailModalOpen(true);
    }
  };

  // 줌 모달 슬라이드 및 스와이프 함수
  const handleZoomSlide = (e, direction) => {
    if (e) e.stopPropagation();
    if (!zoomedData || !zoomedData.images) return;
    setZoomedData(prev => {
      let nextIndex = prev.index + direction;
      if (nextIndex < 0) nextIndex = prev.images.length - 1;
      if (nextIndex >= prev.images.length) nextIndex = 0;
      return { ...prev, index: nextIndex };
    });
  };

  const minSwipeDistance = 50;
  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleZoomSlide(null, 1);
    if (distance < -minSwipeDistance) handleZoomSlide(null, -1);
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    const updatedUrl = fixUrl(editingItem.url);

    const updatePayload = {
      title: editingItem.title,
      category_id: editingItem.category_id,
      subfolder_id: editingItem.subfolder_id,
      type: editingItem.type,
      url: updatedUrl,
      login_id: editingItem.login_id,
      login_pw: editingItem.login_pw,
      content: editingItem.content
    };

    const { error: itemError } = await supabase.from('dashboard_items').update(updatePayload).eq('id', editingItem.id);

    if (itemError) {
      alert('게시물 수정 실패!');
      return;
    }

    await supabase.from('item_images').delete().eq('item_id', editingItem.id);
    
    if (editingItemImages.length > 0) {
      const imagesToInsert = editingItemImages.map((img, index) => ({
        item_id: editingItem.id,
        image_url: img.image_url,
        display_order: index
      }));
      await supabase.from('item_images').insert(imagesToInsert);
    }

    setIsDetailModalOpen(false); 
    fetchInitialData();
  };

  async function handleAddItem(e) {
    e.preventDefault();
    
    let exactType = 'link';
    if (addStep === 'photo' || newItemImages.length > 0) exactType = 'image';
    if (addStep === 'memo') exactType = 'memo';

    const finalItem = { 
      ...newItem, 
      type: exactType, 
      url: fixUrl(newItem.url), 
      title: newItem.title || (exactType === 'image' ? '새 사진' : exactType === 'memo' ? '새 메모' : '새 링크') 
    };
    
    const { data: insertedItem, error: itemError } = await supabase.from('dashboard_items').insert([finalItem]).select().single();

    if (itemError) {
      alert('저장 실패: ' + itemError.message);
      return;
    }

    if (insertedItem && newItemImages.length > 0) {
      const imagesToInsert = newItemImages.map((imgUrl, index) => ({
        item_id: insertedItem.id,
        image_url: imgUrl,
        display_order: index
      }));
      await supabase.from('item_images').insert(imagesToInsert);
    }

    setIsModalOpen(false); 
    fetchInitialData();
  }

  const handleAuthConfirm = async (e) => {
    e.preventDefault();
    if (authInput === authModal.target.password) {
      if (authModal.type === 'view') { setFilter(authModal.target.name); setCurrentSubfolder(null); setVisibleCount(20); } 
      else if (authModal.type === 'delete') { await supabase.from('categories').delete().eq('id', authModal.target.id); fetchInitialData(); } 
      else if (authModal.type === 'edit') setEditingCategory(authModal.target);
      setAuthModal({ open: false, type: '', target: null });
    } else alert("인증에 실패했습니다.");
  };

  const handleCategoryClick = (cat) => {
    setCurrentMenu('home'); setCurrentSubfolder(null); setVisibleCount(20); setIsSelectMode(false); setSelectedItems([]); 
    if (cat.is_private) { setAuthModal({ open: true, type: 'view', target: cat }); setAuthInput(''); } 
    else setFilter(cat.name);
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
    if (confirm('폴더를 삭제하시겠습니까?\n(폴더 안의 내용물은 카테고리 메인으로 빠져나옵니다!)')) {
      await supabase.from('subfolders').delete().eq('id', id); fetchInitialData();
    }
  };

  async function handleDeleteCategory(id) {
    const cat = categories.find(c => c.id === id);
    if (cat.is_private) setAuthModal({ open: true, type: 'delete', target: cat });
    else if (confirm('카테고리를 삭제하면 포함된 모든 정보도 삭제됩니다.')) {
      await supabase.from('categories').delete().eq('id', id); fetchInitialData();
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
    const files = Array.from(e.target.files); 
    if (files.length === 0) return;
    setUploading(true);
    const uploadedUrls = [];

    for (const file of files) {
      let fileExt = 'jpg'; if (file.name && file.name.includes('.')) fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`; const filePath = `uploads/${fileName}`;
      let { error } = await supabase.storage.from('images').upload(filePath, file);
      if (error) alert(`${file.name} 업로드 실패: ${error.message}`);
      else {
        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        uploadedUrls.push(data.publicUrl); 
      }
    }

    if (isDetailModalOpen) setEditingItemImages(prev => [...prev, ...uploadedUrls.map(url => ({ image_url: url }))]);
    else {
      setNewItemImages(prev => [...prev, ...uploadedUrls]);
      if(uploadedUrls.length > 0) setNewItem(prev => ({ ...prev, type: 'image' })); 
    }
    setUploading(false);
  }

  const handleDeleteEditingImage = (index) => setEditingItemImages(prev => prev.filter((_, i) => i !== index));
  const handleDeleteNewImage = (index) => setNewItemImages(prev => prev.filter((_, i) => i !== index));
  const handleCopyUrl = (e, url) => { e.stopPropagation(); navigator.clipboard.writeText(url).then(() => alert('URL 복사 완료! 📋')).catch(() => alert('복사 실패')); };
  
  async function handleSoftDelete(id) {
    if (confirm('휴지통으로 이동하시겠습니까?')) {
      await supabase.from('dashboard_items').update({ is_deleted: true }).eq('id', id);
      setIsDetailModalOpen(false); fetchInitialData();
    }
  }

  async function handleRestore(e, id) { e.stopPropagation(); await supabase.from('dashboard_items').update({ is_deleted: false }).eq('id', id); fetchInitialData(); }
  
  async function handleHardDelete(e, id) {
    e.stopPropagation();
    if (confirm('영구 삭제하면 다시는 복구할 수 없습니다. 삭제하시겠습니까?')) { await supabase.from('dashboard_items').delete().eq('id', id); fetchInitialData(); }
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
      await supabase.from('dashboard_items').delete().eq('is_deleted', true); fetchInitialData();
    }
  };

  const handleBatchMoveSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;
    const finalSubId = batchTargetSub === '' ? null : batchTargetSub;
    await supabase.from('dashboard_items').update({ category_id: batchTargetCat, subfolder_id: finalSubId }).in('id', selectedItems);
    setIsBatchMoveModalOpen(false); setIsSelectMode(false); setSelectedItems([]); fetchInitialData();
  };

  // 4. 필터링 및 렌더링 준비
  let processedItems = [...items];
  const lowerSearch = searchTerm.toLowerCase();

  if (currentMenu === 'trash') {
    processedItems = processedItems.filter(item => item.is_deleted && (item.title?.toLowerCase().includes(lowerSearch) || item.content?.toLowerCase().includes(lowerSearch)));
  } else if (currentMenu === 'mailbox') {
    processedItems = processedItems.filter(item => !item.is_deleted && item.type === 'email' && (item.title?.toLowerCase().includes(lowerSearch) || item.content?.toLowerCase().includes(lowerSearch)));
  } else {
    processedItems = processedItems.filter(item => {
      if (item.is_deleted || item.type === 'email') return false;
      const itemCat = categories.find(c => c.id === item.category_id);
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
    const dateA = new Date(a.created_at).getTime(); const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const totalItemsCount = processedItems.length;
  const displayedItems = processedItems.slice(0, visibleCount);

  // 5. UI 렌더링
  return (
    <div className="flex h-screen bg-[#020617] text-gray-100 font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* 사이드바 */}
      <aside className={`fixed md:relative z-50 w-64 h-full bg-[#020617]/95 backdrop-blur-3xl border-r border-white/5 shadow-2xl transition-transform transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}>
        <div className="p-6 pt-14 md:pt-8 flex justify-between items-center">
          <h2 onClick={handleTitleClick} className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500 cursor-pointer">The Archive</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={24}/></button>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => { setCurrentMenu('home'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${currentMenu === 'home' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Home size={20} /> 메인</button>
          <button onClick={() => { setCurrentMenu('mailbox'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${currentMenu === 'mailbox' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Mail size={20} /> 메일함</button>
          <button onClick={() => { setCurrentMenu('trash'); setCurrentSubfolder(null); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${currentMenu === 'trash' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Trash2 size={20} /> 휴지통</button>
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={() => { setIsCategoryModalOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all"><Settings size={20} /> 카테고리 및 설정</button>
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 h-full overflow-y-auto relative bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pb-32 no-scrollbar">
        {/* 헤더 */}
        <header className="sticky top-0 z-30 flex flex-col items-center pt-4 md:pt-8 pb-4 bg-[#020617]/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl w-full px-4">
          <div className="flex justify-between items-center w-full max-w-5xl mb-4 md:hidden">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors"><Menu size={24} /></button>
            <h1 onClick={handleTitleClick} className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 drop-shadow-[0_10px_20px_rgba(255,255,255,0.15)] cursor-pointer select-none active:scale-95 transition-transform text-center flex-1">The Archive</h1>
            <div className="w-10"></div> 
          </div>

          {currentMenu === 'home' && (
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
                <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} className={`p-1.5 rounded-full transition-all ${sortOrder === 'desc' ? 'text-blue-400 bg-blue-500/10' : 'text-purple-400 bg-purple-500/10'}`}><ArrowDownUp size={16} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} /></button>
                <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedItems([]); }} className={`p-1.5 rounded-full transition-all ${isSelectMode ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}><CheckSquare size={16} /></button>
              </div>
            </div>
          )}
          
          {currentMenu === 'trash' && (
            <div className="flex justify-between items-center w-full max-w-5xl pb-2 md:pt-2">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-400"><Trash2 size={24}/> 휴지통</h2>
              <button onClick={handleEmptyTrash} disabled={totalItemsCount === 0} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all font-bold text-sm disabled:opacity-50"><AlertOctagon size={16}/> 휴지통 비우기</button>
            </div>
          )}

          {currentMenu === 'mailbox' && (
            <div className="flex justify-between items-center w-full max-w-5xl pb-2 md:pt-2">
              <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-400"><Mail size={24}/> 메일함</h2>
              <div className="flex gap-1 shrink-0 bg-white/5 p-1 rounded-full border border-white/10">
                <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedItems([]); }} className={`px-4 py-1.5 text-sm rounded-full transition-all ${isSelectMode ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white'}`}>정리하기</button>
              </div>
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

        {/* 🔥 [복구완료] 제가 실수로 날려먹었던 세부 폴더 UI를 다시 소환합니다! */}
        {currentMenu === 'home' && currentSubfolder && (
          <div className="max-w-7xl mx-auto px-6 mt-8 mb-2">
            <div className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-[2rem] p-4 shadow-xl">
              <button onClick={() => setCurrentSubfolder(null)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-white/5 px-4 py-3 rounded-2xl"><ArrowLeft size={20} /> <span className="text-sm font-bold">카테고리로 나가기</span></button>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-white"><FolderOpen className="text-blue-400"/> {currentSubfolder.name}</h2>
            </div>
          </div>
        )}

        {currentMenu === 'home' && filter !== '전체' && filter !== '★즐겨찾기' && !currentSubfolder && !isSelectMode && (
          <div className="max-w-7xl mx-auto px-6 mt-8 mb-4 space-y-2">
            {subfolders.filter(sf => sf.category_id === categories.find(c => c.name === filter)?.id).map(sf => (
              <div key={sf.id} onClick={() => setCurrentSubfolder(sf)} className="flex items-center justify-between bg-gray-900/50 hover:bg-gray-800 border border-gray-800 rounded-2xl p-4 cursor-pointer transition-all group shadow-sm">
                <div className="flex items-center gap-3"><Folder className="text-blue-400 w-5 h-5" /><span className="font-bold text-gray-200">{sf.name}</span></div>
                <button onClick={(e) => handleDeleteSubfolder(e, sf.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1" title="폴더 삭제"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}

        {/* 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 px-6 max-w-7xl mx-auto">
          {displayedItems.map(item => {
            const isSelected = selectedItems.includes(item.id);
            const hasImages = item.item_images && item.item_images.length > 0;

            return (
              <div 
                key={item.id} 
                onClick={() => handleCardClick(item)} 
                // 🔥 [복구] 원래의 p-6 패딩을 살리고 높이는 20rem으로 컴팩트하게 유지합니다.
                className={`border rounded-3xl p-6 shadow-xl relative group transition-all flex flex-col h-[20rem] overflow-hidden ${
                  currentMenu === 'trash' ? 'bg-red-950/20 border-red-900/30 opacity-70 hover:opacity-100 cursor-default' : 
                  isSelectMode ? (isSelected ? 'bg-blue-900/30 border-blue-500 ring-2 ring-blue-500/50 cursor-pointer' : 'bg-gray-900/50 border-gray-800 hover:border-white/20 opacity-60 hover:opacity-100 cursor-pointer') : 
                  'bg-gray-900 border-gray-800 hover:border-white/20 cursor-pointer'
                }`}
              >
                {(currentMenu === 'home' || currentMenu === 'mailbox') && isSelectMode && ( <div className="absolute top-5 left-5 z-10">{isSelected ? <CheckCircle2 className="text-blue-500 bg-black rounded-full" size={24} /> : <Circle className="text-gray-600 hover:text-white" size={24} />}</div> )}
                {currentMenu === 'home' && !isSelectMode && ( <button onClick={(e) => toggleFavorite(e, item)} className="absolute top-5 right-5 text-gray-600 hover:text-yellow-400 transition-colors z-10"><Star size={22} fill={item.is_favorite ? "currentColor" : "none"} className={item.is_favorite ? "text-yellow-400" : ""} /></button> )}
                {currentMenu === 'mailbox' && !isSelectMode && ( <div className="absolute top-5 right-5 text-indigo-400/30 z-10"><Mail size={22} /></div> )}
                {currentMenu === 'trash' && (
                  <div className="absolute top-5 right-5 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleRestore(e, item.id)} className="p-2 bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/40 transition-colors"><ArchiveRestore size={18} /></button>
                    <button onClick={(e) => handleHardDelete(e, item.id)} className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40 transition-colors"><Trash2 size={18} /></button>
                  </div>
                )}
                
                <div className={`mb-3 flex items-center gap-2 shrink-0 ${isSelectMode && (currentMenu === 'home' || currentMenu === 'mailbox') ? 'ml-8' : ''}`}>
                  {item.category_id ? <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full">{categories.find(c => c.id === item.category_id)?.name}</span> : <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full">수신됨</span>}
                  {item.subfolder_id && !currentSubfolder && ( <span className="text-[10px] font-bold tracking-widest uppercase text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full flex items-center gap-1"><Folder size={10}/> {subfolders.find(s => s.id === item.subfolder_id)?.name}</span> )}
                  <div className="text-[9px] text-gray-600 font-mono">{new Date(item.created_at).toLocaleDateString()}</div>
                </div>

                {/* 🔥 [핵심] 사진 영역: 고정 높이(h-48) 대신 flex-1을 주어 카드의 남는 잉여 공간을 사진이 스스로 꽉 채우게 만듭니다! */}
                {hasImages && (
                  <div 
                    className="relative group/img w-full flex-1 rounded-2xl mb-3 border border-gray-800 overflow-hidden cursor-pointer min-h-0"
                    onClick={(e) => { 
                      if(currentMenu === 'home' && !isSelectMode){ 
                        e.stopPropagation(); 
                        setZoomedData({ images: item.item_images, index: 0 }); 
                      } 
                    }}
                  >
                    <img 
                      src={item.item_images[0]?.image_url} 
                      className={`w-full h-full object-cover transition-opacity ${currentMenu === 'home' && !isSelectMode ? 'group-hover/img:opacity-90 cursor-zoom-in' : ''}`} 
                      alt="uploaded cover" 
                    />
                    {item.item_images.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-white text-[11px] px-2 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow-lg border border-white/10 pointer-events-none">
                        <ImageIcon size={12} className="text-gray-300" /> +{item.item_images.length - 1}장
                      </div>
                    )}
                  </div>
                )}

                <h3 className={`text-xl font-bold mb-1 flex items-center gap-2 shrink-0 ${currentMenu === 'trash' ? 'text-gray-400 line-through' : ''}`}>
                  <span className="truncate">{item.title}</span>
                  {item.url && currentMenu === 'home' && !isSelectMode && (
                    <div className="flex items-center gap-2 ml-1 shrink-0"><a href={item.url} target="_blank" onClick={(e) => e.stopPropagation()}><ExternalLink size={18} className="text-gray-500 hover:text-white transition-colors" /></a><button onClick={(e) => handleCopyUrl(e, item.url)}><Copy size={18} className="text-gray-500 hover:text-blue-400 transition-colors" /></button></div>
                  )}
                </h3>
                {item.login_id && currentMenu === 'home' && <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 shrink-0"><Lock size={10}/> 계정 정보 포함됨</div>}
                
                {/* 🔥 이미지가 없을 때는 메모가 길게 남는 공간을 꽉 채우고(flex-1), 이미지가 있을 때는 살짝만 보이게 설정 */}
                {item.content && (
                  <div 
                    className={`overflow-hidden ${hasImages ? 'mt-1 max-h-[2.5rem]' : 'mt-4 flex-1'}`} 
                    style={{ 
                      WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 1.5rem), transparent 100%)', 
                      maskImage: 'linear-gradient(to bottom, black calc(100% - 1.5rem), transparent 100%)' 
                    }}
                  >
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${currentMenu === 'trash' ? 'text-gray-600' : 'text-gray-400'}`}>{item.content}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {visibleCount < totalItemsCount && ( <div className="flex justify-center mt-8 mb-16"><button onClick={() => setVisibleCount(prev => prev + 20)} className="bg-white/5 border border-white/10 text-gray-300 px-8 py-3 rounded-full font-bold hover:bg-white/10 hover:text-white transition-all backdrop-blur-md shadow-lg">더 보기 ({visibleCount} / {totalItemsCount})</button></div> )}
        {totalItemsCount === 0 && (
          <div className="flex flex-col items-center justify-center mt-32 text-gray-500">
            {currentMenu === 'trash' ? <><ArchiveRestore size={48} className="mb-4 opacity-20"/> 휴지통이 비어있습니다.</> : currentMenu === 'mailbox' ? <><Mail size={48} className="mb-4 opacity-20 text-indigo-500"/> 새로 도착한 메일이 없습니다.</> : <><FolderOpen size={48} className="mb-4 opacity-20"/> 여기는 텅 비어있네요. 기록을 시작해 보세요!</>}
          </div>
        )}
      </main>

      {/* 플로팅 버튼 및 다중 선택 모달 */}
      {currentMenu === 'home' && !isSelectMode && (
        <>
          {filter !== '전체' && filter !== '★즐겨찾기' && ( <button onClick={() => setIsSubfolderModalOpen(true)} className="fixed bottom-28 right-10 w-12 h-12 bg-gray-800 border border-gray-700 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-700 active:scale-95 transition-all z-20"><FolderPlus size={20} className="text-blue-400" /></button> )}
          <button onClick={openAddModal} className="fixed bottom-10 right-8 w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 z-20"><Plus size={32} /></button>
        </>
      )}

      {(currentMenu === 'home' || currentMenu === 'mailbox') && isSelectMode && (
        <div className="fixed bottom-8 left-1/2 md:left-[calc(50%+8rem)] -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-full px-6 py-4 flex items-center gap-6 shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-50 animate-in slide-in-from-bottom-10 backdrop-blur-xl">
          <span className="text-white font-bold whitespace-nowrap"><span className="text-blue-400">{selectedItems.length}</span>개 선택됨</span>
          <div className="w-[1px] h-6 bg-gray-700"></div>
          <button onClick={() => setIsBatchMoveModalOpen(true)} disabled={selectedItems.length === 0} className={`flex items-center gap-2 font-bold transition-colors ${selectedItems.length > 0 ? 'text-white hover:text-blue-400' : 'text-gray-600'}`}><MoveRight size={18} /> 카테고리로 정리</button>
          <button onClick={handleBatchDelete} disabled={selectedItems.length === 0} className={`flex items-center gap-2 font-bold transition-colors ${selectedItems.length > 0 ? 'text-white hover:text-red-500' : 'text-gray-600'}`}><Trash2 size={18} /> 휴지통로</button>
          <button onClick={() => { setIsSelectMode(false); setSelectedItems([]); }} className="p-2 bg-white/10 rounded-full text-gray-400 hover:text-white ml-2"><X size={16} /></button>
        </div>
      )}

      {/* 모달 1: 정보 입력 창 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-scrollbar">
          <div className="bg-gray-900 w-full max-w-lg rounded-[2.5rem] p-8 border border-white/10 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold">{addStep === 'choice' ? '무엇을 기록할까요?' : '정보 입력'}</h2><button onClick={() => setIsModalOpen(false)}><X size={24} /></button></div>
            {addStep === 'choice' ? (
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => setAddStep('url')} className="flex items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all text-left group">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform"><Link size={24} /></div>
                  <div><div className="font-bold text-lg">URL 및 계정</div><div className="text-sm text-gray-500">사이트 주소와 로그인 정보</div></div>
                </button>
                <button onClick={() => setAddStep('photo')} className="flex items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all text-left group">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"><ImageIcon size={24} /></div>
                  <div><div className="font-bold text-lg">사진 및 스크린샷</div><div className="text-sm text-gray-500">이미지 파일 다중 업로드</div></div>
                </button>
                <button onClick={() => setAddStep('memo')} className="flex items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all text-left group">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform"><FileText size={24} /></div>
                  <div><div className="font-bold text-lg">심플 메모</div><div className="text-sm text-gray-500">텍스트 중심의 간단한 기록</div></div>
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddItem} className="space-y-4 text-left">
                <button type="button" onClick={() => setAddStep('choice')} className="text-sm text-gray-500 hover:text-white mb-2">← 뒤로가기</button>
                <select className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-white/50 outline-none transition-colors" value={newItem.category_id} onChange={e => setNewItem({...newItem, category_id: e.target.value})}><option value="" disabled>카테고리 선택</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                
                <input required={!(addStep === 'photo' || newItemImages.length > 0)} placeholder={`제목을 입력하세요 ${(addStep === 'photo' || newItemImages.length > 0) ? '(선택)' : ''}`} className="w-full bg-black border border-gray-800 rounded-xl p-4 text-lg font-bold text-white" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                
                {addStep === 'url' && ( <div className="space-y-3"><input required placeholder="naver.com" className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={newItem.url} onChange={e => setNewItem({...newItem, url: e.target.value})} /><div className="grid grid-cols-2 gap-2"><input placeholder="ID (선택)" className="bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={newItem.login_id} onChange={e => setNewItem({...newItem, login_id: e.target.value})} /><input placeholder="PW (선택)" className="bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={newItem.login_pw} onChange={e => setNewItem({...newItem, login_pw: e.target.value})} /></div></div> )}
                
                {(addStep === 'photo' || newItemImages.length > 0) && ( 
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {newItemImages.map((imgUrl, index) => (
                        <div key={index} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-square">
                          <img src={imgUrl} className="w-full h-full object-cover" alt={`preview ${index + 1}`} />
                          <button type="button" onClick={() => handleDeleteNewImage(index)} className="absolute top-1.5 right-1.5 bg-red-500/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                        </div>
                      ))}
                      {uploading && <div className="aspect-square bg-white/5 rounded-xl flex items-center justify-center text-gray-500 text-xs border border-white/10">로딩...</div>}
                      <label className="cursor-pointer aspect-square bg-white/5 rounded-xl flex flex-col items-center justify-center border border-dashed border-gray-800 hover:border-gray-600 transition-colors group">
                        <Plus size={24} className="text-gray-600 group-hover:text-gray-400" />
                        <span className="text-[11px] text-gray-600 mt-1.5 group-hover:text-gray-400">사진 추가</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                    </div>
                  </div>
                )}
                
                {(addStep === 'photo' || addStep === 'memo' || newItemImages.length > 0) && ( 
                  <textarea required={addStep === 'memo' && newItemImages.length === 0} placeholder={`내용을 자유롭게 적어주세요 ${(addStep === 'photo' || newItemImages.length > 0) ? '(선택)' : ''}`} className={`w-full bg-black border border-gray-800 rounded-xl p-4 text-sm leading-relaxed text-white ${addStep === 'memo' ? 'h-60' : 'h-32'}`} value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} /> 
                )}
                
                <button type="submit" className="w-full bg-white text-black font-extrabold p-5 rounded-2xl active:scale-95 transition-all mt-4" disabled={uploading}>기록 완료</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 모달 2: 정보 상세 / 수정 창 */}
      {isDetailModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex items-center justify-center p-4 overflow-y-auto no-scrollbar">
          <div className="bg-gray-900 w-full max-w-lg rounded-[2.5rem] p-8 border border-white/10 shadow-2xl my-8">
            <div className="flex justify-between items-start mb-6">
              <div><div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Calendar size={12} /> <span>{formatDate(editingItem.created_at)}</span></div><h2 className="text-2xl font-bold">정보 수정 / 이동</h2></div>
              <button onClick={() => setIsDetailModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdateItem} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 ml-1">상위 카테고리</label>
                  <select className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={editingItem.category_id || ''} onChange={e => setEditingItem({...editingItem, category_id: e.target.value, subfolder_id: null})}>
                    <option value="" disabled>분류 필요</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 ml-1">세부 폴더 위치</label>
                  <select className="w-full bg-black border border-blue-900/50 rounded-xl p-3 text-sm text-blue-100" value={editingItem.subfolder_id || ''} onChange={e => setEditingItem({...editingItem, subfolder_id: e.target.value === '' ? null : e.target.value})}>
                    <option value="">📁 지정 안 함 (메인)</option>
                    {subfolders.filter(sf => sf.category_id === editingItem.category_id).map(sf => <option key={sf.id} value={sf.id}>{sf.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-gray-500 ml-1">제목 {editingItem.type === 'image' && <span className="text-gray-600">(선택)</span>}</label>
                <input required={editingItem.type !== 'image'} className="w-full bg-black border border-gray-800 rounded-xl p-3 font-bold text-white" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} />
              </div>
              
              {(editingItem.type === 'image') && ( 
                <div className="space-y-1 mt-3">
                  <label className="text-xs text-gray-500 ml-1">사진 목록 ({editingItemImages.length}장)</label>
                  <div className="grid grid-cols-4 gap-3 border border-gray-800 p-3 rounded-2xl bg-black/30">
                    {editingItemImages.map((img, index) => (
                      <div key={index} className="relative group rounded-lg overflow-hidden border border-white/5 aspect-square">
                        <img src={img.image_url} className="w-full h-full object-cover" alt={`preview ${index + 1}`} />
                        <button type="button" onClick={() => handleDeleteEditingImage(index)} className="absolute top-1.5 right-1.5 bg-red-500/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">{index + 1}</div>
                      </div>
                    ))}
                    {uploading && <div className="aspect-square bg-white/5 rounded-lg flex items-center justify-center text-gray-500 text-xs border border-white/5">로딩...</div>}
                    <label className="cursor-pointer aspect-square bg-white/5 rounded-lg flex flex-col items-center justify-center border border-dashed border-gray-800 hover:border-gray-600 transition-colors group">
                      <Plus size={20} className="text-gray-600 group-hover:text-gray-400" />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  </div>
                </div>
              )}

              {editingItem.type === 'link' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 ml-1">사이트 주소 (URL)</label>
                    <input placeholder="naver.com" className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={editingItem.url || ''} onChange={e => setEditingItem({...editingItem, url: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500 ml-1">ID</label>
                      <input className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={editingItem.login_id || ''} onChange={e => setEditingItem({...editingItem, login_id: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500 ml-1">PW</label>
                      <input className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={editingItem.login_pw || ''} onChange={e => setEditingItem({...editingItem, login_pw: e.target.value})} />
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-1">
                <label className="text-xs text-gray-500 ml-1">메모 내용</label>
                <textarea className={`w-full bg-black border border-gray-800 rounded-xl p-3 text-sm leading-relaxed text-white ${(editingItem.type === 'memo' || editingItem.type === 'email') ? 'h-64' : 'h-32'}`} value={editingItem.content || ''} onChange={e => setEditingItem({...editingItem, content: e.target.value})} />
              </div>

              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => handleSoftDelete(editingItem.id)} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all" title="휴지통으로 이동"><Trash2 size={20} /></button>
                <button type="submit" className="flex-1 bg-white text-black font-extrabold p-4 rounded-2xl active:scale-95 transition-all">저장하기</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 3: 일괄 이동 창 */}
      {isBatchMoveModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[110] flex items-center justify-center p-6 text-center">
          <div className="bg-gray-900 w-full max-sm rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <MoveRight className="text-blue-400 mx-auto mb-6" size={32} />
            <h2 className="text-2xl font-bold mb-2">어디로 옮길까요?</h2>
            <form onSubmit={handleBatchMoveSubmit} className="space-y-4 text-left">
              <div className="space-y-1"><label className="text-xs text-gray-500 ml-1">이동할 카테고리</label><select required className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={batchTargetCat} onChange={e => { setBatchTargetCat(e.target.value); setBatchTargetSub(''); }}><option value="" disabled>카테고리 선택</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              {batchTargetCat && ( <div className="space-y-1"><label className="text-xs text-gray-500 ml-1">세부 폴더 (선택)</label><select className="w-full bg-black border border-blue-900/50 rounded-xl p-3 text-sm text-blue-100" value={batchTargetSub} onChange={e => setBatchTargetSub(e.target.value)}><option value="">📁 폴더 없이 메인에 두기</option>{subfolders.filter(sf => sf.category_id === batchTargetCat).map(sf => <option key={sf.id} value={sf.id}>{sf.name}</option>)}</select></div> )}
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsBatchMoveModalOpen(false)} className="flex-1 bg-gray-800 text-gray-300 font-bold p-4 rounded-2xl">취소</button><button type="submit" className="flex-1 bg-blue-600 text-white font-bold p-4 rounded-2xl">이동하기</button></div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 4: 새 폴더 생성 창 */}
      {isSubfolderModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-center">
          <div className="bg-gray-900 w-full max-sm rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <FolderPlus className="text-blue-400 mx-auto mb-6" size={32} />
            <h2 className="text-2xl font-bold mb-6">새 폴더 만들기</h2>
            <form onSubmit={handleCreateSubfolder} className="space-y-4">
              <input autoFocus required type="text" placeholder="폴더 이름을 입력하세요" className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-center text-xl outline-none text-white focus:border-blue-500/50 transition-colors" value={newSubfolderName} onChange={(e) => setNewSubfolderName(e.target.value)} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsSubfolderModalOpen(false)} className="flex-1 bg-gray-800 text-gray-300 font-bold p-4 rounded-2xl">취소</button><button type="submit" className="flex-1 bg-white text-black font-bold p-4 rounded-2xl">생성하기</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 5: 인증 (PIN 입력) 창 */}
      {authModal.open && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-center">
          <div className="bg-gray-900 w-full max-sm rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <ShieldCheck className="text-blue-400 mx-auto mb-6" size={32} />
            <h2 className="text-2xl font-bold mb-2">{authModal.target.icon} {authModal.target.name}</h2>
            <form onSubmit={handleAuthConfirm} className="space-y-4">
              <input autoFocus type="password" inputMode="numeric" pattern="[0-9]*" placeholder="••••" className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-center text-xl tracking-[0.5em] outline-none text-white" value={authInput} onChange={(e) => setAuthInput(e.target.value)} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAuthModal({ open: false, type: '', target: null })} className="flex-1 bg-gray-800 text-gray-300 font-bold p-4 rounded-2xl">취소</button><button type="submit" className="flex-1 bg-white text-black font-bold p-4 rounded-2xl">확인</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 6: 카테고리 관리 창 */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-4 text-left">
          <div className="bg-gray-900 w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold">카테고리 관리</h2><button onClick={() => {setIsCategoryModalOpen(false); setEditingCategory(null);}}><X size={24} /></button></div>
            <form onSubmit={handleSaveCategory} className="mb-8 space-y-4">
              <div className="flex gap-2">
                <input name="icon" defaultValue={editingCategory?.icon} placeholder="📁" className="w-20 bg-black border border-gray-800 rounded-xl p-3 text-center text-white" />
                <input name="name" required defaultValue={editingCategory?.name} placeholder="카테고리 이름" className="flex-1 bg-black border border-gray-800 rounded-xl p-3 text-white" />
              </div>
              <div className="p-4 bg-black/50 rounded-2xl border border-gray-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="is_private" defaultChecked={editingCategory?.is_private} className="w-5 h-5 rounded bg-black text-white" />
                  <span className="text-sm font-medium text-gray-300">비밀 카테고리</span>
                </label>
                <input name="secret_key" type="password" inputMode="numeric" pattern="[0-9]*" defaultValue={editingCategory?.password} placeholder="숫자 PIN 입력" className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-sm text-white" />
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

      {/* 대화면 이미지 슬라이드 & 모바일 스와이프 모달 */}
      {zoomedData && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-0 md:p-4 select-none" 
          onClick={() => setZoomedData(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center">
            {/* 닫기 버튼 */}
            <button onClick={() => setZoomedData(null)} className="absolute top-6 right-6 z-50 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-colors shadow-2xl backdrop-blur-md"><X size={24} /></button>
            
            {/* 이미지 영역 (스와이프 이벤트 탑재) */}
            <div 
              className="relative w-full h-full md:h-[85vh] flex items-center justify-center overflow-hidden"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onClick={(e) => e.stopPropagation()} 
            >
              {zoomedData.images.length > 1 && (
                <>
                  <button onClick={(e) => handleZoomSlide(e, -1)} className="hidden md:flex absolute left-4 z-10 bg-black/50 text-white p-4 rounded-full hover:bg-black/80 transition-all border border-white/10"><ChevronLeft size={32} /></button>
                  <button onClick={(e) => handleZoomSlide(e, 1)} className="hidden md:flex absolute right-4 z-10 bg-black/50 text-white p-4 rounded-full hover:bg-black/80 transition-all border border-white/10"><ChevronRight size={32} /></button>
                </>
              )}
              
              <img 
                src={zoomedData.images[zoomedData.index].image_url} 
                alt="zoomed" 
                className="max-w-full max-h-full object-contain md:rounded-2xl shadow-2xl transition-transform duration-300" 
              />
            </div>

            {/* 하단 동그라미 인디케이터 */}
            {zoomedData.images.length > 1 && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2.5 bg-black/60 px-5 py-3 rounded-full backdrop-blur-md border border-white/10" onClick={(e) => e.stopPropagation()}>
                {zoomedData.images.map((_, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setZoomedData({ ...zoomedData, index: idx })}
                    className={`h-2 rounded-full transition-all ${idx === zoomedData.index ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}