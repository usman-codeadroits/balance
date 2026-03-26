export interface Subscription {
  id: string;
  plan: any;
  duration: any;
  days: number[];
  startDate: string;
  endDate: string;
  dayMeals: any;
  address: any;
  planPrice: number;
  vat: number;
  totalPrice: number;
  status: 'Active' | 'Completed' | 'Cancelled';
  createdAt: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | string;
}
