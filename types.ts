export enum CategoryGroup {
  RENTING = 'Renting',
  MEMBERSHIP = 'Membership',
  ART_SCHOOL = 'Art School',
  FOOD_DRINKS = 'Food & Drinks',
  OTHER = 'Other'
}

export enum TransactionType {
  INFLOW = 'Inflow',
  EXPENDITURE = 'Expenditure'
}

export enum TaskStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed'
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
}

export interface Business {
  id: string;
  name: string;
  address?: string; // Made optional as it's removed from register
  email: string;
  phone?: string;
  status: 'active' | 'pending' | 'suspended';
  paymentStatus: 'paid' | 'unpaid' | 'pending_verification';
  paymentReceiptUrl?: string;
  planId: string;
  subscriptionExpiry: string;
  registeredAt: string;
  dueDate?: string;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  // group is a free-form group name (e.g. 'Food & Drinks')
  group: string;
  // whether this category group represents product (stock-tracked)
  isProduct?: boolean;
  description: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  category: string; // New
  details: string;  // New
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  categoryName: string;
  categoryGroup: string;
  price: number;
  stock: number;
  unit: string;
  supplierId?: string;
  isService: boolean;
  imageUrl?: string;
}

export interface CartItem extends Product {
  quantity: number;
  discount: number;
}

export interface Transaction {
  id: string;
  businessId: string;
  date: string;
  accountHead: string;
  type: TransactionType;
  amount: number;
  particulars: string;
  paidBy: string;
  receivedBy: string;
  approvedBy: string;
}

export interface AccountHead {
  id: string;
  businessId: string;
  title: string;
  type: TransactionType;
  description: string;
}

export interface Employee {
  id: string;
  businessId: string; // 'super_admin_org' for Super Admin
  isSuperAdmin?: boolean; 
  name: string;
  roleId: string;
  password?: string;
  salary: number;
  email: string;
  phone: string;
  passportUrl?: string;
  cvUrl?: string;
  // Default location where this personnel operates (optional)
  defaultLocationId?: string;
}

export interface Role {
  id: string;
  businessId: string;
  name: string;
  permissions: string[];
}

export interface SaleRecord {
  id: string;
  businessId: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  vat: number;
  total: number;
  paymentMethod: string;
  cashier: string;
  customerId?: string;
  // Location where goods were taken from for this sale
  locationId?: string;
  isProforma?: boolean;
  deliveryFee?: number;
  particulars?: string;
  isReturn?: boolean;
  returnReason?: string;
}

export interface Location {
  id: string;
  businessId: string;
  name: string;
  address?: string;
}

export interface StockEntry {
  id: string;
  businessId: string;
  productId: string;
  locationId: string;
  quantity: number;
}

export interface CompanySettings {
  businessId: string;
  name: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  headerImageUrl?: string;
  footerImageUrl?: string;
  vatRate: number;
  currency: string;
  // Optional default location id that applies to all users when set by admin
  defaultLocationId?: string;
  // Optional mapping from roleId -> default route after login
  loginRedirects?: { [roleId: string]: string };
  // Landing page content sections
  landingContent?: {
    hero?: { title?: string; subtitle?: string; backgroundImage?: string };
    features?: Array<{ title?: string; text?: string }>;
    testimonials?: Array<{ name?: string; quote?: string }>;
    cta?: { heading?: string; subtext?: string; buttonText?: string; buttonUrl?: string };
    footer?: { text?: string; image?: string };
  };
  // Notes to appear on invoices
  invoiceNotes?: string;
}

export interface Task {
  id: string;
  businessId: string;
  title: string;
  description: string;
  assignedTo: string;
  createdBy: string;
  dateToDo: string;
  dateToComplete: string;
  status: TaskStatus;
  type: string;
  category: string;
}

export interface Report {
  id: string;
  businessId: string;
  title: string;
  content: string;
  relatedTaskId?: string;
  createdBy: string;
  createdAt: string;
  category: string;
}

export interface AuditLog {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: string;
  timestamp: string;
}

export interface Feedback {
  id: string;
  name: string;
  email: string;
  message: string;
  date: string;
  status: 'new' | 'reviewed' | 'resolved';
}
