export type Gender = "men" | "women";

export const ORDER_STATUSES = [
  "new",
  "pending_confirmation",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  pending_confirmation: "Pending Confirmation",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export interface Category {
  id: string;
  name: string;
  slug: string;
  gender: Gender;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number | null;
  stock: number;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  gender: Gender;
  category_id: string;
  subcategory: string | null;
  price: number;
  compare_at_price: number | null;
  sku: string | null;
  stock: number;
  low_stock_threshold: number;
  material: string | null;
  metal: string | null;
  finish: string | null;
  color: string | null;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  is_active: boolean;
  is_archived: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  sold_count: number;
  created_at: string;
  updated_at: string;
}

export type ProductWithRelations = Product & {
  category: Pick<Category, "id" | "name" | "slug" | "gender"> | null;
  images: ProductImage[];
  variants: ProductVariant[];
};

export interface SiteSettings {
  id: number;
  business_whatsapp: string | null;
  whatsapp_country_code: string;
  support_whatsapp: string | null;
  shipping_fee: number;
  free_shipping_min: number | null;
  announcement: string | null;
  instagram_handle: string | null;
}

export interface ShippingAddress {
  line1: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  shipping_address: ShippingAddress;
  notes: string | null;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon_code: string | null;
  status: OrderStatus;
  whatsapp_number: string | null;
  whatsapp_link_generated: boolean;
  stock_restored: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified: boolean;
  status: "pending" | "approved" | "hidden";
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  line1: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

/** Shape used by the cart and wishlist on the client. */
export interface CartLine {
  product_id: string;
  variant_id: string | null;
  quantity: number;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
