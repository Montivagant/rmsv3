import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/pos': 'Point of Sale',
  '/kds': 'Kitchen Display',
  '/inventory': 'Inventory',
  '/customers': 'Customers',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export function Breadcrumb() {
  const location = useLocation();
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter(x => x);
    
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/' }
    ];
    
    pathnames.forEach((pathname, index) => {
      const href = `/${pathnames.slice(0, index + 1).join('/')}`;
      const label = routeLabels[href] || pathname.charAt(0).toUpperCase() + pathname.slice(1);
      
      breadcrumbs.push({ label, href });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  // Don't show breadcrumbs on the dashboard
  if (location.pathname === '/') {
    return null;
  }
  
  return (
    <div className="mb-6">
      <nav aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          {breadcrumbs.map((breadcrumb, index) => (
            <li key={breadcrumb.href || breadcrumb.label} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-gray-400 dark:text-gray-500">/</span>
              )}
              {breadcrumb.href && index < breadcrumbs.length - 1 ? (
                <Link
                  to={breadcrumb.href}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {breadcrumb.label}
                </Link>
              ) : (
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {breadcrumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}