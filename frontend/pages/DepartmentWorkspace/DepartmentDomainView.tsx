import React, { useState, useEffect, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';
import { SolarFastQuoteModal } from '../../components/solar/SolarFastQuoteModal';

// Dedicated Modular Department Components
import {
  ExecutiveWorkspace,
  SalesWorkspace,
  EngineeringWorkspace,
  EpcWorkspace,
  OmWorkspace,
  ProcurementWorkspace,
  WarehouseWorkspace,
  MarketingWorkspace,
  CustomerCareWorkspace,
  FinanceWorkspace,
  HrWorkspace,
  ItWorkspace,
  LegalWorkspace
} from './departments';

interface DepartmentDomainViewProps {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
}

export const DepartmentDomainView: React.FC<DepartmentDomainViewProps> = ({
  departmentId,
  departmentName,
  departmentCode
}) => {
  const { user } = useAuth();
  const {
    projects,
    contracts,
    tasks,
    revenueReports,
    users,
    teams,
    positions,
    departmentRequests,
    approvals,
    taskTemplates
  } = useData();

  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isFastQuoteOpen, setIsFastQuoteOpen] = useState(false);

  // Fetch products from MySQL
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await apiFetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setProducts(Array.isArray(data) ? data : (data.products || []));
        }
      } catch (err) {
        // Fallback
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    };
    fetchProducts();
    return () => { isMounted = false; };
  }, []);

  // Filter department contracts & revenue
  const deptContracts = useMemo(() => {
    return contracts.filter(c =>
      c.departmentId === departmentId ||
      c.department === departmentName ||
      c.department === departmentCode
    );
  }, [contracts, departmentId, departmentName, departmentCode]);

  const totalContractValue = useMemo(() => {
    const list = deptContracts.length > 0 ? deptContracts : contracts;
    return list.reduce((sum, c) => sum + (c.postTaxValue || c.preTaxValue || 0), 0);
  }, [deptContracts, contracts]);

  const totalRevenue = useMemo(() => {
    return revenueReports.reduce((sum, r: any) => sum + (r.actualRevenue || r.amount || r.revenue || 0), 0);
  }, [revenueReports]);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Render individual department UI from dedicated component files
  const renderDepartmentContent = () => {
    switch (departmentId) {
      case 'dept-exec':
        return (
          <ExecutiveWorkspace
            contracts={contracts}
            projects={projects}
            approvals={approvals}
            revenueReports={revenueReports}
            totalContractValue={totalContractValue}
            totalRevenue={totalRevenue}
            formatVND={formatVND}
          />
        );

      case 'dept-sales':
        return (
          <SalesWorkspace
            contracts={contracts}
            deptContracts={deptContracts}
            products={products}
            totalContractValue={totalContractValue}
            formatVND={formatVND}
            onOpenFastQuote={() => setIsFastQuoteOpen(true)}
          />
        );

      case 'dept-eng':
        return (
          <EngineeringWorkspace
            onOpenFastQuote={() => setIsFastQuoteOpen(true)}
          />
        );

      case 'dept-epc':
        return (
          <EpcWorkspace
            projects={projects}
          />
        );

      case 'dept-om':
        return (
          <OmWorkspace />
        );

      case 'dept-proc':
        return (
          <ProcurementWorkspace />
        );

      case 'dept-wh':
        return (
          <WarehouseWorkspace
            products={products}
          />
        );

      case 'dept-mkt':
        return (
          <MarketingWorkspace />
        );

      case 'dept-cs':
        return (
          <CustomerCareWorkspace />
        );

      case 'dept-fin':
        return (
          <FinanceWorkspace />
        );

      case 'dept-hr':
        return (
          <HrWorkspace />
        );

      case 'dept-it':
        return (
          <ItWorkspace />
        );

      case 'dept-legal':
        return (
          <LegalWorkspace
            contracts={contracts}
          />
        );

      default:
        return (
          <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400">
              <Building2 size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {departmentName || 'Phòng ban'} chưa có không gian nghiệp vụ đặc thù
            </h3>
            <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
              Mã phòng ban <span className="font-bold">{departmentCode || departmentId}</span> chưa được cấu hình
              workspace riêng. Vui lòng dùng các tab Tổng quan, Công việc, Yêu cầu và Tài liệu, hoặc liên hệ
              quản trị viên để bổ sung.
            </p>
          </div>
        );
    }
  };

  return (
    <>
      {renderDepartmentContent()}
      <SolarFastQuoteModal
        isOpen={isFastQuoteOpen}
        onClose={() => setIsFastQuoteOpen(false)}
      />
    </>
  );
};
