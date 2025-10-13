// File: components/ui/universal-badge.tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UniversalBadgeProps {
  type: 'category' | 'division' | 'brand' | 'condition' | 'location' | 'status' | 'unit';
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
      default:
        return { label: value, className: '' };
    }
  };

  const { label, className: badgeClassName } = getBadgeProps();

  return (
    <Badge variant="outline" className={cn(badgeClassName, className)}>
      {label}
    </Badge>
  );
}

function getCategoryBadgeProps(category: string) {
  switch (category) {
    case '00':
      return { label: 'Lifestyle', className: 'bg-blue-100 text-blue-800' };
    case '01':
      return { label: 'Football', className: 'bg-green-100 text-green-800' };
    case '02':
      return { label: 'Futsal', className: 'bg-purple-100 text-purple-800' };
    case '03':
      return { label: 'Street Soccer', className: 'bg-indigo-100 text-indigo-800' };
    case '04':
      return { label: 'Running', className: 'bg-yellow-100 text-yellow-800' };
    case '05':
      return { label: 'Training', className: 'bg-pink-100 text-pink-800' };
    case '06':
      return { label: 'Volley', className: 'bg-orange-100 text-orange-800' };
    case '08':
      return { label: 'Badminton', className: 'bg-teal-100 text-teal-800' };
    case '09':
      return { label: 'Tennis', className: 'bg-cyan-100 text-cyan-800' };
    case '10':
      return { label: 'Basketball', className: 'bg-lime-100 text-lime-800' };
    case '12':
      return { label: 'Skateboard', className: 'bg-amber-100 text-amber-800' };
    case '14':
      return { label: 'Swimming', className: 'bg-emerald-100 text-emerald-800' };
    case '17':
      return { label: 'Back to school', className: 'bg-slate-100 text-slate-800' };
    default:
      return { label: category, className: '' };
  }
}

function getDivisionBadgeProps(division: string) {
  switch (division) {
    case '11':
      return { label: 'Footwear', className: 'bg-blue-100 text-blue-800' };
    case '12':
      return { label: 'Apparel', className: 'bg-green-100 text-green-800' };
    case '13':
      return { label: 'Accessories', className: 'bg-purple-100 text-purple-800' };
    case '14':
      return { label: 'Equipment', className: 'bg-indigo-100 text-indigo-800' };
    case '21':
      return { label: 'Footwear', className: 'bg-yellow-100 text-yellow-800' };
    case '22':
      return { label: 'Apparel', className: 'bg-pink-100 text-pink-800' };
    case '23':
      return { label: 'Accessories', className: 'bg-orange-100 text-orange-800' };
    case '24':
      return { label: 'Equipment', className: 'bg-teal-100 text-teal-800' };
    default:
      return { label: division, className: '' };
  }
}

function getBrandBadgeProps(brandCode: string) {
  switch (brandCode) {
    case 'PIE':
      return { label: 'Piero', className: 'bg-red-100 text-red-800' };
    case 'SPE':
      return { label: 'Specs', className: 'bg-blue-100 text-blue-800' };
    default:
      return { label: brandCode, className: '' };
  }
}

function getConditionBadgeProps(condition: string) {
  switch (condition) {
    case 'excellent':
      return { label: 'Excellent', className: 'bg-green-100 text-green-800' };
    case 'good':
      return { label: 'Good', className: 'bg-blue-100 text-blue-800' };
    case 'fair':
      return { label: 'Fair', className: 'bg-amber-100 text-amber-800' };
    case 'poor':
      return { label: 'Poor', className: 'bg-red-100 text-red-800' };
    default:
      return { label: condition, className: '' };
  }
}

function getLocationBadgeProps(location: string | null) {
  if (!location) {
    return { label: 'Not Assigned', className: 'bg-gray-100 text-gray-800' };
  }
  
  switch (location) {
    case 'Storage 1':
      return { label: 'Storage 1', className: 'bg-gray-100 text-gray-800' };
    case 'Storage 2':
      return { label: 'Storage 2', className: 'bg-indigo-100 text-indigo-800' };
    case 'Storage 3':
      return { label: 'Storage 3', className: 'bg-pink-100 text-pink-800' };
    default:
      return { label: location, className: '' };
  }
}

function getStatusBadgeProps(status: string) {
  switch (status) {
    case 'pending_approval':
      return { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800' };
    case 'approved':
      return { label: 'Approved', className: 'bg-blue-100 text-blue-800' };
    case 'available':
      return { label: 'Available', className: 'bg-green-100 text-green-800' };
    case 'borrowed':
      return { label: 'Borrowed', className: 'bg-purple-100 text-purple-800' };
    case 'in_clearance':
      return { label: 'In Clearance', className: 'bg-gray-100 text-gray-800' };
    case 'rejected':
      return { label: 'Rejected', className: 'bg-red-100 text-red-800' };
    case 'pending':
      return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' };
    // Stock status values
    case 'out_of_stock':
      return { label: 'Out of Stock', className: 'bg-red-100 text-red-800' };
    case 'low_stock':
      return { label: 'Low Stock', className: 'bg-amber-100 text-amber-800' };
    case 'in_stock':
      return { label: 'In Stock', className: 'bg-green-100 text-green-800' };
    default:
      return { label: status, className: '' };
  }
}

function getUnitBadgeProps(unit: string) {
  switch (unit) {
    case 'PCS':
      return { label: 'PCS', className: 'bg-cyan-100 text-cyan-800' };
    case 'PRS':
      return { label: 'PRS', className: 'bg-orange-100 text-orange-800' };
    default:
      return { label: unit, className: '' };
  }
}