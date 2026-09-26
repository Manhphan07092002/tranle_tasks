import { useState, useCallback, useMemo, useEffect } from 'react';
import { ContractProduct } from '../../../services/contractService';

interface UseContractProductsProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  editingProductIdx: number | null;
  setEditingProductIdx: React.Dispatch<React.SetStateAction<number | null>>;
  newProduct: any;
  setNewProduct: React.Dispatch<React.SetStateAction<any>>;
  catalogProducts: any[];
  contracts: any[];
  isFormLocked: boolean;
  isInput: boolean;
  handlePreTaxChange: (val: number) => void;
  handleNumericInputChange: (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => void;
  borderColor: string;
  ringColor: string;
  btnColor: string;
  handleAddProduct: () => void;
  handleEditProduct: (idx: number) => void;
  handleRemoveProduct: (idx: number) => void;
}

export function useContractProducts({
  form,
  setForm,
  editingProductIdx,
  setEditingProductIdx,
  newProduct,
  setNewProduct,
  catalogProducts,
  contracts,
  isFormLocked,
  isInput,
  handlePreTaxChange,
  handleNumericInputChange,
  borderColor,
  ringColor,
  btnColor,
  handleAddProduct,
  handleEditProduct,
  handleRemoveProduct,
}: UseContractProductsProps) {
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);
  const [showInputPicker, setShowInputPicker] = useState(false);

  // Auto-fill product details when name changes in edit mode
  useEffect(() => {
    if (!isFormLocked && editingProductIdx !== null && newProduct.name) {
      const val = newProduct.name;
      const catalogMatch = catalogProducts.find(prod => prod.name.trim().toLowerCase() === val.trim().toLowerCase());
      const historyMatch = contracts.flatMap(c => c.products || []).find(prod => prod.name?.trim().toLowerCase() === val.trim().toLowerCase());
      const match = catalogMatch || historyMatch;
      if (match) {
        const updates: any = {};
        if (!newProduct.unit) updates.unit = match.unit || '';
        if (!newProduct.origin) updates.origin = match.origin || '';
        if (!newProduct.unitPrice) {
          let priceVal = '';
          if ('importPrice' in match || 'salePrice' in match) {
            if (isInput && match.importPrice) priceVal = String(match.importPrice);
            else if (!isInput && match.salePrice) priceVal = String(match.salePrice);
            else if (match.defaultPrice !== undefined) priceVal = String(match.defaultPrice);
          } else if ('unitPrice' in match) {
            priceVal = String(match.unitPrice);
          }
          if (priceVal) {
            updates.unitPrice = Number(priceVal.replace(/\D/g, '')).toLocaleString('vi-VN');
          }
        }
        if (Object.keys(updates).length > 0) {
          setNewProduct((prev: any) => ({ ...prev, ...updates }));
        }
      }
    }
  }, [newProduct.name, editingProductIdx, catalogProducts, contracts, isFormLocked, isInput, setNewProduct]);

  const currentLineTotal = useMemo(() => {
    if (!newProduct) return 0;
    const qty = Number(newProduct.quantity) || 1;
    const price = Number(newProduct.unitPrice?.replace(/\D/g, '')) || 0;
    return qty * price;
  }, [newProduct]);

  return {
    showWarehousePicker,
    setShowWarehousePicker,
    showInputPicker,
    setShowInputPicker,
    currentLineTotal,
    isEditing: editingProductIdx !== null,
    borderColor,
    ringColor,
    btnColor,
  };
}