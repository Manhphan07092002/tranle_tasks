import { useState, useCallback } from 'react';
import { Contract, ContractProduct } from '../../../services/contractService';

interface UseContractPickerProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  contracts: Contract[];
  catalogProducts: any[];
  isInput: boolean;
  handlePreTaxChange: (val: number) => void;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function useContractPicker({
  form,
  setForm,
  contracts,
  catalogProducts,
  isInput,
  handlePreTaxChange,
  showToast,
}: UseContractPickerProps) {
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);
  const [showInputPicker, setShowInputPicker] = useState(false);

  const handleSelectFromInputContract = useCallback((products: ContractProduct[], contractId: string) => {
    const srcContract = contracts.find(c => c.id === contractId);
    const contractNumberTrimmed = srcContract?.contractNumber?.trim() || '';

    let triggeredFallback = false;
    const newProducts = products.map((p, idx) => {
      const expectedImportCode = `${contractNumberTrimmed}-${idx + 1}`;
      let dbProd = catalogProducts.find(cp => cp.importCode === expectedImportCode);
      if (!dbProd) {
        dbProd = catalogProducts.find(cp => cp.name.trim().toLowerCase() === p.name.trim().toLowerCase());
      }
      const hasSalePrice = dbProd && dbProd.salePrice && Number(dbProd.salePrice) > 0;
      const suggestedPrice = hasSalePrice ? Number(dbProd.salePrice) : Number(p.unitPrice);
      const isFallback = !hasSalePrice;

      if (isFallback) triggeredFallback = true;

      return {
        name: p.name,
        unit: p.unit || '',
        origin: p.origin || '',
        quantity: p.quantity || 1,
        unitPrice: suggestedPrice,
        total: (p.quantity || 1) * suggestedPrice,
        exportedQuantity: p.quantity || 1,
        isBuyingPriceFallback: isFallback,
        sourceProductId: dbProd?.id || '',
        sourceProductName: dbProd?.name || '',
        importCode: dbProd?.importCode || expectedImportCode
      };
    });

    if (triggeredFallback && showToast) {
      showToast('error', '⚠️ Phát hiện sản phẩm chưa có giá bán gợi ý! Đã đề xuất tạm thời bằng giá mua. Bạn cần thay đổi giá bán!');
    }

    setForm((f: any) => {
      const currentLinked = f.linkedInputContractIds || [];
      const newLinked = currentLinked.includes(contractId) ? currentLinked : [...currentLinked, contractId];
      return {
        ...f,
        products: [...f.products, ...newProducts],
        linkedInputContractIds: newLinked
      };
    });

    // Auto update totals
    const preTax = [...form.products, ...newProducts].reduce((sum: number, item: any) => sum + (item.total || 0), 0);
    handlePreTaxChange(preTax);
  }, [form, contracts, catalogProducts, handlePreTaxChange, showToast]);

  const handleSelectFromWarehouse = useCallback((selectedItems: { product: any; quantity: number }[]) => {
    const newProducts = selectedItems.map(item => {
      // Find output contracts that have this product (excluding cancelled)
      const match = contracts
        .filter(c => (c.contractType || 'output') === 'output' && c.status !== 'cancelled')
        .flatMap(c => c.products || [])
        .find(cp => cp.name.trim().toLowerCase() === item.product.name.trim().toLowerCase());
      const salePrice = match ? match.unitPrice : (item.product.salePrice || item.product.defaultPrice || 0);

      return {
        name: item.product.name,
        unit: item.product.unit || '',
        origin: item.product.origin || '',
        quantity: item.quantity,
        unitPrice: salePrice,
        total: item.quantity * salePrice,
        exportedQuantity: item.quantity,
        sourceProductId: item.product.id,
        sourceProductName: item.product.name,
        importCode: item.product.importCode
      };
    });

    setForm((f: any) => ({
      ...f,
      products: [...f.products, ...newProducts],
      preTaxValue: f.preTaxValue + newProducts.reduce((sum, p) => sum + p.total, 0)
    }));
  }, [form, contracts]);

  return {
    showWarehousePicker,
    setShowWarehousePicker,
    showInputPicker,
    setShowInputPicker,
    handleSelectFromInputContract,
    handleSelectFromWarehouse,
  };
}