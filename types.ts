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
  company?: string;
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
  proformaTitle?: string;
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
  logoAlign?: 'left' | 'center' | 'right';
  logoHeight?: number;
  headerImageUrl?: string;
  headerImageHeight?: number;
  footerImageUrl?: string;
  footerImageHeight?: number;
  watermarkImageUrl?: string;
  watermarkAlign?: 'left' | 'center' | 'right';
  signatureUrl?: string;
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

// ============================================================================
// MULTI-TENANT & MARKETPLACE TYPES
// ============================================================================

export type UserType = 'super_admin' | 'admin' | 'employee' | 'driver' | 'customer';

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  userType: UserType;
  businessId?: string;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  userId: string;
  businessId: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  vehicleInsuranceExpires?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: string;
  status: 'available' | 'on_delivery' | 'offline';
  rating: number;
  totalDeliveries: number;
  totalRevenue: number;
  joinedDate: string;
  user?: User;
}

export interface Order {
  id: string;
  orderNumber: string;
  businessId: string;
  customerId: string;
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  pickupAddress?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'assigned_driver' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  paymentMethod?: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  estimatedDeliveryTime?: string;
  createdAt: string;
  updatedAt: string;
  customer?: User;
  business?: Business;
  assignment?: OrderAssignment;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  serviceId?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  product?: Product;
  service?: Service;
}

export interface OrderAssignment {
  id: string;
  orderId: string;
  driverId: string;
  businessId: string;
  assignedAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  acceptanceStatus: 'pending' | 'accepted' | 'rejected';
  rejectionReason?: string;
  driver?: Driver;
}

export interface DriverLocation {
  id: string;
  driverId: string;
  orderId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  source?: string;
  timestamp: string;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  driverId?: string;
  businessId: string;
  ratingOrder?: number;
  ratingDriver?: number;
  commentOrder?: string;
  commentDriver?: string;
  createdAt: string;
  helpfulCount: number;
}

export interface DriverAvailability {
  id: string;
  driverId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'unavailable' | 'blocked';
  reason?: string;
}

export interface Cart {
  id: string;
  customerId: string;
  businessId: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItemModel {
  id: string;
  cartId: string;
  productId?: string;
  serviceId?: string;
  quantity: number;
  addedAt: string;
  product?: Product;
  service?: Service;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  categoryName?: string;
  categoryGroup?: string;
  description?: string;
  price: number;
  unit?: string;
  imageUrl?: string;
}

export interface PublicBusiness extends Business {
  slug: string;
  description?: string;
  website?: string;
  timezone?: string;
  products?: Product[];
  services?: Service[];
  rating?: number;
  totalOrders?: number;
}
