"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Copy, Eye, EyeOff, ExternalLink, Plus, X, Trash2, Image as ImageIcon, Settings, Edit2 } from 'lucide-react';

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('전체');
  const [showPw, setShowPw] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // --- 여기서부터 추가된 카테고리 관리 상태 ---
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  // ----------------------------------------

  const [newItem, setNewItem] = useState({
    title: '', category_id: '', type: 'link', url: '', login_id: '', login_pw: '', content: '', image_url: ''
  });

  useEffect(() => { fetchInitialData(); }, []);

  async function fetchInitialData() {
    const { data: catData } = await supabase.from('categories').select('*').order('display_order');
    setCategories(catData || []);
    if (catData?.length > 0) setNewItem(prev => ({ ...prev, category_id: catData[0].id }));
    const { data: itemData } = await supabase.from('dashboard_items').select('*').order('created_at', { ascending: false });
    setItems(itemData || []);
  }

  // --- 추가된 카테고리 관리 함수들 ---
  async function handleDeleteCategory(id) {
    if (confirm('이 카테고리를 삭제하면 포함된 모든 정보도 삭제됩니다. 계속할까요?')) {
      await supabase.from('categories').delete().eq('id', id);
      fetchInitialData();
    }
  }

  async function handleSaveCategory(e) {
    e.preventDefault();
    const name = e.target.name.value;
    const icon = e.target.icon.value;

    if (editingCategory) {
      await supabase.from('categories').update({ name, icon }).eq('id', editingCategory.id);
    } else {
      await supabase.from('categories').insert([{ name, icon, display_order: categories.length + 1 }]);
    }
    setEditingCategory(null);
    e.target.reset();
    fetchInitialData();
  }
  // ------------------------------

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;
    let { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
    if (uploadError) {
      alert('업로드 실패: ' + uploadError.message);
    } else {
      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      setNewItem({ ...newItem, image_url: data.publicUrl, type: 'image' });
    }
    setUploading(false);
  }

  async function handleAddItem(e) {
    e.preventDefault();
    const { error } = await supabase.from('dashboard_items').insert([newItem]);
    if (error) alert('저장 실패!');
    else {
      setIsModalOpen(false);
      setNewItem({ ...newItem, title: '', url: '', login_id: '', login_pw: '', content: '', image_url: '', type: 'link' });
      fetchInitialData();
    }
  }

  async function handleDelete(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
      await supabase.from('dashboard_items').delete().eq('id', id);
      fetchInitialData();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] via-[#0f1117] to-[#1a1c24] text-gray-100 p-4 pb-24 font-sans">
      
      <header className="sticky top-0 bg-transparent py-12 z-10 flex flex-col items-center text-center">
        <h1 className="text-6xl md:text-7xl font-black mb-10 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 drop-shadow-[0_10px_20px_rgba(255,255,255,0.15)]">
          The Archive
        </h1>
        
        {/* 카테고리 중앙 정렬 및 설정 버튼 추가 */}
        <div className="flex justify-center items-center gap-3 w-full px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-full">
            <button 
              onClick={() => setFilter('전체')} 
              className={`px-6 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 ${filter === '전체' ? 'bg-white text-black font-bold shadow-[0_0_25px_rgba(255,255,255,0.4)] scale-105' : 'bg-white/5 text-gray-400 backdrop-blur-lg border border-white/10 hover:bg-white/10'}`}
            >
              전체
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setFilter(cat.name)} 
                className={`px-6 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 ${filter === cat.name ? 'bg-white text-black font-bold shadow-[0_0_25px_rgba(255,255,255,0.4)] scale-105' : 'bg-white/5 text-gray-400 backdrop-blur-lg border border-white/10 hover:bg-white/10'}`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
          
          {/* 설정 버튼 */}
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all backdrop-blur-lg"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {items.filter(item => filter === '전체' || item.category_id === categories.find(c => c.name === filter)?.id).map(item => (
          <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl relative group">
            <button onClick={() => handleDelete(item.id)} className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 size={18} />
            </button>
            <div className="mb-4">
              <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full">
                {categories.find(c => c.id === item.category_id)?.name}
              </span>
            </div>
            {item.image_url && <img src={item.image_url} className="w-full h-48 object-cover rounded-2xl mb-4 border border-gray-800" alt="uploaded" />}
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              {item.title} {item.url && <a href={item.url} target="_blank"><ExternalLink size={16} className="text-gray-500" /></a>}
            </h3>
            {item.login_id && (
               <div className="space-y-3 bg-black/50 rounded-2xl p-4 border border-gray-800/50 mt-2 text-sm text-gray-300">
                 <div className="flex justify-between items-center"><span>ID: {item.login_id}</span><button onClick={() => navigator.clipboard.writeText(item.login_id)}><Copy size={14} /></button></div>
                 <div className="flex justify-between items-center pt-2 border-t border-gray-800/30">
                   <span>PW: {showPw[item.id] ? item.login_pw : '••••••••'}</span>
                   <div className="flex gap-2">
                     <button onClick={() => setShowPw(p => ({...p, [item.id]: !p[item.id]}))}>{showPw[item.id] ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                     <button onClick={() => navigator.clipboard.writeText(item.login_pw)}><Copy size={14} /></button>
                   </div>
                 </div>
               </div>
            )}
            {item.content && <p className="text-sm text-gray-400 mt-4 leading-relaxed">{item.content}</p>}
          </div>
        ))}
      </main>

      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-10 right-8 w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 z-20"><Plus size={32} /></button>

      {/* 정보 추가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 w-full max-w-md rounded-3xl p-6 border border-gray-800 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">정보 추가하기</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4">
              <input required placeholder="제목" className="w-full bg-black border border-gray-800 rounded-xl p-3" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} />
              <select className="w-full bg-black border border-gray-800 rounded-xl p-3" value={newItem.category_id} onChange={e => setNewItem({...newItem, category_id: e.target.value})}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="border-2 border-dashed border-gray-800 rounded-xl p-4 text-center">
                {newItem.image_url ? (
                  <div className="relative inline-block"><img src={newItem.image_url} className="h-24 rounded-lg" /><button onClick={() => setNewItem({...newItem, image_url: '', type: 'link'})} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"><X size={12} /></button></div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2">
                    <ImageIcon className="text-gray-500" />
                    <span className="text-xs text-gray-500">{uploading ? '업로드 중...' : '이미지 캡처본 업로드'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                )}
              </div>
              <input placeholder="URL" className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm" value={newItem.url} onChange={e => setNewItem({...newItem, url: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="ID" className="bg-black border border-gray-800 rounded-xl p-3 text-sm" value={newItem.login_id} onChange={e => setNewItem({...newItem, login_id: e.target.value})} />
                <input placeholder="PW" className="bg-black border border-gray-800 rounded-xl p-3 text-sm" value={newItem.login_pw} onChange={e => setNewItem({...newItem, login_pw: e.target.value})} />
              </div>
              <textarea placeholder="메모" className="w-full bg-black border border-gray-800 rounded-xl p-3 h-20 text-sm" value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} />
              <button type="submit" className="w-full bg-white text-black font-bold p-4 rounded-xl active:scale-95" disabled={uploading}>저장하기</button>
            </form>
          </div>
        </div>
      )}

      {/* 카테고리 관리 모달 */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">카테고리 관리</h2>
              <button onClick={() => {setIsCategoryModalOpen(false); setEditingCategory(null);}}><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveCategory} className="mb-8 space-y-3 text-left">
              <div className="flex gap-2 text-black">
                <input name="icon" defaultValue={editingCategory?.icon} placeholder="Emoji" className="w-20 bg-black border border-gray-800 rounded-xl p-3 text-center text-white" required />
                <input name="name" defaultValue={editingCategory?.name} placeholder="카테고리 이름" className="flex-1 bg-black border border-gray-800 rounded-xl p-3 text-white" required />
              </div>
              <button type="submit" className="w-full bg-white text-black font-bold p-3 rounded-xl active:scale-95 transition-all">
                {editingCategory ? '수정 완료' : '새 카테고리 추가'}
              </button>
            </form>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar text-left">
              {categories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-lg">{cat.icon} {cat.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCategory(cat)} className="p-2 text-gray-500 hover:text-blue-400"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}