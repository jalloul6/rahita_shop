// Hand-written to match supabase/schema.sql so the project builds before a Supabase
// project exists. Replace with generated types:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts

export type OrderStatus =
  | "pending"
  | "processing"
  | "out_for_delivery"
  | "delivered"
  | "partially_returned"
  | "returned"
  | "canceled";

export type PaymentMethod = "cod" | "whish" | "cash";
export type OrderSource = "online" | "in_store" | "phone";
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
  compare_at_price: number | null;
  is_on_offer: boolean;
  created_at: string;
};

export type ShopSettings = {
  id: number;
  theme: string;
  whatsapp_number: string | null;
  whish_number: string | null;
  instagram_url: string | null;
  copyright_en: string | null;
  copyright_ar: string | null;
  announcement_enabled: boolean;
  announcement_en: string | null;
  announcement_ar: string | null;
  hero_image_url: string | null;
  hero_title_en: string | null;
  hero_title_ar: string | null;
  hero_text_en: string | null;
  hero_text_ar: string | null;
  hero_cta_en: string | null;
  hero_cta_ar: string | null;
  hero_cta_url: string | null;
  store_name_en: string | null;
  store_name_ar: string | null;
  tagline_en: string | null;
  tagline_ar: string | null;
  updated_at: string;
};

export type CustomerRow = {
  phone_key: string;
  customer_name: string;
  phone: string;
  phone2: string | null;
  zone_id: string | null;
  zone_name: string | null;
  address: string;
  orders_count: number;
  total_spent: number;
  last_order_at: string;
};

type OrderExchangeBatch = {
  id: string;
  order_id: string;
  returned_value: number;
  new_value: number;
  shipping_refund: number;
  price_difference: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

type OrderExchangeLine = {
  id: string;
  batch_id: string;
  direction: "returned" | "new";
  order_item_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  restocked: boolean;
  reason: string | null;
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
  shipping_zone_id: string | null;
  status: OrderStatus;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  notes: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  promo_code: string | null;
  discount_amount: number;
  order_source: OrderSource;
  refunded_amount: number;
  shipping_refunded: boolean;
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
  returned_quantity: number;
  from_exchange: boolean;
};

type OrderReturn = {
  id: string;
  order_id: string;
  refund_amount: number;
  shipping_refund: number;
  restocked: boolean;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

type OrderReturnItem = {
  id: string;
  return_id: string;
  order_item_id: string;
  quantity: number;
};

type OrderExchange = {
  id: string;
  order_id: string;
  returned_item_id: string;
  returned_product_name: string;
  returned_quantity: number;
  returned_value: number;
  restocked: boolean;
  new_item_id: string | null;
  new_product_name: string;
  new_quantity: number;
  new_value: number;
  price_difference: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

// Safe public summary returned by track_order() (no name, phone or address).
export type TrackResult = {
  ref: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_source: OrderSource;
  created_at: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  refunded_amount: number;
  zone: string | null;
  items: { name: string; quantity: number; returned_quantity: number }[];
};

export type DashboardStats = {
  kpis: {
    total_sales: number;
    refunds_total: number;
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
      shop_settings: {
        Row: ShopSettings;
        Insert: Partial<ShopSettings>;
        Update: Partial<ShopSettings>;
        Relationships: [];
      };
      customer_notes: {
        Row: { phone_key: string; note: string; updated_at: string };
        Insert: { phone_key: string; note?: string; updated_at?: string };
        Update: { note?: string; updated_at?: string };
        Relationships: [];
      };
      order_exchange_batches: {
        Row: OrderExchangeBatch;
        Insert: Partial<OrderExchangeBatch> & Pick<OrderExchangeBatch, "order_id">;
        Update: Partial<OrderExchangeBatch>;
        Relationships: [
          {
            foreignKeyName: "order_exchange_batches_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_exchange_lines: {
        Row: OrderExchangeLine;
        Insert: Partial<OrderExchangeLine> &
          Pick<OrderExchangeLine, "batch_id" | "direction" | "product_name" | "quantity" | "unit_price">;
        Update: Partial<OrderExchangeLine>;
        Relationships: [
          {
            foreignKeyName: "order_exchange_lines_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "order_exchange_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      order_returns: {
        Row: OrderReturn;
        Insert: Partial<OrderReturn> & Pick<OrderReturn, "order_id" | "restocked">;
        Update: Partial<OrderReturn>;
        Relationships: [
          {
            foreignKeyName: "order_returns_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_return_items: {
        Row: OrderReturnItem;
        Insert: Partial<OrderReturnItem> & Pick<OrderReturnItem, "return_id" | "order_item_id" | "quantity">;
        Update: Partial<OrderReturnItem>;
        Relationships: [
          {
            foreignKeyName: "order_return_items_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "order_returns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_return_items_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      order_exchanges: {
        Row: OrderExchange;
        Insert: Partial<OrderExchange> &
          Pick<
            OrderExchange,
            | "order_id"
            | "returned_item_id"
            | "returned_product_name"
            | "returned_quantity"
            | "returned_value"
            | "restocked"
            | "new_product_name"
            | "new_quantity"
            | "new_value"
            | "price_difference"
          >;
        Update: Partial<OrderExchange>;
        Relationships: [
          {
            foreignKeyName: "order_exchanges_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
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
      admin_create_order: {
        Args: {
          p_source: "in_store" | "phone";
          p_customer_name: string;
          p_phone1: string;
          p_phone2: string | null;
          p_address: string;
          p_shipping_zone_id: string | null;
          p_items: { product_id: string; quantity: number }[];
          p_payment_method: PaymentMethod;
          p_promo_code?: string | null;
          p_manual_discount?: number;
          p_notes?: string | null;
        };
        Returns: { order_id: string; order_number: number; total_amount: number }[];
      };
      process_return: {
        Args: {
          p_order_id: string;
          p_items: { order_item_id: string; quantity: number }[];
          p_restock: boolean;
          p_refund_amount: number;
          p_reason?: string | null;
          p_refund_shipping?: boolean;
        };
        Returns: string;
      };
      process_exchange_multi: {
        Args: {
          p_order_id: string;
          p_returns: { order_item_id: string; quantity: number; restock: boolean; reason: string | null }[];
          p_new_items: { product_id: string; quantity: number }[];
          p_refund_shipping?: boolean;
          p_note?: string | null;
        };
        Returns: { batch_id: string; price_difference: number };
      };
      admin_customers: {
        Args: { p_search?: string | null; p_limit?: number };
        Returns: CustomerRow[];
      };
      admin_customer_orders: {
        Args: { p_key: string };
        Returns: Order[];
      };
      track_order: {
        Args: { p_ref: string; p_phone: string };
        Returns: TrackResult | null;
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
