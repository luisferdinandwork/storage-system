// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date into a readable string
 * @param date - The date to format
 * @param options - Optional formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  options: {
    format?: 'short' | 'medium' | 'long' | 'time' | 'datetime';
    locale?: string;
  } = {}
): string {
  const {
    format = 'medium',
    locale = 'en-US'
  } = options;

  // Convert to Date object if it's not already
  const dateObj = new Date(date);
  
  // Handle invalid dates
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {};

  switch (format) {
    case 'short':
      formatOptions.month = 'short';
      formatOptions.day = 'numeric';
      formatOptions.year = 'numeric';
      break;
    case 'medium':
      formatOptions.month = 'short';
      formatOptions.day = 'numeric';
      formatOptions.year = 'numeric';
      break;
    case 'long':
      formatOptions.month = 'long';
      formatOptions.day = 'numeric';
      formatOptions.year = 'numeric';
      break;
    case 'time':
      formatOptions.hour = 'numeric';
      formatOptions.minute = '2-digit';
      formatOptions.hour12 = true;
      break;
    case 'datetime':
      formatOptions.month = 'short';
      formatOptions.day = 'numeric';
      formatOptions.year = 'numeric';
      formatOptions.hour = 'numeric';
      formatOptions.minute = '2-digit';
      formatOptions.hour12 = true;
      break;
  }

  return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
}

/**
 * Calculates the number of days left from today to the given date
 * @param endDate - The end date to calculate days from
 * @param options - Optional calculation options
 * @returns Number of days left
 */
export function calculateDaysLeft(
  endDate: Date | string | number,
  options: {
    includeToday?: boolean;
    absolute?: boolean;
  } = {}
): number {
  const {
    includeToday = false,
    absolute = false
  } = options;

  // Convert to Date object if it's not already
  const end = new Date(endDate);
  const today = new Date();
  
  // Handle invalid dates
  if (isNaN(end.getTime())) {
    return 0;
  }

  // Reset time to midnight for accurate day calculation
  const endDateTime = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Calculate the difference in milliseconds
  const diffTime = endDateTime.getTime() - todayTime.getTime();
  
  // Convert to days
  let daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Adjust based on includeToday option
  if (includeToday && daysLeft >= 0) {
    daysLeft += 1;
  }
  
  // Return absolute value if requested
  if (absolute) {
    return Math.abs(daysLeft);
  }
  
  return daysLeft;
}

/**
 * Formats a relative time string (e.g., "2 days ago", "in 3 days")
 * @param date - The date to format
 * @param options - Optional formatting options
 * @returns Relative time string
 */
export function formatRelativeTime(
  date: Date | string | number,
  options: {
    locale?: string;
    includeSuffix?: boolean;
  } = {}
): string {
  const {
    locale = 'en-US',
    includeSuffix = true
  } = options;

  const dateObj = new Date(date);
  const now = new Date();
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffInSeconds) < 60) {
    return includeSuffix ? rtf.format(-diffInSeconds, 'second') : rtf.format(-diffInSeconds, 'second');
  } else if (Math.abs(diffInMinutes) < 60) {
    return includeSuffix ? rtf.format(-diffInMinutes, 'minute') : rtf.format(-diffInMinutes, 'minute');
  } else if (Math.abs(diffInHours) < 24) {
    return includeSuffix ? rtf.format(-diffInHours, 'hour') : rtf.format(-diffInHours, 'hour');
  } else {
    return includeSuffix ? rtf.format(-diffInDays, 'day') : rtf.format(-diffInDays, 'day');
  }
}

/**
 * Checks if a date is today
 * @param date - The date to check
 * @returns True if the date is today
 */
export function isToday(date: Date | string | number): boolean {
  const dateObj = new Date(date);
  const today = new Date();
  
  return dateObj.getDate() === today.getDate() &&
         dateObj.getMonth() === today.getMonth() &&
         dateObj.getFullYear() === today.getFullYear();
}

/**
 * Checks if a date is in the past
 * @param date - The date to check
 * @returns True if the date is in the past
 */
export function isPast(date: Date | string | number): boolean {
  const dateObj = new Date(date);
  const today = new Date();
  
  // Reset time to midnight for accurate comparison
  const dateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  return dateOnly < todayOnly;
}

/**
 * Formats a date range (e.g., "Jan 15 - Jan 20, 2024")
 * @param startDate - The start date
 * @param endDate - The end date
 * @param options - Optional formatting options
 * @returns Formatted date range string
 */
export function formatDateRange(
  startDate: Date | string | number,
  endDate: Date | string | number,
  options: {
    format?: 'short' | 'medium' | 'long';
    locale?: string;
    separator?: string;
  } = {}
): string {
  const {
    format = 'medium',
    locale = 'en-US',
    separator = ' - '
  } = options;

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Invalid Date Range';
  }

  // If same year, don't repeat the year in the start date
  if (start.getFullYear() === end.getFullYear()) {
    const startOptions: Intl.DateTimeFormatOptions = {
      month: format === 'long' ? 'long' : 'short',
      day: 'numeric'
    };
    
    const endOptions: Intl.DateTimeFormatOptions = {
      month: format === 'long' ? 'long' : 'short',
      day: 'numeric',
      year: 'numeric'
    };

    const startFormatted = new Intl.DateTimeFormat(locale, startOptions).format(start);
    const endFormatted = new Intl.DateTimeFormat(locale, endOptions).format(end);
    
    return `${startFormatted}${separator}${endFormatted}`;
  }
  
  // Different years, show full dates
  return `${formatDate(start, { format, locale })}${separator}${formatDate(end, { format, locale })}`;
}