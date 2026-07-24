import { useEffect } from 'react';

export const usePageTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} - Atlas` : 'Atlas';
    return () => { document.title = 'Atlas'; };
  }, [title]);
};
