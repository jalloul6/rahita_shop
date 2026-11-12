// Hand-written to match supabase/schema.sql so the project builds before a Supabase
// project exists. Replace with generated types:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts

export type OrderStatus =
  | "pending"
  | "processing"
  | "out_for_delivery"
  | "delivered"
  | "returned"
  | "canceled";

export type PaymentMethod = "cod" | "whish";
export type PaymentStatus = "pending" | "paid";
export type DiscountType = "percentage" | "fixed";

type PromoCode = {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  is_active: boolean;
  created_at: string;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  category: string;
  is_sponsored: boolean;
  is_active: boolean;
  created_at: string;
};

type ShippingZone = {
  id: string;
  zone_name: string;
  delivery_fee: number;
  is_active: boolean;
};

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  phone1: string;
  phone2: string | null;
  address: string;
  shipping_zone_id: string;
  status: OrderStatus;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  notes: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  promo_code: string | null;
  discount_amount: number;
  created_at: string;
  updated_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

export type DashboardStats = {
  kpis: {
    total_sales: number;
    today_sales: number;
    today_orders: number;
    month_sales: number;
    month_orders: number;
    pending: number;
    processing: number;
    out_for_delivery: number;
    unpaid_whish: number;
  };
  top_products: { product_id: string; name: string; quantity: number; revenue: number }[];
};

export type Database = {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: Partial<Product> & Pick<Product, "name" | "price">;
        Update: Partial<Product>;
        Relationships: [];
      };
      shipping_zones: {
        Row: ShippingZone;
        Insert: Partial<ShippingZone> & Pick<ShippingZone, "zone_name" | "delivery_fee">;
        Update: Partial<ShippingZone>;
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: Partial<Order> &
          Pick<
            Order,
            | "customer_name"
            | "phone1"
            | "address"
            | "shipping_zone_id"
            | "subtotal"
            | "shipping_fee"
            | "total_amount"
          >;
        Update: Partial<Order>;
        Relationships: [
          {
            foreignKeyName: "orders_shipping_zone_id_fkey";
            columns: ["shipping_zone_id"];
            isOneToOne: false;
            referencedRelation: "shipping_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: OrderItem;
        Insert: Partial<OrderItem> &
          Pick<OrderItem, "order_id" | "product_id" | "product_name" | "quantity" | "unit_price">;
        Update: Partial<OrderItem>;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      promo_codes: {
        Row: PromoCode;
        Insert: Partial<PromoCode> & Pick<PromoCode, "code" | "discount_type" | "discount_value">;
        Update: Partial<PromoCode>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      place_order: {
        Args: {
          p_customer_name: string;
          p_phone1: string;
          p_phone2: string | null;
          p_address: string;
          p_shipping_zone_id: string;
          p_items: { product_id: string; quantity: number }[];
          p_notes?: string | null;
          p_payment_method?: PaymentMethod;
          p_promo_code?: string | null;
        };
        Returns: { order_id: string; order_number: number; total_amount: number; discount_amount: number }[];
      };
      validate_promo_code: {
        Args: { p_code: string };
        Returns: { code: string; discount_type: DiscountType; discount_value: number }[];
      };
      admin_dashboard_stats: {
        Args: { p_tz?: string };
        Returns: DashboardStats;
      };
    };
    Enums: {
      order_status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      discount_type: DiscountType;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
