import { useEffect, useState } from 'react';
import { useBusinessContext } from './BusinessContext';
import { getCurrentUser } from './auth';

/**
 * Hook to get the correct business ID for data operations
 * For super admins: returns the switched business ID if available
 * For regular users: returns their own business ID
 */
export const useContextBusinessId = () => {
  const { selectedBusinessId } = useBusinessContext();
  const [userBusinessId, setUserBusinessId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserBusinessId(user.businessId);
          setIsSuperAdmin(user.is_super_admin || user.isSuperAdmin || false);
        }
      } catch (e) {
        console.warn('Failed to get current user', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Return the business ID to use for data operations
  const getBusinessId = (): string | null => {
    if (isSuperAdmin && selectedBusinessId) {
      // Super admin with switched business - use the switched one
      return selectedBusinessId;
    }
    // Regular user or super admin without switched business - use their own
    return userBusinessId;
  };

  return {
    businessId: getBusinessId(),
    userBusinessId,
    selectedBusinessId,
    isSuperAdmin,
    loading
  };
};
