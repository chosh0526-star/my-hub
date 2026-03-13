"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
// 🔥 폴더용 아이콘(FolderOpen, FolderPlus, ArrowLeft, Folder)이 추가되었습니다.
import { Copy, Eye, EyeOff, ExternalLink, Plus, X, Trash2, Image as ImageIcon, Settings, Edit2, Lock, ShieldCheck, Link, FileText, Calendar, Search, Star, ChevronUp, ChevronDown, FolderOpen, FolderPlus, ArrowLeft, Folder } from 'lucide-react';

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subfolders, setSubfolders] = useState([]); // 🔥 세부 폴더 리스트 상태
  const [filter, setFilter] = useState('전체');
  const [currentSubfolder, setCurrentSubfolder] = useState(null); // 🔥 현재 들어와 있는 폴더 상태

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

  // 🔥 폴더 생성 모달 상태
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
    
    // 폴더 데이터 불러오기
    const { data: sfData } = await supabase.from('subfolders').select('*').order('created_at');
    setSubfolders(sfData || []);

    if (catData?.length > 0) {
      setNewItem(prev => ({ ...prev, category_id: catData[0].id }));
    }

    const { data: itemData } = await supabase.from('dashboard_items').select('*').order('created_at', { ascending: false });
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

    setNewItem({
      title: '', 
      category_id: defaultCategoryId,
      subfolder_id: null, // 🔥 새 아이템은 무조건 카테고리 메인에 던져놓기!
      type: 'link', url: '', login_id: '', login_pw: '', content: '', image_url: ''
    });
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

  const openDetail = (item) => {
    setEditingItem({ ...item });
    setIsDetailModalOpen(true);
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
    const finalItem = { 
      ...newItem, 
      url: fixUrl(newItem.url),
      title: newItem.title || (addStep === 'photo' ? '새 사진' : addStep === 'memo' ? '새 메모' : '새 링크') 
    };
    const { error } = await supabase.from('dashboard_items').insert([finalItem]);
    if (error) alert('저장 실패: ' + error.message);
    else { setIsModalOpen(false); fetchInitialData(); }
  }

  const handleAuthConfirm = async (e) => {
    e.preventDefault();
    if (authInput === authModal.target.password) {
      if (authModal.type === 'view') {
        setFilter(authModal.target.name);
        setCurrentSubfolder(null); // 방을 옮기면 서브폴더 진입 상태 해제
      } else if (authModal.type === 'delete') {
        await supabase.from('categories').delete().eq('id', authModal.target.id);
        fetchInitialData();
      } else if (authModal.type === 'edit') {
        setEditingCategory(authModal.target);
      }
      setAuthModal({ open: false, type: '', target: null });
    } else alert("인증에 실패했습니다.");
  };

  const handleCategoryClick = (cat) => {
    setCurrentSubfolder(null); // 방을 옮기면 폴더에서 빠져나옴
    if (cat.is_private) {
      setAuthModal({ open: true, type: 'view', target: cat });
      setAuthInput('');
    } else setFilter(cat.name);
  };

  // 🔥 세부 폴더 생성 로직
  const handleCreateSubfolder = async (e) => {
    e.preventDefault();
    const activeCat = categories.find(c => c.name === filter);
    if (!activeCat) return;

    const { error } = await supabase.from('subfolders').insert([{ name: newSubfolderName, category_id: activeCat.id }]);
    if (error) alert('폴더 생성 실패!');
    else {
      setIsSubfolderModalOpen(false);
      setNewSubfolderName('');
      fetchInitialData();
    }
  };

  // 🔥 세부 폴더 삭제 로직
  const handleDeleteSubfolder = async (e, id) => {
    e.stopPropagation();
    if (confirm('폴더를 삭제하시겠습니까?\n(폴더 안의 내용물은 삭제되지 않고 상위 위치로 빠져나옵니다!)')) {
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
    if (cat.is_private) {
      setAuthModal({ open: true, type: 'edit', target: cat });
      setAuthInput('');
    } else setEditingCategory(cat);
  };

  async function handleSaveCategory(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const icon = formData.get('icon') || '📁';
    const is_private = formData.get('is_private') === 'on';
    const password = formData.get('secret_key');

    if (editingCategory) await supabase.from('categories').update({ name, icon, is_private, password }).eq('id', editingCategory.id);
    else await supabase.from('categories').insert([{ name, icon, is_private, password, display_order: categories.length + 1 }]);
    setEditingCategory(null); e.target.reset(); fetchInitialData();
  }

  async function moveCategory(index, direction) {
    if (index + direction < 0 || index + direction >= categories.length) return;
    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[index + direction];
    newCategories[index + direction] = temp;
    setCategories(newCategories);

    await Promise.all(newCategories.map((cat, i) => supabase.from('categories').update({ display_order: i + 1 }).eq('id', cat.id)));
    fetchInitialData();
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    let fileExt = 'jpg';
    if (file.name && file.name.includes('.')) fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;
    
    let { error } = await supabase.storage.from('images').upload(filePath, file);
    if (error) alert('업로드 실패: ' + error.message);
    else {
      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      if (isDetailModalOpen) setEditingItem({ ...editingItem, image_url: data.publicUrl });
      else setNewItem({ ...newItem, image_url: data.publicUrl, type: 'image' });
    }
    setUploading(false);
  }

  async function handleDelete(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
      await supabase.from('dashboard_items').delete().eq('id', id);
      setIsDetailModalOpen(false); fetchInitialData();
    }
  }

  const handleCopyUrl = (e, url) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => alert('URL이 클립보드에 복사되었습니다! 📋')).catch(err => alert('복사에 실패했습니다.'));
  };

  // 🔥 현재 화면에 띄울 정보들을 필터링하는 로직 (폴더 안쪽인지 바깥쪽인지 판별)
  const displayedItems = items.filter(item => {
    const itemCat = categories.find(c => c.id === item.category_id);
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch = item.title?.toLowerCase().includes(lowerSearch) || item.content?.toLowerCase().includes(lowerSearch);
    
    if (filter === '★즐겨찾기') return item.is_favorite && matchesSearch;
    
    if (filter === '전체') {
      const isVisibleCategory = !itemCat?.is_private && itemCat?.name !== '비밀창고';
      return isVisibleCategory && matchesSearch; // 전체 모드에선 폴더 무시하고 다 보여줌
    }

    // 특정 카테고리에 들어왔을 때
    if (itemCat?.name === filter) {
      if (currentSubfolder) {
        // 폴더 안에 들어왔을 땐 해당 폴더 소속만 보여줌
        return item.subfolder_id === currentSubfolder.id && matchesSearch;
      } else {
        // 카테고리 메인일 땐 폴더에 안 들어간(null) 녀석들만 보여줌
        return item.subfolder_id === null && matchesSearch;
      }
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-[#020617] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] text-gray-100 pb-24 font-sans text-center selection:bg-blue-500/30">
      
      <header className="sticky top-0 z-30 flex flex-col items-center pt-14 pb-4 bg-[#020617]/60 backdrop-blur-2xl border-b border-white/5 shadow-2xl w-full">
        <h1 onClick={handleTitleClick} className="text-6xl md:text-7xl font-black mb-2 px-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 drop-shadow-[0_10px_20px_rgba(255,255,255,0.15)] cursor-pointer select-none active:scale-95 transition-transform">
          The Archive
        </h1>
        
        <div className="flex justify-center items-center gap-2 w-full px-4 overflow-x-auto no-scrollbar pt-4 pb-6 -mb-4">
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { setFilter('전체'); setCurrentSubfolder(null); }} className={`px-4 py-1.5 text-sm rounded-full transition-all ${filter === '전체' ? 'bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'bg-white/5 text-gray-400 backdrop-blur-lg border border-white/10 hover:bg-white/10'}`}>전체</button>
            <button onClick={() => { setFilter('★즐겨찾기'); setCurrentSubfolder(null); }} className={`px-4 py-1.5 text-sm rounded-full transition-all ${filter === '★즐겨찾기' ? 'bg-yellow-400 text-black font-bold shadow-[0_0_15px_rgba(250,204,21,0.4)] scale-105' : 'bg-white/5 text-yellow-500 backdrop-blur-lg border border-yellow-500/20 hover:bg-yellow-400/20'}`}>★ 즐겨찾기</button>
            
            {categories.filter(cat => cat.name !== '비밀창고').map(cat => (
              <button key={cat.id} onClick={() => handleCategoryClick(cat)} className={`px-4 py-1.5 text-sm rounded-full transition-all flex items-center gap-1.5 ${filter === cat.name ? 'bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'bg-white/5 text-gray-400 backdrop-blur-lg border border-white/10 hover:bg-white/10'}`}>
                {cat.icon} {cat.name} {cat.is_private && <Lock size={12} />}
              </button>
            ))}
          </div>
          <button onClick={() => setIsCategoryModalOpen(true)} className="p-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all backdrop-blur-lg shrink-0"><Settings size={16} /></button>
        </div>

        <div className="w-full max-w-md px-4 mt-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={18} />
            <input type="text" placeholder="제목이나 메모를 검색하세요" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:bg-white/10 focus:border-white/20 outline-none transition-all backdrop-blur-xl placeholder:text-gray-600" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={16} /></button>}
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 text-left px-4">
        
        {/* 🔥 폴더 진입했을 때 나오는 상단 [이전으로 가기] 바 */}
        {currentSubfolder && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 mb-2 flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-[2rem] p-4 shadow-xl">
            <button onClick={() => setCurrentSubfolder(null)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-white/5 px-4 py-3 rounded-2xl">
              <ArrowLeft size={20} /> <span className="text-sm font-bold">카테고리로 나가기</span>
            </button>
            <h2 className="text-2xl font-bold flex items-center gap-2 text-white"><FolderOpen className="text-blue-400"/> {currentSubfolder.name}</h2>
          </div>
        )}

        {/* 🔥 카테고리 메인 화면일 때 보여주는 [폴더 카드들] */}
        {filter !== '전체' && filter !== '★즐겨찾기' && !currentSubfolder && (
          <>
            {subfolders.filter(sf => sf.category_id === categories.find(c => c.name === filter)?.id).map(sf => (
              <div key={sf.id} onClick={() => setCurrentSubfolder(sf)} className="bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-xl relative group cursor-pointer hover:border-blue-500/50 hover:bg-gray-800/80 transition-all flex flex-col items-center justify-center min-h-[14rem]">
                <button onClick={(e) => handleDeleteSubfolder(e, sf.id)} className="absolute top-5 right-5 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={20} />
                </button>
                <Folder className="text-blue-400 mb-4 w-16 h-16 drop-shadow-[0_5px_15px_rgba(59,130,246,0.3)]" />
                <h3 className="text-xl font-bold text-white">{sf.name}</h3>
                <span className="text-xs text-gray-500 mt-2">폴더 열기</span>
              </div>
            ))}
            
            {/* 새 폴더 추가 버튼 카드 */}
            <div onClick={() => setIsSubfolderModalOpen(true)} className="bg-transparent border-2 border-dashed border-gray-800 rounded-3xl p-6 shadow-xl relative group cursor-pointer hover:border-white/30 hover:bg-white/5 transition-all flex flex-col items-center justify-center min-h-[14rem] opacity-70 hover:opacity-100">
              <FolderPlus className="text-gray-500 mb-4 w-12 h-12 group-hover:text-gray-300 transition-colors" />
              <h3 className="text-lg font-bold text-gray-500 group-hover:text-gray-300 transition-colors">새 폴더 만들기</h3>
            </div>
          </>
        )}

        {/* 📚 일반 정보 카드들 */}
        {displayedItems.map(item => (
          <div key={item.id} onClick={() => openDetail(item)} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl relative group cursor-pointer hover:border-white/20 transition-all">
            <button onClick={(e) => toggleFavorite(e, item)} className="absolute top-5 right-5 text-gray-600 hover:text-yellow-400 transition-colors z-10">
              <Star size={22} fill={item.is_favorite ? "currentColor" : "none"} className={item.is_favorite ? "text-yellow-400" : ""} />
            </button>
            
            <div className="mb-4 flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full">
                {categories.find(c => c.id === item.category_id)?.name}
              </span>
              {/* 폴더 안에 있지 않은데 소속된 폴더가 있다면 뱃지 표시 (전체 보기 용) */}
              {item.subfolder_id && !currentSubfolder && (
                <span className="text-[10px] font-bold tracking-widest uppercase text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full flex items-center gap-1">
                  <Folder size={10}/> {subfolders.find(s => s.id === item.subfolder_id)?.name}
                </span>
              )}
              <div className="text-[9px] text-gray-600 font-mono">{new Date(item.created_at).toLocaleDateString()}</div>
            </div>

            {item.image_url && (
              <img src={item.image_url} className="w-full h-48 object-cover rounded-2xl mb-4 border border-gray-800 cursor-zoom-in hover:opacity-90 transition-opacity" alt="uploaded" onClick={(e) => { e.stopPropagation(); setZoomedImage(item.image_url); }} />
            )}
            
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span className="truncate">{item.title}</span>
              {item.url && (
                <div className="flex items-center gap-2 ml-1 shrink-0">
                  <a href={item.url} target="_blank" onClick={(e) => e.stopPropagation()} title="새 창으로 열기"><ExternalLink size={18} className="text-gray-500 hover:text-white transition-colors" /></a>
                  <button onClick={(e) => handleCopyUrl(e, item.url)} title="URL 복사"><Copy size={18} className="text-gray-500 hover:text-blue-400 transition-colors" /></button>
                </div>
              )}
            </h3>
            {item.login_id && <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-1"><Lock size={10}/> 계정 정보 포함됨</div>}
            {item.content && <p className="text-sm text-gray-400 mt-4 leading-relaxed line-clamp-2">{item.content}</p>}
          </div>
        ))}
      </main>

      {/* 새 카드 작성 (+) 버튼 */}
      <button onClick={openAddModal} className="fixed bottom-10 right-8 w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 z-20"><Plus size={32} /></button>

      {/* 🔥 세부 폴더 생성 모달 */}
      {isSubfolderModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-center">
          <div className="bg-gray-900 w-full max-sm rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <FolderPlus className="text-blue-400 mx-auto mb-6" size={32} />
            <h2 className="text-2xl font-bold mb-6">새 폴더 만들기</h2>
            <form onSubmit={handleCreateSubfolder} className="space-y-4">
              <input autoFocus required type="text" placeholder="폴더 이름을 입력하세요" className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-center text-xl outline-none text-white focus:border-blue-500/50 transition-colors" value={newSubfolderName} onChange={(e) => setNewSubfolderName(e.target.value)} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsSubfolderModalOpen(false)} className="flex-1 bg-gray-800 text-gray-300 font-bold p-4 rounded-2xl">취소</button>
                <button type="submit" className="flex-1 bg-white text-black font-bold p-4 rounded-2xl">생성하기</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 보안 인증 모달 */}
      {authModal.open && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-center">
          <div className="bg-gray-900 w-full max-sm rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <ShieldCheck className="text-blue-400 mx-auto mb-6" size={32} />
            <h2 className="text-2xl font-bold mb-2">{authModal.target.icon} {authModal.target.name}</h2>
            <form onSubmit={handleAuthConfirm} className="space-y-4">
              <input autoFocus type="text" autoComplete="one-time-code" autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="••••" className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-center text-xl tracking-[0.5em] outline-none text-white [-webkit-text-security:disc]" value={authInput} onChange={(e) => setAuthInput(e.target.value)} />
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setAuthModal({ open: false, type: '', target: null })} className="flex-1 bg-gray-800 text-gray-300 font-bold p-4 rounded-2xl">취소</button><button type="submit" className="flex-1 bg-white text-black font-bold p-4 rounded-2xl">확인</button></div>
            </form>
          </div>
        </div>
      )}

      {/* 카드 추가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold">{addStep === 'choice' ? '무엇을 기록할까요?' : '정보 입력'}</h2><button onClick={() => setIsModalOpen(false)}><X size={24} /></button></div>
            {addStep === 'choice' ? (
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => setAddStep('url')} className="flex items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all text-left group"><div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform"><Link size={24} /></div><div><div className="font-bold text-lg">URL 및 계정</div><div className="text-sm text-gray-500">사이트 주소와 로그인 정보</div></div></button>
                <button onClick={() => setAddStep('photo')} className="flex items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all text-left group"><div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"><ImageIcon size={24} /></div><div><div className="font-bold text-lg">사진 및 스크린샷</div><div className="text-sm text-gray-500">이미지 파일 업로드</div></div></button>
                <button onClick={() => setAddStep('memo')} className="flex items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all text-left group"><div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform"><FileText size={24} /></div><div><div className="font-bold text-lg">심플 메모</div><div className="text-sm text-gray-500">텍스트 중심의 간단한 기록</div></div></button>
              </div>
            ) : (
              <form onSubmit={handleAddItem} className="space-y-4 text-left">
                <button type="button" onClick={() => setAddStep('choice')} className="text-sm text-gray-500 hover:text-white mb-2">← 뒤로가기</button>
                <select className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-white/50 outline-none transition-colors" value={newItem.category_id} onChange={e => setNewItem({...newItem, category_id: e.target.value})}><option value="" disabled>카테고리 선택</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                <input required placeholder="제목을 입력하세요" className="w-full bg-black border border-gray-800 rounded-xl p-4 text-lg font-bold text-white" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                {addStep === 'url' && ( <div className="space-y-3"><input required placeholder="naver.com" className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={newItem.url} onChange={e => setNewItem({...newItem, url: e.target.value})} /><div className="grid grid-cols-2 gap-2"><input placeholder="ID (선택)" className="bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={newItem.login_id} onChange={e => setNewItem({...newItem, login_id: e.target.value})} /><input placeholder="PW (선택)" className="bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={newItem.login_pw} onChange={e => setNewItem({...newItem, login_pw: e.target.value})} /></div></div> )}
                {addStep === 'photo' && ( <div className="border-2 border-dashed border-gray-800 rounded-2xl p-8 text-center bg-black/30">{newItem.image_url ? ( <div className="relative inline-block"><img src={newItem.image_url} className="h-32 rounded-xl border border-white/10" /><button onClick={() => setNewItem({...newItem, image_url: ''})} className="absolute -top-3 -right-3 bg-red-500 rounded-full p-1.5"><X size={14} /></button></div> ) : ( <label className="cursor-pointer flex flex-col items-center gap-3"><ImageIcon size={24} className="text-gray-400" /><span className="text-sm text-gray-400">{uploading ? '업로드 중...' : '터치하여 사진 선택'}</span><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} /></label> )}</div> )}
                {addStep === 'memo' && ( <textarea required placeholder="내용을 자유롭게 적어주세요" className="w-full bg-black border border-gray-800 rounded-xl p-4 h-40 text-sm leading-relaxed text-white" value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} /> )}
                <button type="submit" className="w-full bg-white text-black font-extrabold p-5 rounded-2xl active:scale-95 transition-all mt-4" disabled={uploading}>기록 완료</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 🔥 상세 정보 및 수정 모달 (폴더 이동 드롭다운 추가!) */}
      {isDetailModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] text-left">
            <div className="flex justify-between items-start mb-6">
              <div><div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Calendar size={12} /> <span>{formatDate(editingItem.created_at)}</span></div><h2 className="text-2xl font-bold">정보 수정 / 이동</h2></div>
              <button onClick={() => setIsDetailModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 ml-1">상위 카테고리</label>
                  {/* 카테고리를 바꾸면 폴더 위치가 초기화 되도록 스마트하게 처리 */}
                  <select className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={editingItem.category_id} onChange={e => setEditingItem({...editingItem, category_id: e.target.value, subfolder_id: null})}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 ml-1">세부 폴더 위치</label>
                  <select className="w-full bg-black border border-blue-900/50 rounded-xl p-3 text-sm text-blue-100" value={editingItem.subfolder_id || ''} onChange={e => setEditingItem({...editingItem, subfolder_id: e.target.value === '' ? null : e.target.value})}>
                    <option value="">📁 지정 안 함 (메인)</option>
                    {/* 선택된 카테고리에 속한 폴더들만 보여주기 */}
                    {subfolders.filter(sf => sf.category_id === editingItem.category_id).map(sf => (
                      <option key={sf.id} value={sf.id}>{sf.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1"><label className="text-xs text-gray-500 ml-1">제목</label><input required className="w-full bg-black border border-gray-800 rounded-xl p-3 font-bold text-white" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} /></div>
              {editingItem.image_url && (
                <div className="relative group"><img src={editingItem.image_url} className="w-full h-40 object-cover rounded-xl border border-gray-800" /><label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all rounded-xl"><span className="text-xs font-bold">사진 교체</span><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label></div>
              )}
              <div className="space-y-1"><label className="text-xs text-gray-500 ml-1">사이트 주소 (URL)</label><input placeholder="naver.com" className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={editingItem.url || ''} onChange={e => setEditingItem({...editingItem, url: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><label className="text-xs text-gray-500 ml-1">ID</label><input className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={editingItem.login_id || ''} onChange={e => setEditingItem({...editingItem, login_id: e.target.value})} /></div><div className="space-y-1"><label className="text-xs text-gray-500 ml-1">PW</label><input className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white" value={editingItem.login_pw || ''} onChange={e => setEditingItem({...editingItem, login_pw: e.target.value})} /></div></div>
              <div className="space-y-1"><label className="text-xs text-gray-500 ml-1">메모</label><textarea className="w-full bg-black border border-gray-800 rounded-xl p-3 h-32 text-sm leading-relaxed text-white" value={editingItem.content || ''} onChange={e => setEditingItem({...editingItem, content: e.target.value})} /></div>
              <div className="flex gap-2 pt-4"><button type="button" onClick={() => handleDelete(editingItem.id)} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all"><Trash2 size={20} /></button><button type="submit" className="flex-1 bg-white text-black font-extrabold p-4 rounded-2xl active:scale-95 transition-all">저장하기</button></div>
            </form>
          </div>
        </div>
      )}

      {/* 카테고리 관리 모달 */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-4 text-left">
          <div className="bg-gray-900 w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold">카테고리 관리</h2><button onClick={() => {setIsCategoryModalOpen(false); setEditingCategory(null);}}><X size={24} /></button></div>
            <form onSubmit={handleSaveCategory} className="mb-8 space-y-4">
              <div className="flex gap-2">
                <input name="icon" defaultValue={editingCategory?.icon} placeholder="📁" className="w-20 bg-black border border-gray-800 rounded-xl p-3 text-center text-white" />
                <input name="name" required defaultValue={editingCategory?.name} placeholder="카테고리 이름" className="flex-1 bg-black border border-gray-800 rounded-xl p-3 text-white" />
              </div>
              <p className="text-[10px] text-gray-500 -mt-2 ml-1">* 이모지를 비워두면 기본 아이콘(📁)으로 설정됩니다.</p>
              <div className="p-4 bg-black/50 rounded-2xl border border-gray-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="is_private" defaultChecked={editingCategory?.is_private} className="w-5 h-5 rounded bg-black text-white" />
                  <span className="text-sm font-medium text-gray-300">비밀 카테고리</span>
                </label>
                <input 
                  name="secret_key" 
                  type="text" 
                  autoComplete="one-time-code" 
                  autoCapitalize="none" 
                  autoCorrect="off" 
                  spellCheck="false" 
                  defaultValue={editingCategory?.password} 
                  placeholder="PIN 입력 (팝업방지)" 
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-sm text-white [-webkit-text-security:disc]" 
                />
              </div>
              <button type="submit" className="w-full bg-white text-black font-bold p-3 rounded-xl">저장</button>
            </form>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {categories.map((cat, index) => (
                <div key={cat.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-lg flex items-center gap-2">{cat.icon} {cat.name} {cat.is_private && <Lock size={14} className="text-gray-500" />}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 bg-black/30 rounded-lg p-1">
                      <button type="button" onClick={() => moveCategory(index, -1)} disabled={index === 0} className={`p-1 rounded hover:bg-white/10 ${index === 0 ? 'text-gray-700' : 'text-gray-400'}`}><ChevronUp size={16}/></button>
                      <button type="button" onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1} className={`p-1 rounded hover:bg-white/10 ${index === categories.length - 1 ? 'text-gray-700' : 'text-gray-400'}`}><ChevronDown size={16}/></button>
                    </div>
                    <div className="w-[1px] h-4 bg-gray-700 mx-1"></div>
                    <button onClick={() => handleEditCategory(cat)} className="text-gray-500 hover:text-blue-400"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 이미지 원본 보기 */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-5xl w-full flex justify-center">
            <button onClick={() => setZoomedImage(null)} className="absolute -top-14 right-0 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X size={24} /></button>
            <img src={zoomedImage} alt="zoomed" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}

    </div>
  );
}