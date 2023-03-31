/**
 * Order details
 */
export interface CreateOrder {
  /**
   * When the order is requested for delivery
   */
  deliveryTime: Date;
  deliveryLocation: Location;
  payment: PaymentInformation;
  /**
   * Items within the order
   */
  items: OrderItem[];
}

/**
 * Information about an order for a delivery person
 */
export interface DeliveryOrder {
  /**
   * ID for the order
   */
  id: string;
  /**
   * Requested time for the delivery
   */
  deliveryTime: Date;
  preparedLocation: Location;
  deliveryLocation: Location;
  /**
   * Payment amount to perform order delivery
   */
  deliveryFee?: number;
}

/**
 * Error information
 */
export interface ErrorMessage {
  /**
   * Error code for debugging
   */
  code: number;
  /**
   * Message to display to a user
   */
  message: string;
}

/**
 * Favorite order definition, including an ID to update an existing favorite
 */
export interface FavoriteOrder {
  /**
   * ID for the saved order
   */
  readonly id?: string;
  /**
   * Name for the saved order
   */
  name: string;
  /**
   * Items composing the saved order
   */
  items: OrderItem[];
}

/**
 * Address information
 */
export interface Location {
  /**
   * Optional name for the location
   */
  name?: string;
  streetAddress: string;
  city: string;
  state: string;
  /**
   * Zipcode
   */
  zip: string;
}

/**
 * Order information
 */
export interface Order {
  /**
   * ID for the order
   */
  readonly id?: string;
  /**
   * Status of an order
   */
  readonly orderStatus?: OrderStatus;
  /**
   * When the order is scheduled for delivery
   */
  deliveryTime: Date;
  preparedLocation?: Location;
  deliveryLocation: Location;
  /**
   * Who delivered the order
   */
  readonly deliveredBy?: string;
  payment: PaymentInformation;
  /**
   * Items in the order
   */
  items: OrderItem[];
}
export type OrderStatus =
  | 'RECEIVED'
  | 'BREWING'
  | 'MADE'
  | 'PICKED_UP'
  | 'DELIVERED';
export const OrderStatus = {
  RECEIVED: 'RECEIVED' as OrderStatus,
  BREWING: 'BREWING' as OrderStatus,
  MADE: 'MADE' as OrderStatus,
  PICKEDUP: 'PICKED_UP' as OrderStatus,
  DELIVERED: 'DELIVERED' as OrderStatus,
};

/**
 * Item within an order
 */
export interface OrderItem {
  /**
   * Unique ID of the item within the order
   */
  readonly id?: string;
  /**
   * Product ID of the item
   */
  productId: string;
  /**
   * The type of coffee used in a drink
   */
  coffeeType: CoffeeType;
  /**
   * The type of milk used in a drink
   */
  milkType?: MilkType;
  /**
   * Optional additions for the item
   */
  additions?: ProductAddition[];
}

export type CoffeeType = 'REGULAR' | 'DECAF';
export const CoffeeType = {
  REGULAR: 'REGULAR' as CoffeeType,
  DECAF: 'DECAF' as CoffeeType,
};
export type MilkType = 'REGULAR' | 'SKIM' | 'OAT' | 'ALMOND';
export const MilkType = {
  REGULAR: 'REGULAR' as MilkType,
  SKIM: 'SKIM' as MilkType,
  OAT: 'OAT' as MilkType,
  ALMOND: 'ALMOND' as MilkType,
};

/**
 * Rating for an item within an order
 */
export interface OrderRating {
  /**
   * ID of the order
   */
  orderId: string;
  /**
   * Product ID of the item within the order
   */
  orderItemId: string;
  /**
   * Rating on an integer scale of 0-5
   */
  rating: number;
}

/**
 * Credit card information for payment. In a real production system, credit card number and CVV would be secured properly (e.g., hashed) to avoid losing customer data in a spill. For simplicity of this application, full number and CVV are used.
 */
export interface PaymentInformation {
  /**
   * Name on the credit card
   */
  nameOnCard: string;
  /**
   * Full credit card number
   */
  cardNumber: string;
  /**
   * Credit card's CVV
   */
  cvv: string;
}

/**
 * Information about an order for a shop owner
 */
export interface PendingOrder {
  /**
   * ID for the order
   */
  id: string;
  /**
   * Requested delivery time for the order
   */
  deliveryTime: Date;
  deliveryLocation: Location;
  /**
   * Payment amount to prepare order
   */
  commission?: number;
}

/**
 * Product details, including an ID to update an existing product
 */
export interface Product {
  /**
   * Unique ID for the product
   */
  readonly id: string;
  name: string;
  /**
   * Price for the product without any additions
   */
  basePrice: number;
  /**
   * URL for product image
   */
  imageUrl: string;
  /**
   * Types of coffee that can be used to make this product
   */
  allowedCoffeeTypes: CoffeeType[];
  /**
   * Types of milk that can be used to make this product, if applicable
   */
  allowedMilkTypes?: MilkType[];
  /**
   * Additions that can be used to make this product, if applicable
   */
  allowedAdditions?: ProductAddition[];
}

/**
 * Addition to add to a product
 */
export interface ProductAddition {
  /**
   * Unique ID of the addition
   */
  id?: string;
  name: string;
  /**
   * Price to add the addition to a product
   */
  price: number;
  /**
   * Whether this addition is available for use currently
   */
  enabled?: boolean;
}

/**
 * New shop settings
 */
export interface ShopSettings {
  /**
   * Display name for the shop
   */
  name: string;
  /**
   * Whether the shop provides its own delivery
   */
  providesOwnDelivery?: boolean;
}
