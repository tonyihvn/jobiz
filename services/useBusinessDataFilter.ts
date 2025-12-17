import { useBusinessContext } from './BusinessContext';

/**
 * Hook to filter data by currently selected business for super admin
 * Returns all data for regular users, filtered data for super admin
 */
export const useBusinessDataFilter = (isSuperAdmin: boolean = false) => {
  const { selectedBusiness } = useBusinessContext();

  const filterByBusiness = (data: any[], businessIdField: string = 'businessId') => {
    if (!isSuperAdmin || !selectedBusiness || !Array.isArray(data)) {
      return data;
    }
    return data.filter(item => item?.[businessIdField] === selectedBusiness.id);
  };

  return {
    selectedBusiness,
    filterByBusiness,
    shouldShowData: !isSuperAdmin || !!selectedBusiness
  };
};
