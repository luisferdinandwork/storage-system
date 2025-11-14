// File: components/ui/universal-badge.tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UniversalBadgeProps {
  type: 'category' | 'division' | 'brand' | 'condition' | 'location' | 'status' | 'unit' | 'season' | 'period';
  value: string;
  className?: string;
}

export function UniversalBadge({ type, value, className }: UniversalBadgeProps) {
  const getBadgeProps = () => {
    switch (type) {
      case 'category':
        return getCategoryBadgeProps(value);
      case 'division':
        return getDivisionBadgeProps(value);
      case 'brand':
        return getBrandBadgeProps(value);
      case 'condition':
        return getConditionBadgeProps(value);
      case 'location':
        return getLocationBadgeProps(value);
      case 'status':
        return getStatusBadgeProps(value);
      case 'unit':
        return getUnitBadgeProps(value);
      case 'season':
        return getSeasonBadgeProps(value);
      case 'period':
        return getPeriodBadgeProps(value);
      default:
        return { label: value, variant: 'outline', className: '' };
    }
  };

  const { label, variant, className: badgeClassName } = getBadgeProps();

  return (
    <Badge variant={variant as any} className={cn(badgeClassName, className)}>
      {label}
    </Badge>
  );
}

function getCategoryBadgeProps(category: string) {
  const categories: Record<string, string> = {
    '00': 'Lifestyle',
    '01': 'Football',
    '02': 'Futsal',
    '03': 'Street Soccer',
    '04': 'Running',
    '05': 'Training',
    '06': 'Volley',
    '08': 'Badminton',
    '09': 'Tennis',
    '10': 'Basketball',
    '12': 'Skateboard',
    '14': 'Swimming',
    '17': 'Back to school',
  };
  
  return { 
    label: categories[category] || category, 
    variant: 'outline',
    className: 'border-slate-200 text-slate-700 bg-white' 
  };
}

function getDivisionBadgeProps(division: string) {
  const divisions: Record<string, string> = {
    '11': 'Footwear',
    '12': 'Apparel',
    '13': 'Accessories',
    '14': 'Equipment',
    '21': 'Footwear',
    '22': 'Apparel',
    '23': 'Accessories',
    '24': 'Equipment',
  };
  
  return { 
    label: divisions[division] || division, 
    variant: 'outline',
    className: 'border-slate-200 text-slate-700 bg-white' 
  };
}

function getBrandBadgeProps(brandCode: string) {
  const brands: Record<string, string> = {
    'PIE': 'Piero',
    'SPE': 'Specs',
  };
  
  return { 
    label: brands[brandCode] || brandCode, 
    variant: 'outline',
    className: 'border-slate-200 text-slate-700 bg-white font-medium' 
  };
}

function getConditionBadgeProps(condition: string) {
  const conditions: Record<string, { label: string; className: string }> = {
    'excellent': { label: 'Excellent', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'good': { label: 'Good', className: 'bg-white text-slate-700 border-slate-200' },
    'fair': { label: 'Fair', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    'poor': { label: 'Poor', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  };
  
  const defaultCondition = { label: condition, className: 'bg-white text-slate-700 border-slate-200' };
  const result = conditions[condition] || defaultCondition;
  
  return { 
    label: result.label, 
    variant: 'outline',
    className: result.className 
  };
}

function getLocationBadgeProps(location: string | null) {
  if (!location) {
    return { 
      label: 'Unassigned', 
      variant: 'outline',
      className: 'border-slate-200 text-slate-400 bg-slate-50 italic' 
    };
  }
  
  return { 
    label: location, 
    variant: 'outline',
    className: 'border-slate-200 text-slate-700 bg-white' 
  };
}

function getStatusBadgeProps(status: string) {
  const statuses: Record<string, { label: string; className: string }> = {
    // Approval flow
    'pending_approval': { label: 'Pending Approval', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    'approved': { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'rejected': { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
    
    // Availability
    'available': { label: 'Available', className: 'bg-white text-slate-700 border-slate-200' },
    'borrowed': { label: 'Borrowed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    'in_clearance': { label: 'In Clearance', className: 'bg-white text-slate-500 border-slate-200' },
    
    // Stock status
    'in_stock': { label: 'In Stock', className: 'bg-white text-slate-700 border-slate-200' },
    'low_stock': { label: 'Low Stock', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    'out_of_stock': { label: 'Out of Stock', className: 'bg-rose-50 text-rose-700 border-rose-200' },
    
    // Generic
    'pending': { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  
  const defaultStatus = { label: status, className: 'bg-white text-slate-700 border-slate-200' };
  const result = statuses[status] || defaultStatus;
  
  return { 
    label: result.label, 
    variant: 'outline',
    className: result.className 
  };
}

function getUnitBadgeProps(unit: string) {
  const units: Record<string, string> = {
    'PCS': 'pcs',
    'PRS': 'prs',
  };
  
  return { 
    label: units[unit] || unit.toLowerCase(), 
    variant: 'outline',
    className: 'border-slate-200 text-slate-500 bg-white text-xs' 
  };
}

function getSeasonBadgeProps(season: string) {
  const seasons: Record<string, string> = {
    'SS': 'Spring/Summer',
    'FW': 'Fall/Winter',
    'HO': 'Holiday',
    'ES': 'Essential',
  };
  
  return { 
    label: seasons[season] || season, 
    variant: 'outline',
    className: 'border-slate-200 text-slate-700 bg-white' 
  };
}

function getPeriodBadgeProps(period: string) {
  return { 
    label: period, 
    variant: 'outline',
    className: 'border-slate-200 text-slate-700 bg-white' 
  };
}