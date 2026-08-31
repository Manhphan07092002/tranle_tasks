import { useState, useCallback } from 'react';
import { ContractProduct, ContractType, DocumentChecklist } from '../../services/contractService';
import { apiFetch } from '../../services/api';

export interface ContractFormState {
  contractNumber: string;
  clientName: string;
  contractName: string;
  preTaxValue: number;
  vatRate: number;
  postTaxValue: number;
  invoiceDate: string;
  invoiceNumber: string;
  products: ContractProduct[];
  status: string;
  attachments: string[];
  paidAmount: number;
  projectId: string;
  contractType: ContractType;
  supplierName: string;
  documentChecklist: DocumentChecklist;
  linkedInputContractIds?: string[];
}

const INITIAL_FORM: ContractFormState = {
  contractNumber: '', clientName: '', contractName: '',
  preTaxValue: 0, vatRate: 10, postTaxValue: 0,
  invoiceDate: '', invoiceNumber: '',
  products: [], status: 'draft', attachments: [],
  paidAmount: 0, projectId: '',
  contractType: 'output', supplierName: '',
  documentChecklist: {},
  linkedInputContractIds: [],
};

const INITIAL_PRODUCT = { name: '', unit: '', quantity: '1', origin: '', unitPrice: '', vatRate: '8' };

export const useContractForm = () => {
  const [form, setForm] = useState<ContractFormState>(INITIAL_FORM);
  const [newProduct, setNewProduct] = useState(INITIAL_PRODUCT);
  const [editingProductIdx, setEditingProductIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = useCallback((contractType?: ContractType) => {
    setForm({ ...INITIAL_FORM, contractType: contractType || 'output' });
    setNewProduct(INITIAL_PRODUCT);
    setEditingProductIdx(null);
  }, []);

  const handlePreTaxChange = useCallback((val: number) => {
    setForm(f => {
      const totalTax = f.products.reduce((sum, p) => sum + (p.total * (p.vatRate ?? 8) / 100), 0);
      return { ...f, preTaxValue: val, postTaxValue: val + totalTax };
    });
  }, []);

  const handleVatChange = useCallback((val: number) => {
    setForm(f => ({ ...f, vatRate: val, postTaxValue: f.preTaxValue * (1 + val / 100) }));
  }, []);

  const handleEditProduct = useCallback((idx: number) => {
    setForm(f => {
      const p = f.products[idx];
      if (p) {
        setNewProduct({
          name: p.name,
          unit: p.unit || '',
          quantity: String(p.quantity),
          origin: p.origin || '',
          unitPrice: Number(p.unitPrice).toLocaleString('vi-VN'),
          vatRate: String(p.vatRate ?? 8),
        });
        setEditingProductIdx(idx);
      }
      return f;
    });
  }, []);

  const handleAddProduct = useCallback(() => {
    if (!newProduct.name || !newProduct.unitPrice) return;
    const unitPrice = Number(newProduct.unitPrice.replace(/\D/g, '')) || 0;
    const qty = Number(newProduct.quantity) || 1;
    const total = unitPrice * qty;
    const vatRate = Number(newProduct.vatRate) || 0;

    setForm(f => {
      const newList = [...f.products];
      if (editingProductIdx !== null) {
        const oldTotal = newList[editingProductIdx].total;
        newList[editingProductIdx] = {
          ...newList[editingProductIdx],
          name: newProduct.name, unit: newProduct.unit,
          quantity: qty, origin: newProduct.origin,
          unitPrice, total, vatRate,
          isBuyingPriceFallback: false,
        };
        const newPreTax = f.preTaxValue - oldTotal + total;
        const totalTax = newList.reduce((sum, p) => sum + (p.total * (p.vatRate ?? 8) / 100), 0);
        return { ...f, products: newList, preTaxValue: newPreTax, postTaxValue: newPreTax + totalTax };
      } else {
        const newPreTax = f.preTaxValue + total;
        const updatedList = [...newList, {
          name: newProduct.name, unit: newProduct.unit,
          quantity: qty, origin: newProduct.origin,
          unitPrice, total, vatRate,
          isBuyingPriceFallback: false,
        }];
        const totalTax = updatedList.reduce((sum, p) => sum + (p.total * (p.vatRate ?? 8) / 100), 0);
        return { ...f, products: updatedList, preTaxValue: newPreTax, postTaxValue: newPreTax + totalTax };
      }
    });
    setNewProduct(INITIAL_PRODUCT);
    setEditingProductIdx(null);
  }, [newProduct, editingProductIdx]);

  const handleRemoveProduct = useCallback((idx: number) => {
    setForm(f => {
      const list = [...f.products];
      const p = list[idx];
      list.splice(idx, 1);
      const newPreTax = Math.max(0, f.preTaxValue - p.total);
      const totalTax = list.reduce((sum, p) => sum + (p.total * (p.vatRate ?? 8) / 100), 0);
      return { ...f, products: list, preTaxValue: newPreTax, postTaxValue: newPreTax + totalTax };
    });
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('files', f));
      const data: any = await apiFetch('/api/upload', { method: 'POST', body: formData });
      const newUrls = data.files.map((f: any) => f.url);
      setForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...newUrls] }));
    } catch {
      throw new Error('Lỗi khi tải file lên!');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, []);

  const removeAttachment = useCallback((idx: number) => {
    setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }));
  }, []);

  return {
    form, setForm,
    newProduct, setNewProduct,
    editingProductIdx, setEditingProductIdx,
    uploading,
    resetForm,
    handlePreTaxChange, handleVatChange,
    handleEditProduct, handleAddProduct, handleRemoveProduct,
    handleFileUpload, removeAttachment,
    INITIAL_PRODUCT,
  };
};
