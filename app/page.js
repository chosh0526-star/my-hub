"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Copy, Eye, EyeOff, ExternalLink, Plus, X, Trash2, Image as ImageIcon } from 'lucide-react';

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('전체');
  const [showPw, setShowPw] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  // 이미지 업로드 함수
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
    // 1. 배경을 깊이감 있는 그라데이션으로 변경 (bg-gradient-to-br)
    <div className="min-h-screen bg-gradient-to-br from-[#000000] via-[#0f1117] to-[#1a1c24] text-gray-100 p-4 pb-24 font-sans">
      
      {/* 2. 헤더 부분의 이름을 새로운 이름으로 변경 */}
      <header className="sticky top-0 bg-transparent py-4 z-10">
        <h1 className="text-3xl font-extrabold mb-4 ml-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
          The Archive {/* <--- 여기서 이름을 추천받은 이름으로 바꾸세요! */}
        </h1>
        
        {/* 카테고리 버튼들 배경도 살짝 더 투명하게 처리 */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <button 
            onClick={() => setFilter('전체')} 
            className={`px-5 py-2 rounded-full whitespace-nowrap transition-all ${filter === '전체' ? 'bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-white/5 text-gray-400 backdrop-blur-md hover:bg-white/10'}`}
          >
            전체
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => setFilter(cat.name)} 
              className={`px-5 py-2 rounded-full whitespace-nowrap transition-all ${filter === cat.name ? 'bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-white/5 text-gray-400 backdrop-blur-md hover:bg-white/10'}`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
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
    </div>
  );
}