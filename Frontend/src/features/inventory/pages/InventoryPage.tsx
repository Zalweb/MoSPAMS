import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/shared/contexts/DataContext';
import type { Part } from '@/shared/types';

const CATEGORIES = ['Braking', 'Fluids', 'Drivetrain', 'Filtration', 'Ignition', 'Controls', 'Wheels', 'Electrical', 'Engine', 'Body', 'Other'];

export default function Inventory() {
  const { parts, addPart, updatePart, deletePart } = useData();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: 'Other', stock: 0, minStock: 5, price: 0, barcode: '' });

  const filtered = parts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
    const matchesCat = catFilter === 'All' || p.category === catFilter;
    return matchesSearch && matchesCat;
  });

  const openAdd = () => { setEditing(null); setForm({ name: '', category: 'Other', stock: 0, minStock: 5, price: 0, barcode: '' }); setModalOpen(true); };
  const openEdit = (part: Part) => { setEditing(part); setForm({ name: part.name, category: part.category, stock: part.stock, minStock: part.minStock, price: part.price, barcode: part.barcode }); setModalOpen(true); };
  const handleSubmit = () => { if (!form.name.trim()) return; editing ? updatePart(editing.id, form) : addPart(form); setModalOpen(false); };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
        <div>
          <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Inventory</h2>
          <p className="text-[13px] text-[#D6D3D1] mt-0.5">{parts.length} parts in stock</p>
        </div>
        <Button onClick={openAdd} size="sm" className="h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[12px] font-medium px-4 shadow-sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Part
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D6D3D1]" />
          <Input placeholder="Search parts or scan barcode..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 rounded-xl border-[#E7E5E4] bg-white text-[13px] focus:border-[#C4C0BC] focus:ring-0" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-9 px-3.5 rounded-xl border border-[#E7E5E4] text-[13px] bg-white text-[#78716C] focus:outline-none focus:border-[#C4C0BC]">
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F5F5F4]">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase tracking-wider">Part</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase tracking-wider">Category</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase tracking-wider">Stock</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase tracking-wider">Price</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase tracking-wider">Barcode</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAFAF9]">
              {filtered.map(part => {
                const isLow = part.stock <= part.minStock;
                return (
                  <tr key={part.id} className="hover:bg-[#FAFAF9]/60 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[10px] bg-[#F5F5F4] flex items-center justify-center shrink-0 group-hover:bg-[#EFEDEA] transition-colors">
                          <Package className="w-3.5 h-3.5 text-[#A8A29E]" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[#44403C]">{part.name}</p>
                          {isLow && <p className="text-[10px] text-[#F59E0B] font-medium flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />Low stock</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="text-[11px] font-medium text-[#A8A29E] bg-[#F5F5F4] px-2.5 py-[3px] rounded-full">{part.category}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={`text-[13px] font-semibold tabular-nums ${isLow ? 'text-[#F59E0B]' : 'text-[#44403C]'}`}>{part.stock}</span>
                        <div className="w-12 h-[3px] bg-[#F5F5F4] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isLow ? 'bg-[#FBBF24]' : 'bg-[#34D399]'}`} style={{ width: `${Math.min(100, (part.stock / Math.max(part.minStock * 2, 1)) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-[#44403C] tabular-nums">₱{part.price.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-[11px] font-mono text-[#A8A29E]">{part.barcode}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(part)} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#D6D3D1] hover:text-[#78716C] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDelete(part.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#D6D3D1] hover:text-[#EF4444] transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-14 text-center text-[13px] text-[#D6D3D1]">No parts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[20px] border-[#F0EFED] p-6">
          <DialogHeader className="pb-1"><DialogTitle className="text-[15px] font-semibold">{editing ? 'Edit Part' : 'Add New Part'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-3">
            <div><Label className="text-[11px] font-medium text-[#78716C]">Part Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" placeholder="e.g. Brake Pad Set" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[11px] font-medium text-[#78716C]">Category</Label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full mt-1.5 h-9 px-3 rounded-xl border border-[#E7E5E4] text-[13px] bg-white focus:outline-none focus:border-[#C4C0BC]">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><Label className="text-[11px] font-medium text-[#78716C]">Barcode</Label><Input value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] font-mono focus:border-[#C4C0BC] focus:ring-0" placeholder="BRK-001" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-[11px] font-medium text-[#78716C]">Stock</Label><Input type="number" value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value)||0})} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" /></div>
              <div><Label className="text-[11px] font-medium text-[#78716C]">Min Stock</Label><Input type="number" value={form.minStock} onChange={e => setForm({...form, minStock: parseInt(e.target.value)||0})} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" /></div>
              <div><Label className="text-[11px] font-medium text-[#78716C]">Price (₱)</Label><Input type="number" value={form.price} onChange={e => setForm({...form, price: parseInt(e.target.value)||0})} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1 h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[12px] font-medium">{editing ? 'Save Changes' : 'Add Part'}</Button>
              <Button variant="outline" onClick={() => setModalOpen(false)} className="h-9 rounded-xl text-[12px] border-[#E7E5E4] text-[#78716C] hover:bg-[#F5F5F4]">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px] border-[#F0EFED] p-6">
          <DialogHeader><DialogTitle className="text-[15px] font-semibold">Delete Part?</DialogTitle></DialogHeader>
          <p className="text-[13px] text-[#A8A29E] mt-1">This action cannot be undone.</p>
          <div className="flex gap-2 pt-3">
            <Button onClick={() => { if (confirmDelete) { deletePart(confirmDelete); setConfirmDelete(null); } }} variant="destructive" className="flex-1 h-9 rounded-xl text-[12px]">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-9 rounded-xl text-[12px] border-[#E7E5E4]">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
